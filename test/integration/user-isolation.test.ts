import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { withUser } from "../../src/db/user";
import { appUser, deleteUsers, seedUser, superUser } from "./helpers";

/**
 * The user-isolation gate (PV-1) and the theme lock (TH-2), proven against a
 * throwaway Postgres with the real migrations applied - never against Supabase.
 */
const sup = superUser();
const app = appUser();
const created: string[] = [];

async function user(opts?: Parameters<typeof seedUser>[1]) {
  const u = await seedUser(sup, opts);
  created.push(u.userId);
  return u.userId;
}

const asUser = <T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>, isAdmin = false) =>
  withUser(app, { userId, isAdmin }, fn);

afterAll(async () => {
  await deleteUsers(sup, created);
  await sup.end();
  await app.end();
});

describe("row-level security (PV-1)", () => {
  let a: string;
  let b: string;
  beforeAll(async () => {
    a = await user({ paid: true, theme: "aaa" });
    b = await user({ paid: true, theme: "bbb" });
    await sup`insert into user_themes (user_id, theme, source) values (${a}, 'aaa', 'included'), (${b}, 'bbb', 'included')`;
    await sup`insert into theme_changes (user_id, new_theme, changed_by) values (${a}, 'aaa', ${a}), (${b}, 'bbb', ${b})`;
  });

  for (const table of ["profiles", "purchases", "user_themes", "theme_changes"]) {
    it(`${table}: a user sees their own rows and never another user's`, async () => {
      const rows = await asUser(a, (tx) => tx.unsafe<{ user_id: string }[]>(`select user_id from ${table}`));
      expect(rows.length).toBeGreaterThan(0);
      expect(new Set(rows.map((r) => r.user_id))).toEqual(new Set([a]));
    });

    it(`${table}: a query with no user scope returns nothing`, async () => {
      const rows = await app.unsafe(`select user_id from ${table}`);
      expect(rows).toHaveLength(0);
    });
  }

  it("cannot update another user's profile", async () => {
    const result = await asUser(a, (tx) => tx`update profiles set timezone = 'Europe/Dublin' where user_id = ${b}`);
    expect(result.count).toBe(0);
    const [row] = await sup`select timezone from profiles where user_id = ${b}`;
    expect(row!.timezone).toBe("UTC");
  });

  it("cannot create a profile for another user", async () => {
    await expect(
      asUser(a, (tx) => tx`insert into profiles (user_id) values (${"user_someone_else"})`),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot delete profiles", async () => {
    await expect(asUser(a, (tx) => tx`delete from profiles where user_id = ${a}`)).rejects.toThrow(/permission denied/);
  });

  it("the Data API roles have no access to any user table", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const table of ["profiles", "purchases", "user_themes", "theme_changes"]) {
        const [row] = await sup`select has_table_privilege(${role}, ${table}, 'select') as ok`;
        expect(row!.ok, `${role} on ${table}`).toBe(false);
      }
    }
  });
});

describe("theme lock (TH-2)", () => {
  it("app_user cannot write profiles.theme directly - not by insert, not by update", async () => {
    const id = await user({ paid: true });
    await expect(asUser(id, (tx) => tx`update profiles set theme = 'spoofed' where user_id = ${id}`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asUser("user_new_direct", (tx) => tx`insert into profiles (user_id, theme) values ('user_new_direct', 'spoofed')`),
    ).rejects.toThrow(/permission denied/);
    const [row] = await sup`select theme from profiles where user_id = ${id}`;
    expect(row!.theme).toBeNull();
  });

  it("app_user cannot grant itself a theme, a purchase or an audit row", async () => {
    const id = await user({ paid: true });
    await expect(asUser(id, (tx) => tx`insert into user_themes (user_id, theme, source) values (${id}, 'x', 'admin')`)).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asUser(id, (tx) => tx`insert into purchases (user_id, stripe_session_id, amount, currency, status) values (${id}, 'cs_fake', 1, 'usd', 'paid')`),
    ).rejects.toThrow(/permission denied/);
    await expect(asUser(id, (tx) => tx`insert into theme_changes (user_id, new_theme, changed_by) values (${id}, 'x', ${id})`)).rejects.toThrow(
      /permission denied/,
    );
  });

  it("cannot flip a refunded or unrelated purchase to paid", async () => {
    const id = await user({ refunded: true });
    await expect(asUser(id, (tx) => tx`update purchases set status = 'paid' where user_id = ${id}`)).rejects.toThrow(/permission denied/);
  });
});

