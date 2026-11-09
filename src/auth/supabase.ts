import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Env } from "../index";

export interface AuthClaims {
  userId: string;
  /** True only when the verified token carries app_metadata.role === "admin" (server-set, never user-editable). */
  isAdmin: boolean;
  /** The signed-in email, from the token. Used for checkout prefill; never stored. */
  email: string | null;
}

/** The cookie the SPA mirrors its access token into, so page navigations can be themed before first paint. */
export const SESSION_COOKIE = "lh_session";

/** One cached JWKS per Supabase project per isolate. */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(url: string) {
  let set = jwksCache.get(url);
  if (!set) {
    set = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`), { cooldownDuration: 30_000, cacheMaxAge: 600_000 });
    jwksCache.set(url, set);
  }
  return set;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim() || null;
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join("=")) || null;
  }
  return null;
}

/**
 * Verifies the Supabase Auth access token on a request: the Bearer token the SPA attaches
 * to API calls, or the session cookie on a browser page navigation. Tokens are checked
 * against the project's JWKS (asymmetric signing keys, the recommended setup), or against
 * SUPABASE_JWT_SECRET when a project still signs with the legacy shared secret. Either
 * way there is no round trip to Supabase per request once the keys are cached.
 *
 * Returns null for anything short of a valid, unexpired token for this project.
 */
export async function verifyRequest(env: Env, request: Request): Promise<AuthClaims | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const options = { issuer: `${env.SUPABASE_URL}/auth/v1`, audience: "authenticated" };
  let payload: JWTPayload;
  try {
    if (env.SUPABASE_JWT_SECRET) {
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(env.SUPABASE_JWT_SECRET), { ...options, algorithms: ["HS256"] }));
    } else {
      ({ payload } = await jwtVerify(token, jwksFor(env.SUPABASE_URL), { ...options, algorithms: ["ES256", "RS256"] }));
    }
  } catch {
    return null;
  }
  if (typeof payload.sub !== "string" || !payload.sub) return null;
  const app = payload["app_metadata"] as { role?: unknown } | undefined;
  const email = typeof payload["email"] === "string" ? payload["email"] : null;
  return { userId: payload.sub, isAdmin: app?.role === "admin", email };
}
