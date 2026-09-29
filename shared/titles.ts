import type { HabitCategory } from "./categories";

/**
 * A user's title comes from their strongest habit: its category and streak length
 * (SH-1). Titles never expose a habit's custom name (SH-2). Wording is per theme in
 * themes/<slug>/titles.json, keyed "<category>.rank<n>".
 */
export const TITLE_RANK_MIN_STREAK = [1, 7, 30, 100] as const;

export function titleRank(streak: number): 1 | 2 | 3 | 4 | null {
  if (streak < TITLE_RANK_MIN_STREAK[0]) return null;
  if (streak >= TITLE_RANK_MIN_STREAK[3]) return 4;
  if (streak >= TITLE_RANK_MIN_STREAK[2]) return 3;
  if (streak >= TITLE_RANK_MIN_STREAK[1]) return 2;
  return 1;
}

export function titleKey(category: HabitCategory, rank: 1 | 2 | 3 | 4): string {
  return `${category}.rank${rank}`;
}
