import { useAuth } from "../lib/auth";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { AchievementKey } from "@shared/achievement-defs";
import { tierOf } from "@shared/achievement-tiers";
import { familyOf } from "@shared/achievements";
import { THEME_SLUGS } from "@themes/registry";
import { AchievementEmblem } from "../components/AchievementEmblem";
import { MeGate } from "../components/MeGate";
import { Plans } from "../components/Plans";
import { artFor } from "../lib/art";
import { achievementCopy, breakCardCopy } from "../lib/content";
import { homePathFor } from "../lib/me";
import { translate, useT, type StringKey } from "../lib/strings";
import { rememberWorld } from "../lib/world";

const WHY = [1, 2, 3] as const;
const VS = [1, 2, 3, 4, 5, 6] as const;
const HOW = [1, 2, 3] as const;
const FAQ = [1, 2, 3, 4, 5] as const;
const SCENES = ["entry", "today", "badge"] as const;
/** Two badges per world on the wall, so the four voices sit side by side. */
const WALL: AchievementKey[] = ["first_entry", "streak_7", "entries_30", "streak_100", "first_checkin", "streak_14", "prompts_10", "habits_3"];
const ROTATE_MS = 4500;

const shotHeight = (scene: (typeof SCENES)[number]) => (scene === "today" ? 1180 : scene === "entry" ? 1000 : 844);

/**
 * The home page. Neutral littleHYPE voice and money copy, but made of the four worlds'
 * materials: the hero, the walkthrough and the closing band are painted in whichever world
 * is active (it rotates until someone picks), the benefit cards are pages from three worlds,
 * and the comparison puts a drab mock-up next to the real thing. Signed-in visitors go
 * straight to where they belong. Screens are real (scripts/shoot-worlds.mjs).
 */
