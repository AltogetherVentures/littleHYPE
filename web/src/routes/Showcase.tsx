import type { AchievementKey } from "@shared/achievement-defs";
import { Link } from "react-router-dom";
import { THEME_SLUGS } from "@themes/registry";
import { AchievementEmblem } from "../components/AchievementEmblem";
import { Plans } from "../components/Plans";
import { tierOf } from "@shared/achievement-tiers";
import { familyOf } from "@shared/achievements";
import { artFor } from "../lib/art";
import { achievementCopy, examplePage, promptText } from "../lib/content";
import { Markdown } from "../lib/markdown";
import { ThemeProvider, translate, useT, type StringKey } from "../lib/strings";
import { useDocumentTheme } from "../lib/useDocumentTheme";
import { rememberWorld } from "../lib/world";

const VOCAB: StringKey[] = ["vocab.entry", "vocab.prompt", "vocab.habit", "vocab.streak", "vocab.achievement"];
const BADGES: AchievementKey[] = ["first_entry", "streak_7", "entries_30"];
const SCENES = ["today", "entry", "badge"] as const;

/**
 * The product page for one world, for signed-out visitors (TH-7): fully in that theme's
 * look and voice, with real screens (scripts/shoot-worlds.mjs), its vocabulary, its sample
 * page and a few of its badges. Money copy stays neutral.
 */
export function Showcase({ slug }: { slug: string }) {
  useDocumentTheme(slug);
  return (
    <ThemeProvider theme={slug}>
      <WorldPage slug={slug} />
    </ThemeProvider>
  );
}

function WorldPage({ slug }: { slug: string }) {
  const t = useT();
  const name = t("theme.name");
  const art = artFor(slug, "hero");
  const example = examplePage(slug);
  const others = THEME_SLUGS.filter((s) => s !== slug);
  const start = () => rememberWorld(slug);

  return (
    <main className="showcase">
      <nav className="showcase-top" aria-label="Site">
        <Link to="/" className="showcase-back">
          &larr; {translate(null, "world.nav.back")}
        </Link>
        <Link to="/sign-in" className="link-button">
          {translate(null, "auth.signIn")}
        </Link>
      </nav>

      <section className="showcase-hero">
        <div className="showcase-hero-text">
          <p className="showcase-mark">{translate(null, "app.name")}</p>
          <h1>{name}</h1>
          <p className="showcase-tagline">{t("theme.tagline")}</p>
          <p className="showcase-quote">&ldquo;{t("theme.preview")}&rdquo;</p>
          <p className="actions">
            <Link className="button" to="/sign-up" onClick={start}>
              {translate(null, "world.cta", { name })}
            </Link>
          </p>
        </div>
        {art && <img className="showcase-art" src={art} alt="" />}
      </section>

      <section className="showcase-day" aria-labelledby="day-heading">
        <h2 id="day-heading">{translate(null, "world.day.heading", { name })}</h2>
        <ul className="day-shots">
          {SCENES.map((scene) => (
            <li key={scene}>
              <img className="day-shot" src={`/worlds/${slug}-${scene}-phone.jpg`} alt={`${name}: ${translate(null, `world.day.${scene}` as StringKey)}`} loading="lazy" width="390" height={scene === "today" ? 1180 : scene === "entry" ? 1000 : 844} />
              <p>{translate(null, `world.day.${scene}` as StringKey)}</p>
            </li>
          ))}
        </ul>
        <img className="day-desktop" src={`/worlds/${slug}-today-desktop.jpg`} alt={`${name} on a desktop`} loading="lazy" width="1280" height="760" />
      </section>

      <section className="showcase-vocab" aria-labelledby="vocab-heading">
        <h2 id="vocab-heading">{translate(null, "world.vocab.heading", { name })}</h2>
        <dl className="vocab-grid">
          {VOCAB.map((key) => (
            <div key={key} className="vocab-item">
              <dt>{translate(null, key)}</dt>
              <dd>{t(key)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="showcase-sample" aria-labelledby="sample-heading">
        <h2 id="sample-heading">{translate(null, "world.sample.heading", { name })}</h2>
        <div className="entry-card example-card" data-mood={example.mood}>
          <span className="entry-edge" aria-hidden="true" />
          <p className="entry-prompt example-prompt">
            <span className="entry-prompt-label">{t("journal.example.answering")}</span> {promptText(slug, example.promptKey)}
          </p>
          <div className="entry-body">
            <Markdown text={example.body} />
          </div>
        </div>
      </section>

      <section className="showcase-badges" aria-labelledby="badges-heading">
        <h2 id="badges-heading">{translate(null, "world.badges.heading")}</h2>
        <ul className="badge-grid">
          {BADGES.map((key) => {
            const copy = achievementCopy(slug, key);
            return (
              <li key={key} className="badge" data-unlocked="true" data-family={familyOf(key)} data-tier={tierOf(key)}>
                <div className="badge-emblem">
                  <AchievementEmblem family={familyOf(key)} tier={tierOf(key)} size={40} />
                </div>
                <h3 className="badge-name">{copy.name}</h3>
                <p className="badge-desc">{copy.description}</p>
                <p className="badge-status">&ldquo;{copy.unlock}&rdquo;</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="showcase-pricing" aria-labelledby="price-heading">
        <h2 id="price-heading">{translate(null, "world.pricing.heading")}</h2>
        <Plans />
        <p className="actions">
          <Link className="button" to="/sign-up" onClick={start}>
            {translate(null, "world.cta", { name })}
          </Link>
        </p>
        <p className="note">{translate(null, "paywall.secure")}</p>
      </section>

      <section className="showcase-others" aria-labelledby="others-heading">
        <h2 id="others-heading">{translate(null, "world.others.heading")}</h2>
        <ul className="others">
          {others.map((s) => (
            <li key={s}>
              <Link to={`/${s}`} data-theme={s} className="other-world">
                {translate(s, "theme.name")}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="landing-footer">
        <Link to="/privacy">{translate(null, "settings.links.privacy")}</Link>
        <Link to="/terms">{translate(null, "settings.links.terms")}</Link>
        <span>{translate(null, "landing.footer.made")}</span>
      </footer>
    </main>
  );
}
