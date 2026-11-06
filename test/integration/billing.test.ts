import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { signStripePayload } from "../../src/billing/signature";
import { appUser, deleteUsers, requireEnv, seedUser, superUser } from "./helpers";

vi.mock("../../src/auth/clerk", () => ({
  verifyClerkRequest: vi.fn(async (_env: unknown, request: Request) => {
    const userId = request.headers.get("x-test-user");
    return userId ? { userId, isAdmin: false } : null;
  }),
}));

const WEBHOOK_SECRET = "whsec_test";
const env = (over: Partial<Env> = {}): Env => ({
  ENVIRONMENT: "test",
  HYPERDRIVE: { connectionString: requireEnv("PG_APP_URL") } as Hyperdrive,
  ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
  CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  CLERK_SECRET_KEY: "sk_test_abc",
  CLERK_JWT_KEY: "unused",
  PUBLIC_BASE_URL: "https://app.example",
  STRIPE_SECRET_KEY: "sk_test_stripe",
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_PRICE_ID: "price_49",
  ...over,
});

const sup = superUser();
const created: string[] = [];
async function user(opts: { paid?: boolean; theme?: string | null } = {}) {
  const u = await seedUser(sup, { paid: opts.paid ?? false, theme: opts.theme === undefined ? undefined : (opts.theme ?? undefined) });
  created.push(u.userId);
  return u.userId;
}
const purchases = (u: string) => sup<{ status: string; amount: number; currency: string; stripe_session_id: string; stripe_payment_intent: string | null }[]>`select * from purchases where user_id = ${u} order by paid_at`;

