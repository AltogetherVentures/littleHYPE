/**
 * In-memory stand-in for the habits API, gallery only. It runs the real streak engine
 * (shared/streaks.ts) over sample logs so the screens show believable numbers, and
 * check-ins made in the gallery behave like the real thing.
 */
import type { HabitCategory } from "@shared/categories";
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

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export function installMockApi() {
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    if (!url.pathname.startsWith("/api/")) return real(input, init);
    const method = (init?.method ?? "GET").toUpperCase();
    const path = url.pathname;

    if (path === "/api/today") {
      const active = habits.filter((h) => !h.archivedAt).map((h) => view(h));
      return json({ date: today, habits: active.map((v) => v.habit), milestone: nearestMilestone(active.map((v) => v.analysis.currentDays)) });
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
