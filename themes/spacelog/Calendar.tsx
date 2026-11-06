import { dayLabel, monthGrid, monthLabel, shiftMonth } from "../../web/src/lib/calendar";
import type { CalendarProps } from "../../web/src/lib/overrides-types";

/** Space Log calendar: a star chart. Every logged day is a lit star; today wears a targeting ring. */
export default function Calendar({ month, today, days, selected, onSelect, onMonthChange, t }: CalendarProps) {
  const weeks = monthGrid(month, days, today);
  return (
    <div className="cal cal-star">
      <div className="cal-star-nav">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label={t("journal.calendar.prev")}>
          ‹
        </button>
        <span className="cal-star-title">{monthLabel(month)}</span>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label={t("journal.calendar.next")}>
          ›
        </button>
      </div>
      <div className="cal-star-weekdays" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d}>{t(`day.${d}`).slice(0, 2)}</span>
        ))}
      </div>
      <div className="cal-star-grid">
        {weeks.flat().map((cell, i) =>
          cell ? (
            <button
              key={cell.date}
              type="button"
              className="cal-star-day"
              data-has={cell.count > 0}
              data-today={cell.isToday}
              data-mood={cell.mood ?? undefined}
              aria-pressed={selected === cell.date}
              aria-label={`${t("journal.calendar.pick", { date: dayLabel(cell.date) })}${cell.count ? `, ${cell.count === 1 ? t("journal.count.one") : t("journal.count.many", { n: String(cell.count) })}` : ""}`}
              disabled={cell.isFuture}
              onClick={() => onSelect(cell.date)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path className="star" d="M12 2.5l2.2 6.3 6.6.2-5.2 4 1.9 6.4L12 15.6l-5.5 3.8 1.9-6.4-5.2-4 6.6-.2z" />
              </svg>
              <span className="cal-star-num">{cell.day}</span>
            </button>
          ) : (
            <span key={`b${i}`} aria-hidden="true" />
          ),
        )}
      </div>
    </div>
  );
}
