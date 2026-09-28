import type postgres from "postgres";
import { isThemeSlug } from "../../themes/registry";

export interface MeState {
  userId: string;
  theme: string | null;
  timezone: string;
  paid: boolean;
}

export class DomainError extends Error {
  constructor(
    readonly status: 400 | 402 | 403 | 404 | 409,
    readonly code: string,
  ) {
    super(code);
  }
}

/** Creates the profile on first sight (idempotent) and returns the user's state. */
export async function getOrCreateMe(tx: postgres.TransactionSql, userId: string): Promise<MeState> {
  await tx`insert into profiles (user_id) values (${userId}) on conflict (user_id) do nothing`;
  const [row] = await tx<{ theme: string | null; timezone: string; paid: boolean }[]>`
    select p.theme, p.timezone,
           exists (select 1 from purchases x where x.user_id = p.user_id and x.status = 'paid') as paid
      from profiles p
     where p.user_id = ${userId}`;
  if (!row) throw new DomainError(404, "profile_not_found");
  return { userId, theme: row.theme, timezone: row.timezone, paid: row.paid };
}

/** Just the saved theme, without creating a profile (used by page navigations). */
export async function getSavedTheme(tx: postgres.TransactionSql, userId: string): Promise<string | null> {
  const [row] = await tx<{ theme: string | null }[]>`select theme from profiles where user_id = ${userId}`;
  return row?.theme ?? null;
}

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function setTimezone(tx: postgres.TransactionSql, userId: string, timezone: string): Promise<void> {
  if (!isValidTimezone(timezone)) throw new DomainError(400, "invalid_timezone");
  await tx`update profiles set timezone = ${timezone} where user_id = ${userId}`;
}

/** Maps the SQL functions' RAISE EXCEPTION messages to HTTP-shaped errors. */
function mapThemeError(err: unknown): never {
  const message = err instanceof Error ? err.message : "";
  switch (message) {
    case "payment_required":
      throw new DomainError(402, "payment_required");
    case "theme_already_chosen":
      throw new DomainError(409, "theme_already_chosen");
    case "invalid_theme":
      throw new DomainError(400, "invalid_theme");
    case "admin_required":
      throw new DomainError(403, "admin_required");
    case "user_not_found":
    case "profile_not_found":
      throw new DomainError(404, message);
    default:
      throw err;
  }
}

/** One-time theme pick at onboarding (TH-1). The database enforces payment and write-once. */
export async function chooseOnboardingTheme(tx: postgres.TransactionSql, theme: unknown): Promise<string> {
  if (!isThemeSlug(theme)) throw new DomainError(400, "invalid_theme");
  try {
    const [row] = await tx<{ set_onboarding_theme: string }[]>`select set_onboarding_theme(${theme})`;
    return row!.set_onboarding_theme;
  } catch (err) {
    return mapThemeError(err);
  }
}

/** Admin theme change (TH-3). The database refuses unless the request is an admin's. */
export async function adminSetTheme(tx: postgres.TransactionSql, targetUserId: string, theme: unknown): Promise<string> {
  if (!isThemeSlug(theme)) throw new DomainError(400, "invalid_theme");
  try {
    const [row] = await tx<{ admin_set_theme: string }[]>`select admin_set_theme(${targetUserId}, ${theme})`;
    return row!.admin_set_theme;
  } catch (err) {
    return mapThemeError(err);
  }
}
