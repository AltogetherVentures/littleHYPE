import { createClerkClient } from "@clerk/backend";
import type { Env } from "../index";

export interface AuthClaims {
  userId: string;
  /** True only when the verified Clerk token carries metadata.role === "admin". */
  isAdmin: boolean;
}

/**
 * Verifies the session on a request: the Bearer token the SPA attaches to API
 * calls, or the `__session` cookie on a browser page navigation. Networkless via
 * CLERK_JWT_KEY, so there is no per-request round trip to Clerk. Returns null
 * for anything short of a fully signed-in session.
 *
 * The admin flag needs the session token customised in the Clerk dashboard
 * (Sessions -> Customize session token) to include
 *   { "metadata": "{{user.public_metadata}}" }
 * and the user's public metadata to contain { "role": "admin" }. See
 * docs/setup.md.
 */
export async function verifyClerkRequest(env: Env, request: Request): Promise<AuthClaims | null> {
  const clerk = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    jwtKey: env.CLERK_JWT_KEY,
  });

  const state = await clerk.authenticateRequest(request, {
    authorizedParties: [env.PUBLIC_BASE_URL],
    acceptsToken: "session_token",
  });
  const auth = state.toAuth();
  if (!auth?.isAuthenticated) return null;

  const metadata = auth.sessionClaims?.metadata as { role?: unknown } | undefined;
  return { userId: auth.userId, isAdmin: metadata?.role === "admin" };
}
