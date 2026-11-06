import type { UnlockProps } from "../lib/overrides-types";

export function DefaultUnlock({ name, description, unlock, emblem, onDismiss, t }: UnlockProps) {
  return (
    <div className="unlock-scrim unlock-default">
      <div className="unlock-card" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
        <div className="unlock-emblem">{emblem}</div>
        <p className="unlock-kicker">{t("achievements.unlock.heading")}</p>
        <h2 id="unlock-title">{name}</h2>
        <p>{unlock}</p>
        <p className="unlock-desc">{description}</p>
        <button type="button" className="button" autoFocus onClick={onDismiss}>
          {t("achievements.unlock.dismiss")}
        </button>
      </div>
    </div>
  );
}
