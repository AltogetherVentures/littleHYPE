import { useClerk } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useT, type StringKey } from "../lib/strings";

const NAV: { to: string; label: StringKey }[] = [
  { to: "today", label: "nav.today" },
  { to: "journal", label: "nav.journal" },
  { to: "habits", label: "nav.habits" },
  { to: "achievements", label: "nav.achievements" },
  { to: "settings", label: "nav.settings" },
];

/** Themed header and navigation. The theme changes wording and tokens, not structure. */
export function AppShell({ theme, children }: { theme: string; children: ReactNode }) {
  const t = useT();
  const { signOut } = useClerk();
  return (
    <div className="shell">
      <header className="shell-header">
        <span className="brand">{t("theme.name")}</span>
        <nav aria-label="Main">
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={`/${theme}/${to}`}>
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <button className="link-button" onClick={() => void signOut({ redirectUrl: "/" })}>
          {t("auth.signOut")}
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}
