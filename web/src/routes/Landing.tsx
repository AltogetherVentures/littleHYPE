import { useAuth } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router-dom";
import { THEME_SLUGS } from "@themes/registry";
import { MeGate } from "../components/MeGate";
import { Plans } from "../components/Plans";
import { artFor } from "../lib/art";
import { homePathFor } from "../lib/me";
import { translate, useT, type StringKey } from "../lib/strings";
import { rememberWorld } from "../lib/world";

const WHY = [1, 2, 3] as const;
const VS = [1, 2, 3, 4, 5, 6] as const;
const HOW = [1, 2, 3] as const;
const FAQ = [1, 2, 3, 4, 5] as const;

/**
 * The home page: neutral littleHYPE branding, the case for journaling, the four worlds,
 * the price. Signed-in visitors go straight to where they belong. The product screens
 * are real (scripts/shoot-worlds.mjs renders them from the app with sample data).
 */
export function Landing() {
  const { isLoaded, isSignedIn } = useAuth();
  const t = useT();

  if (isLoaded && isSignedIn) {
    return <MeGate>{(me) => <Navigate to={homePathFor(me)} replace />}</MeGate>;
  }
  // One screen per step, each from a different world, so the page shows the range.
  const how = HOW.map((n, i) => ({ n, slug: THEME_SLUGS[i % THEME_SLUGS.length]!, scene: (["entry", "today", "badge"] as const)[i]! }));

  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Site">
        <span className="landing-mark">{t("app.name")}</span>
        <span className="landing-nav-links">
          <a href="#worlds">{t("landing.cta.worlds")}</a>
          <a href="#pricing">{t("paywall.plan.lifetime")}</a>
          <Link to="/sign-in">{t("auth.signIn")}</Link>
        </span>
      </nav>

      <section className="landing-hero">
        <h1>{t("landing.heading")}</h1>
        <p className="landing-body">{t("landing.body")}</p>
        <p className="actions">
          <a className="button" href="#worlds">
            {t("landing.cta.worlds")}
          </a>
          <a className="link-button" href="#how">
            {t("landing.cta.how")}
          </a>
        </p>
      </section>

      <section className="landing-why" aria-labelledby="why-heading">
        <h2 id="why-heading">{t("landing.why.heading")}</h2>
        <ul className="why-grid">
          {WHY.map((n) => (
            <li key={n}>
              <h3>{t(`landing.why.${n}.title` as StringKey)}</h3>
              <p>{t(`landing.why.${n}.body` as StringKey)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-vs" aria-labelledby="vs-heading">
        <h2 id="vs-heading">{t("landing.vs.heading")}</h2>
        <p className="landing-lead">{t("landing.vs.intro")}</p>
        <div className="vs-table" role="table">
          <div className="vs-row vs-head" role="row">
            <span role="columnheader">{t("landing.vs.them")}</span>
            <span role="columnheader">{t("landing.vs.us")}</span>
          </div>
          {VS.map((n) => (
            <div key={n} className="vs-row" role="row">
              <span className="vs-them" role="cell">
                {t(`landing.vs.${n}.them` as StringKey)}
              </span>
              <span className="vs-us" role="cell">
                {t(`landing.vs.${n}.us` as StringKey)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="worlds" className="landing-worlds" aria-labelledby="worlds-heading">
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
                  <span className="world-card-enter">{t("landing.world.enter")} &rarr;</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="how" className="landing-how" aria-labelledby="how-heading">
        <h2 id="how-heading">{t("landing.how.heading")}</h2>
        <ol className="how-steps">
          {how.map(({ n, slug, scene }) => (
            <li key={n} className="how-step">
              <img className="how-shot" src={`/worlds/${slug}-${scene}-phone.jpg`} alt={`${translate(slug, "theme.name")}: ${t(`landing.how.${n}.title` as StringKey)}`} loading="lazy" width="390" height={scene === "today" ? 1180 : scene === "entry" ? 1000 : 844} />
              <h3>{t(`landing.how.${n}.title` as StringKey)}</h3>
              <p>{t(`landing.how.${n}.body` as StringKey)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="landing-pricing" aria-labelledby="pricing-heading">
        <h2 id="pricing-heading">{t("landing.pricing.heading")}</h2>
        <p className="landing-lead">{t("landing.pricing.body")}</p>
        <Plans />
        <p className="actions">
          <Link className="button" to="/sign-up">
            {t("landing.pricing.cta")}
          </Link>
        </p>
      </section>

      <section className="landing-faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading">{t("landing.faq.heading")}</h2>
        <dl className="faq">
          {FAQ.map((n) => (
            <div key={n} className="faq-item">
              <dt>{t(`landing.faq.${n}.q` as StringKey)}</dt>
              <dd>{t(`landing.faq.${n}.a` as StringKey)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="landing-final">
        <h2>{t("landing.final.heading")}</h2>
        <p className="actions">
          <a className="button" href="#worlds">
            {t("landing.cta.worlds")}
          </a>
        </p>
      </section>

      <footer className="landing-footer">
        <Link to="/privacy">{t("settings.links.privacy")}</Link>
        <Link to="/terms">{t("settings.links.terms")}</Link>
        <span>{t("landing.footer.made")}</span>
      </footer>
    </main>
  );
}
