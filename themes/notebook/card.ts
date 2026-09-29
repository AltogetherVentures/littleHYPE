import type { CardStyle } from "../card-kit";
import { CARD_FONT_CSS } from "./card-fonts.generated";

/** NoteBook share card: a page of ruled cream paper with a red margin line and two strips of tape. */
export const style: CardStyle = {
  fontCss: CARD_FONT_CSS,
  headingFont: "'Caveat', 'Segoe Script', cursive",
  bodyFont: "'Lora', Georgia, serif",
  text: "#1d2946",
  muted: "#545a6b",
  accent: "#b3261e",
  footerText: "#1d2946",
  uppercase: false,
  charWidth: 0.4,
  letterSpacing: 0,
  background: (w, h) => {
    const lines: string[] = [];
    for (let y = 150; y < h; y += 64) lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#7a96d6" stroke-opacity="0.35" stroke-width="2"/>`);
    return `<rect width="${w}" height="${h}" fill="#f6f0e1"/><rect x="40" y="40" width="${w - 80}" height="${h - 80}" fill="#fffef9"/>${lines.join("")}<line x1="170" y1="40" x2="170" y2="${h - 40}" stroke="#c23b32" stroke-opacity="0.5" stroke-width="3"/>`;
  },
  frame: (w, h) =>
    `<rect x="40" y="40" width="${w - 80}" height="${h - 80}" fill="none" stroke="#d6cbb0" stroke-width="3"/>
<rect x="${w / 2 - 130}" y="14" width="260" height="56" fill="#f0d68c" fill-opacity="0.8" transform="rotate(-2 ${w / 2} 42)"/>
<g fill="#8e96aa"><circle cx="100" cy="${h * 0.3}" r="18"/><circle cx="100" cy="${h * 0.5}" r="18"/><circle cx="100" cy="${h * 0.7}" r="18"/></g>
<path d="M${w - 140} ${h - 200}l56 -56 28 28 -56 56z" fill="#b3261e" opacity="0.9"/>`,
};
