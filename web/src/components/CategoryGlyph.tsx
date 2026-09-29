import type { HabitCategory } from "@shared/categories";

const PATHS: Record<HabitCategory, string[]> = {
  hydration: ["M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"],
  exercise: ["M4 10v4M20 10v4M6.5 8v8M17.5 8v8M6.5 12h11"],
  sleep: ["M14.5 3.5a8 8 0 1 0 6 12.5 7 7 0 0 1-6-12.5z"],
  reading: ["M4 5.5h6.5a2 2 0 0 1 1.5.7 2 2 0 0 1 1.5-.7H20v13h-6.5a1.5 1.5 0 0 0-1.5 1 1.5 1.5 0 0 0-1.5-1H4z", "M12 6.2v13"],
  mindfulness: ["M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"],
  screentime: ["M4 5h16v11H4z", "M9 20h6M12 16v4"],
  diet: ["M12 21c-4 0-7-3.5-7-8 0-3 2-5 4-5 1 0 2 .5 3 1 1-.5 2-1 3-1 2 0 4 2 4 5 0 4.5-3 8-7 8z", "M12 9c0-2 1-4 3-5"],
  other: ["M12 3l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z"],
};

/** One small line icon per habit category; the theme colours it. */
export function CategoryGlyph({ category, size = 20 }: { category: HabitCategory; size?: number }) {
  return (
    <svg className="category-glyph" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[category].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
