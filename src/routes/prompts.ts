import type { Env } from "../index";
import { requireAuth } from "../auth/context";
import { getDb } from "../db/client";
import { withUser } from "../db/user";
import { getUserToday } from "../habits/service";
import { errorResponse, json } from "../lib/http";
import { getOrCreateMe } from "../profile/service";
import { getDailyPrompt, skipPrompt } from "../prompts/service";

/** The prompt of the day: read it, or swap it for another. */
export async function handlePromptRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const method = request.method;
  const isGet = method === "GET" && pathname === "/api/prompt";
  const isSkip = method === "POST" && pathname === "/api/prompt/skip";
  if (!isGet && !isSkip) return pathname.startsWith("/api/prompt") ? errorResponse(404, "not_found") : null;

  const claims = await requireAuth(env, request);
  const sql = getDb(env);
  try {
    return await withUser(sql, claims, async (tx) => {
      await getOrCreateMe(tx, claims.userId);
      const today = await getUserToday(tx, claims.userId);
      return json(isSkip ? await skipPrompt(tx, claims.userId, today) : await getDailyPrompt(tx, claims.userId, today));
    });
  } finally {
    await sql.end();
  }
}
