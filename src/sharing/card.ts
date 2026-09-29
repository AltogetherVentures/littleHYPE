import type postgres from "postgres";
import { CARD_THEMES, DEFAULT_STRINGS } from "../../themes/cards";
import { renderCardSvg, type CardFormat } from "../../themes/card-kit";
import { pickVariant } from "../../shared/sharing";
import { getOrCreateCode } from "../referrals/service";
import { DomainError } from "../profile/service";
import { currentTitle } from "./service";

const NAME_LIMIT = 40;

export interface CardRequest {
  type: "title" | "break";
  format: CardFormat;
  /** Show the habit's own name on the card (SH-10). Off unless the person ticked it for this card. */
  showName: boolean;
  cardId: string | null;
}

/**
 * Builds a share card as an SVG in the person's theme (SH-7). It is made only from a
 * category, a length and (if asked) a habit name: never journal text (SH-10). Themes supply
 * the words (titles.json, break-cards.json, strings.json) and the art (themes/<slug>/card.ts).
 */
export async function buildShareCard(tx: postgres.TransactionSql, userId: string, today: string, baseUrl: string, req: CardRequest): Promise<string> {
  const [profile] = await tx<{ theme: string | null }[]>`select theme from profiles where user_id = ${userId}`;
  const theme = profile?.theme ? CARD_THEMES[profile.theme] : undefined;
  if (!profile?.theme || !theme) throw new DomainError(409, "theme_required");

  const t = (key: string, vars: Record<string, string> = {}) => (theme.strings[key] ?? DEFAULT_STRINGS[key] ?? key).replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole);
  const themeName = t("theme.name");
  const code = await getOrCreateCode(tx, userId);
  const referralUrl = `${baseUrl}/r/${code}`;

  if (req.type === "title") {
    const title = await currentTitle(tx, userId, today);
    if (!title) throw new DomainError(404, "no_title");
    const headline = (theme.titles[title.key] ?? "").replace(/\{streak\}/g, String(title.streakDays));
    let habitName: string | null = null;
    if (req.showName) {
      const [row] = await tx<{ name: string }[]>`select name from habits where id = ${title.habitId} and user_id = ${userId}`;
      habitName = row ? row.name.slice(0, NAME_LIMIT) : null;
    }
    return renderCardSvg(theme.style, req.format, { kicker: t(`category.${title.category}`), headline, sub: t("habit.streak.days", { n: String(title.streakDays) }), habitName, themeName, referralUrl });
  }

  if (!req.cardId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(req.cardId)) throw new DomainError(404, "card_not_found");
  const [card] = await tx<{ id: string; category: string; length_days: number; habit_id: string }[]>`
    select id, category, length_days, habit_id from streak_break_cards where id = ${req.cardId} and user_id = ${userId}`;
  if (!card) throw new DomainError(404, "card_not_found");
  const variants = theme.breakCard.variants;
  const headline = variants[pickVariant(card.id, variants.length)]!.replace(/\{category\}/g, t(`category.${card.category}`)).replace(/\{length\}/g, String(card.length_days));
  let habitName: string | null = null;
  if (req.showName) {
    const [row] = await tx<{ name: string }[]>`select name from habits where id = ${card.habit_id} and user_id = ${userId}`;
    habitName = row ? row.name.slice(0, NAME_LIMIT) : null;
  }
  return renderCardSvg(theme.style, req.format, { kicker: theme.breakCard.name, headline, sub: theme.breakCard.restart, habitName, themeName, referralUrl });
}
