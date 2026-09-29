import type { ComponentType } from "react";
import { DefaultHeader } from "../components/DefaultHeader";
import { DefaultCalendar } from "../components/DefaultCalendar";
import type { CalendarProps, HeaderProps } from "./overrides-types";

/**
 * Component overrides live in a small registry (TH-11): only where tokens and
 * strings are not enough. Each theme may provide themes/<slug>/Header.tsx; no
 * file means the default header. Discovered at build time, so adding a theme
 * never touches this file.
 */
const headers = import.meta.glob<{ default: ComponentType<HeaderProps> }>("../../../themes/*/Header.tsx", {
  eager: true,
});
const headerBySlug: Record<string, ComponentType<HeaderProps>> = {};
for (const [path, mod] of Object.entries(headers)) {
  const slug = /themes\/([^/]+)\/Header\.tsx$/.exec(path)?.[1];
  if (slug) headerBySlug[slug] = mod.default;
}

export function headerFor(theme: string | null | undefined): ComponentType<HeaderProps> {
  return (theme && headerBySlug[theme]) || DefaultHeader;
}

export function themesWithHeaderOverride(): string[] {
  return Object.keys(headerBySlug);
}

const calendars = import.meta.glob<{ default: ComponentType<CalendarProps> }>("../../../themes/*/Calendar.tsx", {
  eager: true,
});
const calendarBySlug: Record<string, ComponentType<CalendarProps>> = {};
for (const [path, mod] of Object.entries(calendars)) {
  const slug = /themes\/([^/]+)\/Calendar\.tsx$/.exec(path)?.[1];
  if (slug) calendarBySlug[slug] = mod.default;
}

export function calendarFor(theme: string | null | undefined): ComponentType<CalendarProps> {
  return (theme && calendarBySlug[theme]) || DefaultCalendar;
}

export function themesWithCalendarOverride(): string[] {
  return Object.keys(calendarBySlug);
}
