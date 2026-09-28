import { describe, expect, it } from "vitest";
import { decideThemeRoute } from "../shared/theme-routing";
import { THEME_SLUGS } from "../themes/registry";

const [a, b] = THEME_SLUGS as unknown as [string, string];
const decide = (pathname: string, profileTheme: string | null, search = "") =>
  decideThemeRoute({ pathname, search, profileTheme, themes: THEME_SLUGS });

describe("decideThemeRoute (TH-5)", () => {
  it("serves everything when signed out or no theme chosen yet", () => {
    expect(decide(`/${a}/journal`, null)).toEqual({ action: "serve" });
    expect(decide("/", null)).toEqual({ action: "serve" });
  });

  it("serves a path whose theme matches the profile", () => {
    expect(decide(`/${a}/journal`, a)).toEqual({ action: "serve" });
  });

  it("redirects a mismatched theme to the profile theme, preserving the rest of the path and query", () => {
    expect(decide(`/${b}/habits/42`, a, "?x=1")).toEqual({ action: "redirect", location: `/${a}/habits/42?x=1` });
  });

  it("preserves a trailing slash on deeper paths", () => {
    expect(decide(`/${b}/habits/`, a)).toEqual({ action: "redirect", location: `/${a}/habits/` });
  });

  it("sends another theme's bare showcase URL to the user's Today", () => {
    expect(decide(`/${b}`, a)).toEqual({ action: "redirect", location: `/${a}/today` });
  });

  it("sends a signed-in user at the site root to their Today", () => {
    expect(decide("/", a)).toEqual({ action: "redirect", location: `/${a}/today` });
  });

  it("does not touch neutral routes that are not theme-prefixed", () => {
    expect(decide("/paywall", a)).toEqual({ action: "serve" });
    expect(decide("/sign-in", a)).toEqual({ action: "serve" });
  });

  it("never treats an unregistered first segment as a theme", () => {
    expect(decide("/unknown/journal", a)).toEqual({ action: "serve" });
  });
});
