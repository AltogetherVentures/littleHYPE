import { Link } from "react-router-dom";
import { progressUnitOf, tierOf } from "@shared/achievement-tiers";
import { AchievementEmblem } from "../components/AchievementEmblem";
import { achievementCopy } from "../lib/content";
import { useAchievements, type AchievementView } from "../lib/achievements";
import type { Me } from "../lib/me";
import { useT } from "../lib/strings";

const dateLabel = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/** "3 more days" / "1 more" style copy for what is still to earn. */
function toGo(t: ReturnType<typeof useT>, a: AchievementView): string {
  const n = a.progress.target - a.progress.current;
  const days = progressUnitOf(a.key) === "days";
  if (n === 1) return t(days ? "achievements.togo.day" : "achievements.togo.one");
  return t(days ? "achievements.togo.days" : "achievements.togo.many", { n: String(n) });
}

/**
 * The one still-locked achievement the person is closest to, by share of progress. Only
 * something they have started counts (AC-6: never a nudge to write more, just what's near).
 */
export function nearest(items: AchievementView[]): AchievementView | null {
  let best: AchievementView | null = null;
  for (const a of items) {
    if (a.unlockedAt || a.progress.current === 0) continue;
    if (!best || a.progress.current / a.progress.target > best.progress.current / best.progress.target) best = a;
  }
  return best;
}

/** The collection (AC-2, AC-3): everything that can be earned, with progress towards what is not yet. */
export function AchievementsPage({ me }: { me: Me }) {
  const t = useT();
  const { data, isPending, isError, refetch } = useAchievements();
  const items = data?.achievements ?? [];
  const unlocked = items.filter((a) => a.unlockedAt).length;
  const next = nearest(items);

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

      {next && (
        <section className="panel badge-next" aria-labelledby="next-heading" data-family={next.family}>
          <p id="next-heading" className="badge-next-kicker">
            {t("achievements.next.heading")}
          </p>
          <div className="badge-next-body">
            <div className="badge-emblem">
              <AchievementEmblem family={next.family} tier={tierOf(next.key)} size={40} />
            </div>
            <div className="badge-next-text">
              <h2 className="badge-name">{achievementCopy(me.theme, next.key).name}</h2>
              <p className="badge-desc">{achievementCopy(me.theme, next.key).description}</p>
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={next.progress.target} aria-valuenow={next.progress.current} aria-label={achievementCopy(me.theme, next.key).name}>
                <span style={{ width: `${Math.round((next.progress.current / next.progress.target) * 100)}%` }} />
              </div>
              <p className="badge-status badge-togo">{toGo(t, next)}</p>
            </div>
          </div>
          <Link className="link-button badge-next-link" to={`/${me.theme}/today`}>
            {t("achievements.next.cta")}
          </Link>
        </section>
      )}

      <ul className="badge-grid">
        {items.map((a) => {
          const copy = achievementCopy(me.theme, a.key);
          const got = a.unlockedAt !== null;
          return (
            <li key={a.key} className="badge" data-unlocked={got} data-family={a.family} data-tier={tierOf(a.key)} data-next={next?.key === a.key}>
              <div className="badge-emblem">
                <AchievementEmblem family={a.family} tier={tierOf(a.key)} size={40} />
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
                  <p className="badge-status">
                    <span className="badge-togo">{toGo(t, a)}</span>
                    <span className="badge-fraction">{t("achievements.progress", { current: String(a.progress.current), target: String(a.progress.target) })}</span>
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
