/**
 * In-memory stand-in for the habits API, gallery only. It runs the real streak engine
 * (shared/streaks.ts) over sample logs so the screens show believable numbers, and
 * check-ins made in the gallery behave like the real thing.
 */
import type { HabitCategory } from "@shared/categories";
import { CARD_THEMES } from "@themes/cards";
import { renderCardSvg } from "@themes/card-kit";
import { analyseHabit, completionGrid, nearestMilestone, todayStatus, type HabitLog, type Schedule, type ScheduleVersion } from "@shared/streaks";

interface MockHabit {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  versions: ScheduleVersion[];
  logs: Map<string, "done" | "skipped">;
  archivedAt: string | null;
}

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = iso(new Date());
const daysAgo = (n: number) => iso(new Date(Date.now() - n * DAY));

function seed(id: string, name: string, category: HabitCategory, schedule: Schedule, doneRun: number, gaps: number[] = []): MockHabit {
  const logs = new Map<string, "done" | "skipped">();
  for (let n = doneRun; n >= 1; n--) if (!gaps.includes(n)) logs.set(daysAgo(n), "done");
  return { id, name, description: null, category, versions: [{ effectiveFrom: daysAgo(Math.max(doneRun, 30) + 5), schedule }], logs, archivedAt: null };
}

const habits: MockHabit[] = [
  seed("h1", "Drink water", "hydration", { type: "daily" }, 12),
  seed("h2", "Read ten pages", "reading", { type: "daily" }, 6, [7]),
  seed("h3", "Run", "exercise", { type: "weekly", target: 3 }, 20, [2, 5, 9, 12, 16]),
  seed("h4", "Lights out by eleven", "sleep", { type: "weekdays", days: [1, 2, 3, 4, 5, 7] }, 30, [3, 11]),
];

function view(h: MockHabit) {
  const logs: HabitLog[] = [...h.logs].map(([date, status]) => ({ date, status }));
  const input = { versions: h.versions, logs, today };
  const a = analyseHabit(input);
  return {
    habit: {
      id: h.id,
      name: h.name,
      description: h.description,
      category: h.category,
      archivedAt: h.archivedAt,
      createdAt: new Date().toISOString(),
      schedule: h.versions[h.versions.length - 1]!.schedule,
      pendingSchedule: null,
      streak: { current: a.current, longest: a.longest, unit: a.unit, currentDays: a.currentDays, longestDays: a.longestDays },
      today: todayStatus(input),
    },
    analysis: a,
    input,
  };
}

interface MockEntry {
  id: string;
  date: string;
  body: string;
  mood: number | null;
  promptKey: string | null;
}
const bodies = [
  "## A good, slow day\n\nWoke up early and **actually stuck** to the plan. Walked by the river, then read for an hour.\n\n- Finished chapter six\n- Called Mum\n- Cooked something new\n\n> Small things, done daily.",
  "Rough start, better finish. The meeting ran long but the evening run cleared my head. Grateful for tea and a quiet flat.",
  "Tried the new *breathing* exercise. [The guide I used](https://example.com/breathe) says four counts in, six out.",
  "Nothing much to report. Kept the streaks going and went to bed on time.",
];
const entries: MockEntry[] = [1, 2, 3, 5, 6, 8, 9, 12, 15, 19, 22, 30].map((n, i) => ({
  id: `e${i + 1}`,
  date: daysAgo(n),
  body: bodies[i % bodies.length]!,
  mood: [4, 3, 5, null, 2, 4][i % 6] ?? null,
  promptKey: i === 2 ? "gratitude.small_win" : null,
}));
entries.unshift({ id: "e0", date: today, body: "Started writing this morning.", mood: 4, promptKey: null });

