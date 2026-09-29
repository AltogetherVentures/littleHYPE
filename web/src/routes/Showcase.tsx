import { Link } from "react-router-dom";
import { artFor } from "../lib/art";
import { ThemeProvider, translate, useT, type StringKey } from "../lib/strings";
import { useDocumentTheme } from "../lib/useDocumentTheme";

const VOCAB: StringKey[] = ["vocab.entry", "vocab.prompt", "vocab.habit", "vocab.streak", "vocab.achievement"];

/**
 * Logged-out marketing page for one theme (TH-7). Users pay before choosing, so
 * each world needs somewhere to be seen. No redirect check applies here.
 */
export function Showcase({ slug }: { slug: string }) {
  useDocumentTheme(slug);
  return (
    <ThemeProvider theme={slug}>
      <ShowcaseBody slug={slug} />
    </ThemeProvider>
  );
}

function ShowcaseBody({ slug }: { slug: string }) {
  const t = useT();
  const art = artFor(slug, "hero");
  return (
    <main className="showcase">
      <nav className="showcase-top" aria-label="Site">
        <Link to="/" className="showcase-back">
          {translate(null, "app.name")}
        </Link>
        <Link to="/sign-in" className="link-button">
          {translate(null, "auth.signIn")}
        </Link>
      </nav>

      <section className="showcase-hero">
        <div className="showcase-hero-text">
          <h1>{t("theme.name")}</h1>
          <p className="showcase-tagline">{t("theme.tagline")}</p>
          <p className="showcase-quote">&ldquo;{t("theme.preview")}&rdquo;</p>
          <p className="actions">
            <Link className="button" to="/sign-up">
              {t("showcase.cta", { name: translate(slug, "theme.name") })}
            </Link>
          </p>
        </div>
        {art && <img className="showcase-art" src={art} alt="" />}
      </section>

      <section className="showcase-vocab" aria-labelledby="vocab-heading">
        <h2 id="vocab-heading">{t("showcase.vocab.heading")}</h2>
        <dl className="vocab-grid">
          {VOCAB.map((key) => (
            <div key={key} className="vocab-item">
              <dt>{translate(null, key)}</dt>
              <dd>{t(key)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
