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

type Habit = {
  id: string;
  name: string;
  category: string;
  archivedAt: string | null;
  schedule: { type: string; days?: number[]; target?: number };
  pendingSchedule: { effectiveFrom: string; schedule: { type: string } } | null;
  streak: { current: number; longest: number; unit: string; currentDays: number };
  today: { due: boolean; logged: string | null; week: { done: number; target: number } | null };
};

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

async function newHabit(as: string, body: Record<string, unknown> = {}): Promise<Habit> {
  const res = await api("/api/habits", { as, method: "POST", body: { name: "Drink water", category: "hydration", ...body } });
  expect(res.status).toBe(201);
  return res.body.habit as Habit;
}
const check = (as: string, id: string, date: string, status = "done") => api(`/api/habits/${id}/logs/${date}`, { as, method: "PUT", body: { status } });

// 2026-09-30 is a Wednesday; the clock is fixed so "today" is deterministic.
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

describe("creating and validating habits", () => {
  it("requires sign-in", async () => {
    expect((await api("/api/habits")).status).toBe(401);
    expect((await api("/api/today")).status).toBe(401);
  });

  it("creates a daily habit by default, due today with no streak", async () => {
    const u = await user();
    const h = await newHabit(u);
    expect(h).toMatchObject({ name: "Drink water", category: "hydration", archivedAt: null, schedule: { type: "daily" }, streak: { current: 0, longest: 0 }, today: { due: true, logged: null } });
  });

  it("rejects bad input", async () => {
    const u = await user();
    const bad = async (body: unknown) => (await api("/api/habits", { as: u, method: "POST", body })).status;
    expect(await bad({ name: "" })).toBe(400);
    expect(await bad({ name: "   " })).toBe(400);
    expect(await bad({ name: "x".repeat(81) })).toBe(400);
    expect(await bad({ name: "ok", category: "nonsense" })).toBe(400);
    expect(await bad({ name: "ok", description: "x".repeat(301) })).toBe(400);
    for (const schedule of [{ type: "hourly" }, { type: "weekdays", days: [] }, { type: "weekdays", days: [0] }, { type: "weekdays", days: [8] }, { type: "weekly", target: 0 }, { type: "weekly", target: 8 }, { type: "weekly", target: 2.5 }, "daily"]) {
      expect(await bad({ name: "ok", schedule }), JSON.stringify(schedule)).toBe(400);
    }
    expect((await api("/api/habits", { as: u, method: "POST" })).status).toBe(400);
    expect((await api("/api/habits", { as: u })).body.habits).toHaveLength(0);
  });

  it("normalises weekday lists", async () => {
    const u = await user();
    const h = await newHabit(u, { schedule: { type: "weekdays", days: [5, 1, 3, 3] } });
    expect(h.schedule).toEqual({ type: "weekdays", days: [1, 3, 5] });
  });

  it("enforces the limit of 20 active habits, and archiving frees a slot (HB-8)", async () => {
    const u = await user();
    const made: Habit[] = [];
    for (let i = 0; i < 20; i++) made.push(await newHabit(u, { name: `Habit ${i}` }));
    expect((await api("/api/habits", { as: u, method: "POST", body: { name: "One too many" } })).body).toMatchObject({ error: "habit_limit_reached" });
    expect((await api(`/api/habits/${made[0]!.id}/archive`, { as: u, method: "POST" })).status).toBe(200);
    const extra = await newHabit(u, { name: "Fits now" });
    // restoring the archived one would make 21 active
    expect((await api(`/api/habits/${made[0]!.id}/restore`, { as: u, method: "POST" })).body).toMatchObject({ error: "habit_limit_reached" });
    expect(extra.id).toBeTruthy();
  });
});

