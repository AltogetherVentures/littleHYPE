import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { appUser, deleteUsers, requireEnv, seedUser, superUser } from "./helpers";

vi.mock("../../src/auth/clerk", () => ({
  verifyClerkRequest: vi.fn(async (_env: unknown, request: Request) => {
    const userId = request.headers.get("x-test-user");
    return userId ? { userId, isAdmin: request.headers.get("x-test-admin") === "1" } : null;
  }),
}));

const env = (over: Partial<Env> = {}): Env => ({
  ENVIRONMENT: "test",
  HYPERDRIVE: { connectionString: requireEnv("PG_APP_URL") } as Hyperdrive,
  ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
  CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  CLERK_SECRET_KEY: "sk_test_abc",
  CLERK_JWT_KEY: "unused",
  PUBLIC_BASE_URL: "https://app.example",
  STRIPE_SECRET_KEY: "sk_test_stripe",
  STRIPE_PRICE_ID: "price_49",
  ...over,
});

const sup = superUser();
const created: string[] = [];
async function user(opts: { paid?: boolean; theme?: string | null } = {}) {
  const u = await seedUser(sup, { paid: opts.paid ?? false, theme: opts.theme === undefined ? "spacelog" : (opts.theme ?? undefined) });
  created.push(u.userId);
  return u.userId;
}

