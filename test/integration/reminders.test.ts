import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../../src/index";
import { runReminders } from "../../src/email/reminders";
import { signUnsubscribe } from "../../src/email/token";
import { EMAILS } from "../../themes/emails";
import { appUser, deleteUsers, requireEnv, seedUser, superUser } from "./helpers";

vi.mock("../../src/auth/clerk", () => ({
  verifyClerkRequest: vi.fn(async (_env: unknown, request: Request) => {
    const userId = request.headers.get("x-test-user");
    return userId ? { userId, isAdmin: false } : null;
  }),
}));

const SECRET = "test-token-secret";
const env = (over: Partial<Env> = {}): Env => ({
  ENVIRONMENT: "test",
  HYPERDRIVE: { connectionString: requireEnv("PG_APP_URL") } as Hyperdrive,
  ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
  CLERK_PUBLISHABLE_KEY: "pk_test_abc",
  CLERK_SECRET_KEY: "sk_test_abc",
  CLERK_JWT_KEY: "unused",
  PUBLIC_BASE_URL: "https://app.example",
  RESEND_API_KEY: "re_test",
  RESEND_FROM: "littleHYPE <reminders@example.test>",
  EMAIL_TOKEN_SECRET: SECRET,
  ...over,
});

const sup = superUser();
const created: string[] = [];

/** A paid, onboarded user with a reminder at `time` in `timezone`. */
async function person(opts: { time?: string | null; timezone?: string; theme?: string | null; paid?: boolean; onboarded?: boolean } = {}) {
  const u = await seedUser(sup, { paid: opts.paid ?? true, theme: opts.theme === undefined ? "spacelog" : (opts.theme ?? undefined) });
  created.push(u.userId);
  await sup`update profiles set reminder_time = ${opts.time === undefined ? "20:00" : opts.time}::time, timezone = ${opts.timezone ?? "UTC"},
                               onboarded_at = ${opts.onboarded === false ? null : sup`now()`} where user_id = ${u.userId}`;
  return u.userId;
}
const habit = async (u: string) => (await sup`insert into habits (user_id, name) values (${u}, 'h') returning id`)[0]!.id as string;
const logHabit = (u: string, h: string, day: string, status = "done") => sup`insert into habit_logs (habit_id, user_id, log_date, status) values (${h}, ${u}, ${day}, ${status})`;
const write = (u: string, day: string, body = "words") => sup`insert into journal_entries (user_id, entry_date, body) values (${u}, ${day}, ${body})`;

let sent: { to: string; subject: string; headers: Record<string, string>; text: string; html: string; key: string }[];
let resendStatus = 200;
let clerkStatus = 200;
const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.startsWith("https://api.clerk.com/v1/users/")) {
    if (clerkStatus !== 200) return new Response("no", { status: clerkStatus });
    const id = decodeURIComponent(u.split("/").pop()!);
    return Response.json({ primary_email_address_id: "e1", email_addresses: [{ id: "e1", email_address: `${id}@mail.test` }] });
  }
  if (u === "https://api.resend.com/emails") {
    if (resendStatus !== 200) return new Response("fail", { status: resendStatus });
    const body = JSON.parse(String(init!.body));
    sent.push({ to: body.to[0], subject: body.subject, headers: body.headers, text: body.text, html: body.html, key: (init!.headers as Record<string, string>)["idempotency-key"]! });
    return Response.json({ id: "email_1" });
  }
  throw new Error(`unexpected fetch ${u}`);
});

// 2026-09-30 in Dublin is BST (UTC+1): 20:00 local = 19:00 UTC.
const at = (utc: string) => new Date(`2026-09-30T${utc}:00Z`);
const recipients = () => sent.map((s) => s.to);

beforeEach(() => {
  sent = [];
  resendStatus = 200;
  clerkStatus = 200;
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // reminders look across every user, so each test starts from an empty set of people
  await deleteUsers(sup, created.splice(0));
});
afterAll(async () => {
  await deleteUsers(sup, created);
  await sup.end();
});

describe("reminder emails: switched off until configured", () => {
  it("does nothing, and says so, without the three secrets", async () => {
    const u = await person({ timezone: "Europe/Dublin" });
    for (const missing of ["RESEND_API_KEY", "RESEND_FROM", "EMAIL_TOKEN_SECRET"] as const) {
      const run = await runReminders(env({ [missing]: undefined }), at("19:05"));
      expect(run).toEqual({ enabled: false, due: 0, sent: 0, failed: 0 });
    }
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("reminders-disabled"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await sup`select 1 from reminder_log where user_id = ${u}`).length).toBe(0);
  });
});