describe("check-ins and streaks (HB-2, HB-2a, HB-3)", () => {
  it("checks in today, is idempotent, and undo removes it", async () => {
    const u = await user();
    const h = await newHabit(u);
    const r1 = await check(u, h.id, "2026-09-30");
    expect((r1.body.habit as Habit).streak.current).toBe(1);
    expect((r1.body.habit as Habit).today.logged).toBe("done");
    expect(((await check(u, h.id, "2026-09-30")).body.habit as Habit).streak.current).toBe(1);
    const undo = await api(`/api/habits/${h.id}/logs/2026-09-30`, { as: u, method: "DELETE" });
    expect((undo.body.habit as Habit).streak.current).toBe(0);
    expect((undo.body.habit as Habit).today.logged).toBeNull();
  });

  it("counts backfilled days and recalculates when a past day changes", async () => {
    const u = await user();
    const h = await newHabit(u);
    for (const d of ["2026-09-30", "2026-09-29", "2026-09-27"]) await check(u, h.id, d);
    expect(((await api(`/api/habits/${h.id}`, { as: u })).body.habit as Habit).streak.current).toBe(2); // 27th is cut off by the missed 28th
    const filled = await check(u, h.id, "2026-09-28");
    expect((filled.body.habit as Habit).streak).toMatchObject({ current: 4, longest: 4 });
    const removed = await api(`/api/habits/${h.id}/logs/2026-09-29`, { as: u, method: "DELETE" });
    expect((removed.body.habit as Habit).streak).toMatchObject({ current: 1, longest: 2 });
  });

  it("a skipped day does not break the streak (HB-3)", async () => {
    const u = await user();
    const h = await newHabit(u);
    await check(u, h.id, "2026-09-28");
    await check(u, h.id, "2026-09-29", "skipped");
    const r = await check(u, h.id, "2026-09-30");
    expect((r.body.habit as Habit).streak.current).toBe(2);
  });

  it("rejects future, invalid and unknown-status logs", async () => {
    const u = await user();
    const h = await newHabit(u);
    expect((await check(u, h.id, "2026-10-01")).body).toMatchObject({ error: "future_date" });
    expect((await check(u, h.id, "2026-02-30")).body).toMatchObject({ error: "invalid_date" });
    expect((await check(u, h.id, "1999-12-31")).body).toMatchObject({ error: "invalid_date" });
    expect((await check(u, h.id, "2026-09-30", "maybe")).body).toMatchObject({ error: "invalid_status" });
    expect((await api(`/api/habits/${h.id}/logs/2026-09-30`, { as: u, method: "PUT", body: {} })).status).toBe(400);
  });

  it("cannot log against an archived habit", async () => {
    const u = await user();
    const h = await newHabit(u);
    await api(`/api/habits/${h.id}/archive`, { as: u, method: "POST" });
    expect((await check(u, h.id, "2026-09-30")).body).toMatchObject({ error: "habit_archived" });
  });
});

describe("today (TD-1, TD-3, TD-4)", () => {
  it("lists active habits with due state and the nearest milestone", async () => {
    const u = await user();
    const daily = await newHabit(u, { name: "Daily" });
    const tueThu = await newHabit(u, { name: "Tue Thu", schedule: { type: "weekdays", days: [2, 4] } });
    for (const d of ["2026-09-28", "2026-09-29"]) await check(u, daily.id, d);
    const today = (await api("/api/today", { as: u })).body as { date: string; habits: Habit[]; milestone: { milestone: number; remaining: number } | null };
    expect(today.date).toBe("2026-09-30");
    expect(today.habits.map((h) => [h.name, h.today.due])).toEqual([["Daily", true], ["Tue Thu", false]]); // Wednesday
    expect(today.milestone).toEqual({ milestone: 3, remaining: 1 });
    expect(tueThu.id).toBeTruthy();
  });

  it("shows weekly progress and stays due until the target is met", async () => {
    const u = await user();
    const h = await newHabit(u, { schedule: { type: "weekly", target: 2 } });
    await check(u, h.id, "2026-09-28");
    let view = (await api(`/api/habits/${h.id}`, { as: u })).body.habit as Habit;
    expect(view.today).toMatchObject({ due: true, week: { done: 1, target: 2 } });
    await check(u, h.id, "2026-09-29");
    view = (await api(`/api/habits/${h.id}`, { as: u })).body.habit as Habit;
    expect(view.today).toMatchObject({ due: false, week: { done: 2, target: 2 } });
    expect(view.streak).toMatchObject({ current: 1, unit: "weeks", currentDays: 7 });
  });

  it("archived habits are not on Today", async () => {
    const u = await user();
    const h = await newHabit(u);
    await api(`/api/habits/${h.id}/archive`, { as: u, method: "POST" });
    expect(((await api("/api/today", { as: u })).body as { habits: Habit[] }).habits).toHaveLength(0);
  });

  it("uses the user's own timezone, not the server's", async () => {
    // 2026-09-30 12:00 UTC is already 1 October in Kiritimati (UTC+14) and still 30 September in Los Angeles
    const ahead = await user("Pacific/Kiritimati");
    const behind = await user("America/Los_Angeles");
    expect(((await api("/api/today", { as: ahead })).body as { date: string }).date).toBe("2026-10-01");
    expect(((await api("/api/today", { as: behind })).body as { date: string }).date).toBe("2026-09-30");
    const h = await newHabit(ahead);
    expect((await check(ahead, h.id, "2026-10-01")).status).toBe(200); // not "the future" for them
    const h2 = await newHabit(behind);
    expect((await check(behind, h2.id, "2026-10-01")).body).toMatchObject({ error: "future_date" });
  });
});

