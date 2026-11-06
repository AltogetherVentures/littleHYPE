import type { Env } from "../index";
import { getClerkEmail } from "../auth/clerk-admin";
import { getDb } from "../db/client";
import { withSystem } from "../db/user";
import { emailConfig, sendViaResend } from "./resend";
import { renderReminder } from "./render";
import { signUnsubscribe } from "./token";

export interface ReminderRun {
  enabled: boolean;
  due: number;
  sent: number;
  failed: number;
}

/**
 * Sends today's reminders (RM-1, RM-2), called by the cron trigger every 15 minutes.
 * Off unless the email secrets exist, and it says so in the logs rather than pretending.
 * A slot is claimed in the database before sending, so overlapping runs cannot double-send;
 * if sending fails the slot is released and the next run tries again.
 */
export async function runReminders(env: Env, now: Date = new Date()): Promise<ReminderRun> {
  const config = emailConfig(env);
  if (!config) {
    console.warn("reminders-disabled: set RESEND_API_KEY, RESEND_FROM and EMAIL_TOKEN_SECRET to turn reminder emails on");
    return { enabled: false, due: 0, sent: 0, failed: 0 };
  }

  const sql = getDb(env);
  const run: ReminderRun = { enabled: true, due: 0, sent: 0, failed: 0 };
  try {
    const due = await withSystem(sql, (tx) => tx<{ user_id: string; theme: string; local_day: string }[]>`select user_id, theme, local_day::text as local_day from reminder_candidates(${now.toISOString()}::timestamptz)`);
    run.due = due.length;

    for (const person of due) {
      const claimed = await withSystem(sql, async (tx) => (await tx<{ ok: boolean }[]>`select claim_reminder(${person.user_id}, ${person.local_day}::date) as ok`)[0]?.ok === true);
      if (!claimed) continue;
      const release = () => withSystem(sql, (tx) => tx`select release_reminder(${person.user_id}, ${person.local_day}::date)`);

      const address = await getClerkEmail(env, person.user_id);
      const token = await signUnsubscribe(config.tokenSecret, person.user_id);
      const query = `u=${encodeURIComponent(person.user_id)}&t=${token}`;
      const email = renderReminder({ theme: person.theme, openUrl: `${env.PUBLIC_BASE_URL}/${person.theme}/today`, unsubscribeUrl: `${env.PUBLIC_BASE_URL}/unsubscribe?${query}` });
      if (!address || !email) {
        console.error("reminder-skipped", { userId: person.user_id, reason: !address ? "no-email-address" : "no-theme-content" });
        await release();
        run.failed++;
        continue;
      }
      const ok = await sendViaResend(
        config,
        { to: address, ...email, headers: { "List-Unsubscribe": `<${env.PUBLIC_BASE_URL}/api/unsubscribe?${query}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } },
        `reminder-${person.user_id}-${person.local_day}`,
      );
      if (ok) run.sent++;
      else {
        await release();
        run.failed++;
      }
    }
  } finally {
    await sql.end();
  }
  console.log("reminders-run", run);
  return run;
}