async function api(path: string, opts: { as?: string; method?: string; body?: unknown; env?: Env } = {}) {
  const headers: Record<string, string> = {};
  if (opts.as) headers["x-test-user"] = opts.as;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await worker.fetch(new Request(`https://app.example${path}`, { method: opts.method ?? "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }), opts.env ?? env());
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

let stripeCalls: { url: string; body: URLSearchParams; headers: Record<string, string> }[];
let stripeStatus = 200;
const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.startsWith("https://api.clerk.com/")) return Response.json({ primary_email_address_id: "e", email_addresses: [{ id: "e", email_address: "buyer@mail.test" }] });
  if (u === "https://api.stripe.com/v1/checkout/sessions") {
    stripeCalls.push({ url: u, body: new URLSearchParams(String(init!.body)), headers: init!.headers as Record<string, string> });
    return stripeStatus === 200 ? Response.json({ id: "cs_1", url: "https://checkout.stripe.test/c/pay/cs_1" }) : new Response("bad", { status: stripeStatus });
  }
  throw new Error(`unexpected fetch ${u}`);
});

beforeEach(() => {
  stripeCalls = [];
  stripeStatus = 200;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
afterAll(async () => {
  await deleteUsers(sup, created);
  await sup.end();
});

const sessionEvent = (userId: string, over: Record<string, unknown> = {}, type = "checkout.session.completed") => ({
  id: `evt_${Math.random().toString(36).slice(2)}`,
  type,
  data: { object: { id: `cs_${Math.random().toString(36).slice(2)}`, payment_status: "paid", client_reference_id: userId, amount_total: 4900, currency: "usd", payment_intent: `pi_${Math.random().toString(36).slice(2)}`, ...over } },
});

async function webhook(event: unknown, opts: { secret?: string; timestamp?: number; tamper?: boolean; env?: Env; header?: string | null } = {}) {
  const raw = JSON.stringify(event);
  const header = opts.header !== undefined ? opts.header : await signStripePayload(raw, opts.secret ?? WEBHOOK_SECRET, opts.timestamp ?? Math.floor(Date.now() / 1000));
  const res = await worker.fetch(
    new Request("https://app.example/api/stripe/webhook", { method: "POST", headers: header ? { "stripe-signature": header } : {}, body: opts.tamper ? raw.replace("4900", "1") : raw }),
    opts.env ?? env(),
  );
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

describe("creating a checkout", () => {
  it("requires sign-in", async () => {
    expect((await api("/api/checkout", { method: "POST" })).status).toBe(401);
    expect((await api("/api/checkout")).status).toBe(405);
  });

  it("creates a one-time payment session tied to the user, and returns Stripe's page", async () => {
    const u = await user();
    const res = await api("/api/checkout", { as: u, method: "POST" });
    expect(res).toMatchObject({ status: 200, body: { url: "https://checkout.stripe.test/c/pay/cs_1" } });
    const call = stripeCalls[0]!;
    expect(call.headers.authorization).toBe("Bearer sk_test_stripe");
    expect(Object.fromEntries(call.body)).toMatchObject({
      mode: "payment",
      "line_items[0][price]": "price_49",
      "line_items[0][quantity]": "1",
      client_reference_id: u,
      "metadata[user_id]": u,
      customer_email: "buyer@mail.test",
      success_url: "https://app.example/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://app.example/paywall",
    });
    expect(call.body.get("automatic_tax[enabled]")).toBeNull();
  });

  it("turns on Stripe Tax only when told it is set up", async () => {
    const u = await user();
    await api("/api/checkout", { as: u, method: "POST", env: env({ STRIPE_AUTOMATIC_TAX: "true" }) });
    expect(stripeCalls[0]!.body.get("automatic_tax[enabled]")).toBe("true");
  });

  it("will not sell to someone who has already paid", async () => {
    const u = await user({ paid: true });
    expect((await api("/api/checkout", { as: u, method: "POST" })).body.error).toBe("already_paid");
    expect(stripeCalls).toHaveLength(0);
  });

  it("says checkout is unavailable, and does not pretend, when Stripe is not configured", async () => {
    const u = await user();
    const res = await api("/api/checkout", { as: u, method: "POST", env: env({ STRIPE_SECRET_KEY: undefined }) });
    expect(res).toMatchObject({ status: 503, body: { error: "checkout_unavailable" } });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("checkout-unavailable"));
  });

  it("reports a Stripe failure as a bad gateway, never as a success", async () => {
    const u = await user();
    stripeStatus = 500;
    expect((await api("/api/checkout", { as: u, method: "POST" })).status).toBe(502);
  });
});

describe("the Stripe webhook", () => {
  it("records a paid checkout, after which the account is paid and can pick a theme", async () => {
    const u = await user();
    expect((await api("/api/me", { as: u })).body.paid).toBe(false);
    const event = sessionEvent(u, { amount_total: 4900, currency: "USD" });
    expect(await webhook(event)).toMatchObject({ status: 200, body: { received: true } });
    const [row] = await purchases(u);
    expect(row).toMatchObject({ status: "paid", amount: 4900, currency: "usd", stripe_session_id: event.data.object.id, stripe_payment_intent: event.data.object.payment_intent });
    expect((await api("/api/me", { as: u })).body.paid).toBe(true);
    expect((await api("/api/onboarding/theme", { as: u, method: "POST", body: { theme: "spacelog" } })).status).toBe(200);
  });

  it("records a discounted price as what was actually paid", async () => {
    const u = await user();
    await webhook(sessionEvent(u, { amount_total: 4400 }));
    expect((await purchases(u))[0]!.amount).toBe(4400);
  });

  it("is idempotent: Stripe delivering the same event again changes nothing", async () => {
    const u = await user();
    const event = sessionEvent(u);
    for (let i = 0; i < 3; i++) expect((await webhook(event)).status).toBe(200);
    expect(await purchases(u)).toHaveLength(1);
  });

  it("handles a delayed payment method: recorded only when the money arrives", async () => {
    const u = await user();
    const pending = sessionEvent(u, { payment_status: "unpaid" });
    await webhook(pending);
    expect(await purchases(u)).toHaveLength(0);
    expect((await api("/api/me", { as: u })).body.paid).toBe(false);
    await webhook({ ...pending, id: "evt_later", type: "checkout.session.async_payment_succeeded", data: { object: { ...pending.data.object, payment_status: "paid" } } });
    expect(await purchases(u)).toHaveLength(1);
  });

  it("refuses an unsigned, mis-signed, tampered, replayed or unparseable request, and records nothing", async () => {
    const u = await user();
    const event = sessionEvent(u);
    expect((await webhook(event, { header: null })).body.error).toBe("invalid_signature");
    expect((await webhook(event, { secret: "whsec_wrong" })).status).toBe(400);
    expect((await webhook(event, { tamper: true })).status).toBe(400);
    expect((await webhook(event, { timestamp: Math.floor(Date.now() / 1000) - 3600 })).status).toBe(400);
    expect((await webhook(event, { header: "t=1,v1=00" })).status).toBe(400);
    const rawBad = "not json";
    const res = await worker.fetch(new Request("https://app.example/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": await signStripePayload(rawBad, WEBHOOK_SECRET, Math.floor(Date.now() / 1000)) }, body: rawBad }), env());
    expect(res.status).toBe(400);
    expect(await purchases(u)).toHaveLength(0);
  });

  it("cannot be used by a signed-in user to make themselves paid", async () => {
    const u = await user();
    // a user's own session token gives no way to record a purchase: no route, and no permission
    expect((await api("/api/stripe/webhook", { as: u, method: "POST", body: sessionEvent(u) })).status).toBe(400);
    const sql = appUser();
    try {
      await expect(sql.begin(async (tx) => { await tx`select set_config('app.current_user_id', ${u}, true)`; await tx`insert into purchases (user_id, stripe_session_id, amount, currency, status) values (${u}, 'x', 1, 'usd', 'paid')`; })).rejects.toThrow(/permission denied/);
      await expect(sql.begin(async (tx) => { await tx`select set_config('app.current_user_id', ${u}, true)`; await tx`select record_purchase(${u}, 'cs_x', null, 4900, 'usd')`; })).rejects.toThrow(/system_required/);
      await expect(sql.begin(async (tx) => { await tx`select set_config('app.current_role', 'admin', true)`; await tx`select mark_purchase_refunded('pi_x')`; })).rejects.toThrow(/system_required/);
    } finally {
      await sql.end();
    }
    expect(await purchases(u)).toHaveLength(0);
  });

  it("keeps a payment for an account that no longer exists loud, not silent", async () => {
    const res = await webhook(sessionEvent("user_who_deleted_their_account"));
    expect(res.status).toBe(200); // retrying would never help
    expect(console.error).toHaveBeenCalledWith("stripe-purchase-unknown-user", expect.objectContaining({ userId: "user_who_deleted_their_account" }));
  });

  it("logs, and does not guess, when a payment cannot be attributed to anyone", async () => {
    const event = sessionEvent("x", { client_reference_id: null });
    expect((await webhook(event)).status).toBe(200);
    expect(console.error).toHaveBeenCalledWith("stripe-purchase-unattributable", expect.anything());
  });

  it("marks a fully refunded purchase refunded, which revokes access, and ignores partial refunds", async () => {
    const u = await user();
    const paid = sessionEvent(u);
    await webhook(paid);
    const pi = paid.data.object.payment_intent as string;
    await webhook({ id: "evt_partial", type: "charge.refunded", data: { object: { payment_intent: pi, refunded: false, amount_refunded: 500 } } });
    expect((await purchases(u))[0]!.status).toBe("paid");
    expect((await api("/api/me", { as: u })).body.paid).toBe(true);
    await webhook({ id: "evt_full", type: "charge.refunded", data: { object: { payment_intent: pi, refunded: true } } });
    expect((await purchases(u))[0]!.status).toBe("refunded");
    expect((await api("/api/me", { as: u })).body.paid).toBe(false);
    // and it does not delete anything: that is a separate, deliberate admin step
    expect((await sup`select 1 from profiles where user_id = ${u}`)).toHaveLength(1);
  });

  it("acknowledges and ignores events it does not use", async () => {
    expect((await webhook({ id: "evt_x", type: "customer.created", data: { object: {} } })).status).toBe(200);
  });

  it("reports unavailable, rather than accepting anything, without a signing secret", async () => {
    const u = await user();
    expect((await webhook(sessionEvent(u), { env: env({ STRIPE_WEBHOOK_SECRET: undefined }) })).status).toBe(503);
    expect(await purchases(u)).toHaveLength(0);
  });

  it("returns an error, so Stripe retries, when the database is down", async () => {
    const u = await user();
    const broken = env({ HYPERDRIVE: { connectionString: "postgresql://app_user:x@127.0.0.1:1/none" } as Hyperdrive });
    expect((await webhook(sessionEvent(u), { env: broken })).status).toBe(500);
  });
});
