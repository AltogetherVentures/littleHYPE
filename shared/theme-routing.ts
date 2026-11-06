/**
 * Theme-prefixed routing (TH-4, TH-5, TH-6). The profile's theme is the source
 * of truth; the URL is corrected to match it. This one pure function is used by
 * the Worker (server-side redirect before first paint) and by the SPA (client
 * side mirror), so the two can never disagree. It takes the list of valid
 * slugs as an argument and never names a theme itself.
 */
export type ThemeRouteDecision = { action: "serve" } | { action: "redirect"; location: string };

export interface ThemeRouteInput {
  pathname: string;
  search?: string;
  /** The signed-in user's saved theme, or null when signed out / not yet chosen. */
  profileTheme: string | null;
  themes: readonly string[];
}

/** Where a signed-in user lands when they open the bare site root. */
export const DEFAULT_APP_PAGE = "today";

export function decideThemeRoute(input: ThemeRouteInput): ThemeRouteDecision {
  const { pathname, profileTheme, themes } = input;
  const search = input.search ?? "";
  if (!profileTheme) return { action: "serve" };

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (segments.length === 0) {
    return { action: "redirect", location: `/${profileTheme}/${DEFAULT_APP_PAGE}${search}` };
  }
  if (first !== undefined && themes.includes(first) && first !== profileTheme) {
    const rest = segments.slice(1).join("/");
    // A bare `/<other-theme>` (its showcase) lands on the user's Today.
    const target = rest === "" ? DEFAULT_APP_PAGE : rest;
    const trailing = pathname.endsWith("/") && rest !== "" ? "/" : "";
    return { action: "redirect", location: `/${profileTheme}/${target}${trailing}${search}` };
  }
  return { action: "serve" };
}
