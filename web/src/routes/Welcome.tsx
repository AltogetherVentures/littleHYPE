import { HABIT_CATEGORIES, type HabitCategory } from "@shared/categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError, useApi } from "../lib/api";
import { suggestionFor } from "../lib/content";
import { HABITS_KEY, TODAY_KEY } from "../lib/habits";
import { ME_KEY, type Me } from "../lib/me";
import { PROMPT_KEY } from "../lib/prompt";
import { useT, type StringKey } from "../lib/strings";

/**
 * First run, after the theme is chosen and locked (ON-4 to ON-6): pick a first habit from
 * the theme's own suggestions, choose a reminder time, and land on Today with the day's
 * prompt waiting. Both steps are optional and skipping them still finishes.
 */
export function Welcome({ me }: { me: Me }) {
  const t = useT();
  const api = useApi();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [category, setCategory] = useState<HabitCategory | null>(null);
  const [name, setName] = useState("");
  const [reminderOn, setReminderOn] = useState(true);
  const [time, setTime] = useState("20:00");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const finish = useMutation({
    mutationFn: () =>
      api("/api/onboarding/complete", {
        method: "POST",
        body: {
          timezone,
          reminderTime: reminderOn ? time : null,
          ...(category && name.trim() ? { habit: { name: name.trim(), category, schedule: { type: "daily" } } } : {}),
        },
      }),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: ME_KEY }), client.invalidateQueries({ queryKey: TODAY_KEY }), client.invalidateQueries({ queryKey: HABITS_KEY }), client.invalidateQueries({ queryKey: PROMPT_KEY })]);
      navigate(`/${me.theme}/today`, { replace: true });
    },
  });

  if (me.onboarded && !finish.isPending && !finish.isSuccess) return <Navigate to={`/${me.theme}/today`} replace />;

  const pick = (c: HabitCategory) => {
    if (category === c) {
      setCategory(null);
      setName("");
      return;
    }
    setCategory(c);
    setName(suggestionFor(me.theme, c).name);
  };

  return (
    <div className="welcome">
      <header className="page-head">
        <div>
          <h1>{t("welcome.title")}</h1>
          <p className="page-intro">{t("welcome.intro")}</p>
        </div>
      </header>

      <section className="panel" aria-labelledby="welcome-habit">
        <h2 id="welcome-habit" className="panel-title">
          {t("welcome.habit.heading")}
        </h2>
        <p>{t("welcome.habit.body")}</p>
        <div className="chips" role="group" aria-labelledby="welcome-habit">
          {HABIT_CATEGORIES.map((c) => {
            const s = suggestionFor(me.theme, c);
            return (
              <button key={c} type="button" className="chip chip-suggestion" aria-pressed={category === c} title={s.description} onClick={() => pick(c)}>
                {s.name}
              </button>
            );
          })}
        </div>
        {category && (
          <>
            <p className="suggestion-note">{suggestionFor(me.theme, category).description}</p>
            <label className="field">
              <span>{t("welcome.habit.name")}</span>
              <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
            </label>
          </>
        )}
        {!category && <p className="suggestion-note">{t("welcome.habit.none")}</p>}
      </section>

      <section className="panel" aria-labelledby="welcome-reminder">
        <h2 id="welcome-reminder" className="panel-title">
          {t("welcome.reminder.heading")}
        </h2>
        <p>{t("welcome.reminder.body")}</p>
        <div className="segmented" role="group" aria-labelledby="welcome-reminder">
          <button type="button" className="segment" aria-pressed={reminderOn} onClick={() => setReminderOn(true)}>
            {t("welcome.reminder.on")}
          </button>
          <button type="button" className="segment" aria-pressed={!reminderOn} onClick={() => setReminderOn(false)}>
            {t("welcome.reminder.off")}
          </button>
        </div>
        {reminderOn && (
          <label className="inline-field">
            <span>{t("welcome.reminder.time")}</span>
            <input type="time" value={time} required onChange={(e) => setTime(e.target.value)} />
          </label>
        )}
        <p className="suggestion-note">{t("welcome.timezone", { tz: timezone })}</p>
      </section>

      <div className="actions">
        <button type="button" className="button" disabled={finish.isPending || (reminderOn && !time)} onClick={() => finish.mutate()}>
          {finish.isPending ? t("welcome.finish.busy") : t("welcome.finish")}
        </button>
      </div>
      {finish.isError && (
        <p role="alert" className="error">
          {t((finish.error instanceof ApiError && finish.error.code === "habit_limit_reached" ? "habit.error.limit" : "welcome.error") as StringKey)}
        </p>
      )}
    </div>
  );
}
