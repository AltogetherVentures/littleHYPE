import { describe, expect, it } from "vitest";
import { THEME_SLUGS } from "@themes/registry";
import { NEUTRAL_KEY, WAYFINDING_KEY, defaultKeys, tableFor, themeSlugsWithTables, translate } from "./strings";

describe("string tables (TH-10, TH-13, NF-7)", () => {
  it("loads a table for every registered theme", () => {
    expect(themeSlugsWithTables().sort()).toEqual([...THEME_SLUGS].sort());
  });

  it("only defines keys that exist in the default table", () => {
    const known = new Set(defaultKeys());
    for (const slug of THEME_SLUGS) {
      for (const key of Object.keys(tableFor(slug) ?? {})) {
        expect(known.has(key), `${slug}: unknown key ${key}`).toBe(true);
      }
    }
  });

  it("never lets a theme override billing, privacy, deletion or auth copy", () => {
    for (const slug of THEME_SLUGS) {
      const overridden = Object.keys(tableFor(slug) ?? {}).filter((k) => NEUTRAL_KEY.test(k));
      expect(overridden, slug).toEqual([]);
    }
  });

  it("never lets a theme rename the tabs, page titles or buttons people find their way by", () => {
    for (const slug of THEME_SLUGS) {
      const overridden = Object.keys(tableFor(slug) ?? {}).filter((k) => WAYFINDING_KEY.test(k));
      expect(overridden, slug).toEqual([]);
      for (const key of ["nav.settings", "nav.journal", "habits.add", "journal.new", "habit.action.skip"] as const) {
        expect(translate(slug, key)).toBe(translate(null, key));
      }
    }
  });

  it("gives every theme a name, tagline and preview line for the picker", () => {
    for (const slug of THEME_SLUGS) {
      for (const key of ["theme.name", "theme.tagline", "theme.preview"] as const) {
        expect(tableFor(slug)?.[key], `${slug} ${key}`).toBeTruthy();
      }
    }
  });

  it("uses the theme's wording, and falls back to the default for a missing key", () => {
    const [slug] = THEME_SLUGS;
    expect(translate(slug, "today.title")).not.toBe(translate(null, "today.title"));
    expect(translate(slug, "landing.heading")).toBe(translate(null, "landing.heading"));
  });

  it("always uses the default wording for neutral keys, even inside a theme", () => {
    const [slug] = THEME_SLUGS;
    expect(translate(slug, "paywall.heading")).toBe(translate(null, "paywall.heading"));
  });

  it("interpolates variables and leaves unknown placeholders visible", () => {
    expect(translate(null, "picker.choose", { name: "X" })).toBe("Choose X");
    expect(translate(null, "picker.choose")).toContain("{name}");
  });
});
