import { describe, expect, it } from "vitest";
import { addDays, dayNum, dayStr, isDateString, isoWeekday, nextMonday, todayIn, weekStartNum } from "../shared/dates";
import { analyseHabit, completionGrid, nearestMilestone, todayStatus, type HabitLog, type Schedule, type ScheduleVersion } from "../shared/streaks";

// 2026-09-28 is a Monday.
const MON = "2026-09-28";
const day = (offset: number, from = MON) => addDays(from, offset);
const daily: Schedule = { type: "daily" };
const v = (effectiveFrom: string, schedule: Schedule): ScheduleVersion => ({ effectiveFrom, schedule });
const done = (...dates: string[]): HabitLog[] => dates.map((date) => ({ date, status: "done" }));
const skip = (...dates: string[]): HabitLog[] => dates.map((date) => ({ date, status: "skipped" }));
const run = (versions: ScheduleVersion[], logs: HabitLog[], today: string) => analyseHabit({ versions, logs, today });

describe("date helpers", () => {
  it("knows weekdays and week starts", () => {
    expect(isoWeekday(dayNum("2026-09-28"))).toBe(1);
    expect(isoWeekday(dayNum("2026-10-04"))).toBe(7);
    expect(dayStr(weekStartNum(dayNum("2026-10-04")))).toBe("2026-09-28");
    expect(isoWeekday(dayNum("1970-01-01"))).toBe(4);
    expect(isoWeekday(dayNum("1969-12-31"))).toBe(3);
  });
  it("adds days across month and leap boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("rejects invalid dates", () => {
    for (const bad of ["2026-02-30", "2026-13-01", "26-01-01", "", "2026-1-1", "nope"]) expect(isDateString(bad), bad).toBe(false);
    expect(isDateString("2026-02-28")).toBe(true);
    expect(isDateString(20260228)).toBe(false);
  });
  it("finds the next Monday, or the same day if it is already Monday", () => {
    expect(nextMonday("2026-09-28")).toBe("2026-09-28");
    expect(nextMonday("2026-09-29")).toBe("2026-10-05");
    expect(nextMonday("2026-10-04")).toBe("2026-10-05");
  });
  it("computes today in the user's timezone", () => {
    const instant = new Date("2026-09-29T23:30:00Z");
    expect(todayIn("UTC", instant)).toBe("2026-09-29");
    expect(todayIn("Pacific/Auckland", instant)).toBe("2026-09-30");
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-09-29");
    expect(todayIn("Nowhere/Land", instant)).toBe("2026-09-29");
  });
});