describe("who gets a reminder, and when", () => {
  it("sends once, at the person's own local time, in their theme", async () => {
    const u = await person({ timezone: "Europe/Dublin", theme: "dayzero" });
    expect((await runReminders(env(), at("18:55"))).due).toBe(0); // 19:55 local: not yet
    const run = await runReminders(env(), at("19:05")); // 20:05 local
    expect(run).toMatchObject({ enabled: true, due: 1, sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: `${u}@mail.test`, subject: EMAILS.dayzero!.copy.subject });
    expect(sent[0]!.html).toContain("https://app.example/dayzero/today");
    // running again, even a few times, never sends a second one for the same local day
    await runReminders(env(), at("19:20"));
    await runReminders(env(), at("19:35"));
    expect(sent).toHaveLength(1);
    // and the next local day gets its own
    await runReminders(env(), new Date("2026-10-01T19:05:00Z"));
    expect(sent).toHaveLength(2);
  });

  it("carries a working one-click unsubscribe link and header", async () => {
    const u = await person({ timezone: "Europe/Dublin" });
    await runReminders(env(), at("19:05"));
    const token = await signUnsubscribe(SECRET, u);
    expect(sent[0]!.headers["List-Unsubscribe"]).toBe(`<https://app.example/api/unsubscribe?u=${encodeURIComponent(u)}&t=${token}>`);
    expect(sent[0]!.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sent[0]!.text).toContain(`https://app.example/unsubscribe?u=${encodeURIComponent(u)}&t=${token}`);
  });

  it("catches up a missed run for up to two hours, but never later", async () => {
    await person({ timezone: "Europe/Dublin" });
    expect((await runReminders(env(), at("20:59"))).sent).toBe(1); // 21:59 local, within the grace
    await sup`delete from reminder_log`;
    expect((await runReminders(env(), at("21:05"))).due).toBe(0); // 22:05 local, too late
  });

  it("follows timezones on both sides of the date line", async () => {
    const early = await person({ timezone: "Pacific/Kiritimati" }); // UTC+14
    const late = await person({ timezone: "Pacific/Pago_Pago" }); // UTC-11
    // 06:05 UTC on 30 Sept = 20:05 local on 30 Sept in Kiritimati, but 19:05 on 29 Sept in Pago Pago
    await runReminders(env(), at("06:05"));
    expect(recipients()).toEqual([`${early}@mail.test`]);
    // 07:05 UTC on 1 Oct = 20:05 on 30 Sept in Pago Pago
    await runReminders(env(), new Date("2026-10-01T07:05:00Z"));
    expect(recipients()).toContain(`${late}@mail.test`);
  });

  it("skips someone who has both checked in and written today", async () => {
    const u = await person({ timezone: "Europe/Dublin" });
    await logHabit(u, await habit(u), "2026-09-30");
    await write(u, "2026-09-30");
    expect((await runReminders(env(), at("19:05"))).due).toBe(0);
  });

  it("still sends if they only checked in, only wrote, or did neither", async () => {
    const checked = await person({ timezone: "Europe/Dublin" });
    await logHabit(checked, await habit(checked), "2026-09-30");
    const wrote = await person({ timezone: "Europe/Dublin" });
    await habit(wrote);
    await write(wrote, "2026-09-30");
    const neither = await person({ timezone: "Europe/Dublin" });
    await habit(neither);
    await runReminders(env(), at("19:05"));
    expect(recipients().sort()).toEqual([`${checked}@mail.test`, `${wrote}@mail.test`, `${neither}@mail.test`].sort());
  });

  it("counts a rest day as checked in, and a person with no habits as checked in", async () => {
    const rested = await person({ timezone: "Europe/Dublin" });
    await logHabit(rested, await habit(rested), "2026-09-30", "skipped");
    await write(rested, "2026-09-30");
    const habitless = await person({ timezone: "Europe/Dublin" });
    await write(habitless, "2026-09-30");
    const habitlessBlank = await person({ timezone: "Europe/Dublin" });
    expect((await runReminders(env(), at("19:05"))).sent).toBe(1);
    expect(recipients()).toEqual([`${habitlessBlank}@mail.test`]);
  });

  it("ignores whitespace-only entries, yesterday's activity and archived habits", async () => {
    const u = await person({ timezone: "Europe/Dublin" });
    const h = await habit(u);
    await logHabit(u, h, "2026-09-29");
    await write(u, "2026-09-30", "   \n ");
    await write(u, "2026-09-29");
    await sup`update habits set archived_at = now() where id = ${h}`; // no active habits left, but nothing written today
    expect((await runReminders(env(), at("19:05"))).sent).toBe(1);
  });

  it("only reaches paid, onboarded users with a theme and a reminder time", async () => {
    await person({ timezone: "Europe/Dublin", paid: false });
    await person({ timezone: "Europe/Dublin", onboarded: false });
    await person({ timezone: "Europe/Dublin", theme: null });
    await person({ timezone: "Europe/Dublin", time: null });
    const ok = await person({ timezone: "Europe/Dublin" });
    await runReminders(env(), at("19:05"));
    expect(recipients()).toEqual([`${ok}@mail.test`]);
  });

  it("never puts journal text in the email or the logs", async () => {
    const u = await person({ timezone: "Europe/Dublin" });
    await habit(u);
    await write(u, "2026-09-30", "PRIVATE-MARKER-thoughts");
    await runReminders(env(), at("19:05"));
    expect(sent).toHaveLength(1);
    const everything = JSON.stringify([sent, fetchMock.mock.calls, (console.log as any).mock.calls, (console.error as any).mock.calls, (console.warn as any).mock.calls]);
    expect(everything).not.toContain("PRIVATE-MARKER");
  });
});

