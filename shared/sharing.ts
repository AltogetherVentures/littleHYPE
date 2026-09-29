import type { HabitCategory } from "./categories";
import { titleRank, titleKey } from "./titles";
import { hash32 } from "./prompts";

/**
 * Titles and streak-break cards (SH-1 to SH-6). Pure rules, shared by the Worker and the app.
 * Nothing here can see a habit's name or any journal text: only a category and a length.
 */
export const BREAK_CARD_MIN_DAYS = 7;
/** A weekly habit's streak counts in weeks; the same "seven days or more" bar means two weeks or more there. */
export const BREAK_CARD_MIN_WEEKS = 2;
/** Only a recent break earns a card, so opening the app after a long absence is not a wall of old failures. */
export const BREAK_CARD_RECENT_DAYS = 14;

export function qualifiesForBreakCard(unit: "days" | "weeks", length: number): boolean {
  return unit === "weeks" ? length >= BREAK_CARD_MIN_WEEKS : length >= BREAK_CARD_MIN_DAYS;
}

export const breakLengthDays = (unit: "days" | "weeks", length: number): number => (unit === "weeks" ? length * 7 : length);

export interface TitleInput {
  category: HabitCategory;
  streakDays: number;
}

/** The person's title comes from their strongest habit: the longest current streak (SH-1). */
export function strongestHabit<T extends TitleInput>(habits: T[]): T | null {
  let best: T | null = null;
  for (const h of habits) {
    if (h.streakDays < 1) continue;
    if (!best || h.streakDays > best.streakDays) best = h;
  }
  return best;
}

export function titleFor(input: TitleInput): { key: string; rank: 1 | 2 | 3 | 4; streakDays: number } | null {
  const rank = titleRank(input.streakDays);
  return rank ? { key: titleKey(input.category, rank), rank, streakDays: input.streakDays } : null;
}

/** Which of a card's jokes to show: stable for one card, spread across cards. */
export const pickVariant = (cardId: string, count: number): number => hash32(cardId) % count;

/** Referral codes: eight characters, no look-alikes (no i, o, 0, 1), matching the database check. */
export const REFERRAL_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const REFERRAL_CODE_PATTERN = /^[a-hj-np-z2-9]{8}$/;
export const REFERRALS_PER_CREDIT = 3;
export const REFERRAL_REFUND_WINDOW_DAYS = 14;
export const REFERRAL_COOKIE = "lh_ref";
export const REFERRAL_COOKIE_DAYS = 30;
