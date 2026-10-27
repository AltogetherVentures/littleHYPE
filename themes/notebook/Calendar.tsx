import { dayLabel, monthGrid, monthLabel, shiftMonth } from "../../web/src/lib/calendar";
import type { CalendarProps } from "../../web/src/lib/overrides-types";

/** NoteBook calendar: a tear-off desk calendar page. Written days get a hand-drawn circle, today a paper-clip. */
export default function Calendar({ month, today, days, selected, onSelect, onMonthChange, t }: CalendarProps) {
  const weeks = monthGrid(month, days, today);
  return (
    <div className="cal cal-desk">
      <div className="cal-desk-rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="cal-desk-head">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label={t("journal.calendar.prev")}>
          ‹
        </button>
        <span className="cal-desk-title">{monthLabel(month)}</span>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label={t("journal.calendar.next")}>
          ›
        </button>
      </div>
      <table className="cal-desk-table" role="presentation">
        <thead aria-hidden="true">
          <tr>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <th key={d}>{t(`day.${d}`).slice(0, 1)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((cell, i) => (
                <td key={i}>
                  {cell && (
                    <button
                      type="button"
                      className="cal-desk-day"
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
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
