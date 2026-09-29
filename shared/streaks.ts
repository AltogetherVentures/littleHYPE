import { addDays, dayNum, dayStr, isoWeekday, weekStartNum } from "./dates";

/**
 * The one place streak and completion rules live (HB-3, HB-4, HB-5, HB-7). The Today
 * screen, habit history, achievements and share titles all call this, so the numbers
 * always agree.
 *
 * Rules
 *  - A day with a check-in counts. A skipped day (planned rest) does not break a streak and
 *    does not count. A missed day (due, nothing logged, and over) breaks it. Today is never
 *    a miss until it is over.
 *  - "daily" is due every day; "weekdays" only on the chosen ISO weekdays (Mon = 1).
 *    Days a habit is not due are transparent.
 *  - "weekly" (X times per week) counts consecutive Monday-to-Sunday WEEKS in which the
 *    target was met. The week in progress never breaks a streak. A week is excused (not a
 *    break) when skipped days, or the habit starting part-way through, made the target
 *    unattainable.
 *  - Past days are judged by the schedule in force on that day (schedule versions). A week
 *    takes the type of the schedule in force on its Monday; the API starts any change to or
 *    from a weekly schedule on a Monday, so a week never mixes types.
 *  - Backfilled check-ins count. Evaluation begins at the earliest of the first schedule
 *    version and the earliest log. Logs dated after today are ignored.
 */
export type Schedule =
  | { type: "daily" }
  | { type: "weekdays"; days: number[] }
  | { type: "weekly"; target: number };

export interface ScheduleVersion {
  /** "YYYY-MM-DD", the first day this schedule applies. */
  effectiveFrom: string;
  schedule: Schedule;
}

export type LogStatus = "done" | "skipped";
export interface HabitLog {
  date: string;
  status: LogStatus;
}

export interface HabitInput {
  versions: ScheduleVersion[];
  logs: HabitLog[];
  /** The user's local today, "YYYY-MM-DD". */
  today: string;
}

export interface StreakBreak {
  /** Streak length (days, or weeks for a weekly habit) that ended. */
  length: number;
  /** The day the streak was found broken: the missed day, or the Sunday of the missed week. */
  brokenOn: string;
}

export interface HabitAnalysis {
  current: number;
  longest: number;
  /** "weeks" for a weekly habit, otherwise "days". */
  unit: "days" | "weeks";
  /** The current streak expressed in days, for achievements and titles (a week counts as 7). */
  currentDays: number;
  longestDays: number;
  /** Every streak of length >= 1 that ended in a break, oldest first. */
  breaks: StreakBreak[];
  /** First day evaluated, or null for a habit with no history. */
  startDate: string | null;
}

type UnitKind = "done" | "break" | "pass";
interface Unit {
  kind: UnitKind;
  /** Last calendar day this unit covers. */
  day: number;
}

function sortedVersions(versions: ScheduleVersion[]): { from: number; schedule: Schedule }[] {
  return versions.map((v) => ({ from: dayNum(v.effectiveFrom), schedule: v.schedule })).sort((a, b) => a.from - b.from);
}

/** The schedule in force on a day; before the first version, the first version's. */
function scheduleOn(versions: { from: number; schedule: Schedule }[], day: number): Schedule {
  let found = versions[0]!;
  for (const v of versions) {
    if (v.from <= day) found = v;
    else break;
  }
  return found.schedule;
}

function isDue(schedule: Schedule, day: number): boolean {
  if (schedule.type === "daily") return true;
  if (schedule.type === "weekdays") return schedule.days.includes(isoWeekday(day));
  return false; // a weekly schedule has no per-day due date
}

function* units(input: HabitInput): Generator<Unit> {
  if (input.versions.length === 0) return;
  const versions = sortedVersions(input.versions);
  const today = dayNum(input.today);

  const byDay = new Map<number, LogStatus>();
  let earliest = Infinity;
  for (const log of input.logs) {
    const d = dayNum(log.date);
    if (d > today) continue;
    byDay.set(d, log.status);
    if (d < earliest) earliest = d;
  }
  const start = Math.min(versions[0]!.from, earliest);
  if (start > today) return;

  for (let weekStart = weekStartNum(start); weekStart <= today; weekStart += 7) {
    const weekEnd = weekStart + 6;
    const schedule = scheduleOn(versions, weekStart);

    if (schedule.type === "weekly") {
      const firstDay = Math.max(weekStart, start);
      let done = 0;
      let skippedInScope = 0;
      for (let d = weekStart; d <= weekEnd; d++) {
        const status = byDay.get(d);
        if (status === "done") done++;
        if (status === "skipped" && d >= firstDay) skippedInScope++;
      }
      const attainable = weekEnd - firstDay + 1 - skippedInScope;
      if (attainable < schedule.target) yield { kind: "pass", day: weekEnd };
      else if (done >= schedule.target) yield { kind: "done", day: weekEnd };
      else if (weekEnd < today) yield { kind: "break", day: weekEnd };
      else yield { kind: "pass", day: weekEnd };
      continue;
    }

    for (let d = Math.max(weekStart, start); d <= Math.min(weekEnd, today); d++) {
      if (!isDue(scheduleOn(versions, d), d)) {
        yield { kind: "pass", day: d };
        continue;
      }
      const status = byDay.get(d);
      if (status === "done") yield { kind: "done", day: d };
      else if (status === "skipped") yield { kind: "pass", day: d };
      else if (d < today) yield { kind: "break", day: d };
      else yield { kind: "pass", day: d };
    }
  }
}

