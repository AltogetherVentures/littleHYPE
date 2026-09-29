import { NavLink } from "react-router-dom";
import type { NavItem } from "../lib/overrides-types";

/** Bottom navigation for phones: thumb-reachable, with icons. Hidden on wide screens. */
export function TabBar({ items }: { items: NavItem[] }) {
  return (
    <nav className="tabbar" aria-label="Main (mobile)">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} className="tab">
          {item.icon}
          <span className="tab-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
