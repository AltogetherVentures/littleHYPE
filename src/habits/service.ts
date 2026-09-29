import type postgres from "postgres";
import { nextMonday, isDateString, todayIn } from "../../shared/dates";
import type { HabitCategory } from "../../shared/categories";
import {
  analyseHabit,
  completionGrid,
  nearestMilestone,
  todayStatus,
  type GridCell,
  type HabitAnalysis,
  type HabitLog,
  type LogStatus,
  type Schedule,
  type ScheduleVersion,
  type TodayStatus,
} from "../../shared/streaks";
import { writtenOn } from "../journal/service";
import { DomainError } from "../profile/service";

export interface HabitView {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  archivedAt: string | null;
  createdAt: string;
  /** The schedule in force today. */
  schedule: Schedule;
  /** A schedule that starts later (a weekly change waits for the next Monday), if any. */
  pendingSchedule: { effectiveFrom: string; schedule: Schedule } | null;
  streak: Pick<HabitAnalysis, "current" | "longest" | "unit" | "currentDays" | "longestDays">;
  today: TodayStatus;
}

interface HabitRow {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  archived_at: Date | null;
  created_at: Date;
}

export async function getUserToday(tx: postgres.TransactionSql, userId: string, now: Date = new Date()): Promise<string> {
  const [row] = await tx<{ timezone: string }[]>`select timezone from profiles where user_id = ${userId}`;
  return todayIn(row?.timezone ?? "UTC", now);
}

interface Loaded {
  rows: HabitRow[];
  versions: Map<string, ScheduleVersion[]>;
  logs: Map<string, HabitLog[]>;
}

async function load(tx: postgres.TransactionSql, userId: string, habitId?: string): Promise<Loaded> {
  const rows = await tx<HabitRow[]>`
    select id, name, description, category, archived_at, created_at from habits
     where user_id = ${userId} ${habitId ? tx`and id = ${habitId}` : tx``}
     order by created_at, id`;
  const versionRows = await tx<{ habit_id: string; effective_from: string; schedule: Schedule }[]>`
    select habit_id, effective_from::text as effective_from, schedule from habit_schedule_versions
     where user_id = ${userId} ${habitId ? tx`and habit_id = ${habitId}` : tx``}
     order by effective_from`;
  const logRows = await tx<{ habit_id: string; log_date: string; status: LogStatus }[]>`
    select habit_id, log_date::text as log_date, status from habit_logs
     where user_id = ${userId} ${habitId ? tx`and habit_id = ${habitId}` : tx``}
     order by log_date`;
  const versions = new Map<string, ScheduleVersion[]>();
  for (const v of versionRows) (versions.get(v.habit_id) ?? versions.set(v.habit_id, []).get(v.habit_id)!).push({ effectiveFrom: v.effective_from, schedule: v.schedule });
  const logs = new Map<string, HabitLog[]>();
  for (const l of logRows) (logs.get(l.habit_id) ?? logs.set(l.habit_id, []).get(l.habit_id)!).push({ date: l.log_date, status: l.status });
  return { rows, versions, logs };
}

function currentSchedule(versions: ScheduleVersion[], today: string): { current: Schedule; pending: HabitView["pendingSchedule"] } {
  const sorted = [...versions].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  let current = sorted[0]!;
  let pending: HabitView["pendingSchedule"] = null;
  for (const v of sorted) {
    if (v.effectiveFrom <= today) current = v;
    else if (!pending) pending = { effectiveFrom: v.effectiveFrom, schedule: v.schedule };
  }
  return { current: current.schedule, pending };
}

function toView(row: HabitRow, versions: ScheduleVersion[], logs: HabitLog[], today: string): HabitView {
  const input = { versions, logs, today };
  const analysis = analyseHabit(input);
  const { current, pending } = currentSchedule(versions, today);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    archivedAt: row.archived_at ? row.archived_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    schedule: current,
    pendingSchedule: pending,
    streak: { current: analysis.current, longest: analysis.longest, unit: analysis.unit, currentDays: analysis.currentDays, longestDays: analysis.longestDays },
    today: todayStatus(input),
  };
}

export async function listHabits(tx: postgres.TransactionSql, userId: string, today: string): Promise<HabitView[]> {
  const { rows, versions, logs } = await load(tx, userId);
  return rows.map((r) => toView(r, versions.get(r.id) ?? [], logs.get(r.id) ?? [], today));
}

export async function getHabit(tx: postgres.TransactionSql, userId: string, habitId: string, today: string): Promise<HabitView> {
  const { rows, versions, logs } = await load(tx, userId, habitId);
  const row = rows[0];
  if (!row) throw new DomainError(404, "habit_not_found");
  return toView(row, versions.get(row.id) ?? [], logs.get(row.id) ?? [], today);
}

function mapHabitError(err: unknown): never {
  if (err instanceof Error && err.message === "habit_limit_reached") throw new DomainError(409, "habit_limit_reached");
  throw err;
}

export interface NewHabit {
  name: string;
  description: string | null;
  category: HabitCategory;
  schedule: Schedule;
}

export async function createHabit(tx: postgres.TransactionSql, userId: string, input: NewHabit, today: string): Promise<string> {
  try {
    const [row] = await tx<{ id: string }[]>`
      insert into habits (user_id, name, description, category)
      values (${userId}, ${input.name}, ${input.description}, ${input.category})
      returning id`;
    await tx`
      insert into habit_schedule_versions (habit_id, user_id, effective_from, schedule)
      values (${row!.id}, ${userId}, ${today}::date, ${tx.json(input.schedule as never)})`;
    return row!.id;
  } catch (err) {
    return mapHabitError(err);
  }
}

