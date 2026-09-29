import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_SLUGS } from "../themes/registry";

const themesDir = path.resolve(__dirname, "../themes");

describe("theme folders (TH-12, NF-6)", () => {
  it("has a folder with tokens and strings for every registered theme", () => {
    for (const slug of THEME_SLUGS) {
      expect(existsSync(path.join(themesDir, slug, "tokens.css")), `${slug}/tokens.css`).toBe(true);
      expect(existsSync(path.join(themesDir, slug, "strings.json")), `${slug}/strings.json`).toBe(true);
    }
  });

  it("has no unregistered theme folders", () => {
    const folders = readdirSync(themesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== "default")
      .map((d) => d.name);
    expect(folders.sort()).toEqual([...THEME_SLUGS].sort());
  });

  it("has well-formed artwork for every illustration slot", () => {
    for (const slug of ["default", ...THEME_SLUGS]) {
      for (const name of ["hero", "habits", "prompt"]) {
        const file = path.join(themesDir, slug, "assets", `${name}.svg`);
        expect(existsSync(file), `${slug}/assets/${name}.svg`).toBe(true);
        const svg = readFileSync(file, "utf8").trim();
        expect(svg.startsWith("<svg"), `${slug}/${name} starts with <svg`).toBe(true);
        expect(svg, `${slug}/${name} declares a namespace`).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(svg, `${slug}/${name} has a viewBox`).toContain("viewBox=");
        expect(svg.endsWith("</svg>"), `${slug}/${name} is closed`).toBe(true);
        // Artwork is a static asset: no scripts, no external loads.
        expect(svg).not.toMatch(/<script|href="https?:|xlink:href="https?:|url\(https?:/i);
      }
    }
  });

  it("keeps the neutral defaults at zero specificity so a theme can never lose to them", () => {
    // :root and [data-theme] are equally specific; the bundler decides which
    // comes later. A plain :root here made every theme silently invisible.
    const css = readFileSync(path.join(themesDir, "default", "tokens.css"), "utf8");
    const selectors = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{/g)].map((m) => m[1]!.trim());
    expect(selectors).toEqual([":where(:root)"]);
  });

  it("scopes each theme's tokens to its own data-theme block", () => {
    for (const slug of THEME_SLUGS) {
      const css = readFileSync(path.join(themesDir, slug, "tokens.css"), "utf8");
      expect(css).toContain(`[data-theme="${slug}"]`);
    }
  });
});

// NF-4: WCAG 2.2 AA contrast for every theme's colour pairs.
function tokens(file: string): Record<string, string> {
  const css = readFileSync(file, "utf8");
  return Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("theme contrast (NF-4)", () => {
  const files = ["default", ...THEME_SLUGS].map((n) => [n, path.join(themesDir, n, "tokens.css")] as const);
  const pairs: [string, string][] = [
    ["color-text", "color-bg"],
    ["color-text", "color-surface"],
    ["color-muted", "color-bg"],
    ["color-muted", "color-surface"],
    ["color-accent-contrast", "color-accent"],
    ["color-accent", "color-bg"],
    ["color-accent", "color-surface"],
  ];

  for (const [name, file] of files) {
    it(`${name}: every text pair is at least 4.5:1`, () => {
      const t = tokens(file);
      for (const [fg, bg] of pairs) {
        expect(t[fg], `${name} ${fg}`).toMatch(/^#[0-9a-f]{6}$/i);
        expect(t[bg], `${name} ${bg}`).toMatch(/^#[0-9a-f]{6}$/i);
        expect(contrast(t[fg]!, t[bg]!), `${name}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
