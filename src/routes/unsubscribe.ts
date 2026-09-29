import type { Env } from "../index";
import { getDb } from "../db/client";
import { withSystem } from "../db/user";
import { emailConfig } from "../email/resend";
import { verifyUnsubscribe } from "../email/token";
import { errorResponse, json } from "../lib/http";

/**
 * One-click unsubscribe (RM-3). POST only, so a mail scanner that merely fetches the link
 * cannot switch anyone's reminders off; the emailed page and the List-Unsubscribe header
 * both end in this POST. No sign-in: the signed token is the proof.
 */
export async function handleUnsubscribeRoutes(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/unsubscribe") return null;
  if (request.method !== "POST") return errorResponse(405, "method_not_allowed");

  const config = emailConfig(env);
  if (!config) return errorResponse(404, "not_found");
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!(await verifyUnsubscribe(config.tokenSecret, userId, token))) return errorResponse(400, "invalid_token");

  const sql = getDb(env);
  try {
    const changed = await withSystem(sql, async (tx) => (await tx<{ ok: boolean }[]>`select unsubscribe_reminders(${userId}) as ok`)[0]?.ok === true);
    return json({ unsubscribed: true, changed });
  } finally {
    await sql.end();
  }
}
