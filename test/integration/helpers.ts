import { randomUUID } from "node:crypto";
import postgres from "postgres";

/** Fails loudly. A silently skipped isolation test is worse than a red one. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to run the integration tests (see docs/setup.md, "Local development").`);
  }
  return value;
}

export const superUser = () => postgres(requireEnv("PG_SUPERUSER_URL"), { max: 1, onnotice: () => {} });
export const appUser = () => postgres(requireEnv("PG_APP_URL"), { max: 2, fetch_types: false, onnotice: () => {} });

export interface SeededUser {
  userId: string;
}

/** Creates a profile (and optionally a paid purchase) as superuser, the way the webhook slice will. */
export async function seedUser(
  sup: postgres.Sql,
  opts: { paid?: boolean; refunded?: boolean; theme?: string } = {},
): Promise<SeededUser> {
  const userId = `user_${randomUUID()}`;
  await sup`insert into profiles (user_id, theme) values (${userId}, ${opts.theme ?? null})`;
  if (opts.paid || opts.refunded) {
    await sup`
      insert into purchases (user_id, stripe_session_id, amount, currency, status)
      values (${userId}, ${`cs_${randomUUID()}`}, 4900, 'usd', ${opts.refunded ? "refunded" : "paid"})`;
  }
  return { userId };
}

export async function deleteUsers(sup: postgres.Sql, userIds: string[]) {
  if (userIds.length) await sup`delete from profiles where user_id = any(${userIds})`;
}
