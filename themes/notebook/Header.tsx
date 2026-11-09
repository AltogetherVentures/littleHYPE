import { NavLink } from "react-router-dom";
import type { HeaderProps } from "../../web/src/lib/overrides-types";

/** NoteBook header: a stitched notebook spine, coloured index tabs and a ribbon bookmark. */
export default function Header({ items, t, onSignOut }: HeaderProps) {
  return (
    <header className="hdr-note">
      <div className="hdr-note-spine">
        <span className="hdr-note-rings" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="hdr-note-brand">{t("theme.name")}</span>
        <button className="hdr-note-out" onClick={onSignOut}>
          {t("auth.signOut")}
        </button>
      </div>
      <nav className="hdr-nav hdr-note-tabs" aria-label="Main">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <span className="hdr-note-ribbon" aria-hidden="true" />
    </header>
  );
}
