/**
 * Achievement rules are defined once, in code, with a stable key, a trigger and a
 * threshold (AC-1). Themes supply only the name, description and unlock copy in
 * themes/<slug>/achievements.json. They reward consistency, not volume (AC-6):
 * nothing for word counts or entries per day.
 */
export type AchievementRule =
  | { kind: "first_entry" }
  | { kind: "first_checkin" }
  | { kind: "streak"; days: number }
  | { kind: "entry_days"; days: number }
  | { kind: "prompts_answered"; count: number }
  | { kind: "habits_with_streak"; habits: number; days: number };

export const ACHIEVEMENTS = [
  { key: "first_entry", rule: { kind: "first_entry" } },
  { key: "first_checkin", rule: { kind: "first_checkin" } },
  { key: "streak_3", rule: { kind: "streak", days: 3 } },
  { key: "streak_7", rule: { kind: "streak", days: 7 } },
  { key: "streak_14", rule: { kind: "streak", days: 14 } },
  { key: "streak_30", rule: { kind: "streak", days: 30 } },
  { key: "streak_60", rule: { kind: "streak", days: 60 } },
  { key: "streak_100", rule: { kind: "streak", days: 100 } },
  { key: "entries_7", rule: { kind: "entry_days", days: 7 } },
  { key: "entries_30", rule: { kind: "entry_days", days: 30 } },
  { key: "entries_100", rule: { kind: "entry_days", days: 100 } },
  { key: "prompts_10", rule: { kind: "prompts_answered", count: 10 } },
  { key: "prompts_50", rule: { kind: "prompts_answered", count: 50 } },
  { key: "habits_3", rule: { kind: "habits_with_streak", habits: 3, days: 7 } },
] as const satisfies readonly { key: string; rule: AchievementRule }[];

export type AchievementKey = (typeof ACHIEVEMENTS)[number]["key"];
export const ACHIEVEMENT_KEYS = ACHIEVEMENTS.map((a) => a.key) as AchievementKey[];

export function isAchievementKey(value: unknown): value is AchievementKey {
  return typeof value === "string" && (ACHIEVEMENT_KEYS as string[]).includes(value);
}
