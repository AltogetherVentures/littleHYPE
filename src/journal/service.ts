import type postgres from "postgres";
import { DomainError } from "../profile/service";

export interface EntryView {
  id: string;
  date: string;
  body: string;
  mood: number | null;
  promptKey: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A list row: enough to recognise the entry, never the whole text. */
export interface EntrySummary {
  id: string;
  date: string;
  excerpt: string;
  mood: number | null;
  promptKey: string | null;
  updatedAt: string;
}

interface EntryRow {
  id: string;
  entry_date: string;
  body: string;
  mood: number | null;
  prompt_key: string | null;
  created_at: Date;
  updated_at: Date;
}

const EXCERPT = 160;
const COLUMNS = (tx: postgres.TransactionSql) => tx`id, entry_date::text as entry_date, body, mood, prompt_key, created_at, updated_at`;

function toView(r: EntryRow): EntryView {
  return { id: r.id, date: r.entry_date, body: r.body, mood: r.mood, promptKey: r.prompt_key, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() };
}

function toSummary(r: EntryRow): EntrySummary {
  // Line breaks are kept (one per gap) so the client can tell a heading from the text after it.
  const flat = r.body.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  return {
    id: r.id,
    date: r.entry_date,
    excerpt: flat.length > EXCERPT ? `${flat.slice(0, EXCERPT).trimEnd()}…` : flat,
    mood: r.mood,
    promptKey: r.prompt_key,
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function getEntry(tx: postgres.TransactionSql, userId: string, id: string): Promise<EntryView> {
  const [row] = await tx<EntryRow[]>`select ${COLUMNS(tx)} from journal_entries where user_id = ${userId} and id = ${id}`;
  if (!row) throw new DomainError(404, "entry_not_found");
  return toView(row);
}

export async function createEntry(
  tx: postgres.TransactionSql,
  userId: string,
  input: { date: string; body: string; mood: number | null; promptKey: string | null },
): Promise<EntryView> {
  const [row] = await tx<EntryRow[]>`
    insert into journal_entries (user_id, entry_date, body, mood, prompt_key)
    values (${userId}, ${input.date}::date, ${input.body}, ${input.mood}, ${input.promptKey})
    returning ${COLUMNS(tx)}`;
  return toView(row!);
}

export async function updateEntry(
  tx: postgres.TransactionSql,
  userId: string,
  id: string,
  patch: { body?: string; mood?: number | null },
): Promise<EntryView> {
  const [current] = await tx<EntryRow[]>`select ${COLUMNS(tx)} from journal_entries where user_id = ${userId} and id = ${id} for update`;
  if (!current) throw new DomainError(404, "entry_not_found");
  const body = patch.body ?? current.body;
  const mood = patch.mood === undefined ? current.mood : patch.mood;
  if (body === current.body && mood === current.mood) return toView(current);
  const [row] = await tx<EntryRow[]>`
    update journal_entries set body = ${body}, mood = ${mood}, updated_at = now()
     where user_id = ${userId} and id = ${id}
     returning ${COLUMNS(tx)}`;
  return toView(row!);
}

export async function deleteEntry(tx: postgres.TransactionSql, userId: string, id: string): Promise<void> {
  const rows = await tx`delete from journal_entries where user_id = ${userId} and id = ${id} returning id`;
  if (rows.length === 0) throw new DomainError(404, "entry_not_found");
}

export interface ListOptions {
  query: string | null;
  date: string | null;
  limit: number;
  offset: number;
}

/**
 * Newest first (JN-5). A search matches whole words in the entry text, stemmed
 * ("running" finds "run"); results keep the same order rather than ranking, because
 * the person is looking for something they remember writing recently or long ago.
 */
export async function listEntries(tx: postgres.TransactionSql, userId: string, opts: ListOptions): Promise<{ entries: EntrySummary[]; hasMore: boolean }> {
  const rows = await tx<EntryRow[]>`
    select ${COLUMNS(tx)} from journal_entries
     where user_id = ${userId}
       ${opts.date ? tx`and entry_date = ${opts.date}::date` : tx``}
       ${opts.query ? tx`and search @@ websearch_to_tsquery('english', ${opts.query})` : tx``}
     order by entry_date desc, created_at desc, id
     limit ${opts.limit + 1} offset ${opts.offset}`;
  return { entries: rows.slice(0, opts.limit).map(toSummary), hasMore: rows.length > opts.limit };
}

export interface CalendarDay {
  date: string;
  count: number;
  /** The mood of the latest entry that day that has one. */
  mood: number | null;
}

/** Which days of a month have entries (the journal calendar, JN-6). */
export async function calendarMonth(tx: postgres.TransactionSql, userId: string, month: string): Promise<CalendarDay[]> {
  const rows = await tx<{ d: string; count: number; mood: number | null }[]>`
    select entry_date::text as d, count(*)::int as count,
           (array_agg(mood order by created_at desc) filter (where mood is not null))[1] as mood
      from journal_entries
     where user_id = ${userId}
       and entry_date >= (${month} || '-01')::date
       and entry_date < ((${month} || '-01')::date + interval '1 month')
     group by entry_date
     order by entry_date`;
  return rows.map((r) => ({ date: r.d, count: r.count, mood: r.mood }));
}

/** Entries that hold text, for the Today screen's "written today" state (TD-2). */
export async function writtenOn(tx: postgres.TransactionSql, userId: string, date: string): Promise<boolean> {
  const [row] = await tx<{ n: number }[]>`
    select count(*)::int as n from journal_entries where user_id = ${userId} and entry_date = ${date}::date and body ~ '[^[:space:]]'`;
  return (row?.n ?? 0) > 0;
}
