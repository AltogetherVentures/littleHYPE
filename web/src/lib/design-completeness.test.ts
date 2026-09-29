import { describe, expect, it } from "vitest";
import { THEME_SLUGS } from "@themes/registry";
import { artFor, themesWithArt, type ArtName } from "./art";
import { calendarFor, headerFor, themesWithCalendarOverride, themesWithHeaderOverride } from "./overrides";
import { DefaultCalendar } from "../components/DefaultCalendar";
import { DefaultHeader } from "../components/DefaultHeader";

/**
 * TH-14 / the theme brief: every launch theme is a distinct experience, not a
 * colour swap. That means each one ships its own artwork and its own header,
 * not just tokens and strings. A new theme that skips these fails the build.
 */
describe("every launch theme ships a full design", () => {
  const names: ArtName[] = ["hero", "habits", "prompt"];

  it("has its own artwork for every illustration slot", () => {
    expect(themesWithArt().sort()).toEqual([...THEME_SLUGS].sort());
    for (const slug of THEME_SLUGS) {
      for (const name of names) {
        const own = artFor(slug, name);
        const fallback = artFor(null, name);
        expect(own, `${slug}/${name}`).toBeTruthy();
        expect(own, `${slug}/${name} must not just be the default art`).not.toBe(fallback);
      }
    }
  });

  it("has its own header component rather than the neutral one", () => {
    expect(themesWithHeaderOverride().sort()).toEqual([...THEME_SLUGS].sort());
    for (const slug of THEME_SLUGS) expect(headerFor(slug)).not.toBe(DefaultHeader);
  });

  it("has its own calendar component (TH-11) rather than the neutral one", () => {
    expect(themesWithCalendarOverride().sort()).toEqual([...THEME_SLUGS].sort());
    for (const slug of THEME_SLUGS) expect(calendarFor(slug)).not.toBe(DefaultCalendar);
  });

  it("falls back to the neutral header and art for an unknown theme", () => {
    expect(headerFor("nosuchtheme")).toBe(DefaultHeader);
    expect(headerFor(null)).toBe(DefaultHeader);
    expect(calendarFor("nosuchtheme")).toBe(DefaultCalendar);
    expect(artFor("nosuchtheme", "hero")).toBe(artFor(null, "hero"));
  });
});
