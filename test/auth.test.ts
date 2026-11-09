import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/index";
import { SESSION_COOKIE, verifyRequest } from "../src/auth/supabase";

/**
 * Token verification against a Supabase project: the JWKS path (asymmetric signing keys)
 * and the legacy shared-secret path, the cookie fallback for page navigations, and the
 * admin flag coming only from server-set app_metadata.
 */
const ISSUER_URL = "https://unit.supabase.co";
const env = (over: Partial<Env> = {}) => ({ SUPABASE_URL: ISSUER_URL, ...over }) as Env;
const req = (headers: Record<string, string>) => new Request("https://app.test/api/me", { headers });

let privateKey: CryptoKey;
let jwks: { keys: unknown[] };

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey as CryptoKey;
  const jwk = await exportJWK(pair.publicKey);
  jwks = { keys: [{ ...jwk, kid: "k1", alg: "ES256", use: "sig" }] };
});
afterEach(() => vi.unstubAllGlobals());

function sign(claims: Record<string, unknown>, opts: { sub?: string; iss?: string; exp?: string } = {}) {
  return new SignJWT({ aud: "authenticated", ...claims })
    .setProtectedHeader({ alg: "ES256", kid: "k1" })
    .setIssuer(opts.iss ?? `${ISSUER_URL}/auth/v1`)
    .setSubject(opts.sub ?? "11111111-2222-4333-8444-555555555555")
    .setExpirationTime(opts.exp ?? "1h")
    .sign(privateKey);
}

function serveJwks() {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    expect(String(url instanceof Request ? url.url : url)).toBe(`${ISSUER_URL}/auth/v1/.well-known/jwks.json`);
    return Response.json(jwks);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("verifyRequest (Supabase Auth)", () => {
  it("accepts a token signed by the project's JWKS, reading the user, email and admin role", async () => {
    serveJwks();
    const token = await sign({ email: "a@mail.test", app_metadata: { role: "admin" } });
    expect(await verifyRequest(env(), req({ authorization: `Bearer ${token}` }))).toEqual({ userId: "11111111-2222-4333-8444-555555555555", isAdmin: true, email: "a@mail.test" });
  });

  it("never takes the admin role from user_metadata, which the person can edit", async () => {
    serveJwks();
    const token = await sign({ user_metadata: { role: "admin" }, app_metadata: {} });
    expect(await verifyRequest(env(), req({ authorization: `Bearer ${token}` }))).toMatchObject({ isAdmin: false, email: null });
  });

  it("reads the session cookie on a page navigation", async () => {
    serveJwks();
    const token = await sign({});
    expect(await verifyRequest(env(), req({ cookie: `other=1; ${SESSION_COOKIE}=${encodeURIComponent(token)}` }))).toMatchObject({ userId: "11111111-2222-4333-8444-555555555555" });
  });

  it("rejects a missing, malformed, expired or foreign token", async () => {
    serveJwks();
    expect(await verifyRequest(env(), req({}))).toBeNull();
    expect(await verifyRequest(env(), req({ authorization: "Bearer not.a.jwt" }))).toBeNull();
    expect(await verifyRequest(env(), req({ authorization: `Bearer ${await sign({}, { exp: "-1m" })}` }))).toBeNull();
    expect(await verifyRequest(env(), req({ authorization: `Bearer ${await sign({}, { iss: "https://other.supabase.co/auth/v1" })}` }))).toBeNull();
  });

  it("verifies with the shared secret instead when SUPABASE_JWT_SECRET is set (legacy HS256 projects)", async () => {
    const secret = "unit-test-secret-at-least-32-characters-long";
    const key = new TextEncoder().encode(secret);
    const token = await new SignJWT({ aud: "authenticated", app_metadata: {} }).setProtectedHeader({ alg: "HS256" }).setIssuer(`${ISSUER_URL}/auth/v1`).setSubject("u2").setExpirationTime("1h").sign(key);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await verifyRequest(env({ SUPABASE_JWT_SECRET: secret }), req({ authorization: `Bearer ${token}` }))).toEqual({ userId: "u2", isAdmin: false, email: null });
    expect(fetchMock).not.toHaveBeenCalled();
    // and a token signed with the wrong secret is refused
    const wrong = await new SignJWT({ aud: "authenticated" }).setProtectedHeader({ alg: "HS256" }).setIssuer(`${ISSUER_URL}/auth/v1`).setSubject("u2").setExpirationTime("1h").sign(new TextEncoder().encode("x".repeat(40)));
    expect(await verifyRequest(env({ SUPABASE_JWT_SECRET: secret }), req({ authorization: `Bearer ${wrong}` }))).toBeNull();
  });
});
