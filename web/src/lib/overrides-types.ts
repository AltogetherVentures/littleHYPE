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

/**
 * The props every themed calendar receives (TH-11). A theme may draw the month however it
 * likes (a star chart, a wall calendar of tally marks) but must render each non-blank day
 * as a button that calls `onSelect`, marks `selected` with aria-pressed, and is named for
 * screen readers; the date maths comes from web/src/lib/calendar.ts.
 */
export interface CalendarProps {
  /** "YYYY-MM" */
  month: string;
  /** The user's local today, "YYYY-MM-DD". */
  today: string;
  days: { date: string; count: number; mood: number | null }[];
  /** The day whose entries are shown, if any. */
  selected: string | null;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

/**
 * The props the themed achievement-unlock moment receives (TH-11). The theme owns the
 * staging and animation of the celebration; the app owns when it appears and what it says
 * (the achievement's own themed copy). `onDismiss` must be reachable by keyboard.
 */
export interface UnlockProps {
  name: string;
  description: string;
  /** The theme's celebratory line. */
  unlock: string;
  emblem: ReactNode;
  /** How many more are waiting behind this one. */
  remaining: number;
  onDismiss: () => void;
  t: (key: string, vars?: Record<string, string>) => string;
}