export async function updateHabit(
  tx: postgres.TransactionSql,
  userId: string,
  habitId: string,
  changes: { name?: string; description?: string | null; category?: HabitCategory },
): Promise<void> {
  const [existing] = await tx<{ name: string; description: string | null; category: string }[]>`
    select name, description, category from habits where id = ${habitId} and user_id = ${userId}`;
  if (!existing) throw new DomainError(404, "habit_not_found");
  await tx`
    update habits set
      name = ${changes.name ?? existing.name},
      description = ${changes.description === undefined ? existing.description : changes.description},
      category = ${changes.category ?? existing.category}
    where id = ${habitId} and user_id = ${userId}`;
}

/**
 * Edits a schedule going forward only (HB-7). A change to or from a weekly schedule
 * starts on the next Monday, so a week never mixes two kinds of schedule; anything
 * else starts today. Editing again before a pending change starts replaces it.
 */
export async function setSchedule(tx: postgres.TransactionSql, userId: string, habitId: string, schedule: Schedule, today: string): Promise<string> {
  const { rows, versions } = await load(tx, userId, habitId);
  if (!rows[0]) throw new DomainError(404, "habit_not_found");
  const { current } = currentSchedule(versions.get(habitId) ?? [], today);
  const involvesWeekly = current.type === "weekly" || schedule.type === "weekly";
  const effectiveFrom = involvesWeekly ? nextMonday(today) : today;
  await tx`
    insert into habit_schedule_versions (habit_id, user_id, effective_from, schedule)
    values (${habitId}, ${userId}, ${effectiveFrom}::date, ${tx.json(schedule as never)})
    on conflict (habit_id, effective_from) do update set schedule = excluded.schedule`;
  // A pending change replaced by a same-type edit today would leave a stale future row; drop later versions.
  await tx`delete from habit_schedule_versions where habit_id = ${habitId} and user_id = ${userId} and effective_from > ${effectiveFrom}::date`;
  return effectiveFrom;
}

export async function archiveHabit(tx: postgres.TransactionSql, userId: string, habitId: string): Promise<void> {
  const r = await tx`update habits set archived_at = now() where id = ${habitId} and user_id = ${userId} and archived_at is null`;
  if (r.count === 0) throw new DomainError(404, "habit_not_found");
}

export async function restoreHabit(tx: postgres.TransactionSql, userId: string, habitId: string): Promise<void> {
  try {
    const r = await tx`update habits set archived_at = null where id = ${habitId} and user_id = ${userId} and archived_at is not null`;
    if (r.count === 0) throw new DomainError(404, "habit_not_found");
  } catch (err) {
    mapHabitError(err);
  }
}

/** Hard delete removes the habit and all its history; the route requires explicit confirmation (HB-6). */
export async function deleteHabit(tx: postgres.TransactionSql, userId: string, habitId: string): Promise<void> {
  const r = await tx`delete from habits where id = ${habitId} and user_id = ${userId}`;
  if (r.count === 0) throw new DomainError(404, "habit_not_found");
}

const EARLIEST_LOG = "2000-01-01";

export async function setLog(tx: postgres.TransactionSql, userId: string, habitId: string, date: string, status: LogStatus, today: string): Promise<void> {
  if (!isDateString(date) || date < EARLIEST_LOG) throw new DomainError(400, "invalid_date");
  if (date > today) throw new DomainError(400, "future_date");
  if (status !== "done" && status !== "skipped") throw new DomainError(400, "invalid_status");
  const [habit] = await tx<{ archived_at: Date | null }[]>`select archived_at from habits where id = ${habitId} and user_id = ${userId}`;
  if (!habit) throw new DomainError(404, "habit_not_found");
  if (habit.archived_at) throw new DomainError(409, "habit_archived");
  await tx`
    insert into habit_logs (habit_id, user_id, log_date, status)
    values (${habitId}, ${userId}, ${date}::date, ${status})
    on conflict (habit_id, log_date) do update set status = excluded.status, updated_at = now()`;
}

export async function removeLog(tx: postgres.TransactionSql, userId: string, habitId: string, date: string): Promise<void> {
  if (!isDateString(date)) throw new DomainError(400, "invalid_date");
  const [habit] = await tx`select 1 from habits where id = ${habitId} and user_id = ${userId}`;
  if (!habit) throw new DomainError(404, "habit_not_found");
  await tx`delete from habit_logs where habit_id = ${habitId} and user_id = ${userId} and log_date = ${date}::date`;
}

export interface HabitHistory {
  habit: HabitView;
  grid: GridCell[][];
  breaks: HabitAnalysis["breaks"];
  versions: ScheduleVersion[];
}

export async function habitHistory(tx: postgres.TransactionSql, userId: string, habitId: string, today: string, weeks = 12): Promise<HabitHistory> {
  const { rows, versions, logs } = await load(tx, userId, habitId);
  const row = rows[0];
  if (!row) throw new DomainError(404, "habit_not_found");
  const v = versions.get(row.id) ?? [];
  const l = logs.get(row.id) ?? [];
  return {
    habit: toView(row, v, l, today),
    grid: completionGrid({ versions: v, logs: l, today }, weeks),
    breaks: analyseHabit({ versions: v, logs: l, today }).breaks,
    versions: v,
  };
}

export interface TodayPayload {
  date: string;
  habits: HabitView[];
  writtenToday: boolean;
  milestone: { milestone: number; remaining: number } | null;
}

/** Everything the Today screen needs about habits (TD-1, TD-3), for the user's local today (TD-4). */
export async function todayPayload(tx: postgres.TransactionSql, userId: string, today: string): Promise<TodayPayload> {
  const habits = (await listHabits(tx, userId, today)).filter((h) => !h.archivedAt);
  return { date: today, habits, milestone: nearestMilestone(habits.map((h) => h.streak.currentDays)), writtenToday: await writtenOn(tx, userId, today) };
}
