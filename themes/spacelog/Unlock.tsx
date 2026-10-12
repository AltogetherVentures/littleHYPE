import type { UnlockProps } from "../../web/src/lib/overrides-types";

/** Space Log unlock: a mission patch docks in the centre of a radar sweep. */
export default function Unlock({ name, description, unlock, emblem, remaining, onDismiss, t }: UnlockProps) {
  return (
    <div className="unlock-scrim unlock-space">
      <div className="unlock-radar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="unlock-card" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
        <p className="unlock-kicker">{t("achievements.unlock.heading")}</p>
        <div className="unlock-patch" aria-hidden="true">
          <span className="unlock-patch-ring" />
          {emblem}
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
