import { HABIT_CATEGORIES } from "@shared/categories";
import { useState } from "react";
import { Link } from "react-router-dom";
import { HabitForm, type HabitFormValues } from "../components/HabitControls";
import { streakLabel } from "../components/HabitRow";
import { suggestionFor } from "../lib/content";
import { errorCode, useHabitMutations, useHabits, type HabitView } from "../lib/habits";
import { useT, type StringKey } from "../lib/strings";
import type { Me } from "../lib/me";

const BLANK: HabitFormValues = { name: "", description: "", category: "other", schedule: { type: "daily" } };

export function HabitsPage({ me }: { me: Me }) {
  const t = useT();
  const { data, isPending, isError } = useHabits();
  const { create } = useHabitMutations();
  const [adding, setAdding] = useState(false);
  const [seed, setSeed] = useState<HabitFormValues>(BLANK);

  const active = (data?.habits ?? []).filter((h) => !h.archivedAt);
  const archived = (data?.habits ?? []).filter((h) => h.archivedAt);
  const error = create.isError ? (errorCode(create.error) === "habit_limit_reached" ? t("habit.error.limit") : t("habit.error.generic")) : null;

  return (
    <div className="habits-page">
      <header className="page-head">
        <div>
          <h1>{t("nav.habits")}</h1>
          <p className="page-intro">{t("habits.intro")}</p>
        </div>
        {!adding && (
          <button className="button" onClick={() => { setSeed(BLANK); setAdding(true); }}>
            {t("habits.add")}
          </button>
        )}
      </header>

      {adding && (
        <section className="panel">
          <HabitForm
            key={seed.name + seed.category}
            initial={seed}
            submitLabel={t("habit.form.create")}
            busy={create.isPending}
            error={error}
            onCancel={() => setAdding(false)}
            onSubmit={(v) => create.mutate({ name: v.name, description: v.description.trim() || null, category: v.category, schedule: v.schedule }, { onSuccess: () => setAdding(false) })}
          />
        </section>
      )}

      {adding && (
        <section className="suggestions" aria-label={t("habits.suggestions")}>
          <h2>{t("habits.suggestions")}</h2>
          <div className="chips">
            {HABIT_CATEGORIES.map((category) => {
              const s = suggestionFor(me.theme, category);
              return (
                <button key={category} type="button" className="chip chip-suggestion" title={s.description} onClick={() => setSeed({ ...BLANK, name: s.name, category })}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {isPending && <p className="status">{t("common.loading")}</p>}
      {isError && <p role="alert">{t("common.error")}</p>}
      {data && active.length === 0 && !adding && <p className="empty-note">{t("habits.empty")}</p>}

      <ul className="habit-cards">
        {active.map((h) => (
          <HabitCard key={h.id} habit={h} theme={me.theme!} />
        ))}
      </ul>

      {archived.length > 0 && (
        <section className="archived">
          <h2>{t("habits.archived.heading")}</h2>
          <ul className="habit-cards">
            {archived.map((h) => (
              <HabitCard key={h.id} habit={h} theme={me.theme!} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function HabitCard({ habit, theme }: { habit: HabitView; theme: string }) {
  const t = useT();
  return (
    <li>
      <Link className="habit-card" to={`/${theme}/habits/${habit.id}`} data-archived={habit.archivedAt !== null}>
        <span className="habit-card-name">{habit.name}</span>
        <span className="habit-card-meta">
          {t(`category.${habit.category}` as StringKey)}
          {habit.streak.current > 0 ? ` · ${streakLabel(t, habit)}` : ""}
        </span>
      </Link>
    </li>
  );
}
