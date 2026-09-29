import type { Env } from "../index";
import { json } from "../lib/http";

/** Public runtime config for the SPA. The publishable key is not a secret. */
export async function handleConfigRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (request.method === "GET" && pathname === "/api/config") {
    return json({ clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY });
  }
  return null;
}
