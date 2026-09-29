/** Fixed habit categories (HB-9). Titles, share cards and suggestions key off these, never a habit's custom name. */
export const HABIT_CATEGORIES = ["hydration", "exercise", "sleep", "reading", "mindfulness", "screentime", "diet", "other"] as const;
export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export function isHabitCategory(value: unknown): value is HabitCategory {
  return typeof value === "string" && (HABIT_CATEGORIES as readonly string[]).includes(value);
}
