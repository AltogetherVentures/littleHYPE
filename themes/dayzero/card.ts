import { seeded, type CardStyle } from "../card-kit";
import { CARD_FONT_CSS } from "./card-fonts.generated";

/** Day Zero share card: charcoal concrete with grain, hazard tape top and bottom, and a stencilled frame. */
export const style: CardStyle = {
  fontCss: CARD_FONT_CSS,
  headingFont: "'Bebas Neue', Impact, sans-serif",
  bodyFont: "Arial, Helvetica, sans-serif",
  text: "#ebe8df",
  muted: "#b4b1a4",
  accent: "#ff7a1a",
  footerText: "#ebe8df",
  uppercase: true,
  charWidth: 0.46,
  letterSpacing: 3,
  background: (w, h) => {
    const rand = seeded(23);
    const specks = Array.from({ length: 220 }, () => `<rect x="${Math.round(rand() * w)}" y="${Math.round(rand() * h)}" width="${1 + Math.round(rand() * 3)}" height="${1 + Math.round(rand() * 3)}" fill="#fff" opacity="${(0.03 + rand() * 0.08).toFixed(2)}"/>`).join("");
    return `<defs><radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#2b2d2b"/><stop offset="1" stop-color="#121312"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#v)"/>${specks}`;
  },
  frame: (w, h) => {
    const stripe = (y: number) => {
      const bars: string[] = [];
      for (let x = -80; x < w + 80; x += 80) bars.push(`<path d="M${x} ${y + 44}l44 -44h40l-44 44z" fill="#ff7a1a"/>`);
      return `<rect y="${y}" width="${w}" height="44" fill="#1a1a18"/>${bars.join("")}`;
    };
    return `${stripe(0)}${stripe(h - 44)}<rect x="70" y="110" width="${w - 140}" height="${h - 220}" fill="none" stroke="#4c4f49" stroke-width="6"/><g fill="#4c4f49"><circle cx="70" cy="110" r="9"/><circle cx="${w - 70}" cy="110" r="9"/><circle cx="70" cy="${h - 110}" r="9"/><circle cx="${w - 70}" cy="${h - 110}" r="9"/></g>`;
  },
};
