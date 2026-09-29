import { createContext, createElement, useContext, useMemo, type ReactNode } from "react";
import defaultTable from "../../../themes/default/strings.json";

export type StringKey = keyof typeof defaultTable;
type Table = Partial<Record<StringKey, string>>;

// One string table per theme folder, discovered at build time. Adding a theme
// adds files, not code (TH-10, TH-12).
const modules = import.meta.glob<Table>("../../../themes/*/strings.json", { eager: true, import: "default" });
const themeTables: Record<string, Table> = {};
for (const [path, table] of Object.entries(modules)) {
  const slug = /themes\/([^/]+)\/strings\.json$/.exec(path)?.[1];
  if (slug && slug !== "default") themeTables[slug] = table;
}

/**
 * Copy about payments, refunds, deletion, privacy or data loss (and auth) is
 * always the plain default wording, never theme voice (TH-13). Theme tables may
 * not define these keys; strings.test.ts fails the build if they do.
 */
export const NEUTRAL_KEY = /^(billing|paywall|privacy|delete|refund|export|legal|auth)\./;

export function translate(theme: string | null | undefined, key: StringKey, vars?: Record<string, string>): string {
  const themed = theme && !NEUTRAL_KEY.test(key) ? themeTables[theme]?.[key] : undefined;
  const raw = themed ?? defaultTable[key];
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => vars?.[name] ?? whole);
}

/** Exposed for tests. */
export function themeSlugsWithTables(): string[] {
  return Object.keys(themeTables);
}
export function tableFor(theme: string): Table | undefined {
  return themeTables[theme];
}
export function defaultKeys(): string[] {
  return Object.keys(defaultTable);
}

type TFn = (key: StringKey, vars?: Record<string, string>) => string;
const ThemeContext = createContext<string | null>(null);

export function ThemeProvider({ theme, children }: { theme: string | null; children: ReactNode }) {
  return createElement(ThemeContext.Provider, { value: theme }, children);
}

/** Translator bound to the signed-in user's theme (or the defaults outside the app). */
export function useT(): TFn {
  const theme = useContext(ThemeContext);
  return useMemo(() => (key, vars) => translate(theme, key, vars), [theme]);
}