const summary = (e: MockEntry) => ({ id: e.id, date: e.date, excerpt: e.body.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim().slice(0, 160), mood: e.mood, promptKey: e.promptKey, updatedAt: new Date().toISOString() });
const full = (e: MockEntry) => ({ ...e, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export function installMockApi() {
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    if (!url.pathname.startsWith("/api/")) return real(input, init);
    const method = (init?.method ?? "GET").toUpperCase();
    const path = url.pathname;

    if (path === "/api/journal" && method === "GET") {
      const q = url.searchParams.get("q")?.toLowerCase();
      const date = url.searchParams.get("date");
      const rows = entries
        .filter((e) => (!q || e.body.toLowerCase().includes(q)) && (!date || e.date === date))
        .sort((a, b) => b.date.localeCompare(a.date));
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 20);
      return json({ entries: rows.slice(offset, offset + limit).map(summary), hasMore: rows.length > offset + limit });
    }
    if (path === "/api/journal" && method === "POST") {
      const b = JSON.parse(String(init?.body)) as Partial<MockEntry>;
      const e: MockEntry = { id: `n${entries.length}`, date: b.date ?? today, body: b.body ?? "", mood: b.mood ?? null, promptKey: b.promptKey ?? null };
      entries.unshift(e);
      return json({ entry: full(e) }, 201);
    }
    if (path === "/api/journal/calendar") {
      const month = url.searchParams.get("month") ?? today.slice(0, 7);
      const byDay = new Map<string, MockEntry[]>();
      for (const e of entries.filter((x) => x.date.startsWith(month))) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
      return json({ month, today, days: [...byDay].map(([date, list]) => ({ date, count: list.length, mood: list.find((x) => x.mood)?.mood ?? null })).sort((a, b) => a.date.localeCompare(b.date)) });
    }
    const one = path.match(/^\/api\/journal\/([^/]+)$/);
    if (one) {
      const e = entries.find((x) => x.id === one[1]);
      if (!e) return json({ error: "entry_not_found" }, 404);
      if (method === "PATCH") Object.assign(e, JSON.parse(String(init?.body)));
      return json({ entry: full(e) });
    }
    if (path === "/api/title") return json({ title: { category: "hydration", key: "hydration.rank3", rank: 3, streakDays: 43, habitId: "h1" } });
    if (path === "/api/break-card") {
      const scene = new URLSearchParams(window.location.search).get("scene");
      return json({ card: scene === "breakcard" ? { id: "0b7d2f0e-1111-4222-8333-444455556666", category: "hydration", lengthDays: 12, brokenOn: today } : null });
    }
    if (path === "/api/referrals") return json({ code: "k7m2q9xa", link: "https://littlehype.com/r/k7m2q9xa", pending: 1, confirmed: 2, creditsEarned: 0, creditsRedeemed: 0, nextCreditIn: 1 });
    if (path === "/api/share-events") return json({ ok: true });
    if (path === "/api/share/card") {
      const theme = new URLSearchParams(window.location.search).get("theme") ?? "";
      const t = CARD_THEMES[theme];
      if (!t) return json({ error: "theme_required" }, 409);
      const format = url.searchParams.get("format") === "square" ? "square" : "story";
      const strings = t.strings;
      const svg =
        url.searchParams.get("type") === "break"
          ? renderCardSvg(t.style, format, { kicker: t.breakCard.name, headline: t.breakCard.variants[0]!.replace("{category}", "Hydration").replace("{length}", "12"), sub: t.breakCard.restart, habitName: url.searchParams.get("showName") ? "Drink water" : null, themeName: strings["theme.name"]!, referralUrl: "https://littlehype.com/r/k7m2q9xa" })
          : renderCardSvg(t.style, format, { kicker: "Hydration", headline: t.titles["hydration.rank3"]!, sub: (strings["habit.streak.days"] ?? "{n} days").replace("{n}", "43"), habitName: url.searchParams.get("showName") ? "Drink water" : null, themeName: strings["theme.name"]!, referralUrl: "https://littlehype.com/r/k7m2q9xa" });
      return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
    }
    if (path === "/api/achievements/unseen") {
      const showUnlock = new URLSearchParams(window.location.search).get("scene") === "unlock";
      return json({ unseen: showUnlock ? [{ key: "streak_7", family: "streak", unlockedAt: new Date().toISOString() }, { key: "first_entry", family: "entry", unlockedAt: new Date().toISOString() }] : [] });
    }
    if (path === "/api/achievements/seen") return json({ ok: true });
    if (path === "/api/achievements") {
      const rows: [string, string, number, number, boolean][] = [
        ["first_entry", "entry", 1, 1, true], ["first_checkin", "checkin", 1, 1, true], ["streak_3", "streak", 3, 3, true], ["streak_7", "streak", 7, 7, true], ["streak_14", "streak", 12, 14, false],
        ["streak_30", "streak", 12, 30, false], ["streak_60", "streak", 12, 60, false], ["streak_100", "streak", 12, 100, false], ["entries_7", "days", 7, 7, true], ["entries_30", "days", 13, 30, false],
        ["entries_100", "days", 13, 100, false], ["prompts_10", "prompt", 4, 10, false], ["prompts_50", "prompt", 4, 50, false], ["habits_3", "habits", 1, 3, false],
      ];
      return json({ achievements: rows.map(([key, family, current, target, got]) => ({ key, family, unlockedAt: got ? new Date(Date.now() - 86_400_000 * 3).toISOString() : null, seen: got, progress: { current, target } })) });
    }
    if (path === "/api/prompt") return json({ date: today, promptKey: "reflect.proud_of", skipsLeft: 3, answeredBy: null });
    if (path.startsWith("/api/onboarding")) return json({ onboarded: true, habitId: null });
    if (path === "/api/today") {
      const active = habits.filter((h) => !h.archivedAt).map((h) => view(h));
      return json({ date: today, habits: active.map((v) => v.habit), milestone: nearestMilestone(active.map((v) => v.analysis.currentDays)), writtenToday: entries.some((e) => e.date === today) });
    }
    if (path === "/api/habits" && method === "GET") return json({ today, habits: habits.map((h) => view(h).habit) });
    const history = path.match(/^\/api\/habits\/([^/]+)\/history$/);
    if (history) {
      const h = habits.find((x) => x.id === history[1]);
      if (!h) return json({ error: "not_found" }, 404);
      const v = view(h);
      return json({ habit: v.habit, grid: completionGrid(v.input), breaks: v.analysis.breaks, versions: h.versions });
    }
    const log = path.match(/^\/api\/habits\/([^/]+)\/logs\/(\d{4}-\d{2}-\d{2})$/);
    if (log) {
      const h = habits.find((x) => x.id === log[1]);
      if (!h) return json({ error: "not_found" }, 404);
      if (method === "DELETE") h.logs.delete(log[2]!);
      else h.logs.set(log[2]!, (JSON.parse(String(init?.body)) as { status: "done" | "skipped" }).status);
      return json({ habit: view(h).habit });
    }
    return json({ error: "not_mocked" }, 404);
  };
}
