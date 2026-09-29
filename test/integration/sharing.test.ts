import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { signStripePayload } from "../../src/billing/signature";
import { settleAllReferrals } from "../../src/referrals/settle";
import { REFERRAL_CODE_PATTERN } from "../../shared/sharing";
import { appUser, deleteUsers, requireEnv, seedUser, superUser } from "./helpers";

vi.mock("../../src/auth/clerk", () => ({
  verifyClerkRequest: vi.fn(async (_env: unknown, request: Request) => {
    const userId = request.headers.get("x-test-user");
    return userId ? { userId, isAdmin: false } : null;
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
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_ID: "price_49",
  ...over,
});

const sup = superUser();
const created: string[] = [];
async function user(opts: { paid?: boolean; theme?: string | null } = {}) {
  const u = await seedUser(sup, { paid: opts.paid ?? false, theme: opts.theme === undefined ? "aaa" : (opts.theme ?? undefined) });
  created.push(u.userId);
  return u.userId;
}

async function call(path: string, opts: { as?: string; method?: string; body?: unknown; cookie?: string; env?: Env } = {}) {
  const headers: Record<string, string> = {};
  if (opts.as) headers["x-test-user"] = opts.as;
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  return worker.fetch(new Request(`https://app.example${path}`, { method: opts.method ?? "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, redirect: "manual" }), opts.env ?? env());
}
async function api(path: string, opts: Parameters<typeof call>[1] = {}) {
  const res = await call(path, opts);
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}

const setDay = (iso: string) => vi.setSystemTime(new Date(`${iso}T12:00:00Z`));
const day = (n: number) => new Date(Date.UTC(2026, 8, 30 - n)).toISOString().slice(0, 10);
const newHabit = async (u: string, body: Record<string, unknown> = {}) => (await api("/api/habits", { as: u, method: "POST", body: { name: "Secret habit name", category: "hydration", ...body } })).body.habit as { id: string };
const doneOn = (u: string, id: string, ...offsets: number[]) => Promise.all(offsets.map((n) => api(`/api/habits/${id}/logs/${day(n)}`, { as: u, method: "PUT", body: { status: "done" } })));
const range = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, i) => from - i);

let stripeCalls: URLSearchParams[];
const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.startsWith("https://api.clerk.com/")) return Response.json({ primary_email_address_id: "e", email_addresses: [{ id: "e", email_address: "x@mail.test" }] });
  if (u === "https://api.stripe.com/v1/checkout/sessions") {
    stripeCalls.push(new URLSearchParams(String(init!.body)));
    return Response.json({ url: "https://checkout.stripe.test/x" });
  }
  throw new Error(`unexpected fetch ${u}`);
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setDay("2026-09-30");
  stripeCalls = [];
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await deleteUsers(sup, created.splice(0));
});
afterAll(async () => {
  await sup.end();
});

describe("titles", () => {
  it("come from the strongest active habit's category and streak, and never its name", async () => {
    const u = await user();
    expect((await api("/api/title", { as: u })).body.title).toBeNull();
    const water = await newHabit(u, { category: "hydration" });
    const run = await newHabit(u, { name: "Marathon prep", category: "exercise" });
    await doneOn(u, water.id, ...range(9, 0)); // 10 days
    await doneOn(u, run.id, ...range(3, 0)); // 4 days
    const { title } = (await api("/api/title", { as: u })).body;
    expect(title).toMatchObject({ category: "hydration", key: "hydration.rank2", rank: 2, streakDays: 10 });
    expect(JSON.stringify(title)).not.toContain("Secret habit name");
    expect(JSON.stringify(title)).not.toContain("Marathon");
  });

  it("ignore archived habits", async () => {
    const u = await user();
    const h = await newHabit(u);
    await doneOn(u, h.id, ...range(8, 0));
    await api(`/api/habits/${h.id}/archive`, { as: u, method: "POST" });
    expect((await api("/api/title", { as: u })).body.title).toBeNull();
  });
});

describe("streak-break cards", () => {
  it("are offered once a streak of seven days or more breaks, with the category and length only", async () => {
    const u = await user();
    const h = await newHabit(u, { category: "reading" });
    await doneOn(u, h.id, ...range(10, 3)); // 8 days, 20th to 27th; 28th and 29th missed
    const { card } = (await api("/api/break-card", { as: u })).body;
    expect(card).toMatchObject({ category: "reading", lengthDays: 8, brokenOn: "2026-09-28" });
    expect(JSON.stringify(card)).not.toContain("Secret habit name");
    // offered again until dismissed, but it is one card, not a new one each time
    expect((await api("/api/break-card", { as: u, })).body.card.id).toBe(card.id);
    expect((await sup`select 1 from streak_break_cards where user_id = ${u}`).length).toBe(1);
  });

  it("is offered once per broken streak: dismissing it, or reloading, never brings it back", async () => {
    const u = await user();
    const h = await newHabit(u);
    await doneOn(u, h.id, ...range(10, 3));
    const { card } = (await api("/api/break-card", { as: u })).body;
    expect((await api(`/api/break-card/${card.id}/dismiss`, { as: u, method: "POST" })).status).toBe(200);
    expect((await api("/api/break-card", { as: u })).body.card).toBeNull();
    expect((await api("/api/break-card", { as: u })).body.card).toBeNull();
    // a later, separate break earns its own card: five more days done on 1 to 5 October, then missed
    setDay("2026-10-14");
    await api(`/api/habits/${h.id}/logs/2026-10-01`, { as: u, method: "PUT", body: { status: "done" } });
    for (const d of ["02", "03", "04", "05", "06", "07", "08"]) await api(`/api/habits/${h.id}/logs/2026-10-${d}`, { as: u, method: "PUT", body: { status: "done" } });
    const next = (await api("/api/break-card", { as: u })).body.card;
    expect(next).toMatchObject({ brokenOn: "2026-10-09" });
    expect(next.id).not.toBe(card.id);
  });

  it("need seven days: a shorter streak that breaks earns nothing", async () => {
    const u = await user();
    const h = await newHabit(u);
    await doneOn(u, h.id, ...range(8, 3)); // 6 days
    expect((await api("/api/break-card", { as: u })).body.card).toBeNull();
  });

  it("do not appear for a break long ago, so returning after months is not a wall of old failures", async () => {
    const u = await user();
    const h = await newHabit(u);
    await doneOn(u, h.id, ...range(60, 50)); // an 11-day streak that ended weeks ago
    expect((await api("/api/break-card", { as: u })).body.card).toBeNull();
  });

  it("offer only the most recent when several breaks are waiting, and retire the rest", async () => {
    const u = await user();
    const a = await newHabit(u, { category: "sleep" });
    const b = await newHabit(u, { category: "diet" });
    await doneOn(u, a.id, ...range(12, 4)); // sleep broke on the 27th
    await doneOn(u, b.id, ...range(9, 3)); // diet broke on the 28th
    const { card } = (await api("/api/break-card", { as: u })).body;
    expect(card.category).toBe("diet");
    expect((await sup`select 1 from streak_break_cards where user_id = ${u} and dismissed_at is null`).length).toBe(1);
  });

  it("count weeks for a weekly habit: two weeks or more", async () => {
    const u = await user();
    const h = await newHabit(u, { schedule: { type: "weekly", target: 2 } });
    // three consecutive weeks meeting a 2-a-week target: weeks starting 2026-08-31, 09-07, 09-14, then nothing
    await doneOn(u, h.id, 30, 28, 23, 21, 16, 14); // 31 Aug, 2 Sep, 7 Sep, 9 Sep, 14 Sep, 16 Sep
    const { card } = (await api("/api/break-card", { as: u })).body;
    expect(card).toMatchObject({ lengthDays: 21 });
  });

  it("go when the habit is deleted, stay private to their owner, and never appear for archived habits", async () => {
    const a = await user();
    const b = await user();
    const h = await newHabit(a);
    await doneOn(a, h.id, ...range(10, 3));
    const { card } = (await api("/api/break-card", { as: a })).body;
    expect((await api(`/api/break-card/${card.id}/dismiss`, { as: b, method: "POST" })).status).toBe(404);
    expect((await api("/api/break-card", { as: b })).body.card).toBeNull();
    expect((await api("/api/break-card/not-a-uuid/dismiss", { as: a, method: "POST" })).status).toBe(404);
    await api(`/api/habits/${h.id}?confirm=true`, { as: a, method: "DELETE" });
    expect((await api("/api/break-card", { as: a })).body.card).toBeNull();
    const archived = await newHabit(a);
    await doneOn(a, archived.id, ...range(10, 3));
    await api(`/api/habits/${archived.id}/archive`, { as: a, method: "POST" });
    expect((await api("/api/break-card", { as: a })).body.card).toBeNull();
  });
});

describe("share counts", () => {
  it("record that a card of a type was shared, in the sharer's theme, and nothing else", async () => {
    const u = await user({ theme: "aaa" });
    expect((await api("/api/share-events", { as: u, method: "POST", body: { cardType: "title" } })).status).toBe(200);
    expect((await api("/api/share-events", { as: u, method: "POST", body: { cardType: "break", text: "secret", habit: "x" } })).status).toBe(200);
    const rows = await sup`select card_type, theme from share_events where user_id = ${u} order by id`;
    expect(rows.map((r) => [r.card_type, r.theme])).toEqual([["title", "aaa"], ["break", "aaa"]]);
    expect(Object.keys((await sup`select * from share_events where user_id = ${u}`)[0]!).sort()).toEqual(["card_type", "id", "shared_at", "theme", "user_id"]);
  });

  it("refuse an unknown card type and a person with no theme", async () => {
    const u = await user();
    expect((await api("/api/share-events", { as: u, method: "POST", body: { cardType: "journal" } })).body.error).toBe("invalid_card_type");
    const bare = await user({ theme: null });
    expect((await api("/api/share-events", { as: bare, method: "POST", body: { cardType: "title" } })).body.error).toBe("theme_required");
  });
});

describe("referral links", () => {
  it("give every user one stable code and link", async () => {
    const u = await user();
    const first = (await api("/api/referrals", { as: u })).body;
    expect(first.code).toMatch(REFERRAL_CODE_PATTERN);
    expect(first.link).toBe(`https://app.example/r/${first.code}`);
    expect(first).toMatchObject({ pending: 0, confirmed: 0, creditsEarned: 0, nextCreditIn: 3 });
    expect((await api("/api/referrals", { as: u })).body.code).toBe(first.code);
    const other = (await api("/api/referrals", { as: await user() })).body;
    expect(other.code).not.toBe(first.code);
  });

  it("open the sharer's theme showcase and remember the referrer for 30 days", async () => {
    const referrer = await user({ theme: "bbb" });
    const { code } = (await api("/api/referrals", { as: referrer })).body;
    const res = await call(`/r/${code}`);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://app.example/bbb");
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toContain(`lh_ref=${code}`);
    expect(cookie).toContain(`Max-Age=${30 * 86400}`);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Secure/);
  });

  it("do nothing, and set no cookie, for an unknown, malformed or theme-less code", async () => {
    const bare = await user({ theme: null });
    const { code } = (await api("/api/referrals", { as: bare })).body;
    for (const path of ["/r/abcdefgh", "/r/NOTACODE", "/r/abc", `/r/${code}`]) {
      const res = await call(path);
      expect(res.status, path).toBe(302);
      expect(res.headers.get("location"), path).toBe("https://app.example/");
      expect(res.headers.get("set-cookie"), path).toBeNull();
    }
  });
});

