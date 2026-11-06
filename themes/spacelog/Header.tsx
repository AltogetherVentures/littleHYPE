import { NavLink } from "react-router-dom";
import { daysSince } from "../../web/src/lib/flair";
import type { HeaderProps } from "../../web/src/lib/overrides-types";

/** Space Log header: a mission-control bar with a status light and a mission-day readout. */
export default function Header({ items, t, onSignOut, createdAt, timezone }: HeaderProps) {
  const status = t("header.status");
  return (
    <header className="hdr-space">
      <div className="hdr-space-inner">
        <div className="hdr-space-brand">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <circle cx="13" cy="13" r="6" fill="currentColor" />
            <ellipse cx="13" cy="13" rx="12" ry="4.2" stroke="currentColor" strokeWidth="1.5" transform="rotate(-24 13 13)" />
          </svg>
          <span>{t("theme.name")}</span>
        </div>
        <nav className="hdr-nav hdr-space-nav" aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hdr-space-readout">
          {status && (
            <span className="hdr-space-status">
              <i aria-hidden="true" />
              {status}
            </span>
          )}
          <span className="hdr-space-day">
            {t("header.counter")} <b>{daysSince(createdAt, new Date(), timezone)}</b>
          </span>
          <button className="hdr-space-out" onClick={onSignOut}>
            {t("auth.signOut")}
          </button>
        </div>
      </div>
      <div className="hdr-space-scan" aria-hidden="true" />
    </header>
  );
}
