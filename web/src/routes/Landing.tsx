import { useAuth } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router-dom";
import { THEME_SLUGS } from "@themes/registry";
import { MeGate } from "../components/MeGate";
import { artFor } from "../lib/art";
import { homePathFor } from "../lib/me";
import { translate, useT } from "../lib/strings";

/** Neutral littleHYPE branding. Signed-in visitors go straight to where they belong. */
export function Landing() {
  const { isLoaded, isSignedIn } = useAuth();
  const t = useT();

  if (isLoaded && isSignedIn) {
    return <MeGate>{(me) => <Navigate to={homePathFor(me)} replace />}</MeGate>;
  }
  return (
    <main className="landing">
      <section className="landing-hero">
        <p className="landing-mark">{t("app.name")}</p>
        <h1>{t("landing.heading")}</h1>
        <p className="landing-body">{t("landing.body")}</p>
        <p className="actions">
          <Link className="button" to="/sign-up">
            {t("auth.signUp")}
          </Link>
          <Link className="link-button" to="/sign-in">
            {t("auth.signIn")}
          </Link>
        </p>
      </section>
      <section className="landing-worlds" aria-labelledby="worlds-heading">
        <h2 id="worlds-heading">{t("landing.themes.heading")}</h2>
        <p className="note">{t("landing.themes.note")}</p>
        <ul className="worlds">
          {THEME_SLUGS.map((slug) => {
            const art = artFor(slug, "hero");
            return (
              <li key={slug}>
                <Link className="world-card" data-theme={slug} to={`/${slug}`}>
                  {art && <img className="world-card-art" src={art} alt="" />}
                  <span className="world-card-name">{translate(slug, "theme.name")}</span>
                  <span className="world-card-tagline">{translate(slug, "theme.tagline")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
