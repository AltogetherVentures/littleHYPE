import { useEffect, useState } from "react";
import type { HabitView } from "../lib/habits";
import { useT } from "../lib/strings";
import { WeekStrip } from "./WeekStrip";

export function streakLabel(t: ReturnType<typeof useT>, habit: HabitView): string {
  return t(habit.streak.unit === "weeks" ? "habit.streak.weeks" : "habit.streak.days", { n: String(habit.streak.current) });
}

/** How long the check-in moment plays before the row settles (matches the CSS animations). */
const CELEBRATE_MS = 900;

/**
 * One habit on Today: a big round check (the fastest action in the app), its streak, this
 * week as a strip of cells, and a way to rest or undo. Checking in plays a short moment
 * the theme dresses (a burst, an ink tick, a sparkle, a stamp) via `data-celebrate`.
 * State is shown as text as well as colour, for accessibility.
 */
export function HabitRow({ habit, onSet, disabled }: { habit: HabitView; onSet: (status: "done" | "skipped" | null) => void; disabled?: boolean }) {
  const t = useT();
  const logged = habit.today.logged;
  const done = logged === "done";
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (!celebrating) return;
    const id = setTimeout(() => setCelebrating(false), CELEBRATE_MS);
    return () => clearTimeout(id);
  }, [celebrating]);

  const meta = [habit.streak.current > 0 ? streakLabel(t, habit) : null, habit.today.week ? t("habit.week.progress", { done: String(habit.today.week.done), target: String(habit.today.week.target) }) : null].filter(Boolean).join(" · ");

  return (
    <li className="habit-row" data-state={logged ?? "open"} data-celebrate={celebrating}>
      <button
        type="button"
        className="check"
        aria-pressed={done}
        aria-label={`${habit.name}: ${done ? t("habit.action.undo") : t("habit.action.done")}`}
        disabled={disabled}
        onClick={() => {
          const next = done || logged === "skipped" ? null : "done";
          if (next === "done") setCelebrating(true);
          onSet(next);
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path className="check-mark" d="m5 12.5 4.5 4.5L19 7" />
        </svg>
        <span className="check-burst" aria-hidden="true" />
      </button>
      <div className="habit-main">
        <span className="habit-name">{habit.name}</span>
        <span className="habit-meta">{logged === "skipped" ? t("habit.state.skipped") : done ? t("habit.state.done") : meta || " "}</span>
        {(logged === "done" || logged === "skipped") && meta && <span className="habit-meta habit-streak">{meta}</span>}
        <WeekStrip week={habit.week} label={habit.name} />
      </div>
      {logged === null && (
        <button type="button" className="link-button habit-rest" disabled={disabled} onClick={() => onSet("skipped")}>
          {t("habit.action.skip")}
        </button>
      )}
    </li>
  );
}