describe("daily habits", () => {
  const versions = [v(MON, daily)];

  it("has no streak with no history", () => {
    expect(run(versions, [], MON)).toMatchObject({ current: 0, longest: 0 });
    expect(run([], [], MON)).toMatchObject({ current: 0, longest: 0, startDate: null });
  });

  it("counts consecutive check-ins", () => {
    const logs = done(day(0), day(1), day(2));
    expect(run(versions, logs, day(2))).toMatchObject({ current: 3, longest: 3, unit: "days", currentDays: 3 });
  });

  it("does not break on today until today is over", () => {
    const logs = done(day(0), day(1), day(2));
    // today (day 3) is not yet checked in: the streak of 3 stands
    expect(run(versions, logs, day(3))).toMatchObject({ current: 3 });
    // once day 3 is over without a check-in it is a miss
    expect(run(versions, logs, day(4))).toMatchObject({ current: 0, longest: 3 });
  });

  it("a missed day breaks the streak and the longest is remembered", () => {
    const logs = done(day(0), day(1), day(2), day(4), day(5));
    expect(run(versions, logs, day(5))).toMatchObject({ current: 2, longest: 3 });
  });

  it("a skipped day neither breaks nor counts", () => {
    const logs = [...done(day(0), day(1), day(3)), ...skip(day(2))];
    expect(run(versions, logs, day(3))).toMatchObject({ current: 3, longest: 3 });
  });

  it("several skipped days in a row still do not break it", () => {
    const logs = [...done(day(0), day(1), day(5)), ...skip(day(2), day(3), day(4))];
    expect(run(versions, logs, day(5))).toMatchObject({ current: 3 });
  });

  it("a skipped today keeps the streak", () => {
    const logs = [...done(day(0), day(1)), ...skip(day(2))];
    expect(run(versions, logs, day(2))).toMatchObject({ current: 2 });
  });

  it("backfilled check-ins count toward the streak (HB-2a)", () => {
    const before = run(versions, done(day(0), day(2)), day(2));
    expect(before.current).toBe(1);
    const after = run(versions, done(day(0), day(1), day(2)), day(2));
    expect(after.current).toBe(3);
  });

  it("backfilling before the habit existed extends the evaluation start", () => {
    const logs = done(day(-3), day(-2), day(-1), day(0));
    expect(run(versions, logs, day(0))).toMatchObject({ current: 4, startDate: day(-3) });
  });

  it("ignores logs dated after today", () => {
    const logs = done(day(0), day(1), day(9));
    expect(run(versions, logs, day(1))).toMatchObject({ current: 2, longest: 2 });
  });

  it("undoing a check-in recalculates (removing a middle day splits the streak)", () => {
    expect(run(versions, done(day(0), day(1), day(2), day(3), day(4)), day(4)).current).toBe(5);
    expect(run(versions, done(day(0), day(1), day(3), day(4)), day(4))).toMatchObject({ current: 2, longest: 2 });
  });

  it("handles a long streak across a month and year boundary", () => {
    const start = "2026-12-15";
    const logs = Array.from({ length: 40 }, (_, i) => day(i, start)).map((date) => ({ date, status: "done" as const }));
    const r = run([v(start, daily)], logs, day(39, start));
    expect(r).toMatchObject({ current: 40, longest: 40 });
  });

  it("records each broken streak (for streak-break cards)", () => {
    const logs = done(...Array.from({ length: 8 }, (_, i) => day(i)), day(10));
    const r = run(versions, logs, day(10));
    expect(r.breaks).toEqual([{ length: 8, brokenOn: day(8) }]);
    expect(r.current).toBe(1);
  });

  it("does not report a break for a streak that is merely waiting on today", () => {
    const logs = done(...Array.from({ length: 8 }, (_, i) => day(i)));
    expect(run(versions, logs, day(8)).breaks).toEqual([]);
  });
});

describe("weekday habits", () => {
  const weekdays = [v(MON, { type: "weekdays", days: [1, 3, 5] })]; // Mon Wed Fri

  it("ignores days it is not due", () => {
    const logs = done(day(0), day(2), day(4)); // Mon Wed Fri
    expect(run(weekdays, logs, day(6))).toMatchObject({ current: 3 });
  });

  it("a missed due day breaks it, an idle off-day does not", () => {
    const logs = done(day(0), day(4)); // Mon, Fri; missed Wed
    expect(run(weekdays, logs, day(6))).toMatchObject({ current: 1, longest: 1 });
    const ok = done(day(0), day(2), day(4));
    expect(run(weekdays, ok, day(5)).current).toBe(3); // Saturday, not due
  });

  it("carries across weeks", () => {
    const logs = done(day(0), day(2), day(4), day(7), day(9), day(11));
    expect(run(weekdays, logs, day(13)).current).toBe(6);
  });

  it("a check-in on a day it is not due is harmless and does not count", () => {
    const logs = done(day(0), day(1), day(2)); // Tue is not due
    expect(run(weekdays, logs, day(2)).current).toBe(2);
  });
});

