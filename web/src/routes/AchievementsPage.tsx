import { AchievementEmblem } from "../components/AchievementEmblem";
import { achievementCopy } from "../lib/content";
import { useAchievements } from "../lib/achievements";
import type { Me } from "../lib/me";
import { useT } from "../lib/strings";

const dateLabel = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/** The collection (AC-2, AC-3): everything that can be earned, with progress towards what is not yet. */
export function AchievementsPage({ me }: { me: Me }) {
  const t = useT();
  const { data, isPending, isError, refetch } = useAchievements();
  const items = data?.achievements ?? [];
  const unlocked = items.filter((a) => a.unlockedAt).length;

  return (
    <div className="achievements-page">
      <header className="page-head">
        <div>
          <h1>{t("nav.achievements")}</h1>
          <p className="page-intro">{t("achievements.intro")}</p>
        </div>
        {data && <p className="collection-count">{t("achievements.count", { n: String(unlocked), total: String(items.length) })}</p>}
      </header>

      {isPending && <p className="status">{t("common.loading")}</p>}
      {isError && (
        <p role="alert">
          {t("common.error")}{" "}
          <button className="link-button" onClick={() => void refetch()}>
            {t("common.retry")}
          </button>
        </p>
      )}

      <ul className="badge-grid">
        {items.map((a) => {
          const copy = achievementCopy(me.theme, a.key);
          const got = a.unlockedAt !== null;
          return (
            <li key={a.key} className="badge" data-unlocked={got} data-family={a.family}>
              <div className="badge-emblem">
                <AchievementEmblem family={a.family} size={40} />
              </div>
              <h2 className="badge-name">{copy.name}</h2>
              <p className="badge-desc">{copy.description}</p>
              {got ? (
                <p className="badge-status">{t("achievements.unlocked", { date: dateLabel(a.unlockedAt!) })}</p>
              ) : (
                <div className="badge-progress">
                  <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={a.progress.target} aria-valuenow={a.progress.current} aria-label={copy.name}>
                    <span style={{ width: `${Math.round((a.progress.current / a.progress.target) * 100)}%` }} />
                  </div>
                  <p className="badge-status">{t("achievements.progress", { current: String(a.progress.current), target: String(a.progress.target) })}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
