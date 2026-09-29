import { dayLabel, monthGrid, monthLabel, shiftMonth } from "../../web/src/lib/calendar";
import type { CalendarProps } from "../../web/src/lib/overrides-types";

/** Day Zero calendar: a wall calendar in a bunker. Survived days are crossed off in marker; today is circled. */
export default function Calendar({ month, today, days, selected, onSelect, onMonthChange, t }: CalendarProps) {
  const weeks = monthGrid(month, days, today);
  return (
    <div className="cal cal-wall">
      <div className="cal-wall-head">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label={t("journal.calendar.prev")}>
          ‹
        </button>
        <span className="cal-wall-title">{monthLabel(month)}</span>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label={t("journal.calendar.next")}>
          ›
        </button>
      </div>
      <div className="cal-wall-weekdays" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d}>{t(`day.${d}`).slice(0, 2)}</span>
        ))}
      </div>
      <div className="cal-wall-grid">
        {weeks.flat().map((cell, i) =>
          cell ? (
            <button
              key={cell.date}
              type="button"
              className="cal-wall-day"
              data-has={cell.count > 0}
              data-today={cell.isToday}
              data-mood={cell.mood ?? undefined}
              aria-pressed={selected === cell.date}
              aria-label={`${t("journal.calendar.pick", { date: dayLabel(cell.date) })}${cell.count ? `, ${cell.count === 1 ? t("journal.count.one") : t("journal.count.many", { n: String(cell.count) })}` : ""}`}
              disabled={cell.isFuture}
              onClick={() => onSelect(cell.date)}
            >
              <span className="cal-wall-num">{cell.day}</span>
              {cell.count > 0 && (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="cal-wall-x">
                  <path d="M3.5 4.5 20.5 19.5M20 4l-16 16" />
                </svg>
              )}
            </button>
          ) : (
            <span key={`b${i}`} aria-hidden="true" />
          ),
        )}
      </div>
    </div>
  );
}