describe("schedules going forward only (HB-7)", () => {
  it("a change between day-based schedules starts today", async () => {
    const u = await user();
    const h = await newHabit(u);
    const r = await api(`/api/habits/${h.id}/schedule`, { as: u, method: "PUT", body: { schedule: { type: "weekdays", days: [1, 3] } } });
    expect(r.body.effectiveFrom).toBe("2026-09-30");
    expect((r.body.habit as Habit).schedule).toEqual({ type: "weekdays", days: [1, 3] });
  });

  it("a change to or from a weekly schedule waits for the next Monday, and can be replaced before then", async () => {
    const u = await user();
    const h = await newHabit(u);
    const r = await api(`/api/habits/${h.id}/schedule`, { as: u, method: "PUT", body: { schedule: { type: "weekly", target: 3 } } });
    expect(r.body.effectiveFrom).toBe("2026-10-05");
    expect((r.body.habit as Habit).schedule).toEqual({ type: "daily" });
    expect((r.body.habit as Habit).pendingSchedule).toMatchObject({ effectiveFrom: "2026-10-05", schedule: { type: "weekly" } });
    const again = await api(`/api/habits/${h.id}/schedule`, { as: u, method: "PUT", body: { schedule: { type: "weekly", target: 5 } } });
    expect((again.body.habit as Habit).pendingSchedule).toMatchObject({ effectiveFrom: "2026-10-05", schedule: { type: "weekly", target: 5 } });
  });

  it("past days keep being judged by the schedule that applied then", async () => {
    const u = await user();
    vi.setSystemTime(new Date("2026-09-28T12:00:00Z")); // Monday: create a daily habit and check in
    const h = await newHabit(u);
    await check(u, h.id, "2026-09-28");
    vi.setSystemTime(new Date("2026-09-29T12:00:00Z")); // Tuesday
    await check(u, h.id, "2026-09-29");
    vi.setSystemTime(new Date("2026-09-30T12:00:00Z")); // Wednesday: switch to Mondays only, from today
    const changed = await api(`/api/habits/${h.id}/schedule`, { as: u, method: "PUT", body: { schedule: { type: "weekdays", days: [1] } } });
    expect(changed.body.effectiveFrom).toBe("2026-09-30");
    const view = (await api(`/api/habits/${h.id}`, { as: u })).body.habit as Habit;
    // Tuesday counted when the habit was daily; had the new schedule applied backwards it would not (streak 1)
    expect(view.streak).toMatchObject({ current: 2, longest: 2 });
    expect(view.today.due).toBe(false); // Wednesday is now an off-day
    // ...and Wednesday can no longer be missed: next Monday is the next due day
    vi.setSystemTime(new Date("2026-10-02T12:00:00Z")); // Friday, nothing logged Wed/Thu/Fri
    expect(((await api(`/api/habits/${h.id}`, { as: u })).body.habit as Habit).streak.current).toBe(2);
    vi.setSystemTime(new Date("2026-10-06T12:00:00Z")); // Tuesday after a missed Monday 5th
    expect(((await api(`/api/habits/${h.id}`, { as: u })).body.habit as Habit).streak).toMatchObject({ current: 0, longest: 2 });
  });
});

