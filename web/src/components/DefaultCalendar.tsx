import { dayLabel, monthGrid, monthLabel, shiftMonth } from "../lib/calendar";
import type { CalendarProps } from "../lib/overrides-types";

/** The neutral month calendar. Themes replace it (TH-11) but receive exactly these props. */
export function DefaultCalendar({ month, today, days, selected, onSelect, onMonthChange, t }: CalendarProps) {
  const weeks = monthGrid(month, days, today);
  return (
    <div className="cal cal-default">
      <div className="cal-nav">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label={t("journal.calendar.prev")}>
          ‹
        </button>
        <strong>{monthLabel(month)}</strong>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label={t("journal.calendar.next")}>
          ›
        </button>
      </div>
      <div className="cal-weekdays" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d}>{t(`day.${d}`)}</span>
        ))}
      </div>
      <div className="cal-grid">
        {weeks.flat().map((cell, i) =>
          cell ? (
            <button
              key={cell.date}
              type="button"
              className="cal-day"
              data-has={cell.count > 0}
              data-today={cell.isToday}
              data-mood={cell.mood ?? undefined}
              aria-pressed={selected === cell.date}
              aria-label={`${t("journal.calendar.pick", { date: dayLabel(cell.date) })}${cell.count ? `, ${cell.count === 1 ? t("journal.count.one") : t("journal.count.many", { n: String(cell.count) })}` : ""}`}
              disabled={cell.isFuture}
              onClick={() => onSelect(cell.date)}
            >
              {cell.day}
            </button>
          ) : (
            <span key={`b${i}`} className="cal-blank" aria-hidden="true" />
          ),
        )}
      </div>
    </div>
  );
}
