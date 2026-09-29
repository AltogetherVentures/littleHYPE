import type { AchievementFamily } from "@shared/achievements";

const PATHS: Record<AchievementFamily, string[]> = {
  entry: ["M6 3h9l4 4v14H6z", "M15 3v4h4", "M9 12h7", "M9 16h5"],
  checkin: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "m8 12.5 3 3 5-6"],
  streak: ["M12 3c1 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 1-3.2 2-4.2 0 2 1 2.2 1.5 1.2C11.6 8 10.5 5.5 12 3z"],
  days: ["M4 6h16v14H4z", "M4 10.5h16", "M8 3.5v4", "M16 3.5v4", "m8.5 15 2 2 4.5-4.5"],
  prompt: ["M4 5h16v11h-9l-4.5 4v-4H4z", "M10 9.6c0-1 .9-1.7 2-1.7s2 .7 2 1.6c0 1.6-2 1.4-2 3", "M12 14.2v.1"],
  habits: ["M6 16a3 3 0 1 0 0 .01", "M12 8a3 3 0 1 0 0 .01", "M18 16a3 3 0 1 0 0 .01", "M8.2 13.8 10 10.8", "M13.8 10.8 15.8 13.8"],
};

/** Small pips on an arc under the icon, one per tier above the first. */
function pips(n: number) {
  const out: { cx: number; cy: number }[] = [];
  const spread = Math.min(n - 1, 4) * 0.42;
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1));
    out.push({ cx: 12 + Math.cos(a) * 9.6, cy: 12 + Math.sin(a) * 9.6 });
  }
  return out;
}

/**
 * One emblem per family of achievement, growing with its tier: the first rung is the bare
 * icon, later rungs add pips under it and, from the third on, an outer ring, so a 100-day
 * badge never looks like the 3-day one. The theme dresses the badge around it.
 */
export function AchievementEmblem({ family, tier = 0, size = 32 }: { family: AchievementFamily; tier?: number; size?: number }) {
  const scale = tier >= 2 ? 0.72 : tier === 1 ? 0.82 : 1;
  return (
    <svg className="emblem" data-tier={tier} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tier >= 2 && <circle className="emblem-ring" cx="12" cy="12" r="11" strokeWidth="1" strokeDasharray={tier >= 4 ? undefined : "2.5 2"} />}
      {tier >= 4 && <circle className="emblem-ring" cx="12" cy="12" r="8.6" strokeWidth="0.8" strokeDasharray="1 1.6" />}
      <g transform={`translate(12 ${tier >= 1 ? 10.6 : 12}) scale(${scale}) translate(-12 -12)`}>
        {PATHS[family].map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {tier >= 1 && pips(Math.min(tier, 5)).map((p, i) => <circle key={i} className="emblem-pip" cx={p.cx} cy={p.cy} r="1.1" fill="currentColor" stroke="none" />)}
    </svg>
  );
}
