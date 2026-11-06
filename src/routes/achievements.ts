import type { Env } from "../index";
import { requireAuth } from "../auth/context";
import { getDb } from "../db/client";
import { withUser } from "../db/user";
import { evaluateAchievements, listAchievements, markSeen, unseenAchievements } from "../achievements/service";
import { getUserToday } from "../habits/service";
import { errorResponse, json, readJsonObject } from "../lib/http";
import { getOrCreateMe } from "../profile/service";

export async function handleAchievementRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const method = request.method;
  if (!pathname.startsWith("/api/achievements")) return null;
  const known = (method === "GET" && (pathname === "/api/achievements" || pathname === "/api/achievements/unseen")) || (method === "POST" && pathname === "/api/achievements/seen");
  if (!known) return errorResponse(404, "not_found");

  const claims = await requireAuth(env, request);
  const body = method === "POST" ? await readJsonObject(request) : null;
  if (method === "POST" && (!body || !Array.isArray(body.keys) || body.keys.length > 50 || !body.keys.every((k) => typeof k === "string"))) return errorResponse(400, "invalid_body");

  const sql = getDb(env);
  try {
    return await withUser(sql, claims, async (tx) => {
      await getOrCreateMe(tx, claims.userId);
      if (pathname === "/api/achievements/seen") {
        await markSeen(tx, claims.userId, body!.keys as string[]);
        return json({ ok: true });
      }
      const today = await getUserToday(tx, claims.userId);
      if (pathname === "/api/achievements/unseen") {
        await evaluateAchievements(tx, claims.userId, today);
        return json({ unseen: await unseenAchievements(tx, claims.userId) });
      }
      return json({ achievements: await listAchievements(tx, claims.userId, today) });
    });
  } finally {
    await sql.end();
  }
}