describe("weekly (X times per week) habits", () => {
  const weekly3 = [v(MON, { type: "weekly", target: 3 })];

  it("counts consecutive weeks where the target was met", () => {
    const logs = done(day(0), day(2), day(4), day(7), day(8), day(9)); // two full weeks of 3
    const r = run(weekly3, logs, day(14));
    expect(r).toMatchObject({ current: 2, longest: 2, unit: "weeks", currentDays: 14, longestDays: 14 });
  });

  it("the week in progress never breaks a streak", () => {
    const logs = done(day(0), day(2), day(4)); // week 1 met
    expect(run(weekly3, logs, day(8))).toMatchObject({ current: 1 }); // week 2 just started, nothing yet
  });

  it("the week in progress counts once its target is met", () => {
    const logs = done(day(0), day(2), day(4), day(7), day(8), day(9));
    expect(run(weekly3, logs, day(9)).current).toBe(2);
  });

  it("a completed week short of the target breaks it", () => {
    const logs = done(day(0), day(2), day(4), day(7), day(8)); // week 2 only 2 of 3
    const r = run(weekly3, logs, day(14));
    expect(r).toMatchObject({ current: 0, longest: 1 });
    expect(r.breaks).toEqual([{ length: 1, brokenOn: day(13) }]);
  });

  it("skipped days that make the target unattainable excuse the week", () => {
    const logs = [...done(day(0), day(2), day(4)), ...done(day(7)), ...skip(day(8), day(9), day(10), day(11), day(12))];
    // week 2: 1 done, 5 skipped => only 2 days attainable < 3, so excused, not a break
    const r = run(weekly3, logs, day(14));
    expect(r.current).toBe(1);
    expect(r.breaks).toEqual([]);
  });

  it("a partial first week is excused when the target was never attainable", () => {
    // habit starts on Saturday: only 2 days left in that week, target 3
    const sat = day(5);
    const r = run([v(sat, { type: "weekly", target: 3 })], done(sat), day(12));
    expect(r.breaks).toEqual([]);
  });

  it("counts done logs on any day of the week", () => {
    const logs = done(day(1), day(3), day(6));
    expect(run(weekly3, logs, day(10)).current).toBe(1);
  });
});

describe("schedule changes (HB-7)", () => {
  it("judges past days by the schedule that applied then", () => {
    // daily for the first week, then Mon/Wed/Fri only from the second Monday
    const versions = [v(MON, daily), v(day(7), { type: "weekdays", days: [1, 3, 5] })];
    const logs = done(...Array.from({ length: 7 }, (_, i) => day(i)), day(7), day(9), day(11));
    expect(run(versions, logs, day(13))).toMatchObject({ current: 10, longest: 10 });
    // had the new schedule been retroactive nothing would change; had daily continued, Tue would be a miss
    const stillDaily = run([v(MON, daily)], logs, day(13));
    expect(stillDaily.current).toBeLessThan(10);
  });

  it("a stricter schedule going forward does not rewrite history", () => {
    // week 1 only Mon-Wed done under a Mon/Wed schedule, then daily from week 2
    const versions = [v(MON, { type: "weekdays", days: [1, 3] }), v(day(7), daily)];
    const logs = done(day(0), day(2), ...Array.from({ length: 7 }, (_, i) => day(7 + i)));
    expect(run(versions, logs, day(13))).toMatchObject({ current: 9, longest: 9 });
  });

  it("changing to a weekly schedule on a Monday starts counting weeks from then", () => {
    const versions = [v(MON, daily), v(day(7), { type: "weekly", target: 2 })];
    const logs = done(day(0), day(1), day(2), day(3), day(4), day(5), day(6), day(8), day(10));
    const r = run(versions, logs, day(14));
    expect(r.unit).toBe("weeks");
    expect(r.current).toBe(8); // 7 daily days + 1 weekly week
    expect(r.currentDays).toBe(56);
  });

  it("uses the first version for days before it (backfill)", () => {
    const versions = [v(day(2), daily)];
    expect(run(versions, done(day(0), day(1), day(2)), day(2)).current).toBe(3);
  });

  it("backfilled days before the first version are judged by the FIRST schedule, not a later one", () => {
    // Mon/Wed/Fri first (from day 2), daily later (from day 9). Backfill Mon and Wed before the first version.
    const versions = [v(day(2), { type: "weekdays", days: [1, 3, 5] }), v(day(9), daily)];
    const logs = done(day(0), day(2), day(4)); // Mon, Wed, Fri (a Tuesday is not due under the first schedule)
    expect(run(versions, logs, day(6)).current).toBe(3); // Tuesday day(1) must not be a miss
  });

  it("is independent of the order versions are supplied in", () => {
    const a = [v(MON, daily), v(day(7), { type: "weekdays", days: [1, 3, 5] })];
    const b = [...a].reverse();
    const logs = done(day(0), day(1), day(7), day(9));
    expect(run(a, logs, day(10))).toEqual(run(b, logs, day(10)));
  });
});