async function call(path: string, opts: { as?: string; admin?: boolean; method?: string; body?: unknown; env?: Env } = {}) {
  const headers: Record<string, string> = {};
  if (opts.as) headers["x-test-user"] = opts.as;
  if (opts.admin) headers["x-test-admin"] = "1";
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(new Request(`https://app.example${path}`, { method: opts.method ?? "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }), opts.env ?? env());
}
async function api(path: string, opts: Parameters<typeof call>[1] = {}) {
  const res = await call(path, opts);
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

let clerkDirectory: { id: string; email: string; first_name?: string }[];
let clerkSearchStatus = 200;
let clerkDeleteStatus = 204;
let stripeRefund: { status: number; code?: string };
let stripeCalls: { url: string; body: URLSearchParams }[];
const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.startsWith("https://api.clerk.com/v1/users?")) {
    if (clerkSearchStatus !== 200) return new Response("no", { status: clerkSearchStatus });
    return Response.json(clerkDirectory.map((c) => ({ id: c.id, primary_email_address_id: "e", email_addresses: [{ id: "e", email_address: c.email }], first_name: c.first_name ?? null })));
  }
  if (u.startsWith("https://api.clerk.com/v1/users/")) {
    const id = decodeURIComponent(u.split("/").pop()!);
    if (init?.method === "DELETE") return new Response(null, { status: clerkDeleteStatus });
    const found = clerkDirectory.find((c) => c.id === id);
    return found ? Response.json({ id, primary_email_address_id: "e", email_addresses: [{ id: "e", email_address: found.email }], first_name: found.first_name ?? null }) : new Response("nf", { status: 404 });
  }
  if (u === "https://api.stripe.com/v1/refunds") {
    stripeCalls.push({ url: u, body: new URLSearchParams(String(init!.body)) });
    return stripeRefund.status === 200 ? Response.json({ id: "re_1" }) : Response.json({ error: { code: stripeRefund.code } }, { status: stripeRefund.status });
  }
  throw new Error(`unexpected fetch ${u}`);
});

beforeEach(() => {
  clerkDirectory = [];
  clerkSearchStatus = 200;
  clerkDeleteStatus = 204;
  stripeRefund = { status: 200 };
  stripeCalls = [];
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await deleteUsers(sup, created.splice(0));
  await sup`delete from admin_actions`;
});
afterAll(async () => {
  await sup.end();
});

/** A paid account with something in most tables, bought `ageDays` ago through Stripe. */
async function customer(ageDays = 3, opts: { paymentIntent?: string | null } = {}) {
  const u = await user({ paid: false });
  const pi = opts.paymentIntent === undefined ? `pi_${u}` : opts.paymentIntent;
  await sup`insert into purchases (user_id, stripe_session_id, stripe_payment_intent, amount, currency, status, paid_at) values (${u}, ${`cs_${u}`}, ${pi}, 4900, 'usd', 'paid', now() - ${ageDays}::int * interval '1 day')`;
  await sup`insert into journal_entries (user_id, entry_date, body) values (${u}, '2026-09-01', 'ADMIN-MUST-NEVER-SEE-THIS')`;
  await sup`insert into habits (user_id, name) values (${u}, 'HIDDEN-HABIT-NAME')`;
  return u;
}
const admin = () => user({ theme: "spacelog" });
const tableCounts = async (u: string) => (await Promise.all(["profiles", "purchases", "journal_entries", "habits"].map((t) => sup.unsafe(`select 1 from ${t} where user_id = '${u}'`)))).map((r) => r.length);

describe("access", () => {
  it("is closed to the signed-out and to ordinary users, on every admin route", async () => {
    const u = await user();
    const routes: [string, string][] = [["GET", "/api/admin/users?q=ab"], ["GET", `/api/admin/users/${u}`], ["GET", "/api/admin/actions"], ["POST", `/api/admin/users/${u}/theme`], ["POST", `/api/admin/users/${u}/refund-and-delete`]];
    for (const [method, path] of routes) {
      expect((await call(path, { method })).status, `${method} ${path} signed out`).toBe(401);
      expect((await call(path, { method, as: u })).status, `${method} ${path} ordinary user`).toBe(403);
    }
    expect((await call("/api/admin/nothing", { as: u, admin: true })).status).toBe(404);
  });

  it("is enforced by the database too: the functions refuse a user's or an admin-less scope", async () => {
    const u = await user();
    const sql = appUser();
    try {
      for (const role of ["user", ""]) {
        for (const q of [(tx: any) => tx`select * from admin_user_summary(${u})`, (tx: any) => tx`select * from admin_theme_history(${u})`, (tx: any) => tx`select admin_delete_account(${u}, '{}'::jsonb)`]) {
          await expect(sql.begin(async (tx) => { await tx`select set_config('app.current_user_id', ${u}, true)`; await tx`select set_config('app.current_role', ${role}, true)`; await q(tx); })).rejects.toThrow(/admin_required/);
        }
      }
      await expect(sql.begin(async (tx) => { await tx`select set_config('app.current_role', 'admin', true)`; await tx`select * from admin_user_summary(${u})`; })).rejects.toThrow(/admin_required/); // an admin role with no user id
    } finally {
      await sql.end();
    }
  });
});

describe("finding and viewing accounts", () => {
  it("searches the sign-in directory and shows each account's summary, with no content", async () => {
    const a = await admin();
    const c = await customer(3);
    clerkDirectory = [{ id: c, email: "buyer@mail.test", first_name: "Bea" }, { id: "user_only_in_clerk", email: "ghost@mail.test" }];
    const res = await api("/api/admin/users?q=buyer", { as: a, admin: true });
    expect(res.status).toBe(200);
    const [found, ghost] = res.body.users;
    expect(found).toMatchObject({ id: c, email: "buyer@mail.test", name: "Bea", summary: { userId: c, theme: "spacelog", purchase: { status: "paid", amount: 4900, currency: "usd", refundEligible: true } } });
    expect(ghost).toMatchObject({ id: "user_only_in_clerk", summary: null });
    expect(JSON.stringify(res.body)).not.toMatch(/ADMIN-MUST-NEVER-SEE-THIS|HIDDEN-HABIT-NAME/);
  });

  it("looks a user up directly by id, and refuses a too-short or too-long search", async () => {
    const a = await admin();
    const c = await customer();
    clerkDirectory = [{ id: c, email: "direct@mail.test" }];
    expect((await api(`/api/admin/users?q=${c}`, { as: a, admin: true })).body.users[0].email).toBe("direct@mail.test");
    expect((await api("/api/admin/users?q=a", { as: a, admin: true })).body.error).toBe("invalid_query");
    expect((await api(`/api/admin/users?q=${"x".repeat(101)}`, { as: a, admin: true })).status).toBe(400);
  });

  it("says so when the directory cannot be reached", async () => {
    clerkSearchStatus = 500;
    expect((await api("/api/admin/users?q=someone", { as: await admin(), admin: true })).status).toBe(502);
  });

  it("marks a purchase outside the 14-day window as not refundable", async () => {
    const a = await admin();
    const c = await customer(15);
    clerkDirectory = [{ id: c, email: "old@mail.test" }];
    expect((await api(`/api/admin/users/${c}`, { as: a, admin: true })).body.summary.purchase.refundEligible).toBe(false);
  });

  it("shows one account with its theme history, and 404s for an unknown one", async () => {
    const a = await admin();
    const c = await customer();
    await api(`/api/admin/users/${c}/theme`, { as: a, admin: true, method: "POST", body: { theme: "notebook" } });
    const res = await api(`/api/admin/users/${c}`, { as: a, admin: true });
    expect(res.body.history).toEqual([expect.objectContaining({ from: "spacelog", to: "notebook", by: a })]);
    expect(Object.keys(res.body).sort()).toEqual(["email", "history", "name", "summary"]);
    expect((await api("/api/admin/users/user_missing", { as: a, admin: true })).status).toBe(404);
  });
});

describe("the admin log", () => {
  it("records theme changes, and lists recent actions for admins only", async () => {
    const a = await admin();
    const c = await customer();
    await api(`/api/admin/users/${c}/theme`, { as: a, admin: true, method: "POST", body: { theme: "notebook" } });
    await api(`/api/admin/users/${c}/theme`, { as: a, admin: true, method: "POST", body: { theme: "notebook" } }); // no change, no entry
    const { actions } = (await api("/api/admin/actions", { as: a, admin: true })).body;
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ admin: a, action: "theme_change", target: c, detail: { from: "spacelog", to: "notebook" } });
  });
});

