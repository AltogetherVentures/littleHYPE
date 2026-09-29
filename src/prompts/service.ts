import type postgres from "postgres";
import { MAX_SEQ, SKIPS_PER_DAY, choosePrompt, historySince } from "../../shared/prompts";
import { DomainError } from "../profile/service";

export interface DailyPrompt {
  date: string;
  promptKey: string;
  skipsLeft: number;
  /** The entry that answers today's prompt, once one with text exists. */
  answeredBy: string | null;
}

async function loadHistory(tx: postgres.TransactionSql, userId: string, day: string) {
  return tx<{ day: string; seq: number; prompt_key: string }[]>`
    select day::text as day, seq, prompt_key from prompt_history
     where user_id = ${userId} and day > ${historySince(day)}::date and day <= ${day}::date
     order by day, seq`;
}

async function state(tx: postgres.TransactionSql, userId: string, day: string): Promise<DailyPrompt | null> {
  const rows = (await loadHistory(tx, userId, day)).filter((r) => r.day === day);
  const current = rows.at(-1);
  if (!current) return null;
  const [answer] = await tx<{ id: string }[]>`
    select id from journal_entries
     where user_id = ${userId} and entry_date = ${day}::date and prompt_key = ${current.prompt_key} and btrim(body) <> ''
     order by created_at limit 1`;
  return { date: day, promptKey: current.prompt_key, skipsLeft: SKIPS_PER_DAY - (current.seq - 1), answeredBy: answer?.id ?? null };
}

/** Today's prompt, chosen (and remembered) the first time it is asked for. */
export async function getDailyPrompt(tx: postgres.TransactionSql, userId: string, day: string): Promise<DailyPrompt> {
  const existing = await state(tx, userId, day);
  if (existing) return existing;
  const history = (await loadHistory(tx, userId, day)).map((r) => ({ day: r.day, key: r.prompt_key }));
  const key = choosePrompt({ userId, day, seq: 1, history });
  // Two tabs opening Today at once both reach here; the primary key makes one of them a no-op.
  await tx`insert into prompt_history (user_id, day, seq, prompt_key) values (${userId}, ${day}::date, 1, ${key}) on conflict do nothing`;
  return (await state(tx, userId, day))!;
}

/** Swap today's prompt for another (PR-4): at most three times a day, and not once it is answered. */
export async function skipPrompt(tx: postgres.TransactionSql, userId: string, day: string): Promise<DailyPrompt> {
  const current = await getDailyPrompt(tx, userId, day);
  if (current.answeredBy) throw new DomainError(409, "already_answered");
  if (current.skipsLeft <= 0) throw new DomainError(409, "no_skips_left");
  const seq = SKIPS_PER_DAY - current.skipsLeft + 2; // the next sequence number
  if (seq > MAX_SEQ) throw new DomainError(409, "no_skips_left");
  const history = (await loadHistory(tx, userId, day)).map((r) => ({ day: r.day, key: r.prompt_key }));
  const key = choosePrompt({ userId, day, seq, history });
  // A double tap on Skip races on the same sequence number; the loser changes nothing.
  await tx`insert into prompt_history (user_id, day, seq, prompt_key) values (${userId}, ${day}::date, ${seq}, ${key}) on conflict do nothing`;
  return (await state(tx, userId, day))!;
}
