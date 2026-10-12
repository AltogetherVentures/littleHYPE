import type { UnlockProps } from "../../web/src/lib/overrides-types";

/** SpellBook unlock: a rune circle draws itself, sparks rise, and the new spell appears at its heart. */
export default function Unlock({ name, description, unlock, emblem, remaining, onDismiss, t }: UnlockProps) {
  return (
    <div className="unlock-scrim unlock-spell">
      <div className="unlock-card" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
        <p className="unlock-kicker">{t("achievements.unlock.heading")}</p>
        <div className="unlock-circle" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" />
            <circle cx="60" cy="60" r="44" />
            <path d="M60 8 106 88 14 88Z" />
            <path d="M60 112 14 32 106 32Z" />
          </svg>
          <span className="unlock-glyph">{emblem}</span>
          <span className="unlock-sparks">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
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
