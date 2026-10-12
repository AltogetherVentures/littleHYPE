import type { UnlockProps } from "../../web/src/lib/overrides-types";

/** Day Zero unlock: a steel badge plate, hit with a rubber stamp. */
export default function Unlock({ name, description, unlock, emblem, remaining, onDismiss, t }: UnlockProps) {
  return (
    <div className="unlock-scrim unlock-zero">
      <div className="unlock-card" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
        <p className="unlock-kicker">{t("achievements.unlock.heading")}</p>
        <div className="unlock-plate" aria-hidden="true">
          {emblem}
          <span className="unlock-stamp">{t("habit.action.done")}</span>
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
