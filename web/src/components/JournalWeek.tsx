import { dayNum, dayStr, weekStartNum } from "@shared/dates";
import { dayLabel, type CalendarDay } from "../lib/calendar";
import { useT, type StringKey } from "../lib/strings";

/**
 * This week as one tappable row, for phones, where the month calendar would push every
 * entry below the fold. Days with an entry get a dot in the mood's colour; the full themed
 * month stays one tap away.
 */
export function JournalWeek({ today, days, selected, onSelect, monthOpen, onToggleMonth }: { today: string; days: CalendarDay[]; selected: string | null; onSelect: (date: string) => void; monthOpen: boolean; onToggleMonth: () => void }) {
  const t = useT();
  const byDate = new Map(days.map((d) => [d.date, d]));
  const start = weekStartNum(dayNum(today));
  const week = Array.from({ length: 7 }, (_, i) => dayStr(start + i));
  return (
    <div className="journal-week" aria-label={t("journal.week.heading")}>
      <div className="journal-week-days" role="group" aria-label={t("journal.week.heading")}>
        {week.map((date, i) => {
          const d = byDate.get(date);
          const count = d?.count ?? 0;
          const future = date > today;
          return (
            <button
              key={date}
              type="button"
              className="journal-week-day"
              data-has={count > 0}
              data-today={date === today}
              data-mood={d?.mood ?? undefined}
              aria-pressed={selected === date}
              aria-label={`${t("journal.calendar.pick", { date: dayLabel(date) })}${count ? `, ${count === 1 ? t("journal.count.one") : t("journal.count.many", { n: String(count) })}` : ""}`}
              disabled={future}
              onClick={() => onSelect(date)}
            >
              <span className="journal-week-letter" aria-hidden="true">
                {t(`day.${i + 1}` as StringKey).slice(0, 1)}
              </span>
              <span className="journal-week-num" aria-hidden="true">
                {Number(date.slice(8))}
              </span>
              <span className="journal-week-dot" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <button type="button" className="link-button journal-week-toggle" aria-expanded={monthOpen} onClick={onToggleMonth}>
        {monthOpen ? t("journal.week.hideMonth") : t("journal.week.showMonth")}
      </button>
    </div>
  );
}
