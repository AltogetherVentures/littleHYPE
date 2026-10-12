import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_SLUGS } from "../themes/registry";

/**
 * NF-6: application code never names a theme. The active theme is read from the
 * user's profile, and valid names come from themes/registry.ts. Themes are
 * content; if /app needed to know their names, they would be forks.
 */
const root = path.resolve(__dirname, "..");
const scanned = ["src", "shared", "web/src"];
const isSource = (f: string) => /\.(ts|tsx|css)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f) && !f.endsWith("vite-env.d.ts");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return entry === "node_modules" || entry === "dist" ? [] : walk(full);
    return isSource(full) ? [full] : [];
  });
}

const displayNames = ["Space Log", "SpellBook", "Day Zero", "NoteBook"];

describe("theme isolation (NF-6)", () => {
  const files = scanned.flatMap((d) => walk(path.join(root, d)));

  it("scans a meaningful number of files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("never references a theme slug or display name in application code", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const term of [...THEME_SLUGS, ...displayNames]) {
        if (new RegExp(`\\b${term}\\b`, "i").test(text)) offenders.push(`${path.relative(root, file)}: ${term}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
