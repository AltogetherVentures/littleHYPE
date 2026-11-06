import { NavLink } from "react-router-dom";
import type { HeaderProps } from "../../web/src/lib/overrides-types";

/** SpellBook header: a leather book edge with gold trim and a wax seal. */
export default function Header({ items, t, onSignOut }: HeaderProps) {
  const status = t("header.status");
  return (
    <header className="hdr-spell">
      <div className="hdr-spell-bar">
        <span className="hdr-spell-seal" aria-hidden="true">
          <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
            <defs>
              <radialGradient id="wax" cx="35%" cy="30%" r="80%">
                <stop offset="0" stopColor="#d24a5c" />
                <stop offset="1" stopColor="#7a1226" />
              </radialGradient>
            </defs>
            <path d="M27 3c5 0 7 4 12 5s9 5 8 11 3 8 1 13-6 7-7 11-6 6-11 5-8 3-12-1-5-7-9-10-5-7-3-12-1-9 3-13 7-4 11-6 6-3 7-3z" fill="url(#wax)" />
            <circle cx="27" cy="27" r="15" stroke="#f0b9be" strokeOpacity=".55" strokeWidth="1.6" />
            <path d="M27 14l7 13-7 13-7-13z" stroke="#f6d7da" strokeWidth="1.6" />
            <path d="M16 27h22" stroke="#f6d7da" strokeWidth="1.6" />
          </svg>
        </span>
        <span className="hdr-spell-brand">{t("theme.name")}</span>
        <nav className="hdr-nav hdr-spell-nav" aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hdr-spell-right">
          {status && <span className="hdr-spell-status">&#10022; {status}</span>}
          <button className="hdr-spell-out" onClick={onSignOut}>
            {t("auth.signOut")}
          </button>
        </div>
      </div>
      <div className="hdr-spell-trim" aria-hidden="true" />
    </header>
  );
}
