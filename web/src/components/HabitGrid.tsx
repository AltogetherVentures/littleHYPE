import type { GridCell } from "@shared/streaks";

/** The completion grid (HB-5): 12 weeks, Monday first. Each theme draws the cells its own way. */
export function HabitGrid({ grid, label }: { grid: GridCell[][]; label: string }) {
  const done = grid.flat().filter((c) => c.state === "done").length;
  return (
    <div className="habit-grid" role="img" aria-label={`${label}: ${done}`}>
      {grid.map((week, i) => (
        <div key={i} className="grid-week">
          {week.map((cell) => (
            <span key={cell.date} className="cell" data-state={cell.state} title={`${cell.date}: ${cell.state}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
