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
};
