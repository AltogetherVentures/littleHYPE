import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { deleteUsers, requireEnv, seedUser, superUser } from "./helpers";

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
async function user(timezone?: string) {
  const u = await seedUser(sup, { paid: true, theme: "aaa" });
  created.push(u.userId);
  if (timezone) await sup`update profiles set timezone = ${timezone} where user_id = ${u.userId}`;
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
const write = async (as: string, body: Record<string, unknown>) => {
  const res = await api("/api/journal", { as, method: "POST", body });
  expect(res.status).toBe(201);
  return res.body.entry as { id: string; date: string; body: string; mood: number | null; promptKey: string | null };
};

const NOW = "2026-09-30T12:00:00Z";
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await deleteUsers(sup, created);
  await sup.end();
});

describe("writing entries", () => {
  it("requires sign-in", async () => {
    expect((await api("/api/journal")).status).toBe(401);
  });

  it("creates an entry dated today in the user's own timezone", async () => {
    const dublin = await user("Europe/Dublin");
    const kiritimati = await user("Pacific/Kiritimati"); // UTC+14: already Oct 1
    expect((await write(dublin, { body: "Hello" })).date).toBe("2026-09-30");
    expect((await write(kiritimati, { body: "Hello" })).date).toBe("2026-10-01");
  });

  it("starts empty and is edited in place, keeping its date", async () => {
    const u = await user();
    const e = await write(u, {});
    expect(e.body).toBe("");
    const patched = await api(`/api/journal/${e.id}`, { as: u, method: "PATCH", body: { body: "Today I wrote a thing.", mood: 4 } });
    expect(patched.status).toBe(200);
    expect(patched.body.entry).toMatchObject({ id: e.id, date: "2026-09-30", body: "Today I wrote a thing.", mood: 4 });
    const cleared = await api(`/api/journal/${e.id}`, { as: u, method: "PATCH", body: { mood: null } });
    expect(cleared.body.entry).toMatchObject({ body: "Today I wrote a thing.", mood: null });
  });

  it("allows several entries on one day, and backfilling a past day but not a future one", async () => {
    const u = await user();
    await write(u, { body: "morning" });
    await write(u, { body: "evening" });
    await write(u, { body: "last week", date: "2026-09-23" });
    expect((await api("/api/journal", { as: u, method: "POST", body: { body: "x", date: "2026-10-01" } })).body.error).toBe("date_in_future");
    expect((await api("/api/journal", { as: u, method: "POST", body: { body: "x", date: "nope" } })).body.error).toBe("invalid_date");
    const day = await api("/api/journal?date=2026-09-30", { as: u });
    expect(day.body.entries).toHaveLength(2);
  });

  it("validates mood, prompt, and length", async () => {
    const u = await user();
    for (const mood of [0, 6, 2.5, "3"]) expect((await api("/api/journal", { as: u, method: "POST", body: { body: "x", mood } })).body.error).toBe("invalid_mood");
    expect((await api("/api/journal", { as: u, method: "POST", body: { body: "x", promptKey: "made.up" } })).body.error).toBe("invalid_prompt");
    expect((await api("/api/journal", { as: u, method: "POST", body: { body: "x".repeat(50_001) } })).body.error).toBe("entry_too_long");
    expect((await api("/api/journal", { as: u, method: "POST", body: { body: 5 } })).body.error).toBe("invalid_body_text");
    const ok = await write(u, { body: "x".repeat(50_000), promptKey: "reflect.proud_of", mood: 5 });
    expect(ok).toMatchObject({ promptKey: "reflect.proud_of", mood: 5 });
  });

  it("deletes only with confirmation", async () => {
    const u = await user();
    const e = await write(u, { body: "bye" });
    expect((await api(`/api/journal/${e.id}`, { as: u, method: "DELETE" })).body.error).toBe("confirmation_required");
    expect((await api(`/api/journal/${e.id}?confirm=true`, { as: u, method: "DELETE" })).status).toBe(200);
    expect((await api(`/api/journal/${e.id}`, { as: u })).status).toBe(404);
    expect((await api("/api/journal/not-a-uuid", { as: u })).status).toBe(404);
  });
});