describe("refund and delete (PY-5)", () => {
  const go = (a: string, target: string, body: Record<string, unknown> = {}, e?: Env) => api(`/api/admin/users/${target}/refund-and-delete`, { as: a, admin: true, method: "POST", body: { confirm: target, ...body }, env: e });

  it("refunds the payment, then deletes everything of the person's, and logs it", async () => {
    const a = await admin();
    const c = await customer(3);
    expect(await tableCounts(c)).toEqual([1, 1, 1, 1]);
    const res = await go(a, c);
    expect(res).toMatchObject({ status: 200, body: { deleted: true, refunded: true, signInRemoved: true } });
    expect(stripeCalls).toHaveLength(1);
    expect(stripeCalls[0]!.body.get("payment_intent")).toBe(`pi_${c}`);
    expect(await tableCounts(c)).toEqual([0, 0, 0, 0]);
    const [log] = await sup`select * from admin_actions where target_user_id = ${c}`;
    expect(log).toMatchObject({ admin_id: a, action: "refund_and_delete", detail: { refunded: true, hadPurchase: true, amount: 4900, currency: "usd" } });
    expect(JSON.stringify(log)).not.toContain("ADMIN-MUST-NEVER-SEE-THIS");
    expect(fetchMock.mock.calls.some(([u, i]) => String(u).endsWith(`/v1/users/${encodeURIComponent(c)}`) && (i as RequestInit)?.method === "DELETE")).toBe(true);
  });

  it("requires the admin to type the account's id, and does nothing otherwise", async () => {
    const a = await admin();
    const c = await customer();
    for (const body of [{}, { confirm: "someone_else" }, { confirm: c.toUpperCase() }]) {
      const res = await api(`/api/admin/users/${c}/refund-and-delete`, { as: a, admin: true, method: "POST", body });
      expect(res.body.error).toBe("confirmation_required");
    }
    expect(await tableCounts(c)).toEqual([1, 1, 1, 1]);
    expect(stripeCalls).toHaveLength(0);
  });

  it("deletes nothing if Stripe refuses the refund", async () => {
    const a = await admin();
    const c = await customer();
    stripeRefund = { status: 402, code: "card_declined" };
    expect((await go(a, c)).body.error).toBe("refund_failed");
    expect(await tableCounts(c)).toEqual([1, 1, 1, 1]);
    expect((await sup`select status from purchases where user_id = ${c}`)[0]!.status).toBe("paid");
  });

  it("treats a payment already refunded in Stripe as refunded, so a half-finished attempt can be retried", async () => {
    const a = await admin();
    const c = await customer();
    stripeRefund = { status: 400, code: "charge_already_refunded" };
    expect(await go(a, c)).toMatchObject({ status: 200, body: { deleted: true, refunded: true } });
  });

  it("refuses outside the 14-day window unless the admin forces it", async () => {
    const a = await admin();
    const c = await customer(20);
    expect((await go(a, c)).body.error).toBe("outside_refund_window");
    expect(await tableCounts(c)).toEqual([1, 1, 1, 1]);
    expect(stripeCalls).toHaveLength(0);
    expect(await go(a, c, { force: true })).toMatchObject({ status: 200, body: { deleted: true, refunded: true } });
  });

  it("deletes an account that never paid, or was already refunded, without touching Stripe", async () => {
    const a = await admin();
    const unpaid = await user();
    expect(await go(a, unpaid)).toMatchObject({ status: 200, body: { deleted: true, refunded: false } });
    const refunded = await customer();
    await sup`update purchases set status = 'refunded' where user_id = ${refunded}`;
    expect(await go(a, refunded)).toMatchObject({ status: 200, body: { deleted: true, refunded: false } });
    expect(stripeCalls).toHaveLength(0);
  });

  it("handles a purchase with no Stripe payment (a manual one): nothing to refund, still deletes", async () => {
    const a = await admin();
    const c = await customer(3, { paymentIntent: null });
    expect(await go(a, c)).toMatchObject({ status: 200, body: { deleted: true, refunded: false } });
    expect(stripeCalls).toHaveLength(0);
  });

  it("will not delete while it cannot refund: Stripe not configured", async () => {
    const a = await admin();
    const c = await customer();
    expect((await go(a, c, {}, env({ STRIPE_SECRET_KEY: undefined }))).body.error).toBe("refunds_unavailable");
    expect(await tableCounts(c)).toEqual([1, 1, 1, 1]);
  });

  it("404s for an unknown account, and reports a sign-in that could not be removed", async () => {
    const a = await admin();
    expect((await go(a, "user_missing")).status).toBe(404);
    const c = await customer();
    clerkDeleteStatus = 500;
    expect(await go(a, c)).toMatchObject({ status: 200, body: { deleted: true, signInRemoved: false } });
  });

  it("keeps the admin log entry after the person's data is gone", async () => {
    const a = await admin();
    const c = await customer();
    await go(a, c);
    expect((await api("/api/admin/actions", { as: a, admin: true })).body.actions[0]).toMatchObject({ action: "refund_and_delete", target: c });
  });
});