describe("completion grid (HB-5)", () => {
  const versions = [v(MON, daily)];

  it("is 12 weeks of 7 days, Monday first, ending with the current week", () => {
    const grid = completionGrid({ versions, logs: [], today: day(3) });
    expect(grid).toHaveLength(12);
    for (const col of grid) expect(col).toHaveLength(7);
    expect(grid[11]![0]!.date).toBe(MON);
    expect(grid[0]![0]!.date).toBe(addDays(MON, -77));
  });

  it("marks done, skipped, missed, open, future and before", () => {
    const logs = [...done(day(0)), ...skip(day(1))];
    const grid = completionGrid({ versions, logs, today: day(3) });
    const week = grid[11]!.map((c) => c.state);
    expect(week).toEqual(["done", "skipped", "missed", "open", "future", "future", "future"]);
    expect(grid[10]![0]!.state).toBe("before");
  });

  it("shows non-due weekdays as rest, not missed", () => {
    const wd = [v(MON, { type: "weekdays", days: [1] })];
    const week = completionGrid({ versions: wd, logs: done(day(0)), today: day(6) })[11]!.map((c) => c.state);
    expect(week).toEqual(["done", "rest", "rest", "rest", "rest", "rest", "open".replace("open", "rest")]);
  });

  it("shows weekly habits' unlogged days as rest rather than missed", () => {
    const w = [v(MON, { type: "weekly", target: 3 })];
    const week = completionGrid({ versions: w, logs: done(day(0)), today: day(4) })[11]!.map((c) => c.state);
    expect(week).toEqual(["done", "rest", "rest", "rest", "open", "future", "future"]);
  });
});

describe("today status (TD-1)", () => {
  it("daily is always due; weekdays only on its days", () => {
    expect(todayStatus({ versions: [v(MON, daily)], logs: [], today: day(1) })).toMatchObject({ due: true, logged: null });
    const wd = [v(MON, { type: "weekdays", days: [1, 3] })];
    expect(todayStatus({ versions: wd, logs: [], today: day(1) }).due).toBe(false); // Tuesday
    expect(todayStatus({ versions: wd, logs: [], today: day(2) }).due).toBe(true); // Wednesday
  });

  it("reports what was logged today", () => {
    expect(todayStatus({ versions: [v(MON, daily)], logs: done(day(2)), today: day(2) }).logged).toBe("done");
    expect(todayStatus({ versions: [v(MON, daily)], logs: skip(day(2)), today: day(2) }).logged).toBe("skipped");
  });

  it("weekly shows progress and stays due until the target is met", () => {
    const w = [v(MON, { type: "weekly", target: 2 })];
    expect(todayStatus({ versions: w, logs: done(day(0)), today: day(2) })).toMatchObject({ due: true, week: { done: 1, target: 2 } });
    expect(todayStatus({ versions: w, logs: done(day(0), day(1)), today: day(2) })).toMatchObject({ due: false, week: { done: 2, target: 2 } });
    // ...but a habit already ticked today stays visible so it can be undone
    expect(todayStatus({ versions: w, logs: done(day(0), day(2)), today: day(2) }).due).toBe(true);
  });
});

describe("nearest milestone (TD-3)", () => {
  it("finds the closest upcoming milestone across habits", () => {
    expect(nearestMilestone([5, 12])).toEqual({ milestone: 7, remaining: 2 });
    expect(nearestMilestone([0])).toEqual({ milestone: 3, remaining: 3 });
    expect(nearestMilestone([100, 250])).toBeNull();
    expect(nearestMilestone([])).toBeNull();
  });
});