describe("referral attribution and the friend's discount", () => {
  const setup = async () => {
    const referrer = await user({ theme: "bbb" });
    const { code } = (await api("/api/referrals", { as: referrer })).body;
    const friend = await user({ theme: null });
    return { referrer, code: code as string, friend, cookie: `lh_ref=${code}` };
  };
  const referralRows = (referrer: string) => sup<{ referred_user_id: string; purchased_at: Date | null; confirmed_at: Date | null }[]>`select * from referrals where referrer_id = ${referrer}`;

  it("records the referral when the friend starts checkout, and applies the promotion code", async () => {
    const { referrer, friend, cookie } = await setup();
    const withPromo = env({ STRIPE_REFERRAL_PROMOTION_ID: "promo_5off" });
    expect((await call("/api/checkout", { as: friend, method: "POST", cookie, env: withPromo })).status).toBe(200);
    expect((await referralRows(referrer))[0]).toMatchObject({ referred_user_id: friend, purchased_at: null, confirmed_at: null });
    expect(stripeCalls[0]!.get("discounts[0][promotion_code]")).toBe("promo_5off");
    expect(stripeCalls[0]!.get("allow_promotion_codes")).toBeNull();
  });

  it("falls back to letting the buyer enter a code when no referral promotion is configured", async () => {
    const { friend, cookie } = await setup();
    await call("/api/checkout", { as: friend, method: "POST", cookie });
    expect(stripeCalls[0]!.get("discounts[0][promotion_code]")).toBeNull();
    expect(stripeCalls[0]!.get("allow_promotion_codes")).toBe("true");
  });

  it("does not attribute without the cookie, with a bad cookie, or to yourself", async () => {
    const { referrer, code, friend } = await setup();
    const withPromo = env({ STRIPE_REFERRAL_PROMOTION_ID: "promo_5off" });
    await call("/api/checkout", { as: friend, method: "POST", env: withPromo });
    await call("/api/checkout", { as: friend, method: "POST", cookie: "lh_ref=abcdefg0", env: withPromo });
    await call("/api/checkout", { as: referrer, method: "POST", cookie: `lh_ref=${code}`, env: withPromo });
    expect(await referralRows(referrer)).toHaveLength(0);
    for (const s of stripeCalls) expect(s.get("discounts[0][promotion_code]")).toBeNull();
  });

  it("attributes a friend once, to the first referrer, however many links they click", async () => {
    const first = await setup();
    const second = await user({ theme: "bbb" });
    const secondCode = (await api("/api/referrals", { as: second })).body.code as string;
    await call("/api/checkout", { as: first.friend, method: "POST", cookie: first.cookie });
    await call("/api/checkout", { as: first.friend, method: "POST", cookie: first.cookie });
    await call("/api/checkout", { as: first.friend, method: "POST", cookie: `lh_ref=${secondCode}` });
    expect(await referralRows(first.referrer)).toHaveLength(1);
    expect(await referralRows(second)).toHaveLength(0);
  });

  it("never attributes someone who has already paid", async () => {
    const referrer = await user({ theme: "bbb" });
    const { code } = (await api("/api/referrals", { as: referrer })).body;
    const paid = await user({ paid: true });
    expect((await call("/api/checkout", { as: paid, method: "POST", cookie: `lh_ref=${code}` })).status).toBe(409);
    expect(await referralRows(referrer)).toHaveLength(0);
  });

  it("takes a refunded purchase back out of the referral count", async () => {
    const { referrer, friend, cookie } = await setup();
    await call("/api/checkout", { as: friend, method: "POST", cookie });
    const send = async (event: unknown) => {
      const raw = JSON.stringify(event);
      return worker.fetch(new Request("https://app.example/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": await signStripePayload(raw, "whsec_test", Math.floor(Date.now() / 1000)) }, body: raw }), env());
    };
    await send({ id: "evt_a", type: "checkout.session.completed", data: { object: { id: "cs_ref_2", payment_status: "paid", client_reference_id: friend, amount_total: 4400, currency: "usd", payment_intent: "pi_ref_2" } } });
    expect((await api("/api/referrals", { as: referrer })).body.pending).toBe(1);
    await send({ id: "evt_b", type: "charge.refunded", data: { object: { payment_intent: "pi_ref_2", refunded: true } } });
    expect((await api("/api/referrals", { as: referrer })).body).toMatchObject({ pending: 0, confirmed: 0 });
  });

  it("starts the 14-day clock when the payment is recorded by the webhook", async () => {
    const { referrer, friend, cookie } = await setup();
    await call("/api/checkout", { as: friend, method: "POST", cookie });
    const event = { id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_ref_1", payment_status: "paid", client_reference_id: friend, amount_total: 4400, currency: "usd", payment_intent: "pi_ref_1" } } };
    const raw = JSON.stringify(event);
    const res = await worker.fetch(new Request("https://app.example/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": await signStripePayload(raw, "whsec_test", Math.floor(Date.now() / 1000)) }, body: raw }), env());
    expect(res.status).toBe(200);
    expect((await referralRows(referrer))[0]!.purchased_at).not.toBeNull();
    expect((await api("/api/referrals", { as: referrer })).body).toMatchObject({ pending: 1, confirmed: 0 });
  });
});

