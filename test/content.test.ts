import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_KEYS } from "../shared/achievement-defs";
import { HABIT_CATEGORIES } from "../shared/categories";
import { PROMPT_KEYS } from "../shared/prompt-keys";
import { THEME_SLUGS } from "../themes/registry";

/**
 * The content contract (docs/content-brief.md), enforced. Every theme, and the neutral
 * default, must supply the same keys within the same limits, in its own words.
 */
const themesDir = path.resolve(__dirname, "../themes");
const folders = ["default", ...THEME_SLUGS];
const read = (folder: string, file: string) => JSON.parse(readFileSync(path.join(themesDir, folder, file), "utf8")) as unknown;

// Themes evoke genres, never franchises (TH-15); none of this appears in payment/privacy copy either.
const FRANCHISE = ["hogwarts", "gryffindor", "slytherin", "hufflepuff", "ravenclaw", "quidditch", "muggle", "patronus", "harry potter", "dumbledore", "voldemort", "star trek", "starfleet", "klingon", "star wars", "jedi", "sith", "lightsaber", "tardis", "doctor who", "walking dead", "fallout", "hunger games", "minecraft", "pokemon", "zelda", "gandalf", "hobbit", "narnia"];
const BANNED = ["refund", "payment", "$", "price", "privacy", "delete your", "credit card"];
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
const strings = (value: unknown): string[] => (typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);

function expectKeys(actual: object, expected: readonly string[], label: string) {
  expect(Object.keys(actual).sort(), label).toEqual([...expected].sort());
}

describe.each(folders)("theme content: %s", (folder) => {
  const all = ["prompts.json", "achievements.json", "titles.json", "break-cards.json", "suggestions.json", "email.json"].flatMap((f) => strings(read(folder, f)).map((s) => [f, s] as const));

  it("uses no emoji, no franchise references and no money or privacy talk", () => {
    for (const [file, text] of all) {
      expect(EMOJI.test(text), `${folder}/${file}: emoji in "${text}"`).toBe(false);
      const lower = text.toLowerCase();
      for (const term of FRANCHISE) expect(lower.includes(term), `${folder}/${file}: franchise term "${term}" in "${text}"`).toBe(false);
      for (const term of BANNED) expect(lower.includes(term), `${folder}/${file}: banned "${term}" in "${text}"`).toBe(false);
    }
  });

  it("prompts: exactly the 60 keys, one short question each", () => {
    const prompts = read(folder, "prompts.json") as Record<string, string>;
    expectKeys(prompts, PROMPT_KEYS, "prompt keys");
    for (const [key, text] of Object.entries(prompts)) {
      expect(text.trim().length, key).toBeGreaterThan(8);
      expect(text.length, `${key} length`).toBeLessThanOrEqual(110);
      expect(text, `${key} has no template tokens`).not.toMatch(/[{}]/);
    }
  });

  it("achievements: exactly the 14 keys, each with a name, description and unlock line", () => {
    const a = read(folder, "achievements.json") as Record<string, { name: string; description: string; unlock: string }>;
    expectKeys(a, ACHIEVEMENT_KEYS, "achievement keys");
    for (const [key, v] of Object.entries(a)) {
      expectKeys(v, ["name", "description", "unlock"], `${key} fields`);
      expect(v.name.split(/\s+/).length, `${key} name words`).toBeLessThanOrEqual(4);
      expect(v.description.length, `${key} description`).toBeLessThanOrEqual(90);
      expect(v.unlock.length, `${key} unlock`).toBeLessThanOrEqual(90);
    }
  });

  it("titles: 8 categories x 4 ranks, only {streak} as a token", () => {
    const t = read(folder, "titles.json") as Record<string, string>;
    expectKeys(t, HABIT_CATEGORIES.flatMap((c) => [1, 2, 3, 4].map((r) => `${c}.rank${r}`)), "title keys");
    for (const [key, text] of Object.entries(t)) {
      const words = text.replace(/\{streak\}/g, "N").split(/\s+/).length;
      expect(words, `${key} words`).toBeGreaterThanOrEqual(2);
      expect(words, `${key} words`).toBeLessThanOrEqual(7);
      expect([...text.matchAll(/\{(\w+)\}/g)].every((m) => m[1] === "streak"), `${key} tokens`).toBe(true);
    }
  });

  it("break cards: a name, four distinct variants using {category} and {length}, and a restart line", () => {
    const b = read(folder, "break-cards.json") as { name: string; variants: string[]; restart: string };
    expectKeys(b, ["name", "variants", "restart"], "break card fields");
    expect(b.variants).toHaveLength(4);
    expect(new Set(b.variants).size).toBe(4);
    for (const v of b.variants) {
      expect([...v.matchAll(/\{(\w+)\}/g)].every((m) => m[1] === "category" || m[1] === "length"), v).toBe(true);
      expect(/\{category\}|\{length\}/.test(v), `uses a token: ${v}`).toBe(true);
    }
    expect(b.name.length).toBeGreaterThan(2);
    expect(b.restart.length).toBeGreaterThan(5);
  });

  it("suggestions: one starter habit per category within the limits", () => {
    const s = read(folder, "suggestions.json") as Record<string, { name: string; description: string }>;
    expectKeys(s, HABIT_CATEGORIES, "suggestion categories");
    for (const [key, v] of Object.entries(s)) {
      expectKeys(v, ["name", "description"], `${key} fields`);
      expect(v.name.length, `${key} name`).toBeLessThanOrEqual(32);
      expect(v.description.length, `${key} description`).toBeLessThanOrEqual(80);
    }
  });

  it("email: every field present, within the limits, no tokens or digits", () => {
    const e = read(folder, "email.json") as Record<string, string>;
    expectKeys(e, ["subject", "preheader", "heading", "body", "cta", "footer", "unsubscribe"], "email fields");
    expect(e.subject!.length).toBeLessThanOrEqual(60);
    expect(e.preheader!.length).toBeLessThanOrEqual(90);
    expect(e.heading!.length).toBeLessThanOrEqual(40);
    expect(e.cta!.length).toBeLessThanOrEqual(24);
    for (const [k, v] of Object.entries(e)) expect(v, k).not.toMatch(/[{}\d]/);
  });
});

describe("themes are distinct from one another", () => {
  it("no prompt wording is shared between two themes (the default may echo nothing)", () => {
    const seen = new Map<string, string>();
    for (const folder of folders) {
      for (const [key, text] of Object.entries(read(folder, "prompts.json") as Record<string, string>)) {
        const normal = text.toLowerCase().replace(/[^a-z]+/g, " ").trim();
        const prior = seen.get(normal);
        expect(prior, `"${text}" (${folder}/${key}) repeats ${prior}`).toBeUndefined();
        seen.set(normal, `${folder}/${key}`);
      }
    }
  });

  it("each theme names its achievements and break card differently", () => {
    const names = folders.map((f) => (read(f, "break-cards.json") as { name: string }).name);
    expect(new Set(names).size).toBe(names.length);
    const streak7 = folders.map((f) => (read(f, "achievements.json") as Record<string, { name: string }>)["streak_7"]!.name);
    expect(new Set(streak7).size).toBe(streak7.length);
  });
});
