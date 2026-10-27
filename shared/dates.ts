/**
 * Calendar-date helpers on "YYYY-MM-DD" strings. A user's "today" is computed from
 * their stored timezone, never the server's (TD-4); everything below is timezone-free
 * arithmetic on dates already resolved in that timezone. Weeks start on Monday.
 */
const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a valid calendar date. Throws on anything else. */
export function dayNum(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`invalid date: ${date}`);
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const back = new Date(ms).toISOString().slice(0, 10);
  if (back !== date) throw new Error(`invalid date: ${date}`);
  return Math.round(ms / DAY_MS);
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    dayNum(value);
    return true;
  } catch {
    return false;
  }
}

export function dayStr(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(n: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  // 1970-01-01 was a Thursday (4).
  return ((((n + 3) % 7) + 7) % 7 + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function weekStartNum(n: number): number {
  return n - (isoWeekday(n) - 1);
}

export function addDays(date: string, delta: number): string {
  return dayStr(dayNum(date) + delta);
}

/** Today's calendar date in a timezone (falls back to UTC for an unknown zone). */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const format = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  try {
    return format(timeZone);
  } catch {
    return format("UTC");
  }
}

/** The Monday on or after `date` (used to start weekly schedules on a week boundary). */
export function nextMonday(date: string): string {
  const n = dayNum(date);
  return dayStr(isoWeekday(n) === 1 ? n : weekStartNum(n) + 7);
}