describe("rewards: confirmed after the refund window, one credit per three", () => {
  async function friendWhoBought(referrer: string, code: string, ageDays: number, status: "paid" | "refunded" = "paid") {
    const friend = await user();
    await sup`insert into referrals (referrer_id, referral_code, referred_user_id, purchased_at) values (${referrer}, ${code}, ${friend}, now() - ${ageDays}::int * interval '1 day')`;
    await sup`update purchases set status = ${status} where user_id = ${friend}`;
    await sup`insert into purchases (user_id, stripe_session_id, amount, currency, status) select ${friend}, ${`cs_${friend}`}, 4400, 'usd', ${status} where not exists (select 1 from purchases where user_id = ${friend})`;
    return friend;
  }
  const settle = () => settleAllReferrals(env());

  it("only counts a purchase once its 14 days have passed and it is still paid", async () => {
    const referrer = await user();
    const { code } = (await api("/api/referrals", { as: referrer })).body;
    await friendWhoBought(referrer, code, 13);
    await friendWhoBought(referrer, code, 20, "refunded");
    expect(await settle()).toEqual({ confirmed: 0, credits: 0 });
    // the refunded purchase is no longer counted as pending either
    expect((await api("/api/referrals", { as: referrer })).body).toMatchObject({ pending: 1, confirmed: 0 });
    await friendWhoBought(referrer, code, 15);
    expect(await settle()).toEqual({ confirmed: 1, credits: 0 });
    expect((await api("/api/referrals", { as: referrer })).body).toMatchObject({ pending: 1, confirmed: 1, creditsEarned: 0, nextCreditIn: 2 });
  });

  it("grants one credit for every three confirmed referrals, once each, however often it runs", async () => {
    const referrer = await user();
    const { code } = (await api("/api/referrals", { as: referrer })).body;
    for (let i = 0; i < 2; i++) await friendWhoBought(referrer, code, 30);
    expect((await settle()).credits).toBe(0);
    await friendWhoBought(referrer, code, 30);
    expect(await settle()).toEqual({ confirmed: 1, credits: 1 });
    expect(await settle()).toEqual({ confirmed: 0, credits: 0 });
    for (let i = 0; i < 3; i++) await friendWhoBought(referrer, code, 30);
    expect((await settle()).credits).toBe(1);
    expect((await api("/api/referrals", { as: referrer })).body).toMatchObject({ confirmed: 6, creditsEarned: 2, creditsRedeemed: 0, nextCreditIn: 3 });
  });

  it("keeps credits separate for separate referrers", async () => {
    const a = await user();
    const b = await user();
    const codeA = (await api("/api/referrals", { as: a })).body.code;
    const codeB = (await api("/api/referrals", { as: b })).body.code;
    for (let i = 0; i < 3; i++) await friendWhoBought(a, codeA, 30);
    for (let i = 0; i < 2; i++) await friendWhoBought(b, codeB, 30);
    await settle();
    expect((await api("/api/referrals", { as: a })).body.creditsEarned).toBe(1);
    expect((await api("/api/referrals", { as: b })).body.creditsEarned).toBe(0);
  });
});