describe("finding entries", () => {
  it("lists newest first with an excerpt, never the whole text, and pages", async () => {
    const u = await user();
    await write(u, { body: "oldest", date: "2026-09-01" });
    await write(u, { body: "A".repeat(500), date: "2026-09-15" });
    await write(u, { body: "newest", date: "2026-09-29" });
    const page = await api("/api/journal?limit=2", { as: u });
    expect(page.body.entries.map((e: { date: string }) => e.date)).toEqual(["2026-09-29", "2026-09-15"]);
    expect(page.body.hasMore).toBe(true);
    expect(page.body.entries[1].excerpt.length).toBeLessThanOrEqual(161);
    expect(page.body.entries[1].body).toBeUndefined();
    const next = await api("/api/journal?limit=2&offset=2", { as: u });
    expect(next.body.entries.map((e: { date: string }) => e.date)).toEqual(["2026-09-01"]);
    expect(next.body.hasMore).toBe(false);
  });

  it("searches whole words, stemmed, newest first", async () => {
    const u = await user();
    await write(u, { body: "I went running by the river", date: "2026-09-10" });
    await write(u, { body: "Ran a long way. Then rested.", date: "2026-09-20" });
    await write(u, { body: "Quiet day with tea", date: "2026-09-25" });
    const run = await api("/api/journal?q=run", { as: u });
    expect(run.body.entries.map((e: { date: string }) => e.date)).toEqual(["2026-09-10"]);
    const tea = await api("/api/journal?q=tea%20day", { as: u });
    expect(tea.body.entries).toHaveLength(1);
    expect((await api("/api/journal?q=zzzz", { as: u })).body.entries).toEqual([]);
    expect((await api(`/api/journal?q=${"a".repeat(201)}`, { as: u })).body.error).toBe("invalid_query");
    // punctuation and operators in a query are ordinary text, never an error
    expect((await api("/api/journal?q=%22%20%26%20!%20(", { as: u })).status).toBe(200);
  });

  it("summarises a month for the calendar, with the latest mood of each day", async () => {
    const u = await user();
    await write(u, { body: "a", date: "2026-09-05", mood: 2 });
    await write(u, { body: "b", date: "2026-09-05", mood: 5 });
    await write(u, { body: "c", date: "2026-09-05" });
    await write(u, { body: "d", date: "2026-09-12" });
    await write(u, { body: "e", date: "2026-08-31", mood: 3 });
    const cal = await api("/api/journal/calendar?month=2026-09", { as: u });
    expect(cal.body).toMatchObject({ month: "2026-09", today: "2026-09-30" });
    expect(cal.body.days).toEqual([
      { date: "2026-09-05", count: 3, mood: 5 },
      { date: "2026-09-12", count: 1, mood: null },
    ]);
    expect((await api("/api/journal/calendar?month=2026-13", { as: u })).status).toBe(400);
    expect((await api("/api/journal/calendar", { as: u })).body.month).toBe("2026-09");
  });
});

describe("what counts as written", () => {
  it("is text, not whitespace: spaces, tabs and blank lines do not make a day 'written today'", async () => {
    const u = await user();
    await write(u, { body: " \n\t \r\n\n " });
    expect((await api("/api/today", { as: u })).body.writtenToday).toBe(false);
    await write(u, { body: "\n\nreal words\n" });
    expect((await api("/api/today", { as: u })).body.writtenToday).toBe(true);
  });
});

describe("privacy", () => {
  it("keeps every entry to its owner: read, edit, delete, list and search", async () => {
    const alice = await user();
    const bob = await user();
    const secret = await write(alice, { body: "alice private thoughts about marmalade" });
    expect((await api(`/api/journal/${secret.id}`, { as: bob })).status).toBe(404);
    expect((await api(`/api/journal/${secret.id}`, { as: bob, method: "PATCH", body: { body: "hijack" } })).status).toBe(404);
    expect((await api(`/api/journal/${secret.id}?confirm=true`, { as: bob, method: "DELETE" })).status).toBe(404);
    expect((await api("/api/journal", { as: bob })).body.entries).toEqual([]);
    expect((await api("/api/journal?q=marmalade", { as: bob })).body.entries).toEqual([]);
    expect((await api("/api/journal/calendar?month=2026-09", { as: bob })).body.days).toEqual([]);
    expect((await api(`/api/journal/${secret.id}`, { as: alice })).body.entry.body).toBe("alice private thoughts about marmalade");
  });

  it("does not let the API move an entry to another user or another day", async () => {
    const u = await user();
    const e = await write(u, { body: "x" });
    const res = await api(`/api/journal/${e.id}`, { as: u, method: "PATCH", body: { body: "y", date: "2020-01-01", userId: "someone" } });
    expect(res.body.entry.date).toBe("2026-09-30");
    const [row] = await sup`select user_id from journal_entries where id = ${e.id}`;
    expect(row!.user_id).toBe(u);
  });
});
