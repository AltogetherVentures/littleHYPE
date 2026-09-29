import { pickVariant } from "@shared/sharing";
import { useEffect, useState } from "react";
import { useUnseenAchievements } from "../lib/achievements";
import { breakCardCopy } from "../lib/content";
import { useBreakCard, useDismissBreakCard } from "../lib/sharing";
import { useT, type StringKey } from "../lib/strings";
import { ShareDialog } from "./ShareDialog";

/**
 * The streak-break card (SH-4 to SH-6): when a streak of seven days or more has broken, the
 * next open offers the theme's joke about it, once, with a way to start again. It waits its
 * turn behind any achievement being celebrated, and dismissing it is final for that break.
 */
export function BreakCardHost({ theme }: { theme: string }) {
  const t = useT();
  const { data } = useBreakCard();
  const unseen = useUnseenAchievements();
  const dismiss = useDismissBreakCard();
  const [sharing, setSharing] = useState(false);
  const card = data?.card;
  const waiting = !unseen.isSuccess || (unseen.data?.unseen?.length ?? 0) > 0;

  useEffect(() => {
    if (!card || waiting || sharing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss.mutate(card.id);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [card, waiting, sharing, dismiss]);

  if (!card || waiting) return null;
  const copy = breakCardCopy(theme);
  const joke = copy.variants[pickVariant(card.id, copy.variants.length)]!
    .replace(/\{category\}/g, t(`category.${card.category}` as StringKey))
    .replace(/\{length\}/g, String(card.lengthDays));

  if (sharing) return <ShareDialog type="break" cardId={card.id} onClose={() => setSharing(false)} />;
  return (
    <div className="unlock-scrim break-scrim">
      <div className="unlock-card break-card" role="dialog" aria-modal="true" aria-labelledby="break-title">
        <p className="unlock-kicker">{copy.name}</p>
        <h2 id="break-title">{joke}</h2>
        <p className="unlock-desc">{copy.restart}</p>
        <div className="actions">
          <button type="button" className="button" autoFocus disabled={dismiss.isPending} onClick={() => dismiss.mutate(card.id)}>
            {t("share.startAgain")}
          </button>
          <button type="button" className="link-button" onClick={() => setSharing(true)}>
            {t("share.share")}
          </button>
          <button type="button" className="link-button" disabled={dismiss.isPending} onClick={() => dismiss.mutate(card.id)}>
            {t("share.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
