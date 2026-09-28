import type { Env } from "../index";
import { requireAdmin } from "../auth/context";
import { getDb } from "../db/client";
import { withUser } from "../db/user";
import { errorResponse, json, readJsonObject } from "../lib/http";
import { matchPath } from "../lib/router";
import { adminSetTheme } from "../profile/service";

/**
 * Internal-team actions. These touch the profile and its audit log only:
 * staff never read journal content through admin tools (PV-3).
 */
export async function handleAdminRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);

  const params = request.method === "POST" ? matchPath("/api/admin/users/:userId/theme", pathname) : null;
  if (params) {
    const claims = await requireAdmin(env, request);
    const body = await readJsonObject(request);
    if (!body) return errorResponse(400, "invalid_body");
    const sql = getDb(env);
    try {
      const theme = await withUser(sql, claims, (tx) => adminSetTheme(tx, params.userId!, body.theme));
      return json({ theme });
    } finally {
      await sql.end();
    }
  }
  return null;
}
