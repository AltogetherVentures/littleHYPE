import type { Env } from "../index";

/**
 * Removes the person's sign-in from Clerk once their data is gone (PV-6). Called after the
 * database delete commits, so a failure here leaves a login with nothing behind it (loud in
 * the logs, and the person is told) rather than data with no owner able to delete it.
 */
export async function deleteClerkUser(env: Env, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
    });
    if (res.ok || res.status === 404) return true; // already gone is fine
    console.error("clerk-delete-failed", { userId, status: res.status });
    return false;
  } catch (err) {
    console.error("clerk-delete-failed", { userId, error: err instanceof Error ? err.message : "unknown" });
    return false;
  }
}

/** The person's primary email address, fetched from Clerk at send time so we never store it (PV). */
export async function getClerkEmail(env: Env, userId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, { headers: { authorization: `Bearer ${env.CLERK_SECRET_KEY}` } });
    if (!res.ok) {
      console.error("clerk-email-lookup-failed", { userId, status: res.status });
      return null;
    }
    const user = (await res.json()) as { primary_email_address_id?: string | null; email_addresses?: { id: string; email_address: string }[] };
    const primary = user.email_addresses?.find((e) => e.id === user.primary_email_address_id) ?? user.email_addresses?.[0];
    return primary?.email_address ?? null;
  } catch (err) {
    console.error("clerk-email-lookup-failed", { userId, error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

export interface ClerkUserSummary {
  id: string;
  email: string | null;
  name: string | null;
}

const summarise = (u: { id: string; primary_email_address_id?: string | null; email_addresses?: { id: string; email_address: string }[]; first_name?: string | null; last_name?: string | null }): ClerkUserSummary => ({
  id: u.id,
  email: (u.email_addresses?.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses?.[0])?.email_address ?? null,
  name: [u.first_name, u.last_name].filter(Boolean).join(" ") || null,
});

/** Finds sign-ins by email or name for the admin tool. Returns null if Clerk could not be asked. */
export async function searchClerkUsers(env: Env, query: string): Promise<ClerkUserSummary[] | null> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users?limit=10&query=${encodeURIComponent(query)}`, { headers: { authorization: `Bearer ${env.CLERK_SECRET_KEY}` } });
    if (!res.ok) {
      console.error("clerk-search-failed", { status: res.status });
      return null;
    }
    return ((await res.json()) as Parameters<typeof summarise>[0][]).map(summarise);
  } catch (err) {
    console.error("clerk-search-failed", { error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

export async function getClerkUser(env: Env, userId: string): Promise<ClerkUserSummary | null> {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, { headers: { authorization: `Bearer ${env.CLERK_SECRET_KEY}` } });
    return res.ok ? summarise((await res.json()) as Parameters<typeof summarise>[0]) : null;
  } catch {
    return null;
  }
}
