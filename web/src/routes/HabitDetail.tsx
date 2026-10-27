import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HabitForm, ScheduleEditor } from "../components/HabitControls";
import { HabitGrid } from "../components/HabitGrid";
import { errorCode, useHabitHistory, useHabitMutations } from "../lib/habits";
import type { Me } from "../lib/me";
import { useT } from "../lib/strings";
import type { Schedule } from "@shared/streaks";

export function HabitDetail({ me }: { me: Me }) {
  const t = useT();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isPending, isError } = useHabitHistory(id);
  const m = useHabitMutations();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  if (isPending) return <p className="status">{t("common.loading")}</p>;
  if (isError || !data) {
    return (
      <p role="alert" className="status">
        {t("common.error")} <Link to={`/${me.theme}/habits`}>{t("habits.back")}</Link>
      </p>
    );
  }
  const { habit, grid } = data;
  const archived = habit.archivedAt !== null;
  const shown = schedule ?? habit.schedule;
  const failure = (mutation: { isError: boolean; error: unknown }) => (mutation.isError ? (errorCode(mutation.error) === "habit_limit_reached" ? t("habit.error.limit") : t("habit.error.generic")) : null);

  return (
    <div className="habit-detail">
      <p>
        <Link to={`/${me.theme}/habits`}>&larr; {t("habits.back")}</Link>
      </p>
      <header className="page-head">
        <div>
          <h1>{habit.name}</h1>
          {habit.description && <p className="page-intro">{habit.description}</p>}
        </div>
        <div className="actions">
          {!archived && (
            <button className="link-button" onClick={() => setEditing((e) => !e)}>
              {editing ? t("habit.form.cancel") : t("habit.edit")}
            </button>
          )}
        </div>
      </header>

      <div className="stat-row">
        <section className="panel stat">
          <h2 className="panel-title">{t("habit.detail.current")}</h2>
          <p className="stat-num">{habit.streak.current}</p>
          <p className="stat-unit">{habit.streak.unit === "weeks" ? t("habit.unit.weeks") : t("today.streak.unit")}</p>
        </section>
        <section className="panel stat">
          <h2 className="panel-title">{t("habit.detail.longest")}</h2>
          <p className="stat-num">{habit.streak.longest}</p>
          <p className="stat-unit">{habit.streak.unit === "weeks" ? t("habit.unit.weeks") : t("today.streak.unit")}</p>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">{t("habit.detail.history")}</h2>
        <HabitGrid grid={grid} label={t("habit.detail.history")} />
      </section>

      {editing && !archived && (
        <section className="panel">
          <HabitForm
            initial={{ name: habit.name, description: habit.description ?? "", category: habit.category, schedule: habit.schedule }}
            withSchedule={false}
            submitLabel={t("habit.form.save")}
            busy={m.update.isPending}
            error={failure(m.update)}
            onCancel={() => setEditing(false)}
            onSubmit={(v) => m.update.mutate({ id, name: v.name, description: v.description.trim() || null, category: v.category }, { onSuccess: () => setEditing(false) })}
          />
        </section>
      )}

      {!archived && (
        <section className="panel">
          <h2 className="panel-title">{t("habit.detail.schedule")}</h2>
          <ScheduleEditor value={shown} onChange={setSchedule} />
          {habit.pendingSchedule && <p className="note">{t("habit.schedule.pending", { date: habit.pendingSchedule.effectiveFrom })}</p>}
          {schedule && (
            <div className="actions">
              <button className="button" disabled={m.schedule.isPending} onClick={() => m.schedule.mutate({ id, schedule }, { onSuccess: () => setSchedule(null) })}>
                {t("habit.form.save")}
              </button>
              <button className="link-button" onClick={() => setSchedule(null)}>
                {t("habit.form.cancel")}
              </button>
            </div>
          )}
          {failure(m.schedule) && <p role="alert" className="error">{failure(m.schedule)}</p>}
        </section>
      )}

      <section className="danger-zone">
        <div className="actions">
          {archived ? (
            <button className="button" disabled={m.restore.isPending} onClick={() => m.restore.mutate(id)}>
              {t("habit.restore")}
            </button>
          ) : (
            <button className="link-button" disabled={m.archive.isPending} onClick={() => m.archive.mutate(id, { onSuccess: () => navigate(`/${me.theme}/habits`) })}>
              {t("habit.archive")}
            </button>
          )}
          {!confirmDelete && (
            <button className="link-button danger" onClick={() => setConfirmDelete(true)}>
              {t("delete.habit.action")}
            </button>
          )}
        </div>
        {failure(m.restore) && <p role="alert" className="error">{failure(m.restore)}</p>}
        {confirmDelete && (
          <div className="confirm" role="alertdialog" aria-labelledby="confirm-heading">
            <h2 id="confirm-heading">{t("delete.habit.heading")}</h2>
            <p>{t("delete.habit.body")}</p>
            <div className="actions">
              <button className="button danger-button" disabled={m.remove.isPending} onClick={() => m.remove.mutate(id, { onSuccess: () => navigate(`/${me.theme}/habits`) })}>
                {t("delete.habit.confirm")}
              </button>
              <button className="link-button" onClick={() => setConfirmDelete(false)}>
                {t("delete.habit.cancel")}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
