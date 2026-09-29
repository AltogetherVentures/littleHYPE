import { NavLink } from "react-router-dom";
import { daysSince } from "../../web/src/lib/flair";
import type { HeaderProps } from "../../web/src/lib/overrides-types";

/** Day Zero header: hazard tape, and a stencilled counter of days survived since Day Zero. */
export default function Header({ items, t, onSignOut, createdAt, timezone }: HeaderProps) {
  const day = daysSince(createdAt, new Date(), timezone);
  const status = t("header.status");
  return (
    <header className="hdr-zero">
      <div className="hdr-zero-hazard" aria-hidden="true" />
      <div className="hdr-zero-bar">
        <div className="hdr-zero-counter" aria-label={`${t("header.counter")}: ${day}`}>
          <span className="hdr-zero-label">{t("header.counter")}</span>
          <span className="hdr-zero-num">{day}</span>
        </div>
        <span className="hdr-zero-brand">{t("theme.name")}</span>
        <nav className="hdr-nav hdr-zero-nav" aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hdr-zero-right">
          {status && (
            <span className="hdr-zero-status">
              <i aria-hidden="true" />
              {status}
            </span>
          )}
          <button className="hdr-zero-out" onClick={onSignOut}>
            {t("auth.signOut")}
          </button>
        </div>
      </div>
    </header>
  );
}
