import type postgres from "postgres";
import { ACHIEVEMENTS, type AchievementKey } from "../../shared/achievement-defs";
import { earnedKeys, familyOf, progressFor, type AchievementFamily, type AchievementStats, type Progress } from "../../shared/achievements";
import { listHabits } from "../habits/service";

// Lists go to Postgres as JSON: pool connections run with fetch_types off, which leaves no array serializer.
export interface AchievementView {
  key: AchievementKey;
  family: AchievementFamily;
  unlockedAt: string | null;
  seen: boolean;
  progress: Progress;
}

/** Counts and streak lengths only. Journal text is never read here (PV-3). */
export async function loadStats(tx: postgres.TransactionSql, userId: string, today: string): Promise<AchievementStats> {
  const [journal] = await tx<{ entries: number; days: number; prompts: number }[]>`
    select count(*)::int as entries,
           count(distinct entry_date)::int as days,
           count(distinct (entry_date, prompt_key)) filter (where prompt_key is not null)::int as prompts
      from journal_entries
     where user_id = ${userId} and btrim(body) <> ''`;
  const [logs] = await tx<{ n: number }[]>`select count(*)::int as n from habit_logs where user_id = ${userId} and status = 'done'`;
  const habits = await listHabits(tx, userId, today);
  return {
    entries: journal?.entries ?? 0,
    entryDays: journal?.days ?? 0,
    promptsAnswered: journal?.prompts ?? 0,
    checkins: logs?.n ?? 0,
    bestStreakDays: Math.max(0, ...habits.map((h) => h.streak.longestDays)),
    currentStreakDays: habits.filter((h) => !h.archivedAt).map((h) => h.streak.currentDays),
  };
}

/**
 * Unlocks whatever the user's history now earns and returns the keys newly unlocked.
 * Idempotent, and it only ever adds: an unlocked achievement stays unlocked (AC-5).
 */
export async function evaluateAchievements(tx: postgres.TransactionSql, userId: string, today: string): Promise<AchievementKey[]> {
  const earned = earnedKeys(await loadStats(tx, userId, today));
  if (earned.length === 0) return [];
  const rows = await tx<{ key: AchievementKey }[]>`
    insert into user_achievements (user_id, key)
    select ${userId}, k from jsonb_array_elements_text(${tx.json(earned)}) as k
    on conflict do nothing
    returning key`;
  return rows.map((r) => r.key);
}

/** Every achievement, unlocked or not, with progress towards it (AC-2, AC-3). */
export async function listAchievements(tx: postgres.TransactionSql, userId: string, today: string): Promise<AchievementView[]> {
  await evaluateAchievements(tx, userId, today);
  const stats = await loadStats(tx, userId, today);
  const rows = await tx<{ key: string; unlocked_at: Date; seen_at: Date | null }[]>`select key, unlocked_at, seen_at from user_achievements where user_id = ${userId}`;
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return ACHIEVEMENTS.map((a) => {
    const row = byKey.get(a.key);
    return { key: a.key, family: familyOf(a.key), unlockedAt: row ? row.unlocked_at.toISOString() : null, seen: row ? row.seen_at !== null : false, progress: progressFor(a.rule, stats) };
  });
}

/** Unlocked but not yet celebrated, oldest first: what the unlock moment should show next. */
export async function unseenAchievements(tx: postgres.TransactionSql, userId: string): Promise<{ key: AchievementKey; family: AchievementFamily; unlockedAt: string }[]> {
  const rows = await tx<{ key: AchievementKey; unlocked_at: Date }[]>`
    select key, unlocked_at from user_achievements where user_id = ${userId} and seen_at is null order by unlocked_at, key`;
  return rows.filter((r) => ACHIEVEMENTS.some((a) => a.key === r.key)).map((r) => ({ key: r.key, family: familyOf(r.key), unlockedAt: r.unlocked_at.toISOString() }));
}

export async function markSeen(tx: postgres.TransactionSql, userId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await tx`update user_achievements set seen_at = now() where user_id = ${userId} and seen_at is null and key in (select jsonb_array_elements_text(${tx.json(keys)}))`;
}
