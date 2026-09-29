import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { PROMPT_KEYS } from "../../shared/prompt-keys";
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
async function user(opts: { theme?: string | null; timezone?: string } = {}) {
  const u = await seedUser(sup, { paid: true, theme: opts.theme === undefined ? "aaa" : (opts.theme ?? undefined) });
  created.push(u.userId);
  if (opts.timezone) await sup`update profiles set timezone = ${opts.timezone} where user_id = ${u.userId}`;
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
const setDay = (iso: string) => vi.setSystemTime(new Date(`${iso}T12:00:00Z`));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setDay("2026-09-30");
});
afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await deleteUsers(sup, created);
  await sup.end();
});

describe("the prompt of the day", () => {
  it("requires sign-in", async () => {
    expect((await api("/api/prompt")).status).toBe(401);
    expect((await api("/api/prompt/skip", { method: "POST" })).status).toBe(401);
  });

  it("gives the same prompt all day, remembered rather than recomputed", async () => {
    const u = await user();
    const first = await api("/api/prompt", { as: u });
    expect(first.status).toBe(200);
    expect(PROMPT_KEYS).toContain(first.body.promptKey);
    expect(first.body).toMatchObject({ date: "2026-09-30", skipsLeft: 3, answeredBy: null });
    for (let i = 0; i < 3; i++) expect((await api("/api/prompt", { as: u })).body.promptKey).toBe(first.body.promptKey);
    const rows = await sup`select seq from prompt_history where user_id = ${u}`;
    expect(rows).toHaveLength(1);
  });

  it("allows three skips a day, each a different prompt, and then refuses", async () => {
    const u = await user();
    const seen = [(await api("/api/prompt", { as: u })).body.promptKey as string];
    for (const left of [2, 1, 0]) {
      const skipped = await api("/api/prompt/skip", { as: u, method: "POST" });
      expect(skipped.status).toBe(200);
      expect(skipped.body.skipsLeft).toBe(left);
      expect(seen).not.toContain(skipped.body.promptKey);
      seen.push(skipped.body.promptKey);
    }
    const refused = await api("/api/prompt/skip", { as: u, method: "POST" });
    expect(refused).toMatchObject({ status: 409, body: { error: "no_skips_left" } });
    expect((await api("/api/prompt", { as: u })).body.promptKey).toBe(seen[3]);
  });

  it("survives a burst of skips without ever exceeding the daily limit", async () => {
    const u = await user();
    const results = await Promise.all(Array.from({ length: 8 }, () => api("/api/prompt/skip", { as: u, method: "POST" })));
    expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(true);
    const rows = await sup<{ seq: number }[]>`select seq from prompt_history where user_id = ${u} order by seq`;
    // simultaneous taps collapse into one swap rather than burning several skips, and there are never gaps or more than four
    const seqs = rows.map((r) => r.seq);
    expect(seqs.length).toBeGreaterThanOrEqual(2);
    expect(seqs.length).toBeLessThanOrEqual(4);
    expect(seqs).toEqual(seqs.map((_, i) => i + 1));
  });

  it("chooses a new prompt each day and never repeats one from the last 30 days", async () => {
    const u = await user();
    const shown = new Map<string, number>();
    for (let d = 0; d < 70; d++) {
      const date = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
      setDay(date);
      const { body } = await api("/api/prompt", { as: u });
      if (shown.has(body.promptKey)) expect(d - shown.get(body.promptKey)!).toBeGreaterThanOrEqual(30);
      shown.set(body.promptKey, d);
    }
    expect(shown.size).toBeGreaterThan(50);
  });

  it("counts a prompt as answered only by an entry that has text", async () => {
    const u = await user();
    const { body: prompt } = await api("/api/prompt", { as: u });
    await api("/api/journal", { as: u, method: "POST", body: { body: "  ", promptKey: prompt.promptKey } });
    expect((await api("/api/prompt", { as: u })).body.answeredBy).toBeNull();
    const entry = await api("/api/journal", { as: u, method: "POST", body: { body: "My answer", promptKey: prompt.promptKey } });
    expect((await api("/api/prompt", { as: u })).body.answeredBy).toBe(entry.body.entry.id);
    expect((await api("/api/prompt/skip", { as: u, method: "POST" })).body.error).toBe("already_answered");
  });

  it("does not count an entry that answers a different prompt or a different day", async () => {
    const u = await user();
    const { body: prompt } = await api("/api/prompt", { as: u });
    const other = PROMPT_KEYS.find((k) => k !== prompt.promptKey)!;
    await api("/api/journal", { as: u, method: "POST", body: { body: "elsewhere", promptKey: other } });
    await api("/api/journal", { as: u, method: "POST", body: { body: "yesterday", promptKey: prompt.promptKey, date: "2026-09-29" } });
    expect((await api("/api/prompt", { as: u })).body.answeredBy).toBeNull();
  });

  it("follows the user's own timezone for what 'today' is", async () => {
    const early = await user({ timezone: "Pacific/Kiritimati" }); // UTC+14: already 1 October
    expect((await api("/api/prompt", { as: early })).body.date).toBe("2026-10-01");
    const late = await user({ timezone: "Pacific/Pago_Pago" }); // UTC-11: still 30 September
    expect((await api("/api/prompt", { as: late })).body.date).toBe("2026-09-30");
  });

  it("keeps each user's history to themselves", async () => {
    const a = await user();
    const b = await user();
    const pa = (await api("/api/prompt", { as: a })).body;
    await api("/api/prompt/skip", { as: a, method: "POST" });
    const pb = (await api("/api/prompt", { as: b })).body;
    expect(pb.skipsLeft).toBe(3);
    const rowsB = await sup`select 1 from prompt_history where user_id = ${b}`;
    expect(rowsB).toHaveLength(1);
    expect(pa.promptKey).toBeTruthy();
  });
});

