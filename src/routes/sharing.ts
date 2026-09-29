import type { Env } from "../index";
import { requireAuth } from "../auth/context";
import { getDb } from "../db/client";
import { withSystem, withUser } from "../db/user";
import { getUserToday } from "../habits/service";
import { errorResponse, json, readJsonObject } from "../lib/http";
import { matchPath } from "../lib/router";
import { getOrCreateMe } from "../profile/service";
import { referralLandingTheme, referralStats } from "../referrals/service";
import { buildShareCard } from "../sharing/card";
import { currentTitle, dismissBreakCard, pendingBreakCard, recordShare } from "../sharing/service";
import { REFERRAL_CODE_PATTERN, REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from "../../shared/sharing";

/** Titles, streak-break cards, share counts and referrals. The /r/<code> landing is public. */
export async function handleSharingRoutes(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  const landing = matchPath("/r/:code", pathname);
  if (landing && (method === "GET" || method === "HEAD")) return referralLanding(landing.code!, url, env);

  const isApi = pathname === "/api/title" || pathname === "/api/break-card" || pathname === "/api/share-events" || pathname === "/api/referrals" || pathname === "/api/share/card" || pathname.startsWith("/api/break-card/");
  if (!isApi) return null;

  const claims = await requireAuth(env, request);
  const dismiss = matchPath("/api/break-card/:id/dismiss", pathname);
  const body = method === "POST" && pathname === "/api/share-events" ? await readJsonObject(request) : null;

  const sql = getDb(env);
  try {
    return await withUser(sql, claims, async (tx) => {
      await getOrCreateMe(tx, claims.userId);
      const userId = claims.userId;
      const today = await getUserToday(tx, userId);
      if (method === "GET" && pathname === "/api/title") return json({ title: await currentTitle(tx, userId, today) });
      if (method === "GET" && pathname === "/api/break-card") return json({ card: await pendingBreakCard(tx, userId, today) });
      if (method === "POST" && dismiss) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(dismiss.id!)) return errorResponse(404, "card_not_found");
        await dismissBreakCard(tx, userId, dismiss.id!);
        return json({ ok: true });
      }
      if (method === "POST" && pathname === "/api/share-events") {
        if (!body || (body.cardType !== "title" && body.cardType !== "break")) return errorResponse(400, "invalid_card_type");
        await recordShare(tx, userId, body.cardType);
        return json({ ok: true });
      }
      if (method === "GET" && pathname === "/api/share/card") {
        const type = url.searchParams.get("type");
        const format = url.searchParams.get("format") ?? "story";
        if ((type !== "title" && type !== "break") || (format !== "story" && format !== "square")) return errorResponse(400, "invalid_card_request");
        const svg = await buildShareCard(tx, userId, today, env.PUBLIC_BASE_URL, { type, format, showName: url.searchParams.get("showName") === "1", cardId: url.searchParams.get("card") });
        return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "private, no-store" } });
      }
      if (method === "GET" && pathname === "/api/referrals") {
        const stats = await referralStats(tx, userId);
        return json({ ...stats, link: `${env.PUBLIC_BASE_URL}/r/${stats.code}` });
      }
      return errorResponse(404, "not_found");
    });
  } finally {
    await sql.end();
  }
}

/**
 * littleHYPE.com/r/<code> (SH-11): remember the referrer for 30 days (SH-12) and open the showcase
 * for the sharer's theme. An unknown code changes nothing and just lands on the home page.
 */
async function referralLanding(code: string, url: URL, env: Env): Promise<Response> {
  const home = new URL("/", url).toString();
  if (!REFERRAL_CODE_PATTERN.test(code)) return redirect(home);
  const sql = getDb(env);
  let theme: string | null = null;
  try {
    theme = await withSystem(sql, (tx) => referralLandingTheme(tx, code));
  } catch (err) {
    console.error("referral-landing-failed", err instanceof Error ? err.message : "unknown");
  } finally {
    await sql.end();
  }
  if (!theme) return redirect(home);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  return redirect(new URL(`/${theme}`, url).toString(), `${REFERRAL_COOKIE}=${code}; Max-Age=${REFERRAL_COOKIE_DAYS * 86400}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ location, "cache-control": "private, no-store" });
  if (cookie) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}
