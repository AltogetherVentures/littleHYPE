import { addDays, dayNum, dayStr, isoWeekday } from "@shared/dates";

export interface CalendarDay {
  date: string;
  count: number;
  mood: number | null;
}

export interface CalendarCell {
  date: string;
  day: number;
  count: number;
  mood: number | null;
  isToday: boolean;
  isFuture: boolean;
}

/** "YYYY-MM" of a date. */
export const monthOf = (date: string) => date.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

export function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * The weeks of a month, Monday first, as rows of seven. Days outside the month are null so
 * a theme can draw the blanks however it likes. Themes render this; none re-derives dates.
 */
export function monthGrid(month: string, days: CalendarDay[], today: string): (CalendarCell | null)[][] {
  const first = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;
  const length = dayNum(next) - dayNum(first);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const lead = isoWeekday(dayNum(first)) - 1;
  const cells: (CalendarCell | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 0; i < length; i++) {
    const date = dayStr(dayNum(first) + i);
    const entry = byDate.get(date);
    cells.push({ date, day: i + 1, count: entry?.count ?? 0, mood: entry?.mood ?? null, isToday: date === today, isFuture: date > today });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export { addDays };
