import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { THEME_SLUGS } from "../../themes/registry";
import { deleteUsers, requireEnv, seedUser, superUser } from "./helpers";

// Clerk itself is not exercised here (it needs a live instance). The stub reads
// the identity from test headers and otherwise behaves like a failed
// verification, so everything downstream - routes, RLS, the SQL functions - is real.
vi.mock("../../src/auth/clerk", () => ({
  verifyClerkRequest: vi.fn(async (_env: unknown, request: Request) => {
    if (request.headers.get("x-clerk-broken")) throw new Error("clerk unreachable");
    const userId = request.headers.get("x-test-user");
    return userId ? { userId, isAdmin: request.headers.get("x-test-admin") === "1" } : null;
  }),
}));

const [themeA, themeB] = THEME_SLUGS as unknown as [string, string];
const SHELL = '<!doctype html><html lang="en"><head><title>x</title></head><body><div id="root"></div></body></html>';

const env = (): Env => ({
  ENVIRONMENT: "test",
  HYPERDRIVE: { connectionString: requireEnv("PG_APP_URL") } as Hyperdrive,
  ASSETS: {
    fetch: async (input: Request | string | URL) => {
      const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
      return url.pathname === "/" ? new Response(SHELL, { headers: { "content-type": "text/html" } }) : new Response("asset:" + url.pathname);
    },
  } as unknown as Fetcher,
  CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  CLERK_SECRET_KEY: "sk_test_abc",
  CLERK_JWT_KEY: "unused",
  PUBLIC_BASE_URL: "http://localhost",
});

const sup = superUser();
const created: string[] = [];

async function user(opts?: Parameters<typeof seedUser>[1]) {
  const u = await seedUser(sup, opts);
  created.push(u.userId);
  return u.userId;
}

function call(path: string, opts: { as?: string; admin?: boolean; method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.as) headers["x-test-user"] = opts.as;
  if (opts.admin) headers["x-test-admin"] = "1";
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    }),
    env(),
  );
}

const meOf = async (userId: string) =>
  (await (await call("/api/me", { as: userId })).json()) as { theme: string | null; timezone: string; paid: boolean };

afterAll(async () => {
  await deleteUsers(sup, created);
  await sup.end();
});

