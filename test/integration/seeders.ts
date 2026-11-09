import { randomUUID } from "node:crypto";
import type postgres from "postgres";

/**
 * One seeder per user-owned table, inserting a row (or a few) for a user who already has
 * a profile. The isolation gate seeds two users through these, then proves neither can
 * see the other's rows. A test fails if a table exists without a seeder here, so a new
 * migration cannot add a table that escapes the gate.
 */
type Seeder = (sup: postgres.Sql, userId: string) => Promise<void>;

async function habit(sup: postgres.Sql, userId: string): Promise<string> {
  const id = randomUUID();
  await sup`insert into habits (id, user_id, name, category) values (${id}, ${userId}, 'Seeded', 'other')`;
  return id;
}

export const SEEDERS: Record<string, Seeder> = {
  profiles: async () => {}, // created by seedUser
  purchases: async (sup, userId) => {
    const [row] = await sup`select 1 from purchases where user_id = ${userId}`;
    if (!row) await sup`insert into purchases (user_id, stripe_session_id, amount, currency, status) values (${userId}, ${`cs_${randomUUID()}`}, 4900, 'usd', 'paid')`;
  },
  user_themes: async (sup, userId) => {
    await sup`insert into user_themes (user_id, theme, source) values (${userId}, 'aaa', 'included') on conflict do nothing`;
  },
  theme_changes: async (sup, userId) => {
    await sup`insert into theme_changes (user_id, new_theme, changed_by) values (${userId}, 'aaa', ${userId})`;
  },
  habits: async (sup, userId) => {
    await habit(sup, userId);
  },
  habit_schedule_versions: async (sup, userId) => {
    const id = await habit(sup, userId);
    await sup`insert into habit_schedule_versions (habit_id, user_id, effective_from, schedule) values (${id}, ${userId}, '2026-01-01', '{"type":"daily"}')`;
  },
  habit_logs: async (sup, userId) => {
    const id = await habit(sup, userId);
    await sup`insert into habit_logs (habit_id, user_id, log_date, status) values (${id}, ${userId}, '2026-01-01', 'done')`;
  },
  prompt_history: async (sup, userId) => {
    await sup`insert into prompt_history (user_id, day, seq, prompt_key) values (${userId}, '2026-01-01', 1, 'reflect.proud_of')`;
  },
  streak_break_cards: async (sup, userId) => {
    const id = await habit(sup, userId);
    await sup`insert into streak_break_cards (user_id, habit_id, category, length_days, broken_on) values (${userId}, ${id}, 'other', 9, '2026-01-01')`;
  },
  share_events: async (sup, userId) => {
    await sup`insert into share_events (user_id, card_type, theme) values (${userId}, 'title', 'aaa')`;
  },
  referral_codes: async (sup, userId) => {
    await sup`insert into referral_codes (user_id, code) values (${userId}, ${randomUUID().replace(/[^a-hj-np-z2-9]/g, "").padEnd(8, "k").slice(0, 8)})`;
  },
  referrals: async (sup, userId) => {
    const friend = `user_${randomUUID()}`;
    await sup`insert into profiles (user_id) values (${friend})`;
    await sup`insert into referrals (referrer_id, referral_code, referred_user_id) values (${userId}, 'abcdefgh', ${friend})`;
  },
  referral_credits: async (sup, userId) => {
    await sup`insert into referral_credits (user_id) values (${userId})`;
  },
  admin_actions: async (sup, userId) => {
    await sup`insert into admin_actions (admin_id, action, target_user_id) values (${userId}, 'theme_change', ${userId})`;
  },
  reminder_log: async (sup, userId) => {
    await sup`insert into reminder_log (user_id, sent_on) values (${userId}, '2026-01-01')`;
  },
  user_achievements: async (sup, userId) => {
    await sup`insert into user_achievements (user_id, key) values (${userId}, 'first_entry')`;
  },
  journal_entries: async (sup, userId) => {
    await sup`insert into journal_entries (user_id, entry_date, body) values (${userId}, '2026-01-01', 'Seeded entry')`;
  },
};
