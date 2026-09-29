import type { ReactNode } from "react";

/** One neutral icon set. Themes restyle stroke weight and colour with CSS, never the shapes. */
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  className: "icon",
};

export const icons: Record<"today" | "journal" | "habits" | "achievements" | "settings", ReactNode> = {
  today: (
    <svg {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  ),
  journal: (
    <svg {...base}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z" />
      <path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19v-3M9 8h6M9 12h4" />
    </svg>
  ),
  habits: (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 3 3 5-6" />
    </svg>
  ),
  achievements: (
    <svg {...base}>
      <path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z" />
    </svg>
  ),
  settings: (
    <svg {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </svg>
  ),
};
