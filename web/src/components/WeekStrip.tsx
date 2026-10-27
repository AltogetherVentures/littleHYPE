import type { GridCell } from "@shared/streaks";
import { useT, type StringKey } from "../lib/strings";

/**
 * This week at a glance: seven cells, Monday first, drawn with the same `.cell` art the
 * theme uses for the 12-week history, so a habit's row and its history page agree.
 */
export function WeekStrip({ week, label }: { week: GridCell[]; label: string }) {
  const t = useT();
  const done = week.filter((c) => c.state === "done").length;
  return (
    <span className="week-strip" role="img" aria-label={`${label}: ${t("habit.week.strip", { done: String(done) })}`}>
      {week.map((cell, i) => (
        <span key={cell.date} className="week-day" data-state={cell.state}>
          <span className="cell" data-state={cell.state} />
          <span className="week-letter" aria-hidden="true">
            {t(`day.${i + 1}` as StringKey).slice(0, 1)}
          </span>
        </span>
      ))}
    </span>
  );
}
