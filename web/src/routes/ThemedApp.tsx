import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { decideThemeRoute } from "@shared/theme-routing";
import { THEME_SLUGS } from "@themes/registry";
import { AppShell } from "../components/AppShell";
import { homePathFor, type Me } from "../lib/me";
import { ThemeProvider, useT, type StringKey } from "../lib/strings";
import { useDocumentTheme } from "../lib/useDocumentTheme";

function Today() {
  const t = useT();
  return (
    <>
      <h1>{t("today.title")}</h1>
      <p>{t("today.greeting")}</p>
      <section className="card">
        <h2>{t("today.habits.heading")}</h2>
        <p>{t("today.habits.empty")}</p>
      </section>
      <section className="card">
        <h2>{t("today.prompt.heading")}</h2>
        <p>{t("today.prompt.empty")}</p>
      </section>
    </>
  );
}

function ComingSoon({ title }: { title: StringKey }) {
  const t = useT();
  return (
    <>
      <h1>{t(title)}</h1>
      <p>{t("soon.body")}</p>
    </>
  );
}

/**
 * Everything under /<theme>/... for a signed-in, paid, onboarded user. The URL
 * is corrected to the profile's theme with the same function the Worker uses
 * (TH-5); the profile stays the single source of truth.
 */
export function ThemedApp({ me }: { me: Me }) {
  const location = useLocation();
  useDocumentTheme(me.theme);

  if (!me.theme) return <Navigate to={homePathFor(me)} replace />;
  const decision = decideThemeRoute({
    pathname: location.pathname,
    search: location.search,
    profileTheme: me.theme,
    themes: THEME_SLUGS,
  });
  if (decision.action === "redirect") return <Navigate to={decision.location} replace />;

  return (
    <ThemeProvider theme={me.theme}>
      <AppShell theme={me.theme}>
        <Routes>
          <Route path="today" element={<Today />} />
          <Route path="journal" element={<ComingSoon title="nav.journal" />} />
          <Route path="habits" element={<ComingSoon title="nav.habits" />} />
          <Route path="achievements" element={<ComingSoon title="nav.achievements" />} />
          <Route path="settings" element={<ComingSoon title="nav.settings" />} />
          <Route path="*" element={<Navigate to={homePathFor(me)} replace />} />
        </Routes>
      </AppShell>
    </ThemeProvider>
  );
}
