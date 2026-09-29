/**
 * Illustrations are theme assets (themes/<slug>/assets/<name>.svg), so a theme
 * ships its own artwork with no code. A missing file falls back to the default
 * theme's neutral art, mirroring how string tables fall back.
 */
export type ArtName = "hero" | "habits" | "prompt";

const files = import.meta.glob<string>("../../../themes/*/assets/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

const urls: Record<string, Record<string, string>> = {};
for (const [path, url] of Object.entries(files)) {
  const match = /themes\/([^/]+)\/assets\/([^/]+)\.svg$/.exec(path);
  if (!match) continue;
  (urls[match[1]!] ??= {})[match[2]!] = url;
}

export function artFor(theme: string | null | undefined, name: ArtName): string | undefined {
  return (theme ? urls[theme]?.[name] : undefined) ?? urls["default"]?.[name];
}

export function themesWithArt(): string[] {
  return Object.keys(urls).filter((s) => s !== "default");
}
