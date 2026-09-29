import { seeded, type CardStyle } from "../card-kit";
import { CARD_FONT_CSS } from "./card-fonts.generated";

/** SpellBook share card: aged parchment in a gold and burgundy frame, a row of moon phases and a scatter of stars. */
export const style: CardStyle = {
  fontCss: CARD_FONT_CSS,
  headingFont: "'Cinzel', Georgia, serif",
  bodyFont: "'EB Garamond', Georgia, serif",
  text: "#3a1322",
  muted: "#64463a",
  accent: "#7a1f3d",
  footerText: "#3a1322",
  uppercase: true,
  charWidth: 0.78,
  letterSpacing: 1,
  background: (w, h) => {
    const rand = seeded(11);
    const sparkle = Array.from({ length: 26 }, () => {
      const x = Math.round(80 + rand() * (w - 160));
      const y = Math.round(80 + rand() * (h - 160));
      const r = 5 + rand() * 9;
      return `<path d="M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z" fill="#c9962e" opacity="${(0.25 + rand() * 0.5).toFixed(2)}"/>`;
    }).join("");
    return `<defs><radialGradient id="p" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#fbf3de"/><stop offset="1" stop-color="#e2cfa2"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#p)"/>${sparkle}`;
  },
  frame: (w, h) => {
    const phases = [0, 1, 2, 3, 4, 3, 2, 1, 0]
      .map((ph, i) => {
        const x = w / 2 - 240 + i * 60;
        return `<circle cx="${x}" cy="128" r="18" fill="none" stroke="#a7761a" stroke-width="3"/>${ph > 0 ? `<path d="M${x} 110a18 18 0 0 ${i < 4 ? 1 : 0} 0 36a${18 - ph * 4} 18 0 0 ${i < 4 ? 0 : 1} 0 -36z" fill="#c9962e"/>` : ""}`;
      })
      .join("");
    return `<rect x="46" y="46" width="${w - 92}" height="${h - 92}" fill="none" stroke="#7a1f3d" stroke-width="10"/><rect x="72" y="72" width="${w - 144}" height="${h - 144}" fill="none" stroke="#c9962e" stroke-width="3"/>${phases}<circle cx="${w / 2}" cy="${h - 80}" r="0" fill="none"/>`;
  },
};
