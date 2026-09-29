import type { HabitCategory } from "@shared/categories";
import { HABIT_CATEGORIES } from "@shared/categories";
import type { Schedule } from "@shared/streaks";
import { useState } from "react";
import { useT, type StringKey } from "../lib/strings";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Every day / certain days / N times a week. Plain controls; the theme restyles them. */
export function ScheduleEditor({ value, onChange }: { value: Schedule; onChange: (next: Schedule) => void }) {
  const t = useT();
  const days = value.type === "weekdays" ? value.days : [1, 2, 3, 4, 5];
  const target = value.type === "weekly" ? value.target : 3;
  const setType = (type: Schedule["type"]) => onChange(type === "daily" ? { type } : type === "weekdays" ? { type, days } : { type, target });

  return (
    <fieldset className="field schedule-editor">
      <legend>{t("habit.form.schedule")}</legend>
      <div className="segmented" role="radiogroup" aria-label={t("habit.form.schedule")}>
        {(["daily", "weekdays", "weekly"] as const).map((type) => (
          <label key={type} className="segment" data-selected={value.type === type}>
            <input type="radio" name="schedule-type" checked={value.type === type} onChange={() => setType(type)} />
            <span>{t(`habit.schedule.${type}` as StringKey)}</span>
          </label>
        ))}
      </div>
      {value.type === "weekdays" && (
        <div className="day-chips" role="group" aria-label={t("habit.schedule.weekdays")}>
          {WEEKDAYS.map((d) => {
            const on = days.includes(d);
            return (
              <button
                key={d}
                type="button"
                className="chip"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? days.filter((x) => x !== d) : [...days, d].sort();
                  if (next.length > 0) onChange({ type: "weekdays", days: next });
                }}
              >
                {t(`day.${d}` as StringKey)}
              </button>
            );
          })}
        </div>
      )}
      {value.type === "weekly" && (
        <label className="inline-field">
          <span>{t("habit.schedule.target")}</span>
          <select value={target} onChange={(e) => onChange({ type: "weekly", target: Number(e.target.value) })}>
            {WEEKDAYS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}

export interface HabitFormValues {
  name: string;
  description: string;
  category: HabitCategory;
  schedule: Schedule;
}

export function HabitForm({
  initial,
  submitLabel,
  busy,
  error,
  withSchedule = true,
  onSubmit,
  onCancel,
}: {
  initial: HabitFormValues;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  withSchedule?: boolean;
  onSubmit: (values: HabitFormValues) => void;
  onCancel?: () => void;
}) {
  const t = useT();
  const [values, setValues] = useState(initial);
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (values.name.trim()) onSubmit({ ...values, name: values.name.trim() });
      }}
    >
      <label className="field">
        <span>{t("habit.form.name")}</span>
        <input required maxLength={80} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} autoComplete="off" />
      </label>
      <label className="field">
        <span>{t("habit.form.category")}</span>
        <select value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value as HabitCategory })}>
          {HABIT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`category.${c}` as StringKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t("habit.form.description")}</span>
        <textarea maxLength={300} rows={2} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
      </label>
      {withSchedule && <ScheduleEditor value={values.schedule} onChange={(schedule) => setValues({ ...values, schedule })} />}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button className="button" type="submit" disabled={busy || !values.name.trim()}>
          {submitLabel}
        </button>
        {onCancel && (
          <button className="link-button" type="button" onClick={onCancel}>
            {t("habit.form.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
