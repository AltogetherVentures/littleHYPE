import type { Env } from "../index";
import { requireAuth } from "../auth/context";
import { getDb } from "../db/client";
import { withUser } from "../db/user";
import { errorResponse, json, readJsonObject } from "../lib/http";
import { completeOnboarding } from "../profile/onboarding";
import { chooseOnboardingTheme, getOrCreateMe, parseReminderTime, setReminderTime, setTimezone } from "../profile/service";

/** The signed-in user's own account: state, timezone, and the one-time theme pick. */
export async function handleMeRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const method = request.method;

  if (method === "GET" && pathname === "/api/me") {
    const claims = await requireAuth(env, request);
    const sql = getDb(env);
    try {
      const me = await withUser(sql, claims, (tx) => getOrCreateMe(tx, claims.userId));
      return json({ ...me, isAdmin: claims.isAdmin });
    } finally {
      await sql.end();
    }
  }

  if (method === "PUT" && pathname === "/api/me/timezone") {
    const claims = await requireAuth(env, request);
    const body = await readJsonObject(request);
    if (!body) return errorResponse(400, "invalid_body");
    const sql = getDb(env);
    try {
      await withUser(sql, claims, async (tx) => {
        await getOrCreateMe(tx, claims.userId);
        await setTimezone(tx, claims.userId, body.timezone as string);
      });
      return json({ ok: true });
    } finally {
      await sql.end();
    }
  }

  if (method === "PUT" && pathname === "/api/me/reminder") {
    const claims = await requireAuth(env, request);
    const body = await readJsonObject(request);
    if (!body) return errorResponse(400, "invalid_body");
    const sql = getDb(env);
    try {
      const time = parseReminderTime(body.time);
      await withUser(sql, claims, async (tx) => {
        await getOrCreateMe(tx, claims.userId);
        await setReminderTime(tx, claims.userId, time);
      });
      return json({ reminderTime: time });
    } finally {
      await sql.end();
    }
  }

  if (method === "POST" && pathname === "/api/onboarding/complete") {
    const claims = await requireAuth(env, request);
    const body = await readJsonObject(request);
    if (!body) return errorResponse(400, "invalid_body");
    const sql = getDb(env);
    try {
      const result = await withUser(sql, claims, async (tx) => {
        await getOrCreateMe(tx, claims.userId);
        return completeOnboarding(tx, claims.userId, body);
      });
      return json(result);
    } finally {
      await sql.end();
    }
  }

  if (method === "POST" && pathname === "/api/onboarding/theme") {
    const claims = await requireAuth(env, request);
    const body = await readJsonObject(request);
    if (!body) return errorResponse(400, "invalid_body");
    const sql = getDb(env);
    try {
      const theme = await withUser(sql, claims, async (tx) => {
        await getOrCreateMe(tx, claims.userId);
        return chooseOnboardingTheme(tx, body.theme);
      });
      return json({ theme });
    } finally {
      await sql.end();
    }
  }

  return null;
}
