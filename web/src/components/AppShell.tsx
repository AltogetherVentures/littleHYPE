import { useClerk } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import type { Me } from "../lib/me";
import { headerFor } from "../lib/overrides";
import type { HeaderProps, NavItem } from "../lib/overrides-types";
import { useT, type StringKey } from "../lib/strings";
import { icons } from "./icons";
import { TabBar } from "./TabBar";

const NAV: { to: string; label: StringKey; icon: keyof typeof icons }[] = [
  { to: "today", label: "nav.today", icon: "today" },
  { to: "journal", label: "nav.journal", icon: "journal" },
  { to: "habits", label: "nav.habits", icon: "habits" },
  { to: "achievements", label: "nav.achievements", icon: "achievements" },
  { to: "settings", label: "nav.settings", icon: "settings" },
];

/**
 * Themed frame around every signed-in screen. The theme may replace the header
 * component (TH-11) and restyles everything else through tokens and theme CSS;
 * the structure, navigation and behaviour are the same in every theme.
 */
export function AppShell({ theme, me, children }: { theme: string; me: Me; children: ReactNode }) {
  const t = useT();
  const { signOut } = useClerk();
  const Header = headerFor(theme);

  const items: NavItem[] = NAV.map(({ to, label, icon }) => ({
    to: `/${theme}/${to}`,
    label: t(label),
    icon: icons[icon],
  }));
  const headerT: HeaderProps["t"] = (key, vars) => t(key as StringKey, vars);

  return (
    <div className="shell">
      <Header
        items={items}
        t={headerT}
        onSignOut={() => void signOut({ redirectUrl: "/" })}
        createdAt={me.createdAt}
        timezone={me.timezone}
      />
      <main id="main">{children}</main>
      <TabBar items={items} />
    </div>
  );
}