describe("when sending goes wrong", () => {
  it("gives the day back when the email service fails, and retries on the next run", async () => {
    const u = await person({ timezone: "Europe/Dublin" });
    resendStatus = 500;
    expect(await runReminders(env(), at("19:05"))).toMatchObject({ due: 1, sent: 0, failed: 1 });
    expect((await sup`select 1 from reminder_log where user_id = ${u}`).length).toBe(0);
    resendStatus = 200;
    expect((await runReminders(env(), at("19:20"))).sent).toBe(1);
  });

  it("skips loudly, and retries later, when the address cannot be looked up", async () => {
    const u = await person({ timezone: "Europe/Dublin" });
    clerkStatus = 500;
    expect(await runReminders(env(), at("19:05"))).toMatchObject({ sent: 0, failed: 1 });
    expect(console.error).toHaveBeenCalledWith("reminder-skipped", expect.objectContaining({ userId: u, reason: "no-email-address" }));
    clerkStatus = 200;
    expect((await runReminders(env(), at("19:20"))).sent).toBe(1);
  });

  it("does not let two overlapping runs send twice", async () => {
    await person({ timezone: "Europe/Dublin" });
    await Promise.all([runReminders(env(), at("19:05")), runReminders(env(), at("19:05")), runReminders(env(), at("19:05"))]);
    expect(sent).toHaveLength(1);
  });
});

describe("the database functions are for the system only", () => {
  it("refuse a user, an admin, and a request with no role", async () => {
    const sql = appUser();
    try {
      for (const role of ["user", "admin", ""]) {
        for (const query of [
          (tx: any) => tx`select * from reminder_candidates(now())`,
          (tx: any) => tx`select claim_reminder('x', current_date)`,
          (tx: any) => tx`select release_reminder('x', current_date)`,
          (tx: any) => tx`select unsubscribe_reminders('x')`,
        ]) {
          await expect(
            sql.begin(async (tx) => {
              await tx`select set_config('app.current_role', ${role}, true)`;
              await query(tx);
            }),
          ).rejects.toThrow(/system_required/);
        }
      }
    } finally {
      await sql.end();
    }
  });

  it("cannot be used to read anyone's rows through the ordinary tables", async () => {
    const u = await person({ timezone: "Europe/Dublin" });
    await runReminders(env(), at("19:05"));
    const sql = appUser();
    try {
      const rows = await sql.begin(async (tx) => {
        await tx`select set_config('app.current_user_id', 'someone-else', true)`;
        return tx`select * from reminder_log where user_id = ${u}`;
      });
      expect(rows).toHaveLength(0);
    } finally {
      await sql.end();
    }
  });
});

describe("one-click unsubscribe", () => {
  const post = (query: string, e: Env = env()) => worker.fetch(new Request(`https://app.example/api/unsubscribe?${query}`, { method: "POST" }), e);

  it("turns the reminder off with a valid link, without signing in, and leaves everyone else alone", async () => {
    const u = await person();
    const other = await person();
    const token = await signUnsubscribe(SECRET, u);
    const res = await post(`u=${encodeURIComponent(u)}&t=${token}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ unsubscribed: true, changed: true });
    expect((await sup`select reminder_time from profiles where user_id = ${u}`)[0]!.reminder_time).toBeNull();
    expect((await sup`select reminder_time from profiles where user_id = ${other}`)[0]!.reminder_time).not.toBeNull();
    // clicking again is harmless
    expect(await (await post(`u=${encodeURIComponent(u)}&t=${token}`)).json()).toEqual({ unsubscribed: true, changed: false });
  });

  it("refuses a forged, borrowed or missing token, and changes nothing", async () => {
    const u = await person();
    const other = await person();
    const othersToken = await signUnsubscribe(SECRET, other);
    for (const query of [`u=${encodeURIComponent(u)}&t=${othersToken}`, `u=${encodeURIComponent(u)}&t=${"0".repeat(64)}`, `u=${encodeURIComponent(u)}`, `t=${othersToken}`, ""]) {
      expect((await post(query)).status, query).toBe(400);
    }
    expect((await sup`select reminder_time from profiles where user_id = ${u}`)[0]!.reminder_time).not.toBeNull();
  });

  it("only acts on POST, so a mail scanner fetching the link changes nothing", async () => {
    const u = await person();
    const token = await signUnsubscribe(SECRET, u);
    const res = await worker.fetch(new Request(`https://app.example/api/unsubscribe?u=${encodeURIComponent(u)}&t=${token}`), env());
    expect(res.status).toBe(405);
    expect((await sup`select reminder_time from profiles where user_id = ${u}`)[0]!.reminder_time).not.toBeNull();
  });

  it("does not exist while emails are switched off", async () => {
    expect((await post("u=x&t=y", env({ EMAIL_TOKEN_SECRET: undefined }))).status).toBe(404);
  });
});
