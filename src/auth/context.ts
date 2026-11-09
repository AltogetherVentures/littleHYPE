import type { Env } from "../index";
import { verifyRequest, type AuthClaims } from "./supabase";

export class AuthError extends Error {
  constructor(
    readonly status: 401 | 403,
    readonly code: string,
  ) {
    super(code);
  }
}

/** Requires a signed-in user, or throws a 401 AuthError. */
export async function requireAuth(env: Env, request: Request): Promise<AuthClaims> {
  const claims = await verifyRequest(env, request);
  if (!claims) throw new AuthError(401, "unauthenticated");
  return claims;
}

/** Requires a signed-in admin, or throws 401 / 403. */
export async function requireAdmin(env: Env, request: Request): Promise<AuthClaims> {
  const claims = await requireAuth(env, request);
  if (!claims.isAdmin) throw new AuthError(403, "admin_required");
  return claims;
}
