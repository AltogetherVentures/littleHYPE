import { NavLink } from "react-router-dom";
import type { HeaderProps } from "../lib/overrides-types";

/** The neutral header, used by any theme that does not ship its own. */
export function DefaultHeader({ items, t, onSignOut }: HeaderProps) {
  return (
    <header className="shell-header">
      <span className="brand">{t("theme.name")}</span>
      <nav className="hdr-nav" aria-label="Main">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button className="link-button" onClick={onSignOut}>
        {t("auth.signOut")}
      </button>
    </header>
  );
}
