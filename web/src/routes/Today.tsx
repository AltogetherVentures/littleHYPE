import { useMemo } from "react";
import { Link } from "react-router-dom";
import { artFor } from "../lib/art";
import { flairFor } from "../lib/flair";
import type { Me } from "../lib/me";
import { useT } from "../lib/strings";

/**
 * The screen opened every day. Habits and prompts are not built yet, so their
 * panels are honest, inviting empty states with a "coming soon" tag rather than
 * dead buttons. Theme wording and artwork come from the theme folder.
 */
export function Today({ me }: { me: Me }) {
  const t = useT();
  const flair = useMemo(() => flairFor(me.createdAt, me.timezone), [me.createdAt, me.timezone]);
  const hero = artFor(me.theme, "hero");
  const habits = artFor(me.theme, "habits");
  const prompt = artFor(me.theme, "prompt");

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
            <span className="panel-tag">{t("today.tag.soon")}</span>
          </header>
          <div className="panel-body">
            {habits && <img className="panel-art" src={habits} alt="" />}
            <p>{t("today.habits.empty")}</p>
          </div>
        </section>

        <section className="panel panel-prompt" aria-labelledby="prompt-heading">
          <header className="panel-head">
            <h2 id="prompt-heading" className="panel-title">
              {t("today.prompt.heading")}
            </h2>
            <span className="panel-tag">{t("today.tag.soon")}</span>
          </header>
          <div className="panel-body">
            {prompt && <img className="panel-art" src={prompt} alt="" />}
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
              <span className="streak-num">0</span>
              <span className="streak-unit">{t("today.streak.unit")}</span>
            </p>
            <p className="streak-empty">{t("today.streak.empty")}</p>
          </section>
          <p className="today-note">{t("today.note")}</p>
        </aside>
      </div>
    </div>
  );
}
