import type postgres from "postgres";

interface ExportedHabit {
  id: string;
  name: string;
  description: string | null;
  category: string;
  archivedAt: string | null;
  createdAt: string;
  schedules: { effectiveFrom: string; schedule: unknown }[];
  logs: { date: string; status: string }[];
}

export interface DataExport {
  exportedAt: string;
  profile: { theme: string | null; timezone: string; reminderTime: string | null; createdAt: string };
  habits: ExportedHabit[];
  journal: { id: string; date: string; body: string; mood: number | null; promptKey: string | null; createdAt: string; updatedAt: string }[];
  achievements: { key: string; unlockedAt: string }[];
  purchases: { amount: number; currency: string; status: string; paidAt: string }[];
}

/** Everything the person has put into littleHYPE (PV-5), in a form they can keep. Only their own rows: RLS scopes every query. */
export async function buildExport(tx: postgres.TransactionSql, userId: string, now: Date = new Date()): Promise<DataExport> {
  const [profile] = await tx<{ theme: string | null; timezone: string; reminder: string | null; created_at: Date }[]>`
    select theme, timezone, to_char(reminder_time, 'HH24:MI') as reminder, created_at from profiles where user_id = ${userId}`;
  const habits = await tx<{ id: string; name: string; description: string | null; category: string; archived_at: Date | null; created_at: Date }[]>`
    select id, name, description, category, archived_at, created_at from habits where user_id = ${userId} order by created_at, id`;
  const versions = await tx<{ habit_id: string; effective_from: string; schedule: unknown }[]>`
    select habit_id, effective_from::text as effective_from, schedule from habit_schedule_versions where user_id = ${userId} order by effective_from`;
  const logs = await tx<{ habit_id: string; log_date: string; status: string }[]>`
    select habit_id, log_date::text as log_date, status from habit_logs where user_id = ${userId} order by log_date`;
  const journal = await tx<{ id: string; entry_date: string; body: string; mood: number | null; prompt_key: string | null; created_at: Date; updated_at: Date }[]>`
    select id, entry_date::text as entry_date, body, mood, prompt_key, created_at, updated_at from journal_entries where user_id = ${userId} order by entry_date, created_at, id`;
  const achievements = await tx<{ key: string; unlocked_at: Date }[]>`select key, unlocked_at from user_achievements where user_id = ${userId} order by unlocked_at, key`;
  const purchases = await tx<{ amount: number; currency: string; status: string; paid_at: Date }[]>`select amount, currency, status, paid_at from purchases where user_id = ${userId} order by paid_at`;

  return {
    exportedAt: now.toISOString(),
    profile: { theme: profile?.theme ?? null, timezone: profile?.timezone ?? "UTC", reminderTime: profile?.reminder ?? null, createdAt: (profile?.created_at ?? now).toISOString() },
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      category: h.category,
      archivedAt: h.archived_at?.toISOString() ?? null,
      createdAt: h.created_at.toISOString(),
      schedules: versions.filter((v) => v.habit_id === h.id).map((v) => ({ effectiveFrom: v.effective_from, schedule: v.schedule })),
      logs: logs.filter((l) => l.habit_id === h.id).map((l) => ({ date: l.log_date, status: l.status })),
    })),
    journal: journal.map((e) => ({ id: e.id, date: e.entry_date, body: e.body, mood: e.mood, promptKey: e.prompt_key, createdAt: e.created_at.toISOString(), updatedAt: e.updated_at.toISOString() })),
    achievements: achievements.map((a) => ({ key: a.key, unlockedAt: a.unlocked_at.toISOString() })),
    purchases: purchases.map((p) => ({ amount: p.amount, currency: p.currency, status: p.status, paidAt: p.paid_at.toISOString() })),
  };
}

/** The journal alone, as one readable Markdown document, oldest first. */
export function journalMarkdown(data: DataExport): string {
  const lines = ["# My journal", "", `Exported ${data.exportedAt.slice(0, 10)}`, ""];
  for (const e of data.journal) {
    lines.push(`## ${e.date}`, "");
    const meta = [e.mood ? `Mood: ${e.mood} of 5` : null, e.promptKey ? `Prompt: ${e.promptKey}` : null].filter(Boolean);
    if (meta.length) lines.push(`*${meta.join(" · ")}*`, "");
    lines.push(e.body.trim() || "*(empty)*", "");
  }
  if (data.journal.length === 0) lines.push("*No entries.*", "");
  return lines.join("\n");
}
