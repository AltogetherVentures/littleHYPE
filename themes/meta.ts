/**
 * What the Worker needs to write a page title, description and share image into the HTML
 * for the signed-out marketing pages, without the SPA's string loader. Each theme's strings
 * are imported by name (the Worker bundler has no glob imports); test/emails.test.ts keeps
 * this list in step with the registry.
 */
import dayzero from "./dayzero/strings.json";
import defaults from "./default/strings.json";
import notebook from "./notebook/strings.json";
import spacelog from "./spacelog/strings.json";
import spellbook from "./spellbook/strings.json";

type Strings = Record<string, string>;
const THEMES: Record<string, Strings> = { spacelog, notebook, spellbook, dayzero };

export interface PageMeta {
  title: string;
  description: string;
  /** Path of the share image, relative to the site root. */
  image: string;
}

const D = defaults as Strings;

/** Meta for the home page. */
export function homeMeta(): PageMeta {
  return { title: `${D["app.name"]}: ${D["landing.heading"]}`, description: D["landing.body"]!, image: "/worlds/spacelog-today-desktop.jpg" };
}

/** Meta for a world's product page, or null for an unknown slug. */
export function worldMeta(slug: string): PageMeta | null {
  const s = THEMES[slug];
  if (!s) return null;
  return { title: `${s["theme.name"]} by ${D["app.name"]}`, description: s["theme.tagline"] ?? D["landing.body"]!, image: `/worlds/${slug}-today-desktop.jpg` };
}

export const META_THEMES = Object.keys(THEMES);