describe("set_onboarding_theme (TH-1, ON-1)", () => {
  it("refuses without a paid purchase", async () => {
    const id = await user();
    await expect(asUser(id, (tx) => tx`select set_onboarding_theme('aaa')`)).rejects.toThrow("payment_required");
  });

  it("refuses when the only purchase was refunded", async () => {
    const id = await user({ refunded: true });
    await expect(asUser(id, (tx) => tx`select set_onboarding_theme('aaa')`)).rejects.toThrow("payment_required");
  });

  it("sets the theme once, records ownership and writes the audit row", async () => {
    const id = await user({ paid: true });
    const [row] = await asUser(id, (tx) => tx<{ set_onboarding_theme: string }[]>`select set_onboarding_theme('aaa')`);
    expect(row!.set_onboarding_theme).toBe("aaa");

    const [profile] = await sup`select theme from profiles where user_id = ${id}`;
    expect(profile!.theme).toBe("aaa");
    const owned = await sup`select theme, source, purchase_id from user_themes where user_id = ${id}`;
    expect(owned).toHaveLength(1);
    expect(owned[0]).toMatchObject({ theme: "aaa", source: "included" });
    expect(owned[0]!.purchase_id).not.toBeNull();
    const audit = await sup`select old_theme, new_theme, changed_by from theme_changes where user_id = ${id}`;
    expect(audit).toEqual([{ old_theme: null, new_theme: "aaa", changed_by: id }]);
  });

  it("refuses a second choice, even of the same theme", async () => {
    const id = await user({ paid: true });
    await asUser(id, (tx) => tx`select set_onboarding_theme('aaa')`);
    await expect(asUser(id, (tx) => tx`select set_onboarding_theme('bbb')`)).rejects.toThrow("theme_already_chosen");
    await expect(asUser(id, (tx) => tx`select set_onboarding_theme('aaa')`)).rejects.toThrow("theme_already_chosen");
    const [profile] = await sup`select theme from profiles where user_id = ${id}`;
    expect(profile!.theme).toBe("aaa");
  });

  it("rejects malformed slugs", async () => {
    const id = await user({ paid: true });
    for (const bad of ["", "A", "a", "has space", "x'; drop table profiles;--", "a".repeat(40)]) {
      await expect(asUser(id, (tx) => tx`select set_onboarding_theme(${bad})`), bad).rejects.toThrow("invalid_theme");
    }
  });

  it("only ever acts on the scoped user", async () => {
    const victim = await user({ paid: true });
    const attacker = await user({ paid: true });
    await asUser(attacker, (tx) => tx`select set_onboarding_theme('aaa')`);
    const [v] = await sup`select theme from profiles where user_id = ${victim}`;
    expect(v!.theme).toBeNull();
  });

  it("refuses with no user scope", async () => {
    await expect(app`select set_onboarding_theme('aaa')`).rejects.toThrow("not_authenticated");
  });
});

describe("admin_set_theme (TH-3)", () => {
  it("refuses a normal user, even one who is changing their own theme", async () => {
    const id = await user({ paid: true, theme: "aaa" });
    await expect(asUser(id, (tx) => tx`select admin_set_theme(${id}, 'bbb')`)).rejects.toThrow("admin_required");
    const [p] = await sup`select theme from profiles where user_id = ${id}`;
    expect(p!.theme).toBe("aaa");
  });

  it("changes the theme for an admin and audits who, when, old and new", async () => {
    const target = await user({ paid: true, theme: "aaa" });
    const admin = await user();
    await asUser(admin, (tx) => tx`select admin_set_theme(${target}, 'bbb')`, true);

    const [p] = await sup`select theme from profiles where user_id = ${target}`;
    expect(p!.theme).toBe("bbb");
    const audit = await sup`select old_theme, new_theme, changed_by, changed_at from theme_changes where user_id = ${target}`;
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ old_theme: "aaa", new_theme: "bbb", changed_by: admin });
    expect(audit[0]!.changed_at).toBeInstanceOf(Date);
    const owned = await sup`select theme, source from user_themes where user_id = ${target}`;
    expect(owned).toEqual([{ theme: "bbb", source: "admin" }]);
  });

  it("writes nothing when the theme is unchanged", async () => {
    const target = await user({ paid: true, theme: "aaa" });
    const admin = await user();
    await asUser(admin, (tx) => tx`select admin_set_theme(${target}, 'aaa')`, true);
    expect(await sup`select 1 from theme_changes where user_id = ${target}`).toHaveLength(0);
  });

  it("reports an unknown user and malformed slugs", async () => {
    const admin = await user();
    await expect(asUser(admin, (tx) => tx`select admin_set_theme('user_missing', 'aaa')`, true)).rejects.toThrow("user_not_found");
    await expect(asUser(admin, (tx) => tx`select admin_set_theme(${admin}, 'NOPE!')`, true)).rejects.toThrow("invalid_theme");
  });
});
