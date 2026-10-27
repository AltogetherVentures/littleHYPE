import type { Env } from "../index";
import { getDb } from "../db/client";
import { json } from "../lib/http";

export async function handleHealthRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (request.method !== "GET") return null;

  if (pathname === "/health") return json({ ok: true, environment: env.ENVIRONMENT });

  if (pathname === "/health/db") {
    const sql = getDb(env);
    try {
      await sql`select 1`;
      return json({ ok: true });
    } catch (err) {
      console.error("health-db-failed", err instanceof Error ? err.message : err);
      return json({ ok: false }, 503);
    } finally {
      await sql.end();
    }
  }
  return null;
}
