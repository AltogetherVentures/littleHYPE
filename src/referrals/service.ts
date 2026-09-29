import type postgres from "postgres";
import { REFERRALS_PER_CREDIT, REFERRAL_CODE_ALPHABET, REFERRAL_CODE_PATTERN } from "../../shared/sharing";

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => REFERRAL_CODE_ALPHABET[b % REFERRAL_CODE_ALPHABET.length]).join("");
}

/** The person's own referral code (SH-12), made the first time it is needed. */
export async function getOrCreateCode(tx: postgres.TransactionSql, userId: string): Promise<string> {
  const [existing] = await tx<{ code: string }[]>`select code from referral_codes where user_id = ${userId}`;
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const rows = await tx<{ code: string }[]>`insert into referral_codes (user_id, code) values (${userId}, ${code}) on conflict do nothing returning code`;
    if (rows[0]) return rows[0].code;
    const [again] = await tx<{ code: string }[]>`select code from referral_codes where user_id = ${userId}`;
    if (again) return again.code; // a second tab got there first
  }
  throw new Error("referral-code-collision");
}

export interface ReferralStats {
  code: string;
  /** Friends who have bought through the link, still inside their refund window. */
  pending: number;
  /** Friends whose 14-day refund window has passed: only these count towards rewards (SH-14). */
  confirmed: number;
  creditsEarned: number;
  creditsRedeemed: number;
  /** Confirmed referrals still needed for the next credit. */
  nextCreditIn: number;
}

/** Counts only; the referrer never sees who bought (their ids are not readable). SH-15. */
export async function referralStats(tx: postgres.TransactionSql, userId: string): Promise<ReferralStats> {
  const code = await getOrCreateCode(tx, userId);
  const [counts] = await tx<{ pending: number; confirmed: number }[]>`
    select count(*) filter (where purchased_at is not null and confirmed_at is null)::int as pending,
           count(*) filter (where confirmed_at is not null)::int as confirmed
      from referrals where referrer_id = ${userId}`;
  const [credits] = await tx<{ earned: number; redeemed: number }[]>`
    select count(*)::int as earned, count(*) filter (where redeemed_at is not null)::int as redeemed from referral_credits where user_id = ${userId}`;
  const confirmed = counts?.confirmed ?? 0;
  return {
    code,
    pending: counts?.pending ?? 0,
    confirmed,
    creditsEarned: credits?.earned ?? 0,
    creditsRedeemed: credits?.redeemed ?? 0,
    nextCreditIn: REFERRALS_PER_CREDIT - (confirmed % REFERRALS_PER_CREDIT),
  };
}

/** Records who referred a signed-in buyer, from the code in their cookie. True if the referral stands. */
export async function attachReferral(tx: postgres.TransactionSql, code: string | null): Promise<boolean> {
  if (!code || !REFERRAL_CODE_PATTERN.test(code)) return false;
  const [row] = await tx<{ ok: boolean }[]>`select attach_referral(${code}) as ok`;
  return row?.ok === true;
}

export async function referralLandingTheme(tx: postgres.TransactionSql, code: string): Promise<string | null> {
  const [row] = await tx<{ theme: string | null }[]>`select referral_landing(${code}) as theme`;
  return row?.theme ?? null;
}

export async function settleReferrals(tx: postgres.TransactionSql): Promise<{ confirmed: number; credits: number }> {
  const [row] = await tx<{ confirmed: number; credits: number }[]>`select * from settle_referrals()`;
  return { confirmed: row?.confirmed ?? 0, credits: row?.credits ?? 0 };
}