describe("referral privacy and permissions", () => {
  it("never lets a referrer see who they referred, or change any referral row", async () => {
    const referrer = await user();
    const { code } = (await api("/api/referrals", { as: referrer })).body;
    const friend = await user();
    await sup`insert into referrals (referrer_id, referral_code, referred_user_id) values (${referrer}, ${code}, ${friend})`;
    const sql = appUser();
    try {
      const asReferrer = (fn: (tx: any) => Promise<unknown>) => sql.begin(async (tx) => { await tx`select set_config('app.current_user_id', ${referrer}, true)`; return fn(tx); });
      expect(await asReferrer((tx) => tx`select referrer_id, referral_code from referrals`)).toHaveLength(1);
      await expect(asReferrer((tx) => tx`select referred_user_id from referrals`)).rejects.toThrow(/permission denied/);
      await expect(asReferrer((tx) => tx`select * from referrals`)).rejects.toThrow(/permission denied/);
      await expect(asReferrer((tx) => tx`update referrals set confirmed_at = now()`)).rejects.toThrow(/permission denied/);
      await expect(asReferrer((tx) => tx`insert into referrals (referrer_id, referral_code, referred_user_id) values (${referrer}, 'abcdefgh', 'x')`)).rejects.toThrow(/permission denied/);
      await expect(asReferrer((tx) => tx`insert into referral_credits (user_id) values (${referrer})`)).rejects.toThrow(/permission denied/);
      await expect(asReferrer((tx) => tx`select * from settle_referrals()`)).rejects.toThrow(/system_required/);
      await expect(asReferrer((tx) => tx`select referral_landing('abcdefgh')`)).rejects.toThrow(/system_required/);
      await expect(sql`select attach_referral('abcdefgh')`).rejects.toThrow(/not_authenticated/);
    } finally {
      await sql.end();
    }
    // and the friend sees nothing of the referral either
    const sql2 = appUser();
    try {
      const rows = await sql2.begin(async (tx) => { await tx`select set_config('app.current_user_id', ${friend}, true)`; return tx`select referrer_id from referrals`; });
      expect(rows).toHaveLength(0);
    } finally {
      await sql2.end();
    }
  });
});