describe("finishing onboarding", () => {
  const me = async (u: string) => (await api("/api/me", { as: u })).body;

  it("requires sign-in and a chosen theme", async () => {
    expect((await api("/api/onboarding/complete", { method: "POST", body: {} })).status).toBe(401);
    const u = await user({ theme: null });
    expect((await api("/api/onboarding/complete", { as: u, method: "POST", body: {} })).body.error).toBe("theme_required");
  });

  it("starts not onboarded, with no reminder", async () => {
    const u = await user();
    expect(await me(u)).toMatchObject({ onboarded: false, reminderTime: null });
  });

  it("creates the first habit, sets the reminder and timezone, and marks the user onboarded", async () => {
    const u = await user();
    const res = await api("/api/onboarding/complete", {
      as: u,
      method: "POST",
      body: { habit: { name: "Drink water", category: "hydration" }, reminderTime: "20:30", timezone: "Europe/Dublin" },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ onboarded: true });
    expect(res.body.habitId).toBeTruthy();
    expect(await me(u)).toMatchObject({ onboarded: true, reminderTime: "20:30", timezone: "Europe/Dublin" });
    const habits = (await api("/api/habits", { as: u })).body.habits;
    expect(habits).toHaveLength(1);
    expect(habits[0]).toMatchObject({ name: "Drink water", category: "hydration", schedule: { type: "daily" } });
  });

  it("is safe to repeat: no second habit, nothing overwritten", async () => {
    const u = await user();
    await api("/api/onboarding/complete", { as: u, method: "POST", body: { habit: { name: "First" }, reminderTime: "08:00" } });
    const again = await api("/api/onboarding/complete", { as: u, method: "POST", body: { habit: { name: "Second" }, reminderTime: "09:00" } });
    expect(again.status).toBe(200);
    expect((await api("/api/habits", { as: u })).body.habits).toHaveLength(1);
    expect((await me(u)).reminderTime).toBe("08:00");
  });

  it("completes with everything skipped", async () => {
    const u = await user();
    expect((await api("/api/onboarding/complete", { as: u, method: "POST", body: {} })).status).toBe(200);
    expect(await me(u)).toMatchObject({ onboarded: true, reminderTime: null });
    expect((await api("/api/habits", { as: u })).body.habits).toEqual([]);
  });

  it("refuses bad input and changes nothing, so the user can try again", async () => {
    const u = await user();
    for (const body of [{ reminderTime: "25:00" }, { reminderTime: "8:00" }, { reminderTime: 830 }, { timezone: "Not/AZone" }, { habit: { name: "" } }, { habit: { name: "x", category: "nope" } }, { habit: { name: "x", schedule: { type: "weekly", target: 9 } } }, { habit: "text" }]) {
      const res = await api("/api/onboarding/complete", { as: u, method: "POST", body });
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(await me(u)).toMatchObject({ onboarded: false, reminderTime: null, timezone: "UTC" });
    expect((await api("/api/habits", { as: u })).body.habits).toEqual([]);
  });

  it("sets and clears the reminder time on its own", async () => {
    const u = await user();
    expect((await api("/api/me/reminder", { as: u, method: "PUT", body: { time: "07:15" } })).body.reminderTime).toBe("07:15");
    expect((await me(u)).reminderTime).toBe("07:15");
    expect((await api("/api/me/reminder", { as: u, method: "PUT", body: { time: null } })).status).toBe(200);
    expect((await me(u)).reminderTime).toBeNull();
    expect((await api("/api/me/reminder", { as: u, method: "PUT", body: { time: "24:00" } })).status).toBe(400);
  });
});
