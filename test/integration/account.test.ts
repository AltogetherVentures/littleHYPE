import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { appUser, deleteUsers, requireEnv, seedUser, superUser } from "./helpers";

vi.mock("../../src/auth/clerk", () => ({
  verifyClerkRequest: vi.fn(async (_env: unknown, request: Request) => {
    const userId = request.headers.get("x-test-user");
    return userId ? { userId, isAdmin: false } : null;
  }),
}));

const env = (): Env => ({
  ENVIRONMENT: "test",
  HYPERDRIVE: { connectionString: requireEnv("PG_APP_URL") } as Hyperdrive,
  ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
  CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  CLERK_SECRET_KEY: "sk_test_abc",
  CLERK_JWT_KEY: "unused",
  PUBLIC_BASE_URL: "http://localhost",
});

const sup = superUser();
const created: string[] = [];
async function user() {
  const u = await seedUser(sup, { paid: true, theme: "aaa" });
  created.push(u.userId);
  return u.userId;
}

async function call(path: string, opts: { as?: string; method?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.as) headers["x-test-user"] = opts.as;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(new Request(`http://localhost${path}`, { method: opts.method ?? "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }), env());
}
const api = async (path: string, opts: Parameters<typeof call>[1] = {}) => {
  const res = await call(path, opts);
  return { status: res.status, body: (await res.json()) as Record<string, any> };
};

/** A user with something in every table. */
async function populate(u: string, marker: string) {
  await sup`insert into user_themes (user_id, theme, source) values (${u}, 'aaa', 'included') on conflict do nothing`;
  await sup`insert into theme_changes (user_id, new_theme, changed_by) values (${u}, 'aaa', ${u})`;
  await api("/api/prompt", { as: u });
  const habit = (await api("/api/habits", { as: u, method: "POST", body: { name: `${marker} habit`, category: "reading" } })).body.habit;
  await api(`/api/habits/${habit.id}/logs/2026-09-30`, { as: u, method: "PUT", body: { status: "done" } });
  await api("/api/journal", { as: u, method: "POST", body: { body: `${marker} secret thoughts`, mood: 4 } });
  await api("/api/achievements/unseen", { as: u });
}

const tablesFor = (u: string) => [
  ["profiles", sup`select 1 from profiles where user_id = ${u}`],
  ["purchases", sup`select 1 from purchases where user_id = ${u}`],
  ["user_themes", sup`select 1 from user_themes where user_id = ${u}`],
  ["theme_changes", sup`select 1 from theme_changes where user_id = ${u}`],
  ["habits", sup`select 1 from habits where user_id = ${u}`],
  ["habit_schedule_versions", sup`select 1 from habit_schedule_versions where user_id = ${u}`],
  ["habit_logs", sup`select 1 from habit_logs where user_id = ${u}`],
  ["journal_entries", sup`select 1 from journal_entries where user_id = ${u}`],
  ["prompt_history", sup`select 1 from prompt_history where user_id = ${u}`],
  ["user_achievements", sup`select 1 from user_achievements where user_id = ${u}`],
] as const;
const counts = async (u: string): Promise<Record<string, number>> => Object.fromEntries(await Promise.all(tablesFor(u).map(async ([name, q]) => [name, (await q).length] as const)));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  await deleteUsers(sup, created);
  await sup.end();
});

describe("data export", () => {
  it("requires sign-in and a known format", async () => {
    expect((await call("/api/export")).status).toBe(401);
    expect((await api("/api/export?format=xml", { as: await user() })).body.error).toBe("invalid_format");
  });

  it("returns a downloadable copy of everything the user has, and nothing of anyone else's", async () => {
    const a = await user();
    const b = await user();
    await populate(a, "alice");
    await populate(b, "bob");
    const res = await call("/api/export", { as: a });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="littlehype-data-2026-09-30.json"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(text).not.toContain("bob");
    const data = JSON.parse(text);
    expect(data.profile).toMatchObject({ theme: "aaa", timezone: "UTC" });
    expect(data.habits).toHaveLength(1);
    expect(data.habits[0]).toMatchObject({ name: "alice habit", category: "reading" });
    expect(data.habits[0].schedules).toEqual([{ effectiveFrom: "2026-09-30", schedule: { type: "daily" } }]);
    expect(data.habits[0].logs).toEqual([{ date: "2026-09-30", status: "done" }]);
    expect(data.journal).toHaveLength(1);
    expect(data.journal[0]).toMatchObject({ body: "alice secret thoughts", mood: 4, date: "2026-09-30" });
    expect(data.achievements.map((x: { key: string }) => x.key).sort()).toEqual(["first_checkin", "first_entry"]);
    expect(data.purchases).toHaveLength(1);
    expect(data.purchases[0]).toMatchObject({ amount: 4900, currency: "usd", status: "paid" });
  });

  it("exports the journal as readable Markdown, oldest first", async () => {
    const u = await user();
    await api("/api/journal", { as: u, method: "POST", body: { body: "later entry", date: "2026-09-20", mood: 5 } });
    await api("/api/journal", { as: u, method: "POST", body: { body: "earlier entry", date: "2026-09-10", promptKey: "reflect.proud_of" } });
    const res = await call("/api/export?format=md", { as: u });
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(res.headers.get("content-disposition")).toContain("littlehype-journal-2026-09-30.md");
    const md = await res.text();
    expect(md.indexOf("earlier entry")).toBeLessThan(md.indexOf("later entry"));
    expect(md).toContain("## 2026-09-10");
    expect(md).toContain("Prompt: reflect.proud_of");
    expect(md).toContain("Mood: 5 of 5");
  });

  it("exports cleanly for a brand new user", async () => {
    const u = await user();
    const data = (await api("/api/export", { as: u })).body;
    expect(data.habits).toEqual([]);
    expect(data.journal).toEqual([]);
    const md = await (await call("/api/export?format=md", { as: u })).text();
    expect(md).toContain("No entries.");
  });
});

describe("account deletion", () => {
  it("requires sign-in and explicit confirmation, and deletes nothing without it", async () => {
    const u = await user();
    await populate(u, "keep");
    expect((await call("/api/account", { method: "DELETE" })).status).toBe(401);
    expect((await api("/api/account", { as: u, method: "DELETE" })).body.error).toBe("confirmation_required");
    expect((await api("/api/account?confirm=yes", { as: u, method: "DELETE" })).status).toBe(400);
    expect((await counts(u)).journal_entries).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes every trace of the user in every table, leaves everyone else alone, and removes the sign-in", async () => {
    const a = await user();
    const b = await user();
    await populate(a, "alice");
    await populate(b, "bob");
    const before = await counts(a);
    expect(Object.values(before).every((n) => n >= 1)).toBe(true);
    const bobBefore = await counts(b);

    const res = await api("/api/account?confirm=true", { as: a, method: "DELETE" });
    expect(res).toMatchObject({ status: 200, body: { deleted: true, signInRemoved: true } });
    expect(Object.values(await counts(a)).every((n) => n === 0)).toBe(true);
    expect(await counts(b)).toEqual(bobBefore);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`https://api.clerk.com/v1/users/${a}`);
    expect(init).toMatchObject({ method: "DELETE", headers: { authorization: "Bearer sk_test_abc" } });
  });

  it("still deletes the data when Clerk cannot be reached, and says the sign-in needs removing", async () => {
    const u = await user();
    await populate(u, "carol");
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await api("/api/account?confirm=true", { as: u, method: "DELETE" });
    expect(res.body).toEqual({ deleted: true, signInRemoved: false });
    expect(Object.values(await counts(u)).every((n) => n === 0)).toBe(true);
    expect(err.mock.calls.some((c) => c[0] === "clerk-delete-failed")).toBe(true);
    // the log line names the user and status, never any journal text
    expect(JSON.stringify(err.mock.calls)).not.toContain("secret thoughts");
    err.mockRestore();
  });

  it("treats a sign-in that is already gone as removed", async () => {
    const u = await user();
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    expect((await api("/api/account?confirm=true", { as: u, method: "DELETE" })).body.signInRemoved).toBe(true);
  });

  it("gives a returning person a fresh, unpaid, theme-less account rather than the old one", async () => {
    const u = await user();
    await populate(u, "dave");
    await api("/api/account?confirm=true", { as: u, method: "DELETE" });
    const me = (await api("/api/me", { as: u })).body;
    expect(me).toMatchObject({ theme: null, paid: false, onboarded: false });
    expect((await api("/api/habits", { as: u })).body.habits).toEqual([]);
  });

  it("is possible only through the deliberate function, never a plain delete", async () => {
    const u = await user();
    const sql = appUser();
    try {
      await expect(
        sql.begin(async (tx) => {
          await tx`select set_config('app.current_user_id', ${u}, true)`;
          await tx`delete from profiles where user_id = ${u}`;
        }),
      ).rejects.toThrow(/permission denied/);
      await expect(sql`select delete_my_account()`).rejects.toThrow(/not_authenticated/);
    } finally {
      await sql.end();
    }
    expect((await counts(u)).profiles).toBe(1);
  });
});
