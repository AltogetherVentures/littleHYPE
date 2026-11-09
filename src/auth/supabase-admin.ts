import type { Env } from "../index";

/**
 * The Supabase Auth admin API, called with the service-role key (a Worker secret, never
 * sent to the browser). Used only for what the app cannot do from a user's own session:
 * removing a sign-in after an account is deleted, reading an email address at send time,
 * and the admin tool's directory search.
 */
function adminHeaders(env: Env): HeadersInit {
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" };
}

const usersUrl = (env: Env, path = "") => `${env.SUPABASE_URL}/auth/v1/admin/users${path}`;

interface AuthUser {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: unknown; name?: unknown } | null;
}

export interface AuthUserSummary {
  id: string;
  email: string | null;
  name: string | null;
}

const summarise = (u: AuthUser): AuthUserSummary => {
  const meta = u.user_metadata ?? {};
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;
  return { id: u.id, email: u.email ?? null, name: name || null };
};

/**
 * Removes the person's sign-in once their data is gone (PV-6). Called after the database
 * delete commits, so a failure here leaves a login with nothing behind it (loud in the logs,
 * and the person is told) rather than data with no owner able to delete it.
 */
export async function deleteAuthUser(env: Env, userId: string): Promise<boolean> {
  try {
    const res = await fetch(usersUrl(env, `/${encodeURIComponent(userId)}`), { method: "DELETE", headers: adminHeaders(env) });
    if (res.ok || res.status === 404) return true; // already gone is fine
    console.error("signin-delete-failed", { userId, status: res.status });
    return false;
  } catch (err) {
    console.error("signin-delete-failed", { userId, error: err instanceof Error ? err.message : "unknown" });
    return false;
  }
}

export async function getAuthUser(env: Env, userId: string): Promise<AuthUserSummary | null> {
  try {
    const res = await fetch(usersUrl(env, `/${encodeURIComponent(userId)}`), { headers: adminHeaders(env) });
    if (!res.ok) {
      console.error("signin-lookup-failed", { userId, status: res.status });
      return null;
    }
    return summarise((await res.json()) as AuthUser);
  } catch (err) {
    console.error("signin-lookup-failed", { userId, error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

/** The person's email address, fetched at send time so we never store it (PV). */
export async function getAuthUserEmail(env: Env, userId: string): Promise<string | null> {
  return (await getAuthUser(env, userId))?.email ?? null;
}

/** Finds sign-ins by email for the admin tool. Returns null if the directory could not be asked. */
export async function searchAuthUsers(env: Env, query: string): Promise<AuthUserSummary[] | null> {
  try {
    const res = await fetch(usersUrl(env, `?page=1&per_page=10&filter=${encodeURIComponent(query)}`), { headers: adminHeaders(env) });
    if (!res.ok) {
      console.error("signin-search-failed", { status: res.status });
      return null;
    }
    const body = (await res.json()) as { users?: AuthUser[] };
    return (body.users ?? []).map(summarise);
  } catch (err) {
    console.error("signin-search-failed", { error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}