export function analyseHabit(input: HabitInput): HabitAnalysis {
  const versions = sortedVersions(input.versions);
  const empty: HabitAnalysis = { current: 0, longest: 0, unit: "days", currentDays: 0, longestDays: 0, breaks: [], startDate: null };
  if (versions.length === 0) return empty;

  let run = 0;
  let longest = 0;
  const breaks: StreakBreak[] = [];
  let first: number | null = null;
  for (const unit of units(input)) {
    first ??= unit.day;
    if (unit.kind === "done") {
      run++;
      if (run > longest) longest = run;
    } else if (unit.kind === "break") {
      if (run > 0) breaks.push({ length: run, brokenOn: dayStr(unit.day) });
      run = 0;
    }
  }

  const weekly = scheduleOn(versions, dayNum(input.today)).type === "weekly";
  const perUnit = weekly ? 7 : 1;
  return {
    current: run,
    longest,
    unit: weekly ? "weeks" : "days",
    currentDays: run * perUnit,
    longestDays: longest * perUnit,
    breaks,
    startDate: first === null ? null : dayStr(Math.min(versions[0]!.from, ...input.logs.map((l) => dayNum(l.date)))),
  };
}

export type CellState = "done" | "skipped" | "missed" | "rest" | "open" | "future" | "before";
export interface GridCell {
  date: string;
  state: CellState;
}

/**
 * The completion grid for a habit's history (HB-5): `weeks` columns of seven days, Monday
 * first, ending with the week containing today.
 */
export function completionGrid(input: HabitInput, weeks = 12): GridCell[][] {
  const today = dayNum(input.today);
  const versions = input.versions.length ? sortedVersions(input.versions) : null;
  const byDay = new Map<number, LogStatus>();
  let earliest = Infinity;
  for (const log of input.logs) {
    const d = dayNum(log.date);
    byDay.set(d, log.status);
    if (d <= today && d < earliest) earliest = d;
  }
  const start = versions ? Math.min(versions[0]!.from, earliest) : Infinity;

  const lastWeek = weekStartNum(today);
  const grid: GridCell[][] = [];
  for (let w = lastWeek - 7 * (weeks - 1); w <= lastWeek; w += 7) {
    const column: GridCell[] = [];
    for (let d = w; d < w + 7; d++) {
      const status = byDay.get(d);
      let state: CellState;
      if (d > today) state = "future";
      else if (!versions || d < start) state = status === "done" ? "done" : "before";
      else if (status === "done") state = "done";
      else if (status === "skipped") state = "skipped";
      else {
        const schedule = scheduleOn(versions, weekStartNum(d));
        const weekly = schedule.type === "weekly";
        const due = weekly ? false : isDue(scheduleOn(versions, d), d);
        if (d === today) state = weekly || due ? "open" : "rest";
        else state = due ? "missed" : "rest";
      }
      column.push({ date: dayStr(d), state });
    }
    grid.push(column);
  }
  return grid;
}

export interface TodayStatus {
  /** Shown on the Today screen and open for check-in. */
  due: boolean;
  logged: LogStatus | null;
  /** For a weekly habit: check-ins so far this week and the target. */
  week: { done: number; target: number } | null;
}

/** Whether a habit is due today and how far along it is (TD-1). */
export function todayStatus(input: HabitInput): TodayStatus {
  const versions = sortedVersions(input.versions);
  const today = dayNum(input.today);
  const logged = input.logs.find((l) => l.date === input.today)?.status ?? null;
  if (versions.length === 0) return { due: false, logged, week: null };
  const schedule = scheduleOn(versions, today);
  if (schedule.type === "weekly") {
    const weekStart = weekStartNum(today);
    const done = input.logs.filter((l) => {
      const d = dayNum(l.date);
      return l.status === "done" && d >= weekStart && d <= today;
    }).length;
    return { due: done < schedule.target || logged !== null, logged, week: { done, target: schedule.target } };
  }
  return { due: isDue(schedule, today), logged, week: null };
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export interface Milestone {
  milestone: number;
  remaining: number;
  /** Position in the list passed in, so the caller can say which habit is nearly there. */
  index: number;
}

/**
 * The nearest milestone across a set of current streaks, e.g. "2 days to your 7-day
 * streak" (TD-3). Ties go to the longer streak, so the message is about the habit the
 * person is most invested in.
 */
export function nearestMilestone(streakDays: number[]): Milestone | null {
  let best: Milestone | null = null;
  streakDays.forEach((streak, index) => {
    const next = STREAK_MILESTONES.find((m) => m > streak);
    if (next === undefined) return;
    const remaining = next - streak;
    if (best === null || remaining < best.remaining || (remaining === best.remaining && streak > streakDays[best.index]!)) best = { milestone: next, remaining, index };
  });
  return best;
}

/** The current Monday-to-Sunday week of a habit, for the small strip under its name. */
export function currentWeek(input: HabitInput): GridCell[] {
  return completionGrid(input, 1)[0]!;
}

export { addDays };
