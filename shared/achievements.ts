import { ACHIEVEMENTS, type AchievementKey, type AchievementRule } from "./achievement-defs";

/**
 * What the rules are judged against. Everything here is a count or a streak length: never
 * text, word counts or volume (AC-6, PV-3).
 */
export interface AchievementStats {
  /** Entries that hold some text. */
  entries: number;
  /** Distinct calendar days with at least one such entry. */
  entryDays: number;
  /** Distinct (day, prompt) pairs answered with an entry that has text. */
  promptsAnswered: number;
  /** Habit check-ins ever recorded as done. */
  checkins: number;
  /** Longest streak reached on any habit, in days (a weekly habit's week counts as 7). */
  bestStreakDays: number;
  /** Current streak of every active habit, in days. */
  currentStreakDays: number[];
}

export interface Progress {
  current: number;
  target: number;
}

/** How far along a rule is, capped at its target. */
export function progressFor(rule: AchievementRule, stats: AchievementStats): Progress {
  const cap = (current: number, target: number): Progress => ({ current: Math.min(current, target), target });
  switch (rule.kind) {
    case "first_entry":
      return cap(stats.entries, 1);
    case "first_checkin":
      return cap(stats.checkins, 1);
    case "streak":
      return cap(stats.bestStreakDays, rule.days);
    case "entry_days":
      return cap(stats.entryDays, rule.days);
    case "prompts_answered":
      return cap(stats.promptsAnswered, rule.count);
    case "habits_with_streak":
      return cap(stats.currentStreakDays.filter((d) => d >= rule.days).length, rule.habits);
  }
}

export const isEarned = (rule: AchievementRule, stats: AchievementStats): boolean => {
  const p = progressFor(rule, stats);
  return p.current >= p.target;
};

/** Every achievement the stats currently earn (whether or not it was already unlocked). */
export function earnedKeys(stats: AchievementStats): AchievementKey[] {
  return ACHIEVEMENTS.filter((a) => isEarned(a.rule, stats)).map((a) => a.key);
}

/** Which of the icon families an achievement's emblem is drawn from. */
export type AchievementFamily = "entry" | "checkin" | "streak" | "days" | "prompt" | "habits";
export function familyOf(key: AchievementKey): AchievementFamily {
  const rule = ACHIEVEMENTS.find((a) => a.key === key)!.rule;
  switch (rule.kind) {
    case "first_entry":
      return "entry";
    case "first_checkin":
      return "checkin";
    case "streak":
      return "streak";
    case "entry_days":
      return "days";
    case "prompts_answered":
      return "prompt";
    case "habits_with_streak":
      return "habits";
  }
}

export const EMPTY_STATS: AchievementStats = { entries: 0, entryDays: 0, promptsAnswered: 0, checkins: 0, bestStreakDays: 0, currentStreakDays: [] };
