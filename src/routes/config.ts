import type { Env } from "../index";
import { json } from "../lib/http";

/** Public runtime config for the SPA. The project URL and publishable key are not secrets. */
export async function handleConfigRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (request.method === "GET" && pathname === "/api/config") {
    return json({ supabaseUrl: env.SUPABASE_URL, supabaseAnonKey: env.SUPABASE_ANON_KEY });
  }
  return null;
}