describe("history, archive and delete (HB-5, HB-6)", () => {
  it("returns a 12-week grid and streak breaks", async () => {
    const u = await user();
    const h = await newHabit(u);
    for (let i = 0; i < 8; i++) await check(u, h.id, new Date(Date.UTC(2026, 8, 10 + i)).toISOString().slice(0, 10)); // 10..17 Sept
    const r = await api(`/api/habits/${h.id}/history`, { as: u });
    expect(r.body.grid).toHaveLength(12);
    expect(r.body.grid[11]).toHaveLength(7);
    expect(r.body.breaks).toEqual([{ length: 8, brokenOn: "2026-09-18" }]);
    expect(((await api(`/api/habits/${h.id}/history?weeks=4`, { as: u })).body.grid as unknown[]).length).toBe(4);
  });

  it("archiving keeps history; restoring brings it back with the streak intact", async () => {
    const u = await user();
    const h = await newHabit(u);
    await check(u, h.id, "2026-09-30");
    await api(`/api/habits/${h.id}/archive`, { as: u, method: "POST" });
    const listed = ((await api("/api/habits", { as: u })).body.habits as Habit[])[0]!;
    expect(listed.archivedAt).not.toBeNull();
    const restored = (await api(`/api/habits/${h.id}/restore`, { as: u, method: "POST" })).body.habit as Habit;
    expect(restored).toMatchObject({ archivedAt: null, streak: { current: 1 } });
  });

  it("hard delete needs explicit confirmation and removes the history", async () => {
    const u = await user();
    const h = await newHabit(u);
    await check(u, h.id, "2026-09-30");
    expect((await api(`/api/habits/${h.id}`, { as: u, method: "DELETE" })).body).toMatchObject({ error: "confirmation_required" });
    expect((await api(`/api/habits/${h.id}?confirm=true`, { as: u, method: "DELETE" })).status).toBe(200);
    expect((await api(`/api/habits/${h.id}`, { as: u })).status).toBe(404);
    expect(await sup`select 1 from habit_logs where habit_id = ${h.id}`).toHaveLength(0);
  });

  it("edits name, description and category without touching history", async () => {
    const u = await user();
    const h = await newHabit(u);
    await check(u, h.id, "2026-09-30");
    const r = await api(`/api/habits/${h.id}`, { as: u, method: "PATCH", body: { name: "Water", category: "diet", description: "Two litres" } });
    expect(r.body.habit).toMatchObject({ name: "Water", category: "diet", streak: { current: 1 } });
    expect((await api(`/api/habits/${h.id}`, { as: u, method: "PATCH", body: { category: "nope" } })).status).toBe(400);
  });
});

describe("isolation between users", () => {
  it("another user cannot see, edit, log against, archive or delete a habit", async () => {
    const a = await user();
    const b = await user();
    const h = await newHabit(a);
    await check(a, h.id, "2026-09-30");
    expect(((await api("/api/habits", { as: b })).body.habits as Habit[])).toHaveLength(0);
    expect((await api(`/api/habits/${h.id}`, { as: b })).status).toBe(404);
    expect((await api(`/api/habits/${h.id}`, { as: b, method: "PATCH", body: { name: "Hijacked" } })).status).toBe(404);
    expect((await check(b, h.id, "2026-09-29")).status).toBe(404);
    expect((await api(`/api/habits/${h.id}/logs/2026-09-30`, { as: b, method: "DELETE" })).status).toBe(404);
    expect((await api(`/api/habits/${h.id}/archive`, { as: b, method: "POST" })).status).toBe(404);
    expect((await api(`/api/habits/${h.id}/schedule`, { as: b, method: "PUT", body: { schedule: { type: "daily" } } })).status).toBe(404);
    expect((await api(`/api/habits/${h.id}?confirm=true`, { as: b, method: "DELETE" })).status).toBe(404);
    expect((await api(`/api/habits/${h.id}/history`, { as: b })).status).toBe(404);
    const stillMine = (await api(`/api/habits/${h.id}`, { as: a })).body.habit as Habit;
    expect(stillMine).toMatchObject({ name: "Drink water", archivedAt: null, streak: { current: 1 } });
  });
});
