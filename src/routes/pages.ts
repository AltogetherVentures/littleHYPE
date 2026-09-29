import type { Env } from "../index";
import { verifyClerkRequest } from "../auth/clerk";
import { getDb } from "../db/client";
import { withUser } from "../db/user";
import { getSavedTheme } from "../profile/service";
import { isAssetPath, serveAppShell } from "../shell";
import { decideThemeRoute } from "../../shared/theme-routing";
import { THEME_SLUGS, isThemeSlug } from "../../themes/registry";

/**
 * The saved theme for a page navigation, or null when there is no usable
 * session. Never throws: the SPA re-checks against /api/me and corrects the
 * URL and data-theme itself, so a failure here costs a flash, not correctness.
 * It is logged so it cannot fail silently.
 */
async function resolveSessionTheme(env: Env, request: Request): Promise<string | null> {
  try {
    const claims = await verifyClerkRequest(env, request);
    if (!claims) return null;
    const sql = getDb(env);
    try {
      const saved = await withUser(sql, claims, (tx) => getSavedTheme(tx, claims.userId));
      // Only a registered slug is ever routed to or written into markup.
      return isThemeSlug(saved) ? saved : null;
    } finally {
      await sql.end();
    }
  } catch (err) {
    console.error("theme-resolve-failed", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Everything that is not an API route: static files, or the SPA shell with theme routing. */
export async function handlePageRoutes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if ((request.method !== "GET" && request.method !== "HEAD") || isAssetPath(url.pathname)) {
    return env.ASSETS.fetch(request);
  }

  const theme = await resolveSessionTheme(env, request);
  const decision = decideThemeRoute({
    pathname: url.pathname,
    search: url.search,
    profileTheme: theme,
    themes: THEME_SLUGS,
  });
  if (decision.action === "redirect") {
    return new Response(null, {
      status: 302,
      headers: { location: new URL(decision.location, url).toString(), "cache-control": "private, no-store" },
    });
  }
  return serveAppShell(env, request, theme);
}
