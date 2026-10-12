/**
 * Reminder-email content per theme, for the Worker. The Worker bundler has no glob imports,
 * so each theme's email files are imported by name here. Adding a theme = its folder, one
 * line in registry.ts, and one line here; test/emails.test.ts fails if this list and the
 * registry ever disagree.
 */
import dayzeroEmail from "./dayzero/email.json";
import dayzeroStyle from "./dayzero/email-theme.json";
import dayzeroStrings from "./dayzero/strings.json";
import notebookEmail from "./notebook/email.json";
import notebookStyle from "./notebook/email-theme.json";
import notebookStrings from "./notebook/strings.json";
import spacelogEmail from "./spacelog/email.json";
import spacelogStyle from "./spacelog/email-theme.json";
import spacelogStrings from "./spacelog/strings.json";
import spellbookEmail from "./spellbook/email.json";
import spellbookStyle from "./spellbook/email-theme.json";
import spellbookStrings from "./spellbook/strings.json";

export interface EmailCopy {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  cta: string;
  footer: string;
  unsubscribe: string;
}

export interface EmailStyle {
  background: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  headingFont: string;
  bodyFont: string;
  headingTransform: "none" | "uppercase";
}

export const EMAILS: Record<string, { copy: EmailCopy; style: EmailStyle; name: string }> = {
  spacelog: { copy: spacelogEmail, style: spacelogStyle as EmailStyle, name: spacelogStrings["theme.name"] },
  notebook: { copy: notebookEmail, style: notebookStyle as EmailStyle, name: notebookStrings["theme.name"] },
  spellbook: { copy: spellbookEmail, style: spellbookStyle as EmailStyle, name: spellbookStrings["theme.name"] },
  dayzero: { copy: dayzeroEmail, style: dayzeroStyle as EmailStyle, name: dayzeroStrings["theme.name"] },
};