describe("public routes", () => {
  it("reports health, including the database", async () => {
    expect(await (await call("/health")).json()).toMatchObject({ ok: true });
    expect(await (await call("/health/db")).json()).toEqual({ ok: true });
  });

  it("serves the publishable key for the SPA, and no secret", async () => {
    const body = await (await call("/api/config")).json();
    expect(body).toEqual({ clerkPublishableKey: "pk_test_abc" });
  });

  it("returns a JSON 404 for unknown API paths rather than the SPA", async () => {
    const res = await call("/api/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});

describe("GET /api/me", () => {
  it("requires sign-in", async () => {
    expect((await call("/api/me")).status).toBe(401);
  });

  it("creates the profile on first sight, unpaid with no theme", async () => {
    const id = `user_new_${crypto.randomUUID()}`;
    created.push(id);
    const res = await call("/api/me", { as: id });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { createdAt: string };
    expect(body).toEqual({ userId: id, theme: null, timezone: "UTC", paid: false, isAdmin: false, createdAt: expect.any(String) });
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
    expect(await sup`select 1 from profiles where user_id = ${id}`).toHaveLength(1);
    // idempotent
    expect((await call("/api/me", { as: id })).status).toBe(200);
  });

  it("reports paid once a purchase exists, and surfaces the admin flag", async () => {
    const id = await user({ paid: true });
    expect(await (await call("/api/me", { as: id, admin: true })).json()).toMatchObject({ paid: true, isAdmin: true });
  });
});

describe("POST /api/onboarding/theme", () => {
  it("requires sign-in", async () => {
    expect((await call("/api/onboarding/theme", { method: "POST", body: { theme: themeA } })).status).toBe(401);
  });

  it("returns 402 for an unpaid account and leaves the theme unset", async () => {
    const id = await user();
    const res = await call("/api/onboarding/theme", { as: id, method: "POST", body: { theme: themeA } });
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "payment_required" });
    expect((await meOf(id)).theme).toBeNull();
  });

  it("rejects a well-formed but unregistered theme, and bad bodies", async () => {
    const id = await user({ paid: true });
    expect((await call("/api/onboarding/theme", { as: id, method: "POST", body: { theme: "nosuchtheme" } })).status).toBe(400);
    expect((await call("/api/onboarding/theme", { as: id, method: "POST", body: { theme: 7 } })).status).toBe(400);
    expect((await call("/api/onboarding/theme", { as: id, method: "POST", body: [] })).status).toBe(400);
    expect((await meOf(id)).theme).toBeNull();
  });

  it("locks the chosen theme: the second attempt is a 409 and nothing changes", async () => {
    const id = await user({ paid: true });
    const first = await call("/api/onboarding/theme", { as: id, method: "POST", body: { theme: themeA } });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ theme: themeA });

    const second = await call("/api/onboarding/theme", { as: id, method: "POST", body: { theme: themeB } });
    expect(second.status).toBe(409);
    expect((await meOf(id)).theme).toBe(themeA);
  });
});

describe("PUT /api/me/timezone (ON-3, TD-4)", () => {
  it("stores a valid IANA timezone and rejects junk", async () => {
    const id = await user();
    expect((await call("/api/me/timezone", { as: id, method: "PUT", body: { timezone: "Europe/Dublin" } })).status).toBe(200);
    expect((await meOf(id)).timezone).toBe("Europe/Dublin");
    expect((await call("/api/me/timezone", { as: id, method: "PUT", body: { timezone: "Mars/Olympus" } })).status).toBe(400);
    expect((await call("/api/me/timezone", { as: id, method: "PUT", body: {} })).status).toBe(400);
    expect((await meOf(id)).timezone).toBe("Europe/Dublin");
  });
});

describe("POST /api/admin/users/:id/theme (TH-3)", () => {
  const change = (target: string, opts: { as?: string; admin?: boolean; theme?: unknown }) =>
    call(`/api/admin/users/${encodeURIComponent(target)}/theme`, {
      as: opts.as,
      admin: opts.admin,
      method: "POST",
      body: { theme: opts.theme },
    });

  it("is 401 signed out and 403 for a non-admin", async () => {
    const target = await user({ paid: true, theme: themeA });
    expect((await change(target, { theme: themeB })).status).toBe(401);
    expect((await change(target, { as: target, theme: themeB })).status).toBe(403);
    expect((await meOf(target)).theme).toBe(themeA);
  });

  it("lets an admin change a user's theme, writing the audit record", async () => {
    const target = await user({ paid: true, theme: themeA });
    const admin = await user();
    const res = await change(target, { as: admin, admin: true, theme: themeB });
    expect(res.status).toBe(200);
    expect((await meOf(target)).theme).toBe(themeB);
    expect(await sup`select old_theme, new_theme, changed_by from theme_changes where user_id = ${target}`).toEqual([
      { old_theme: themeA, new_theme: themeB, changed_by: admin },
    ]);
  });

  it("validates the theme and the target", async () => {
    const admin = await user();
    expect((await change(admin, { as: admin, admin: true, theme: "nosuchtheme" })).status).toBe(400);
    expect((await change("user_missing", { as: admin, admin: true, theme: themeA })).status).toBe(404);
  });
});

describe("page navigation: theme routing before first paint (TH-5, TH-8)", () => {
  const html = async (res: Response) => res.text();

  it("serves the neutral shell, with no data-theme, to signed-out visitors - including on a theme showcase", async () => {
    for (const path of ["/", `/${themeA}`, `/${themeA}/journal`]) {
      const res = await call(path);
      expect(res.status, path).toBe(200);
      expect(await html(res), path).not.toContain("data-theme");
    }
  });

  it("sets data-theme on <html> for a signed-in user on a matching path", async () => {
    const id = await user({ paid: true, theme: themeA });
    const res = await call(`/${themeA}/today`, { as: id });
    expect(res.status).toBe(200);
    expect(await html(res)).toContain(`<html lang="en" data-theme="${themeA}">`);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("redirects a mismatched theme to the profile theme, keeping the rest of the path and query", async () => {
    const id = await user({ paid: true, theme: themeA });
    const res = await call(`/${themeB}/habits/7?x=1`, { as: id });
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get("location")!).pathname + new URL(res.headers.get("location")!).search).toBe(`/${themeA}/habits/7?x=1`);
  });

  it("sends a signed-in user at the site root to their Today", async () => {
    const id = await user({ paid: true, theme: themeA });
    const res = await call("/", { as: id });
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get("location")!).pathname).toBe(`/${themeA}/today`);
  });

  it("does not redirect or theme a user who has not chosen yet", async () => {
    const id = await user({ paid: true });
    const res = await call(`/${themeB}/today`, { as: id });
    expect(res.status).toBe(200);
    expect(await html(res)).not.toContain("data-theme");
  });

  it("serves static assets straight from the assets binding, without a session lookup", async () => {
    const res = await call("/assets/app.js", { as: "user_ignored" });
    expect(await res.text()).toBe("asset:/assets/app.js");
  });

  it("degrades to the neutral shell, and says so in the logs, if the session check fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(`/${themeA}/today`, { as: "user_x", headers: { "x-clerk-broken": "1" } });
    expect(res.status).toBe(200);
    expect(await html(res)).not.toContain("data-theme");
    expect(spy).toHaveBeenCalledWith("theme-resolve-failed", "clerk unreachable");
    spy.mockRestore();
  });

  it("never writes an unregistered or malformed theme from the database into the markup", async () => {
    const id = await user({ paid: true, theme: "evil" });
    const res = await call("/somewhere", { as: id });
    expect(await html(res)).not.toContain("evil");
  });
});

beforeEach(() => vi.clearAllMocks());
