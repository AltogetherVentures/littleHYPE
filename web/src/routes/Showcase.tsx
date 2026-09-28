import { Link } from "react-router-dom";
import { ThemeProvider, translate, useT } from "../lib/strings";
import { useDocumentTheme } from "../lib/useDocumentTheme";

/**
 * Logged-out marketing page for one theme (TH-7). Users pay before choosing,
 * so each theme needs somewhere to be seen. No redirect check applies here.
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
  return (
    <main className="page-narrow">
      <h1>{t("theme.name")}</h1>
      <p>{t("theme.tagline")}</p>
      <p className="theme-card-preview">&ldquo;{t("theme.preview")}&rdquo;</p>
      <p className="actions">
        <Link className="button" to="/sign-up">
          {t("showcase.cta", { name: translate(slug, "theme.name") })}
        </Link>
      </p>
    </main>
  );
}
