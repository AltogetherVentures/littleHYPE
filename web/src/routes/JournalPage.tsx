import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { JournalWeek } from "../components/JournalWeek";
import { MoodFace } from "../components/MoodPicker";
import { dayLabel, monthOf, shiftMonth } from "../lib/calendar";
import { plainExcerpt } from "../lib/format";
import { useCalendar, useEntries } from "../lib/journal";
import type { Me } from "../lib/me";
import { calendarFor } from "../lib/overrides";
import { useT, type StringKey } from "../lib/strings";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** The journal home: search, a themed calendar, and every entry newest first. */
export function JournalPage({ me }: { me: Me }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const date = params.get("date");
  const [typed, setTyped] = useState(params.get("q") ?? "");
  const q = useDebounced(typed.trim(), 300);
  const [month, setMonth] = useState<string | null>(date ? monthOf(date) : null);
  const [monthOpen, setMonthOpen] = useState(false);

  useEffect(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (q) next.set("q", q);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }, [q, setParams]);

  const entries = useEntries({ q, date });
  const shown = month ?? monthOf(date ?? new Date().toISOString().slice(0, 10));
  const calendar = useCalendar(shown);
  // The week strip can straddle a month boundary, so it also sees the month before.
  const previous = useCalendar(shiftMonth(shown, -1));
  const today = calendar.data?.today ?? new Date().toISOString().slice(0, 10);
  const Calendar = calendarFor(me.theme);
  const rows = entries.data?.pages.flatMap((p) => p.entries) ?? [];
  const filtered = q !== "" || date !== null;

  const selectDate = (d: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (next.get("date") === d) next.delete("date");
        else next.set("date", d);
        return next;
      },
      { replace: true },
    );

  return (
    <div className="journal-page" data-month-open={monthOpen}>
      <header className="page-head">
        <div>
          <h1>{t("nav.journal")}</h1>
          <p className="page-intro">{t("journal.intro")}</p>
        </div>
        <Link className="button" to={`/${me.theme}/journal/new${date ? `?date=${date}` : ""}`}>
          {t("journal.new")}
        </Link>
      </header>

      <div className="journal-layout">
        <section className="journal-main" aria-label={t("nav.journal")}>
          <JournalWeek today={today} days={[...(previous.data?.days ?? []), ...(calendar.data?.days ?? [])]} selected={date} onSelect={selectDate} monthOpen={monthOpen} onToggleMonth={() => setMonthOpen((o) => !o)} />
          <div className="search">
            <label className="sr-only" htmlFor="journal-search">
              {t("journal.search.label")}
            </label>
            <input id="journal-search" type="search" value={typed} placeholder={t("journal.search.placeholder")} onChange={(e) => setTyped(e.target.value)} maxLength={200} />
          </div>

          {date && (
            <p className="filter-note">
              {t("journal.filter.day", { date: dayLabel(date) })}{" "}
              <button type="button" className="link-button" onClick={() => selectDate(date)}>
                {t("journal.filter.clear")}
              </button>
            </p>
          )}

          {entries.isPending && <p className="status">{t("common.loading")}</p>}
          {entries.isError && <p role="alert">{t("common.error")}</p>}
          {entries.data && rows.length === 0 && <p className="empty-note">{filtered ? t("journal.search.empty") : t("journal.empty")}</p>}

          <ul className="entry-list">
            {rows.map((e) => (
              <li key={e.id}>
                <Link className="entry-card" to={`/${me.theme}/journal/${e.id}`} data-mood={e.mood ?? undefined}>
                  {e.mood && <span className="entry-edge" aria-hidden="true" />}
                  <span className="entry-date">{dayLabel(e.date)}</span>
                  <span className="entry-excerpt">{plainExcerpt(e.excerpt) || t("journal.blank")}</span>
                  {e.mood && (
                    <span className="entry-mood" data-mood={e.mood} title={t(`journal.mood.${e.mood}` as StringKey)}>
                      <MoodFace mood={e.mood} />
                      <span className="sr-only">{t(`journal.mood.${e.mood}` as StringKey)}</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {entries.hasNextPage && (
            <button type="button" className="link-button" disabled={entries.isFetchingNextPage} onClick={() => void entries.fetchNextPage()}>
              {t("journal.more")}
            </button>
          )}
        </section>

        <aside className="journal-side" aria-labelledby="cal-h">
          <h2 id="cal-h" className="side-title">
            {t("journal.calendar.heading")}
          </h2>
          <Calendar
            month={shown}
            today={today}
            days={calendar.data?.days ?? []}
            selected={date}
            onSelect={selectDate}
            onMonthChange={setMonth}
            t={(key, vars) => t(key as StringKey, vars)}
          />
        </aside>
      </div>
    </div>
  );
}
