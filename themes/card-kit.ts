/**
 * Share-card layout (SH-7 to SH-10): one layout for the story (1080x1920) and square
 * (1080x1080) sizes, dressed by each theme's own background and frame. A card holds a
 * kicker, a headline, a short line under it, an optional habit name, and the littleHYPE
 * footer with the referral link. It never holds journal text.
 */
export type CardFormat = "story" | "square";
export const CARD_SIZES: Record<CardFormat, { w: number; h: number }> = { story: { w: 1080, h: 1920 }, square: { w: 1080, h: 1080 } };

export interface CardText {
  kicker: string;
  headline: string;
  sub: string;
  /** The habit's own name, only when the person ticked "show habit name" (SH-10). */
  habitName: string | null;
  themeName: string;
  referralUrl: string;
}

export interface CardStyle {
  /** Background drawn behind everything. Returns SVG elements. */
  background: (w: number, h: number) => string;
  /** Decorative frame and motifs drawn above the background, below the text. */
  frame: (w: number, h: number) => string;
  fontCss: string;
  headingFont: string;
  bodyFont: string;
  text: string;
  muted: string;
  accent: string;
  /** Text colour for the footer strip. */
  footerText: string;
  uppercase: boolean;
  /** Average glyph width as a fraction of the font size, for wrapping without measuring. */
  charWidth: number;
  letterSpacing: number;
}

export const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Greedy word wrap by estimated width; a word longer than a line is broken rather than overflowing. */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let word of words) {
    while (word.length > maxChars) {
      if (line) (lines.push(line), (line = ""));
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
    else (lines.push(line), (line = word));
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]!.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
    return kept;
  }
  return lines;
}

function textBlock(lines: string[], x: number, y: number, size: number, lineHeight: number, attrs: string): string {
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" ${attrs}>${lines.map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(l)}</tspan>`).join("")}</text>`;
}

export function renderCardSvg(style: CardStyle, format: CardFormat, content: CardText): string {
  const { w, h } = CARD_SIZES[format];
  const story = format === "story";
  const cx = w / 2;
  const margin = 110;
  const inner = w - margin * 2;
  const cased = (t: string) => (style.uppercase ? t.toUpperCase() : t);

  const subSize = story ? 46 : 40;
  const nameSize = 36;
  const footY = h - (story ? 250 : 215);
  const top = story ? 330 : 190;
  const zoneTop = top + 60;
  const zoneBottom = footY - 70;
  const subLines = wrapText(cased(content.sub), Math.floor(inner / (subSize * style.charWidth)), 2);
  const subBlock = subLines.length * subSize * 1.2;
  const nameBlock = content.habitName ? nameSize * 1.4 + 20 : 0;

  // The largest headline that fits the space between the kicker and the footer.
  let headSize = 56;
  let headLines: string[] = [];
  for (const size of story ? [104, 96, 84, 72, 64, 56] : [92, 84, 72, 64, 56, 48]) {
    const lines = wrapText(cased(content.headline), Math.floor(inner / (size * style.charWidth)), 9);
    headSize = size;
    headLines = lines;
    if (lines.length * size * 1.16 + 30 + subBlock + nameBlock <= zoneBottom - zoneTop) break;
  }
  const headLine = headSize * 1.16;
  const headBlock = headLines.length * headLine;
  const total = headBlock + 30 + subBlock + nameBlock;
  const startY = zoneTop + Math.max(0, (zoneBottom - zoneTop - total) / 2);
  const headY = startY + headSize * 0.9;
  const heading = `font-family="${style.headingFont}" fill="${style.text}" letter-spacing="${style.letterSpacing}"`;

  const parts: string[] = [];
  parts.push(style.background(w, h));
  parts.push(style.frame(w, h));
  parts.push(textBlock(wrapText(cased(content.kicker), Math.floor(inner / (34 * style.charWidth)), 2), cx, top, 34, 44, `font-family="${style.bodyFont}" fill="${style.accent}" letter-spacing="${style.letterSpacing + 4}"`));
  parts.push(textBlock(headLines, cx, headY, headSize, headLine, heading));
  let y = headY + headBlock - headLine + headSize * 0.5 + 30 + subSize;
  parts.push(textBlock(subLines, cx, y, subSize, subSize * 1.2, `font-family="${style.headingFont}" fill="${style.accent}" letter-spacing="${style.letterSpacing + 2}"`));
  y += (subLines.length - 1) * subSize * 1.2;
  if (content.habitName) {
    y += nameSize * 1.4 + 6;
    parts.push(textBlock(wrapText(content.habitName, Math.floor(inner / (nameSize * style.charWidth)), 1), cx, y, nameSize, 44, `font-family="${style.bodyFont}" fill="${style.muted}"`));
  }
  parts.push(textBlock([cased("littleHYPE")], cx, footY, 44, 50, `font-family="${style.headingFont}" fill="${style.footerText}" letter-spacing="${style.letterSpacing + 6}"`));
  parts.push(textBlock([content.themeName], cx, footY + 42, 28, 34, `font-family="${style.bodyFont}" fill="${style.muted}"`));
  parts.push(textBlock([content.referralUrl.replace(/^https?:\/\//, "")], cx, footY + 80, 26, 32, `font-family="${style.bodyFont}" fill="${style.footerText}" opacity="0.9"`));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(content.headline)}"><defs><style>${style.fontCss}</style></defs>${parts.join("")}</svg>`;
}

/** Deterministic pseudo-random numbers, so a card looks the same every time it is drawn. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
