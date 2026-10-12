import type { Env } from "../index";
import { getDb } from "../db/client";
import { withSystem } from "../db/user";
import { settleReferrals } from "./service";

/** Cron: confirm referrals past the 14-day refund window and grant credits (SH-13, SH-14). Idempotent. */
export async function settleAllReferrals(env: Env): Promise<{ confirmed: number; credits: number }> {
  const sql = getDb(env);
  try {
    const result = await withSystem(sql, (tx) => settleReferrals(tx));
    if (result.confirmed > 0 || result.credits > 0) console.log("referrals-settled", result);
    return result;
  } finally {
    await sql.end();
  }
}
