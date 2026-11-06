/**
 * Renders the real app screens (from the design gallery, `npm run visual`) into the images
 * the marketing pages show, so a product page can never drift from the product. Run after a
 * design change, with the gallery up on :4173:
 *
 *   CHROMIUM_PATH=/path/to/chrome node scripts/shoot-worlds.mjs
 *
 * Writes web/public/worlds/<slug>-<scene>-<desktop|phone>.jpg for every launch theme.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { THEME_SLUGS } from "../themes/registry.ts";

const base = process.env.VISUAL_URL ?? "http://127.0.0.1:4173/";
const out = new URL("../web/public/worlds/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

// scene -> [gallery query, desktop clip height, phone clip height]
const SCENES = {
  today: ["scene=today", 760, 1180],
  entry: ["scene=entry", 700, 1000],
  badge: ["scene=unlock", 700, 844],
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
for (const slug of THEME_SLUGS) {
  for (const [scene, [query, desktopH, phoneH]] of Object.entries(SCENES)) {
    for (const [kind, width, height, scale] of [["desktop", 1280, desktopH, 1], ["phone", 390, phoneH, 2]]) {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
      const page = await ctx.newPage();
      await page.goto(`${base}?${query}&theme=${slug}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${out}${slug}-${scene}-${kind}.jpg`, type: "jpeg", quality: 82 });
      await ctx.close();
      console.log(`${slug} ${scene} ${kind}`);
    }
  }
}
await browser.close();
