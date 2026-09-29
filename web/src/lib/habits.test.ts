import { describe, expect, it } from "vitest";
import { optimisticLog, type HabitView } from "./habits";

const habit = (over: Partial<HabitView["today"]> = {}, streak: Partial<HabitView["streak"]> = {}): HabitView => ({
  id: "h1",
  name: "Water",
  description: null,
  category: "hydration",
  archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  schedule: { type: "daily" },
  pendingSchedule: null,
  week: [{ date: "2026-09-28", state: "done" }, { date: "2026-09-29", state: "open" }, { date: "2026-09-30", state: "future" }],
  streak: { current: 4, longest: 6, unit: "days", currentDays: 4, longestDays: 6, ...streak },
  today: { due: true, logged: null, week: null, ...over },
});

describe("optimisticLog", () => {
  it("checking in adds one to the streak and marks it done", () => {
    const next = optimisticLog(habit(), "done");
    expect(next.today.logged).toBe("done");
    expect(next.streak.current).toBe(5);
  });
  it("undoing a check-in takes it away again, never below zero", () => {
    expect(optimisticLog(habit({ logged: "done" }), null).streak.current).toBe(3);
    expect(optimisticLog(habit({ logged: "done" }, { current: 0 }), null).streak.current).toBe(0);
  });
  it("resting does not change the streak, and swapping done for rest removes the day", () => {
    expect(optimisticLog(habit(), "skipped").streak.current).toBe(4);
    expect(optimisticLog(habit({ logged: "done" }), "skipped").streak.current).toBe(3);
  });
  it("raises the longest streak when the current one passes it", () => {
    expect(optimisticLog(habit({}, { current: 6, longest: 6 }), "done").streak.longest).toBe(7);
  });
  it("weekly habits move their week progress, not their streak of weeks", () => {
    const weekly = habit({ week: { done: 1, target: 3 } }, { unit: "weeks", current: 2, currentDays: 14 });
    const next = optimisticLog(weekly, "done");
    expect(next.today.week).toEqual({ done: 2, target: 3 });
    expect(next.streak.current).toBe(2);
    expect(optimisticLog({ ...weekly, today: { ...weekly.today, logged: "done" } }, null).today.week).toEqual({ done: 0, target: 3 });
  });
});

describe("the week strip follows the tap", () => {
  it("marks today's cell (the last one not still to come) done, resting, or open again", () => {
    expect(optimisticLog(habit(), "done").week.map((c) => c.state)).toEqual(["done", "done", "future"]);
    expect(optimisticLog(habit(), "skipped").week.map((c) => c.state)).toEqual(["done", "skipped", "future"]);
    expect(optimisticLog(optimisticLog(habit(), "done"), null).week.map((c) => c.state)).toEqual(["done", "open", "future"]);
  });
});
