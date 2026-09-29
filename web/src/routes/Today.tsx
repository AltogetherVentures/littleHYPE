import { useMemo } from "react";
import { Link } from "react-router-dom";
import { HabitRow } from "../components/HabitRow";
import { artFor } from "../lib/art";
import { flairFor } from "../lib/flair";
import { useSetLog, useToday } from "../lib/habits";
import type { Me } from "../lib/me";
import { useT } from "../lib/strings";

/**
 * The screen opened every day: today's habits with one-tap check-in (TD-1), the prompt
 * (TD-2, added with the journal), and the nearest milestone (TD-3). Days follow the user's
 * own timezone (TD-4). Theme wording and artwork come from the theme folder.
 */
export function Today({ me }: { me: Me }) {
  const t = useT();
  const flair = useMemo(() => flairFor(me.createdAt, me.timezone), [me.createdAt, me.timezone]);
  const hero = artFor(me.theme, "hero");
  const habitsArt = artFor(me.theme, "habits");
  const promptArt = artFor(me.theme, "prompt");
  const { data, isPending, isError, refetch } = useToday();
  const setLog = useSetLog();

  const habits = data?.habits ?? [];
  const due = habits.filter((h) => h.today.due);
  const rest = habits.filter((h) => !h.today.due);
  const allDone = due.length > 0 && due.every((h) => h.today.logged !== null);
  const milestone = data?.milestone;
  // The headline counts days, so a weekly habit (whose streak is in weeks) only leads when
  // there is no daily one.
  const daily = habits.filter((h) => h.streak.unit === "days");
  const headlineStreak = Math.max(0, ...(daily.length > 0 ? daily : habits).map((h) => h.streak.currentDays));

  return (
    <div className="today">
      <section className="hero" aria-labelledby="today-title">
        <div className="hero-text">
          <p className="hero-eyebrow">{t("today.eyebrow", flair)}</p>
          <h1 id="today-title" className="hero-title">
            {t("today.title")}
          </h1>
          <p className="hero-greeting">{t("today.greeting")}</p>
          <div className="hero-actions">
            <Link className="button" to={`/${me.theme}/journal`}>
              {t("today.cta")}
            </Link>
            <span className="hero-sub">{t("today.cta.sub")}</span>
          </div>
        </div>
        {hero && <img className="hero-art" src={hero} alt="" />}
      </section>

      <div className="today-grid">
        <section className="panel panel-habits" aria-labelledby="habits-heading">
          <header className="panel-head">
            <h2 id="habits-heading" className="panel-title">
              {t("today.habits.heading")}
            </h2>
            <Link className="link-button" to={`/${me.theme}/habits`}>
              {t("today.habits.manage")}
            </Link>
          </header>

          {isPending && <p className="panel-status">{t("common.loading")}</p>}
          {isError && (
            <p className="panel-status" role="alert">
              {t("common.error")}{" "}
              <button className="link-button" onClick={() => void refetch()}>
                {t("common.retry")}
              </button>
            </p>
          )}

          {data && habits.length === 0 && (
            <div className="panel-body">
              {habitsArt && <img className="panel-art" src={habitsArt} alt="" />}
              <div>
                <p>{t("today.habits.empty")}</p>
                <Link className="button" to={`/${me.theme}/habits`}>
                  {t("habits.add")}
                </Link>
              </div>
            </div>
          )}

          {due.length > 0 && (
            <ul className="habit-list">
              {due.map((h) => (
                <HabitRow key={h.id} habit={h} onSet={(status) => setLog.mutate({ habitId: h.id, date: data!.date, status })} />
              ))}
            </ul>
          )}
          {allDone && <p className="all-clear">{t("today.allclear")}</p>}
          {setLog.isError && (
            <p role="alert" className="error">
              {t("habit.error.generic")}
            </p>
          )}

          {rest.length > 0 && (
            <details className="not-due">
              <summary>
                {t("today.notdue.heading")} ({rest.length})
              </summary>
              <ul className="habit-list">
                {rest.map((h) => (
                  <HabitRow key={h.id} habit={h} onSet={(status) => setLog.mutate({ habitId: h.id, date: data!.date, status })} />
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="panel panel-prompt" aria-labelledby="prompt-heading">
          <header className="panel-head">
            <h2 id="prompt-heading" className="panel-title">
              {t("today.prompt.heading")}
            </h2>
            <span className="panel-tag">{t("today.tag.soon")}</span>
          </header>
          <div className="panel-body">
            {promptArt && <img className="panel-art" src={promptArt} alt="" />}
            <p>{t("today.prompt.empty")}</p>
          </div>
        </section>

        <aside className="rail">
          <section className="panel panel-streak" aria-labelledby="streak-heading">
            <header className="panel-head">
              <h2 id="streak-heading" className="panel-title">
                {t("today.streak.heading")}
              </h2>
            </header>
            <p className="streak-value">
              <span className="streak-num">{headlineStreak}</span>
              <span className="streak-unit">{t("today.streak.unit")}</span>
            </p>
            <p className="streak-empty">
              {milestone
                ? t(milestone.remaining === 1 ? "today.milestone.one" : "today.milestone", { remaining: String(milestone.remaining), milestone: String(milestone.milestone) })
                : t("today.streak.empty")}
            </p>
          </section>
          <p className="today-note">{t("today.note")}</p>
        </aside>
      </div>
    </div>
  );
}
