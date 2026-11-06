import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { ACHIEVEMENT_KEYS } from "../../shared/achievement-defs";
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

async function api(path: string, opts: { as?: string; method?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.as) headers["x-test-user"] = opts.as;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await worker.fetch(
    new Request(`http://localhost${path}`, { method: opts.method ?? "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }),
    env(),
  );
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const unseen = async (u: string) => ((await api("/api/achievements/unseen", { as: u })).body.unseen as { key: string }[]).map((x) => x.key);
const listed = async (u: string) => (await api("/api/achievements", { as: u })).body.achievements as { key: string; unlockedAt: string | null; seen: boolean; progress: { current: number; target: number } }[];
const write = (as: string, body: Record<string, unknown>) => api("/api/journal", { as, method: "POST", body });
const day = (n: number) => new Date(Date.UTC(2026, 8, 30 - n)).toISOString().slice(0, 10);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await deleteUsers(sup, created);
  await sup.end();
});

describe("achievements", () => {
  it("requires sign-in and knows only its own routes", async () => {
    expect((await api("/api/achievements")).status).toBe(401);
    expect((await api("/api/achievements/unseen")).status).toBe(401);
    expect((await api("/api/achievements/nope", { as: await user() })).status).toBe(404);
  });

  it("lists all fourteen with progress, none unlocked for a new user", async () => {
    const u = await user();
    const all = await listed(u);
    expect(all.map((a) => a.key).sort()).toEqual([...ACHIEVEMENT_KEYS].sort());
    expect(all.every((a) => a.unlockedAt === null && !a.seen && a.progress.current === 0)).toBe(true);
    expect(await unseen(u)).toEqual([]);
  });

  it("unlocks first_entry on a saved entry with text, once, and shows it once", async () => {
    const u = await user();
    await write(u, { body: "   " });
    expect(await unseen(u)).toEqual([]); // an empty entry earns nothing
    await write(u, { body: "Hello" });
    expect(await unseen(u)).toEqual(["first_entry"]);
    expect(await unseen(u)).toEqual(["first_entry"]); // still waiting until it is marked seen
    expect((await api("/api/achievements/seen", { as: u, method: "POST", body: { keys: ["first_entry"] } })).status).toBe(200);
    expect(await unseen(u)).toEqual([]);
    await write(u, { body: "Another" });
    expect(await unseen(u)).toEqual([]); // never celebrated twice
    const entry = (await listed(u)).find((a) => a.key === "first_entry")!;
    expect(entry).toMatchObject({ seen: true, progress: { current: 1, target: 1 } });
    expect(entry.unlockedAt).toBeTruthy();
  });

  it("unlocks first_checkin and a 3-day streak from real check-ins", async () => {
    const u = await user();
    const habit = (await api("/api/habits", { as: u, method: "POST", body: { name: "Water", category: "hydration" } })).body.habit;
    // backfill needs a schedule that reaches back: created today, so backfill counts from the earliest log
    for (const n of [2, 1, 0]) await api(`/api/habits/${habit.id}/logs/${day(n)}`, { as: u, method: "PUT", body: { status: "done" } });
    expect((await unseen(u)).sort()).toEqual(["first_checkin", "streak_3"]);
    const streak7 = (await listed(u)).find((a) => a.key === "streak_7")!;
    expect(streak7.progress).toEqual({ current: 3, target: 7 });
  });

  it("never takes an achievement away: undoing the check-in or deleting the entry keeps it", async () => {
    const u = await user();
    const habit = (await api("/api/habits", { as: u, method: "POST", body: { name: "Water" } })).body.habit;
    await api(`/api/habits/${habit.id}/logs/${day(0)}`, { as: u, method: "PUT", body: { status: "done" } });
    const entry = (await write(u, { body: "text" })).body.entry;
    expect((await unseen(u)).sort()).toEqual(["first_checkin", "first_entry"]);
    await api(`/api/habits/${habit.id}/logs/${day(0)}`, { as: u, method: "DELETE" });
    await api(`/api/journal/${entry.id}?confirm=true`, { as: u, method: "DELETE" });
    await api(`/api/habits/${habit.id}?confirm=true`, { as: u, method: "DELETE" });
    const after = await listed(u);
    expect(after.find((a) => a.key === "first_checkin")!.unlockedAt).toBeTruthy();
    expect(after.find((a) => a.key === "first_entry")!.unlockedAt).toBeTruthy();
    expect(after.find((a) => a.key === "first_entry")!.progress.current).toBe(0); // progress shows the truth, the unlock stays
  });

  it("counts writing days, not entries, for the 7-day writing achievement", async () => {
    const u = await user();
    for (let i = 0; i < 10; i++) await write(u, { body: `entry ${i}`, date: day(0) });
    expect(await unseen(u)).toEqual(["first_entry"]);
    for (let n = 1; n <= 6; n++) await write(u, { body: "another day", date: day(n) });
    expect(await unseen(u)).toEqual(["first_entry", "entries_7"]);
  });

  it("counts answered prompts once per prompt per day", async () => {
    const u = await user();
    for (let n = 0; n < 9; n++) await write(u, { body: "answer", promptKey: "reflect.proud_of", date: day(n) });
    await write(u, { body: "second answer, same day and prompt", promptKey: "reflect.proud_of", date: day(0) });
    expect(await unseen(u)).not.toContain("prompts_10");
    await write(u, { body: "tenth", promptKey: "gratitude.person", date: day(0) });
    expect(await unseen(u)).toContain("prompts_10");
  });

  it("ignores keys it does not know or that belong to someone else when marking seen", async () => {
    const a = await user();
    const b = await user();
    await write(a, { body: "hi" });
    await write(b, { body: "hi" });
    expect(await unseen(a)).toEqual(["first_entry"]);
    expect(await unseen(b)).toEqual(["first_entry"]);
    await api("/api/achievements/seen", { as: b, method: "POST", body: { keys: ["first_entry", "made_up"] } });
    expect(await unseen(a)).toEqual(["first_entry"]); // b marking its own did not touch a's
    expect((await api("/api/achievements/seen", { as: a, method: "POST", body: { keys: "first_entry" } })).status).toBe(400);
    expect((await api("/api/achievements/seen", { as: a, method: "POST", body: {} })).status).toBe(400);
  });

  it("cannot be deleted or back-dated by the application role, even directly", async () => {
    const u = await user();
    await write(u, { body: "hi" });
    await unseen(u);
    const sql = appUser();
    try {
      await expect(
        sql.begin(async (tx) => {
          await tx`select set_config('app.current_user_id', ${u}, true)`;
          await tx`delete from user_achievements where user_id = ${u}`;
        }),
      ).rejects.toThrow(/permission denied/);
      await expect(
        sql.begin(async (tx) => {
          await tx`select set_config('app.current_user_id', ${u}, true)`;
          await tx`update user_achievements set unlocked_at = '2020-01-01' where user_id = ${u}`;
        }),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await sql.end();
    }
    expect((await listed(u)).find((a) => a.key === "first_entry")!.unlockedAt).toBeTruthy();
  });
});
