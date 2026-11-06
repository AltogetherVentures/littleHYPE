import type postgres from "postgres";
import { addDays, dayNum } from "../../shared/dates";
import type { HabitCategory } from "../../shared/categories";
import { BREAK_CARD_RECENT_DAYS, breakLengthDays, qualifiesForBreakCard, strongestHabit, titleFor } from "../../shared/sharing";
import { analyseAllHabits } from "../habits/service";
import { DomainError } from "../profile/service";

export interface TitleView {
  category: HabitCategory;
  key: string;
  rank: 1 | 2 | 3 | 4;
  streakDays: number;
  habitId: string;
}

/** The person's current title, from their strongest active habit (SH-1). Never includes the habit's name. */
export async function currentTitle(tx: postgres.TransactionSql, userId: string, today: string): Promise<TitleView | null> {
  const active = (await analyseAllHabits(tx, userId, today)).filter((h) => !h.archived);
  const best = strongestHabit(active.map((h) => ({ category: h.category, streakDays: h.analysis.currentDays, habitId: h.id })));
  const title = best ? titleFor(best) : null;
  return best && title ? { category: best.category, ...title, habitId: best.habitId } : null;
}

export interface BreakCardView {
  id: string;
  category: HabitCategory;
  lengthDays: number;
  brokenOn: string;
}

/**
 * Turns any newly broken streak of seven days or more into a card, once (SH-4, SH-6): the row's
 * unique (habit, broken_on) is what makes it once per broken streak however often this runs.
 */
export async function syncBreakCards(tx: postgres.TransactionSql, userId: string, today: string): Promise<void> {
  const oldest = addDays(today, -BREAK_CARD_RECENT_DAYS);
  for (const habit of await analyseAllHabits(tx, userId, today)) {
    if (habit.archived) continue;
    for (const b of habit.analysis.breaks) {
      if (b.brokenOn < oldest || !qualifiesForBreakCard(habit.analysis.unit, b.length)) continue;
      await tx`
        insert into streak_break_cards (user_id, habit_id, category, length_days, broken_on)
        values (${userId}, ${habit.id}, ${habit.category}, ${breakLengthDays(habit.analysis.unit, b.length)}, ${b.brokenOn}::date)
        on conflict (habit_id, broken_on) do nothing`;
    }
  }
}

/** The card to offer on this open: the most recent one not yet dismissed. Older ones are quietly retired. */
export async function pendingBreakCard(tx: postgres.TransactionSql, userId: string, today: string): Promise<BreakCardView | null> {
  await syncBreakCards(tx, userId, today);
  const rows = await tx<{ id: string; category: HabitCategory; length_days: number; broken_on: string }[]>`
    select id, category, length_days, broken_on::text as broken_on from streak_break_cards
     where user_id = ${userId} and dismissed_at is null order by broken_on desc, created_at desc`;
  const [latest, ...older] = rows;
  if (older.length > 0) {
    // One card at a time; the rest were superseded by a newer break and are not offered later.
    await tx`update streak_break_cards set dismissed_at = now() where user_id = ${userId} and dismissed_at is null and id <> ${latest!.id}`;
  }
  return latest ? { id: latest.id, category: latest.category, lengthDays: latest.length_days, brokenOn: latest.broken_on } : null;
}

export async function dismissBreakCard(tx: postgres.TransactionSql, userId: string, id: string): Promise<void> {
  const r = await tx`update streak_break_cards set dismissed_at = coalesce(dismissed_at, now()) where user_id = ${userId} and id = ${id}`;
  if (r.count === 0) throw new DomainError(404, "card_not_found");
}

export async function recordShare(tx: postgres.TransactionSql, userId: string, cardType: "title" | "break"): Promise<void> {
  const [row] = await tx<{ theme: string | null }[]>`select theme from profiles where user_id = ${userId}`;
  if (!row?.theme) throw new DomainError(409, "theme_required");
  await tx`insert into share_events (user_id, card_type, theme) values (${userId}, ${cardType}, ${row.theme})`;
}

/** Days since a break, for tests and sanity. */
export const daysSince = (from: string, today: string) => dayNum(today) - dayNum(from);
