import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

/**
 * The props every themed header receives (TH-11). A theme may replace the whole
 * header component, but only by rendering this same information: navigation,
 * sign out, and the small facts (account age, timezone) it may want to show.
 */
export interface HeaderProps {
  items: NavItem[];
  /** Resolves a string key in this theme's voice (with default fallback). */
  t: (key: string, vars?: Record<string, string>) => string;
  onSignOut: () => void;
  createdAt: string;
  timezone: string;
}
