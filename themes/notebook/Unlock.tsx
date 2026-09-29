import type { UnlockProps } from "../../web/src/lib/overrides-types";

/** NoteBook unlock: a sticker is pressed onto the page, with a curl of backing paper. */
export default function Unlock({ name, description, unlock, emblem, remaining, onDismiss, t }: UnlockProps) {
  return (
    <div className="unlock-scrim unlock-note">
      <div className="unlock-card" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
        <span className="unlock-tape" aria-hidden="true" />
        <p className="unlock-kicker">{t("achievements.unlock.heading")}</p>
        <div className="unlock-sticker" aria-hidden="true">
          {emblem}
          <span className="unlock-peel" />
        </div>
        <h2 id="unlock-title">{name}</h2>
        <p className="unlock-line">{unlock}</p>
        <p className="unlock-desc">{description}</p>
        {remaining > 0 && <p className="unlock-more">+{remaining}</p>}
        <button type="button" className="button" autoFocus onClick={onDismiss}>
          {t("achievements.unlock.dismiss")}
        </button>
      </div>
    </div>
  );
}
