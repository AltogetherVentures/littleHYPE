/**
 * Pixel-level WCAG AA contrast check for the design gallery (NF-4, TH-14).
 *
 * Automated tools such as axe skip text that sits on gradients and textures, so
 * this renders each screen with all text hidden, samples the real pixels behind
 * every text run, and compares them with the text colour. Themes are full of
 * textures, so this is the check that actually finds problems.
 *
 *   npm run visual            # terminal 1: serves the gallery on :4173
 *   npm run visual:contrast   # terminal 2
 *
 * Needs Chromium: set CHROMIUM_PATH, or run `npx playwright-core install chromium`.
 * Not part of CI (it needs a browser and network for web fonts).
 */
import { chromium } from "playwright-core";
import { THEME_SLUGS } from "../../themes/registry.ts";

const base = process.env.VISUAL_URL ?? "http://127.0.0.1:4173/";
const only = process.argv[2];
const scenes = [
  ...THEME_SLUGS.flatMap((t) => [
    [`today ${t}`, `scene=today&theme=${t}`],
    [`journal ${t}`, `scene=journal&theme=${t}`],
    [`habits ${t}`, `scene=habits&theme=${t}`],
    [`habit ${t}`, `scene=habit&theme=${t}`],
    [`welcome ${t}`, `scene=welcome&theme=${t}`],
    [`entry ${t}`, `scene=entry&theme=${t}`],
    [`newentry ${t}`, `scene=newentry&theme=${t}`],
    [`showcase ${t}`, `scene=showcase&theme=${t}&signedout=1`],
  ]),
  ["picker", "scene=picker&theme=x"],
  ["landing", "scene=landing&signedout=1&theme=x"],
];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
let checked = 0;
let fails = 0;

for (const [name, query] of scenes) {
  if (only && !name.includes(only)) continue;
  for (const [width, height] of [[1280, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${base}?${query}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Freeze motion; make fixed/sticky chrome ordinary flow (a full-page capture would
    // otherwise park it mid-page). `relative` keeps stacking contexts, `static` would not.
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important} .tabbar,[class^='hdr-']{position:relative!important}" });
    await page.waitForTimeout(400);

    const runs = await page.evaluate(() => {
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.nodeValue.trim();
        const el = node.parentElement;
        if (!text || seen.has(el) || ["SCRIPT", "STYLE"].includes(el.tagName)) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0 || el.closest(".sr-only")) continue; // sr-only text is not visible
        const range = document.createRange();
        range.selectNodeContents(node);
        const r = range.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        seen.add(el);
        out.push({ text: text.slice(0, 40), color: cs.color.match(/[\d.]+/g).slice(0, 3).map(Number), size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height });
      }
      return out;
    });

    await page.addStyleTag({ content: "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}" });
    const png = (await page.screenshot({ fullPage: true })).toString("base64");
    const results = await page.evaluate(async ({ png, runs }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const lum = ([r, g, b]) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      return runs.map((run) => {
        const x = Math.max(0, Math.floor(run.x));
        const y = Math.max(0, Math.floor(run.y));
        const w = Math.max(1, Math.min(img.width - x, Math.ceil(run.w)));
        const h = Math.max(1, Math.min(img.height - y, Math.ceil(run.h)));
        const data = ctx.getImageData(x, y, w, h).data;
        const samples = [];
        for (let i = 0; i < data.length; i += 12) samples.push(lum([data[i], data[i + 1], data[i + 2]]));
        samples.sort((a, b) => a - b);
        const text = lum(run.color);
        const worst = Math.min(ratio(text, samples[Math.floor(samples.length * 0.03)]), ratio(text, samples[Math.floor(samples.length * 0.97)]), ratio(text, samples[Math.floor(samples.length / 2)]));
        const large = run.size >= 24 || (run.size >= 18.66 && run.weight >= 700);
        return { text: run.text, worst: Number(worst.toFixed(2)), need: large ? 3 : 4.5, size: run.size };
      });
    }, { png, runs });

    for (const r of results) {
      checked++;
      if (r.worst < r.need) {
        fails++;
        console.log(`[${name} @${width}] ${r.worst}:1 < ${r.need}  "${r.text}" (${r.size}px)`);
      }
    }
    await page.close();
  }
}
await browser.close();
console.log(`checked ${checked} text runs, ${fails} below WCAG AA`);
process.exit(fails ? 1 : 0);
