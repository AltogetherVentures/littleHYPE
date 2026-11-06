import type { Env } from "./index";
import { isThemeSlug } from "../themes/registry";
import { homeMeta, worldMeta, type PageMeta } from "../themes/meta";

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

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** The marketing pages' title, description and share image, written into <head> for crawlers and link previews. */
export function applyPageMeta(html: string, meta: PageMeta, origin: string, path: string): string {
  const title = escapeHtml(meta.title);
  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${escapeHtml(origin + path)}">`,
    `<meta property="og:image" content="${escapeHtml(origin + meta.image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<link rel="canonical" href="${escapeHtml(origin + path)}">`,
  ].join("\n    ");
  return html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>\n    ${tags}`);
}

/** Which marketing page, if any, a signed-out path is. */
export function metaFor(pathname: string): PageMeta | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/") return homeMeta();
  const m = /^\/([a-z]+)$/.exec(clean);
  return m ? worldMeta(m[1]!) : null;
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

  if (!asset.ok) return new Response(asset.body, { status: asset.status, headers });
  const url = new URL(request.url);
  const meta = theme ? null : metaFor(url.pathname);
  if (!meta && (!theme || !isThemeSlug(theme))) {
    return new Response(asset.body, { status: asset.status, headers });
  }
  let html = await asset.text();
  if (meta) html = applyPageMeta(html, meta, url.origin, url.pathname.replace(/\/+$/, "") || "/");
  if (theme && isThemeSlug(theme)) html = applyThemeAttribute(html, theme);
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(html, { status: asset.status, headers });
}
