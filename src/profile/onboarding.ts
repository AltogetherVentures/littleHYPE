import type postgres from "postgres";
import { createHabit, getUserToday } from "../habits/service";
import { parseCategory, parseName, parseSchedule } from "../habits/validation";
import { DomainError, isValidTimezone, parseReminderTime, setReminderTime, setTimezone } from "./service";

/**
 * The end of first-run (ON-4 to ON-6): an optional first habit, an optional reminder time,
 * and the flag that stops the welcome screen appearing again. Skipping everything is fine;
 * it still completes. Calling it again does nothing, so a double tap never makes two habits.
 */
export async function completeOnboarding(tx: postgres.TransactionSql, userId: string, body: Record<string, unknown>): Promise<{ onboarded: true; habitId: string | null }> {
  const [row] = await tx<{ theme: string | null; onboarded: boolean }[]>`select theme, onboarded_at is not null as onboarded from profiles where user_id = ${userId} for update`;
  if (!row) throw new DomainError(404, "profile_not_found");
  if (!row.theme) throw new DomainError(409, "theme_required");
  if (row.onboarded) return { onboarded: true, habitId: null };

  // Validate everything before writing anything.
  const reminder = "reminderTime" in body ? parseReminderTime(body.reminderTime) : undefined;
  if (body.timezone !== undefined && !isValidTimezone(body.timezone)) throw new DomainError(400, "invalid_timezone");
  let habit: { name: string; category: ReturnType<typeof parseCategory>; schedule: ReturnType<typeof parseSchedule> } | null = null;
  if (body.habit !== undefined && body.habit !== null) {
    const h = body.habit as Record<string, unknown>;
    if (typeof h !== "object") throw new DomainError(400, "invalid_habit");
    habit = { name: parseName(h.name), category: parseCategory(h.category), schedule: parseSchedule(h.schedule ?? { type: "daily" }) };
  }

  if (body.timezone !== undefined) await setTimezone(tx, userId, body.timezone as string);
  if (reminder !== undefined) await setReminderTime(tx, userId, reminder);
  let habitId: string | null = null;
  if (habit) habitId = await createHabit(tx, userId, { ...habit, description: null }, await getUserToday(tx, userId));
  await tx`update profiles set onboarded_at = now() where user_id = ${userId}`;
  return { onboarded: true, habitId };
}
