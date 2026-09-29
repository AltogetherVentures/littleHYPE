/**
 * Small, theme-neutral facts a theme can weave into its own wording via string
 * variables ({date}, {day}, {stardate}, {moon}). The app computes them; each
 * theme's string table decides which to show and how to phrase it.
 */
const DAY_MS = 86_400_000;

/** The calendar date ("YYYY-MM-DD") of an instant in a timezone, falling back to UTC. */
function calendarDay(ms: number, timeZone: string): number {
  const format = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
  let text: string;
  try {
    text = format(timeZone);
  } catch {
    text = format("UTC");
  }
  const [y, m, d] = text.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/**
 * 1 on the day the account was created, then counting up at the user's own
 * midnight (TD-4), not after 24 elapsed hours.
 */
export function daysSince(iso: string, now: Date = new Date(), timeZone = "UTC"): number {
  const start = Date.parse(iso);
  if (Number.isNaN(start)) return 1;
  return Math.max(1, Math.round((calendarDay(now.getTime(), timeZone) - calendarDay(start, timeZone)) / DAY_MS) + 1);
}

/** Year plus day-of-year, e.g. "2026.272". */
export function stardate(now: Date = new Date()): string {
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear) / DAY_MS);
  return `${now.getUTCFullYear()}.${String(dayOfYear).padStart(3, "0")}`;
}

const SYNODIC_MONTH = 29.530588853;
// A known new moon: 6 January 2000, 18:14 UTC.
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const PHASES = [
  "New moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
] as const;

export function moonPhase(now: Date = new Date()): string {
  const age = (((now.getTime() - REFERENCE_NEW_MOON) / DAY_MS) % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH;
  return PHASES[Math.floor((age / SYNODIC_MONTH) * 8 + 0.5) % 8]!;
}

/** "Tuesday 29 September" in the user's own timezone (TD-4), falling back to UTC. */
export function longDate(now: Date, timeZone: string): string {
  const format = (tz: string) =>
    new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now);
  try {
    return format(timeZone);
  } catch {
    return format("UTC");
  }
}

export type Flair = Record<"date" | "day" | "stardate" | "moon", string>;

export function flairFor(createdAt: string, timeZone: string, now: Date = new Date()): Flair {
  return {
    date: longDate(now, timeZone),
    day: String(daysSince(createdAt, now, timeZone)),
    stardate: stardate(now),
    moon: moonPhase(now),
  };
}
