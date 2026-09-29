/**
 * Theme content that is data, not code: prompts, achievements, titles, streak-break cards,
 * habit suggestions (docs/content-brief.md). Discovered from the theme folders at build
 * time; a theme with no file, or a missing key, falls back to themes/default.
 */
import type { AchievementKey } from "@shared/achievement-defs";
import type { HabitCategory } from "@shared/categories";
import type { PromptKey } from "@shared/prompt-keys";

export interface AchievementCopy {
  name: string;
  description: string;
  unlock: string;
}
export interface BreakCardCopy {
  name: string;
  variants: string[];
  restart: string;
}
export interface Suggestion {
  name: string;
  description: string;
}

function bySlug<T>(files: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [path, value] of Object.entries(files)) {
    const slug = /themes\/([^/]+)\//.exec(path)?.[1];
    if (slug) out[slug] = value;
  }
  return out;
}

const prompts = bySlug(import.meta.glob<Record<PromptKey, string>>("../../../themes/*/prompts.json", { eager: true, import: "default" }));
const achievements = bySlug(import.meta.glob<Record<AchievementKey, AchievementCopy>>("../../../themes/*/achievements.json", { eager: true, import: "default" }));
const titles = bySlug(import.meta.glob<Record<string, string>>("../../../themes/*/titles.json", { eager: true, import: "default" }));
const breakCards = bySlug(import.meta.glob<BreakCardCopy>("../../../themes/*/break-cards.json", { eager: true, import: "default" }));
const suggestions = bySlug(import.meta.glob<Record<HabitCategory, Suggestion>>("../../../themes/*/suggestions.json", { eager: true, import: "default" }));

const pick = <T>(table: Record<string, T>, theme: string | null | undefined): T => ((theme && table[theme]) || table["default"]) as T;

export const promptText = (theme: string | null | undefined, key: PromptKey): string => pick(prompts, theme)[key] ?? pick(prompts, null)[key];
export const achievementCopy = (theme: string | null | undefined, key: AchievementKey): AchievementCopy => pick(achievements, theme)[key] ?? pick(achievements, null)[key];
export const titleText = (theme: string | null | undefined, key: string, streak: number): string =>
  (pick(titles, theme)[key] ?? pick(titles, null)[key] ?? "").replace(/\{streak\}/g, String(streak));
export const breakCardCopy = (theme: string | null | undefined): BreakCardCopy => pick(breakCards, theme);
export const suggestionFor = (theme: string | null | undefined, category: HabitCategory): Suggestion => pick(suggestions, theme)[category] ?? pick(suggestions, null)[category];

export function contentSlugs() {
  return { prompts: Object.keys(prompts), achievements: Object.keys(achievements), titles: Object.keys(titles), breakCards: Object.keys(breakCards), suggestions: Object.keys(suggestions) };
}
