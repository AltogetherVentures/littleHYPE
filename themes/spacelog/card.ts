import { seeded, type CardStyle } from "../card-kit";
import { CARD_FONT_CSS } from "./card-fonts.generated";

/** Space Log share card: deep-space navy, a starfield, a ringed planet and HUD corner brackets. */
export const style: CardStyle = {
  fontCss: CARD_FONT_CSS,
  headingFont: "'Space Grotesk', 'Trebuchet MS', sans-serif",
  bodyFont: "'Space Grotesk', Arial, sans-serif",
  text: "#e8edff",
  muted: "#a9b6df",
  accent: "#5fe3e8",
  footerText: "#e8edff",
  uppercase: true,
  charWidth: 0.6,
  letterSpacing: 2,
  background: (w, h) => {
    const rand = seeded(7);
    const stars = Array.from({ length: 140 }, () => `<circle cx="${Math.round(rand() * w)}" cy="${Math.round(rand() * h)}" r="${(0.6 + rand() * 2).toFixed(1)}" fill="#fff" opacity="${(0.25 + rand() * 0.7).toFixed(2)}"/>`).join("");
    return `<defs><radialGradient id="g1" cx="80%" cy="0%" r="90%"><stop offset="0" stop-color="#3a4fd6" stop-opacity="0.55"/><stop offset="1" stop-color="#3a4fd6" stop-opacity="0"/></radialGradient><radialGradient id="g2" cx="0%" cy="100%" r="80%"><stop offset="0" stop-color="#7c42d2" stop-opacity="0.5"/><stop offset="1" stop-color="#7c42d2" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="#080f24"/><rect width="${w}" height="${h}" fill="url(#g1)"/><rect width="${w}" height="${h}" fill="url(#g2)"/>${stars}`;
  },
  frame: (w, h) => {
    const b = 60;
    const len = 90;
    const corner = (x: number, y: number, dx: number, dy: number) => `<path d="M${x} ${y + dy * len}V${y}H${x + dx * len}" fill="none" stroke="#5fe3e8" stroke-width="4"/>`;
    const px = w - 190;
    const py = h < 1500 ? 110 : 190;
    return `${corner(b, b, 1, 1)}${corner(w - b, b, -1, 1)}${corner(b, h - b, 1, -1)}${corner(w - b, h - b, -1, -1)}
<g transform="translate(${px} ${py})"><ellipse cx="0" cy="0" rx="120" ry="30" transform="rotate(-18)" fill="none" stroke="#5fe3e8" stroke-opacity="0.6" stroke-width="5"/><circle r="52" fill="#7a63e8"/><circle r="52" fill="none" stroke="#c9b8ff" stroke-opacity="0.5" stroke-width="3"/></g>`;
  },
};
