import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { decideThemeRoute } from "@shared/theme-routing";
import { THEME_SLUGS } from "@themes/registry";
import { AppShell } from "../components/AppShell";
import { homePathFor, type Me } from "../lib/me";
import { ThemeProvider, useT, type StringKey } from "../lib/strings";
import { useDocumentTheme } from "../lib/useDocumentTheme";
import { EntryPage } from "./EntryPage";
import { HabitDetail } from "./HabitDetail";
import { HabitsPage } from "./HabitsPage";
import { JournalPage } from "./JournalPage";
import { Today } from "./Today";
import { Welcome } from "./Welcome";

function ComingSoon({ title }: { title: StringKey }) {
  const t = useT();
  return (
    <section className="panel coming-soon">
      <header className="panel-head">
        <h1 className="panel-title">{t(title)}</h1>
        <span className="panel-tag">{t("today.tag.soon")}</span>
      </header>
      <p>{t("soon.body")}</p>
    </section>
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

  // First run: nothing else in the app until the welcome step is done or skipped (ON-4).
  const welcomePath = `/${me.theme}/welcome`;
  if (!me.onboarded && location.pathname !== welcomePath) return <Navigate to={welcomePath} replace />;

  return (
    <ThemeProvider theme={me.theme}>
      <AppShell theme={me.theme} me={me}>
        <Routes>
          <Route path="welcome" element={<Welcome me={me} />} />
          <Route path="today" element={<Today me={me} />} />
          <Route path="journal" element={<JournalPage me={me} />} />
          <Route path="journal/:id" element={<EntryPage me={me} />} />
          <Route path="habits" element={<HabitsPage me={me} />} />
          <Route path="habits/:id" element={<HabitDetail me={me} />} />
          <Route path="achievements" element={<ComingSoon title="nav.achievements" />} />
          <Route path="settings" element={<ComingSoon title="nav.settings" />} />
          <Route path="*" element={<Navigate to={homePathFor(me)} replace />} />
        </Routes>
      </AppShell>
    </ThemeProvider>
  );
}
