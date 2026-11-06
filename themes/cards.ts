/**
 * Share-card content and art per theme, for the Worker. Like themes/emails.ts, each theme's
 * files are imported by name because the Worker bundler has no glob imports; adding a theme
 * = its folder, one line in registry.ts, and one block here (test/cards.test.ts keeps this
 * list and the registry in step).
 */
import type { CardStyle } from "./card-kit";
import dayzeroBreak from "./dayzero/break-cards.json";
import { style as dayzeroStyle } from "./dayzero/card";
import dayzeroStrings from "./dayzero/strings.json";
import dayzeroTitles from "./dayzero/titles.json";
import notebookBreak from "./notebook/break-cards.json";
import { style as notebookStyle } from "./notebook/card";
import notebookStrings from "./notebook/strings.json";
import notebookTitles from "./notebook/titles.json";
import defaultStrings from "./default/strings.json";
import spacelogBreak from "./spacelog/break-cards.json";
import { style as spacelogStyle } from "./spacelog/card";
import spacelogStrings from "./spacelog/strings.json";
import spacelogTitles from "./spacelog/titles.json";
import spellbookBreak from "./spellbook/break-cards.json";
import { style as spellbookStyle } from "./spellbook/card";
import spellbookStrings from "./spellbook/strings.json";
import spellbookTitles from "./spellbook/titles.json";

export interface ThemeCardContent {
  style: CardStyle;
  titles: Record<string, string>;
  breakCard: { name: string; variants: string[]; restart: string };
  strings: Record<string, string>;
}

export const CARD_THEMES: Record<string, ThemeCardContent> = {
  spacelog: { style: spacelogStyle, titles: spacelogTitles, breakCard: spacelogBreak, strings: spacelogStrings },
  notebook: { style: notebookStyle, titles: notebookTitles, breakCard: notebookBreak, strings: notebookStrings },
  spellbook: { style: spellbookStyle, titles: spellbookTitles, breakCard: spellbookBreak, strings: spellbookStrings },
  dayzero: { style: dayzeroStyle, titles: dayzeroTitles, breakCard: dayzeroBreak, strings: dayzeroStrings },
};

export const DEFAULT_STRINGS: Record<string, string> = defaultStrings;
