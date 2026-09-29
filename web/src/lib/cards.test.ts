import { describe, expect, it } from "vitest";
import { CARD_SIZES, renderCardSvg, wrapText, type CardFormat } from "@themes/card-kit";
import { CARD_THEMES } from "@themes/cards";
import { THEME_SLUGS } from "@themes/registry";

const content = {
  kicker: "Hydration",
  headline: "Archmage of Hydration, Day 43",
  sub: "43 days",
  habitName: null,
  themeName: "Theme",
  referralUrl: "https://app.example/r/abcdefgh",
};

describe("share card registry", () => {
  it("covers exactly the registered themes, each with titles for every category and rank, and a break card", () => {
    expect(Object.keys(CARD_THEMES).sort()).toEqual([...THEME_SLUGS].sort());
    for (const [slug, t] of Object.entries(CARD_THEMES)) {
      expect(Object.keys(t.titles), slug).toHaveLength(32);
      expect(t.breakCard.variants, slug).toHaveLength(4);
      expect(t.strings["theme.name"], slug).toBeTruthy();
    }
  });
});

describe("share card SVG", () => {
  const cases = THEME_SLUGS.flatMap((slug) => (["story", "square"] as CardFormat[]).map((format) => [slug, format] as const));

  it.each(cases)("%s %s is well-formed, the right size, and self-contained", (slug, format) => {
    const svg = renderCardSvg(CARD_THEMES[slug]!.style, format, content);
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror"), "must parse as XML").toBeNull();
    const root = doc.documentElement;
    const { w, h } = CARD_SIZES[format];
    expect([root.getAttribute("width"), root.getAttribute("height"), root.getAttribute("viewBox")]).toEqual([String(w), String(h), `0 0 ${w} ${h}`]);
    expect(svg).not.toMatch(/<script|<foreignObject|<image|<a[ >]|href=|onload=|onerror=|@import|https?:\/\/(?!www\.w3\.org)/i);
    expect(svg).toContain("font/woff2;base64"); // its fonts travel with it
    expect(svg).toContain("app.example/r/abcdefgh");
    expect(svg).toContain("Theme");
    expect(doc.querySelectorAll("text").length).toBeGreaterThanOrEqual(5);
  });

  it("draws each theme differently", () => {
    const drawings = new Set(THEME_SLUGS.map((s) => renderCardSvg(CARD_THEMES[s]!.style, "story", content).replace(/<style>.*?<\/style>/s, "")));
    expect(drawings.size).toBe(THEME_SLUGS.length);
  });

  it("is the same every time, so a shared card matches the preview", () => {
    for (const slug of THEME_SLUGS) expect(renderCardSvg(CARD_THEMES[slug]!.style, "story", content)).toBe(renderCardSvg(CARD_THEMES[slug]!.style, "story", content));
  });

  it("shows the habit's name only when one is given, and escapes anything in it", () => {
    const style = CARD_THEMES.spacelog!.style;
    expect(renderCardSvg(style, "story", content)).not.toContain("Marathon");
    const svg = renderCardSvg(style, "story", { ...content, habitName: 'Marathon <script>alert("x")</script> & co' });
    expect(svg).toContain("Marathon &lt;script&gt;");
    expect(svg).not.toContain("<script>");
    expect(new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror")).toBeNull();
  });

  it("wraps long text to fit and never overflows the frame", () => {
    const long = "word ".repeat(80).trim();
    for (const slug of THEME_SLUGS) {
      const svg = renderCardSvg(CARD_THEMES[slug]!.style, "square", { ...content, headline: long, sub: long, kicker: long });
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      for (const t of doc.querySelectorAll("text")) expect(t.querySelectorAll("tspan").length, slug).toBeLessThanOrEqual(9);
    }
    expect(wrapText("a b c", 3, 5)).toEqual(["a b", "c"]);
    expect(wrapText("supercalifragilistic", 6, 5)).toEqual(["superc", "alifra", "gilist", "ic"]);
    const clipped = wrapText("one two three four five six", 7, 2);
    expect(clipped).toHaveLength(2);
    expect(clipped[1]!.endsWith("…")).toBe(true);
    expect(wrapText("", 10, 3)).toEqual([]);
  });
});
