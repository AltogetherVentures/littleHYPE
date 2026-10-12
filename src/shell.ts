import type { Env } from "./index";
import { isThemeSlug } from "../themes/registry";

const ASSET_PREFIXES = ["/assets/"];

/** Files (anything with an extension) and the build's asset folder go straight to static assets. */
export function isAssetPath(pathname: string): boolean {
  if (ASSET_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  const last = pathname.split("/").pop() ?? "";
  return last.includes(".");
}

/** Adds data-theme to the opening <html> tag, unless it is already there. */
export function applyThemeAttribute(html: string, theme: string): string {
  return html.replace(/<html(?![^>]*\sdata-theme=)([^>]*)>/i, `<html$1 data-theme="${theme}">`);
}

/**
 * Serves the SPA's index.html with `data-theme` already on <html>, so the
 * first paint is in the right theme (TH-8). With no theme (signed out, or not
 * yet chosen) the page is served untouched and renders the neutral tokens.
 * Only a registered slug is ever written into the markup.
 */
export async function serveAppShell(env: Env, request: Request, theme: string | null): Promise<Response> {
  const asset = await env.ASSETS.fetch(new Request(new URL("/", request.url)));
  const headers = new Headers(asset.headers);
  // The shell differs per user (theme), so it must never be cached shared.
  headers.set("cache-control", "private, no-store");
  headers.append("vary", "cookie");

  if (!theme || !isThemeSlug(theme) || !asset.ok) {
    return new Response(asset.body, { status: asset.status, headers });
  }
  const html = applyThemeAttribute(await asset.text(), theme);
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(html, { status: asset.status, headers });
}
