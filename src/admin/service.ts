import type postgres from "postgres";
import { DomainError } from "../profile/service";

export interface AdminSummary {
  userId: string;
  theme: string | null;
  timezone: string;
  createdAt: string;
  onboarded: boolean;
  purchase: { status: string; amount: number; currency: string; paidAt: string; paymentIntent: string | null; refundEligible: boolean } | null;
}

const REFUND_WINDOW_MS = 14 * 86_400_000;

/** An account at a glance: profile and purchase only. Never habits, check-ins or journal text (PV-3). */
export async function adminSummary(tx: postgres.TransactionSql, target: string, now: Date = new Date()): Promise<AdminSummary | null> {
  const [row] = await tx<{ user_id: string; theme: string | null; timezone: string; created_at: Date; onboarded: boolean; purchase_status: string | null; amount: number | null; currency: string | null; paid_at: Date | null; payment_intent: string | null }[]>`
    select * from admin_user_summary(${target})`;
  if (!row) return null;
  return {
    userId: row.user_id,
    theme: row.theme,
    timezone: row.timezone,
    createdAt: row.created_at.toISOString(),
    onboarded: row.onboarded,
    purchase: row.purchase_status
      ? {
          status: row.purchase_status,
          amount: row.amount!,
          currency: row.currency!,
          paidAt: row.paid_at!.toISOString(),
          paymentIntent: row.payment_intent,
          refundEligible: row.purchase_status === "paid" && now.getTime() - row.paid_at!.getTime() <= REFUND_WINDOW_MS,
        }
      : null,
  };
}

export async function adminThemeHistory(tx: postgres.TransactionSql, target: string) {
  const rows = await tx<{ old_theme: string | null; new_theme: string; changed_by: string; changed_at: Date }[]>`select * from admin_theme_history(${target})`;
  return rows.map((r) => ({ from: r.old_theme, to: r.new_theme, by: r.changed_by, at: r.changed_at.toISOString() }));
}

export async function adminRecentActions(tx: postgres.TransactionSql, limit = 20) {
  const rows = await tx<{ id: string; admin_id: string; action: string; target_user_id: string; detail: Record<string, unknown>; at: Date }[]>`
    select id::text, admin_id, action, target_user_id, detail, at from admin_actions order by at desc, id desc limit ${limit}`;
  return rows.map((r) => ({ id: r.id, admin: r.admin_id, action: r.action, target: r.target_user_id, detail: r.detail, at: r.at.toISOString() }));
}

export async function adminDeleteAccount(tx: postgres.TransactionSql, target: string, detail: Record<string, unknown>): Promise<void> {
  const [row] = await tx<{ ok: boolean }[]>`select admin_delete_account(${target}, ${tx.json(detail as never)}) as ok`;
  if (!row?.ok) throw new DomainError(404, "user_not_found");
}
