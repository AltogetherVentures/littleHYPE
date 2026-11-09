import { dayLabel, monthGrid, monthLabel, shiftMonth } from "../../web/src/lib/calendar";
import type { CalendarProps } from "../../web/src/lib/overrides-types";

/** SpellBook calendar: a lunar calendar. Each day is a moon that fills when a scroll was inscribed. */
export default function Calendar({ month, today, days, selected, onSelect, onMonthChange, t }: CalendarProps) {
  const weeks = monthGrid(month, days, today);
  return (
    <div className="cal cal-moon">
      <div className="cal-moon-head">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label={t("journal.calendar.prev")}>
          ‹
        </button>
        <span className="cal-moon-title">{monthLabel(month)}</span>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label={t("journal.calendar.next")}>
          ›
        </button>
      </div>
      <div className="cal-moon-rule" aria-hidden="true">
        ✦ ✦ ✦
      </div>
      <div className="cal-moon-weekdays" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d}>{t(`day.${d}`).slice(0, 2)}</span>
        ))}
      </div>
      <div className="cal-moon-grid">
        {weeks.flat().map((cell, i) =>
          cell ? (
            <button
              key={cell.date}
              type="button"
              className="cal-moon-day"
              data-has={cell.count > 0}
              data-today={cell.isToday}
              data-mood={cell.mood ?? undefined}
              aria-pressed={selected === cell.date}
              aria-label={`${t("journal.calendar.pick", { date: dayLabel(cell.date) })}${cell.count ? `, ${cell.count === 1 ? t("journal.count.one") : t("journal.count.many", { n: String(cell.count) })}` : ""}`}
              disabled={cell.isFuture}
              onClick={() => onSelect(cell.date)}
            >
              <span className="cal-moon-disc" aria-hidden="true" />
              <span className="cal-moon-num">{cell.day}</span>
            </button>
          ) : (
            <span key={`b${i}`} aria-hidden="true" />
          ),
        )}
      </div>
    </div>
  );
}
