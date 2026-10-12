/**
 * The one place a theme's name is registered. Application code (src/, web/src/,
 * shared/) never names a theme: it imports this list, or reads the active
 * theme from the user's profile. test/theme-isolation.test.ts enforces that.
 *
 * Adding a theme = a new themes/<slug>/ folder (tokens.css, strings.json, ...)
 * plus one line here. Keep this file dependency-free: both the Worker and the
 * SPA import it.
 */
export const THEME_SLUGS = ["spacelog", "notebook", "spellbook", "dayzero"] as const;

export type ThemeSlug = (typeof THEME_SLUGS)[number];

export function isThemeSlug(value: unknown): value is ThemeSlug {
  return typeof value === "string" && (THEME_SLUGS as readonly string[]).includes(value);
}