export function Landing() {
  const { isLoaded, isSignedIn } = useAuth();
  const t = useT();
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const active = THEME_SLUGS[index % THEME_SLUGS.length]!;

  // Rotate the active world until the visitor picks one; never on reduced motion.
  useEffect(() => {
    if (pinned || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [pinned]);

  if (isLoaded && isSignedIn) {
    return <MeGate>{(me) => <Navigate to={homePathFor(me)} replace />}</MeGate>;
  }

  const pick = (slug: (typeof THEME_SLUGS)[number]) => {
    setPinned(true);
    setIndex(THEME_SLUGS.indexOf(slug));
  };
  const chips = (label: StringKey) => (
    <div className="world-chips" role="group" aria-label={t(label)}>
      <span className="world-chips-label">{t(label)}</span>
      {THEME_SLUGS.map((slug) => {
        const art = artFor(slug, "hero");
        return (
          <button key={slug} type="button" className="world-chip" data-theme={slug} aria-pressed={slug === active} onClick={() => pick(slug)}>
            {art && <img src={art} alt="" />}
            <span>{translate(slug, "theme.name")}</span>
          </button>
        );
      })}
    </div>
  );
  const joke = breakCardCopy(active);
  const jokeText = joke.variants[0]!.replace(/\{category\}/g, t("category.hydration").toLowerCase()).replace(/\{length\}/g, "12");

  return (
    <main className="landing">
      <section className="world-band landing-hero" data-theme={active}>
        <div className="wrap">
          <nav className="landing-nav" aria-label="Site">
            <span className="landing-mark">{t("app.name")}</span>
            <span className="landing-nav-links">
              <a href="#worlds">{t("landing.cta.worlds")}</a>
              <a href="#pricing">{t("paywall.plan.lifetime")}</a>
              <Link to="/sign-in">{t("auth.signIn")}</Link>
            </span>
          </nav>
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>
                {t("landing.heading.lead")}{" "}
                <span key={active} className="hero-elsewhere">
                  {translate(active, "theme.elsewhere")}
                </span>
              </h1>
              <p className="landing-body">{t("landing.body")}</p>
              <p className="actions">
                <Link className="button" to={`/${active}`} onClick={() => rememberWorld(active)}>
                  {t("landing.world.enter")}: {translate(active, "theme.name")}
                </Link>
                <a className="link-button" href="#how">
                  {t("landing.cta.how")}
                </a>
              </p>
              {chips("landing.hero.pick")}
            </div>
            <div className="hero-fan" aria-hidden="true">
              {THEME_SLUGS.map((slug, i) => (
                <img key={slug} className="fan-shot" data-pos={(i - index + THEME_SLUGS.length * 64) % THEME_SLUGS.length} src={`/worlds/${slug}-today-phone.jpg`} alt="" width="390" height="1180" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-why" aria-labelledby="why-heading">
        <div className="wrap">
          <h2 id="why-heading">{t("landing.why.heading")}</h2>
          <ul className="why-pages">
            {WHY.map((n, i) => {
              const slug = THEME_SLUGS[i % THEME_SLUGS.length]!;
              const art = artFor(slug, "prompt");
              return (
                <li key={n} className="why-page" data-theme={slug}>
                  {art && <img className="why-page-art" src={art} alt="" />}
                  <h3>{t(`landing.why.${n}.title` as StringKey)}</h3>
                  <p>{t(`landing.why.${n}.body` as StringKey)}</p>
                  <Link className="why-page-from" to={`/${slug}`} onClick={() => rememberWorld(slug)}>
                    {t("landing.why.from", { name: translate(slug, "theme.name") })}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="landing-vs" aria-labelledby="vs-heading">
        <div className="wrap">
          <h2 id="vs-heading">{t("landing.vs.heading")}</h2>
          <p className="landing-lead">{t("landing.vs.intro")}</p>
          <div className="vs-table" role="table">
            <div className="vs-row vs-head" role="row">
              <span role="columnheader">{t("landing.vs.them")}</span>
              <span role="columnheader">{t("landing.vs.us")}</span>
            </div>
            {VS.map((n, i) => {
              const slug = THEME_SLUGS[i % THEME_SLUGS.length]!;
              const art = artFor(slug, "hero");
              return (
                <div key={n} className="vs-row" role="row">
                  <span className="vs-them" role="cell">
                    <span className="drab" aria-hidden="true">
                      <i className="drab-dot" />
                      <i className="drab-dot" />
                      <i className="drab-dot" />
                    </span>
                    <span className="vs-them-text">{t(`landing.vs.${n}.them` as StringKey)}</span>
                  </span>
                  <span className="vs-us" role="cell" data-theme={slug}>
                    {art && <img className="vs-us-art" src={art} alt="" />}
                    <span className="vs-us-text">{t(`landing.vs.${n}.us` as StringKey)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="worlds" className="landing-worlds" aria-labelledby="worlds-heading">
        <div className="wrap">
          <h2 id="worlds-heading">{t("landing.themes.heading")}</h2>
          <p className="landing-lead">{t("landing.themes.note")}</p>
          <ul className="worlds">
            {THEME_SLUGS.map((slug) => {
              const art = artFor(slug, "hero");
              return (
                <li key={slug}>
                  <Link className="world-card" data-theme={slug} to={`/${slug}`} onClick={() => rememberWorld(slug)}>
                    {art && <img className="world-card-art" src={art} alt="" />}
                    <span className="world-card-name">{translate(slug, "theme.name")}</span>
                    <span className="world-card-tagline">{translate(slug, "theme.tagline")}</span>
                    <span className="world-card-preview">&ldquo;{translate(slug, "theme.preview")}&rdquo;</span>
                    <span className="world-card-enter button">{t("landing.world.enter")} &rarr;</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id="how" className="world-band landing-how" data-theme={active} aria-labelledby="how-heading">
        <div className="wrap">
          <h2 id="how-heading">{t("landing.how.heading")}</h2>
          {chips("landing.how.switch")}
          <ol className="how-steps">
            {HOW.map((n, i) => {
              const scene = SCENES[i]!;
              return (
                <li key={n} className="how-step">
                  <img key={active} className="how-shot" src={`/worlds/${active}-${scene}-phone.jpg`} alt={`${translate(active, "theme.name")}: ${t(`landing.how.${n}.title` as StringKey)}`} width="390" height={shotHeight(scene)} />
                  <h3>{t(`landing.how.${n}.title` as StringKey)}</h3>
                  <p>{t(`landing.how.${n}.body` as StringKey)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="landing-extras" aria-labelledby="extras-heading">
        <div className="wrap">
          <h2 id="extras-heading">{t("landing.extras.heading")}</h2>
          <div className="extras-grid">
            <div className="extras-badges">
              <h3>{t("landing.extras.badges.title")}</h3>
              <p>{t("landing.extras.badges.body")}</p>
              <ul className="badge-wall">
                {WALL.map((key, i) => {
                  const slug = THEME_SLUGS[i % THEME_SLUGS.length]!;
                  const copy = achievementCopy(slug, key);
                  return (
                    <li key={key} className="badge wall-badge" data-theme={slug} data-unlocked="true" data-family={familyOf(key)} data-tier={tierOf(key)}>
                      <div className="badge-emblem">
                        <AchievementEmblem family={familyOf(key)} tier={tierOf(key)} size={34} />
                      </div>
                      <span className="badge-name">{copy.name}</span>
                      <span className="badge-desc">{copy.description}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="extras-break">
              <h3>{t("landing.extras.break.title")}</h3>
              <p>{t("landing.extras.break.body")}</p>
              <div className="break-demo" data-theme={active}>
                <div key={active} className="unlock-card break-card">
                  <p className="unlock-kicker">{joke.name}</p>
                  <h2 className="break-demo-joke">{jokeText}</h2>
                  <p className="unlock-desc">{joke.restart}</p>
                  <div className="actions">
                    <a className="button" href="#worlds">
                      {t("share.startAgain")}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="landing-pricing" aria-labelledby="pricing-heading">
        <div className="wrap">
          <h2 id="pricing-heading">{t("landing.pricing.heading")}</h2>
          <p className="landing-lead">{t("landing.pricing.body")}</p>
          <Plans />
          <p className="actions">
            <Link className="button" to="/sign-up">
              {t("landing.pricing.cta")}
            </Link>
          </p>
        </div>
      </section>

      <section className="landing-faq" aria-labelledby="faq-heading">
        <div className="wrap">
          <h2 id="faq-heading">{t("landing.faq.heading")}</h2>
          <dl className="faq">
            {FAQ.map((n) => (
              <div key={n} className="faq-item">
                <dt>{t(`landing.faq.${n}.q` as StringKey)}</dt>
                <dd>{t(`landing.faq.${n}.a` as StringKey)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="world-band landing-final" data-theme={active}>
        <div className="wrap">
          <h2>{t("landing.final.heading")}</h2>
          <ul className="final-worlds">
            {THEME_SLUGS.map((slug) => (
              <li key={slug}>
                <Link className="final-world" data-theme={slug} to={`/${slug}`} onClick={() => rememberWorld(slug)}>
                  {translate(slug, "theme.name")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/privacy">{t("settings.links.privacy")}</Link>
        <Link to="/terms">{t("settings.links.terms")}</Link>
        <span>{t("landing.footer.made")}</span>
      </footer>
    </main>
  );
}
