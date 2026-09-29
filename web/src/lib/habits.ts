import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { HabitCategory } from "@shared/categories";
import type { GridCell, HabitAnalysis, LogStatus, Schedule, ScheduleVersion, TodayStatus } from "@shared/streaks";
import { invalidateAchievements } from "./achievements";
import { ApiError, useApi } from "./api";

export interface HabitView {
  id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  archivedAt: string | null;
  createdAt: string;
  schedule: Schedule;
  pendingSchedule: { effectiveFrom: string; schedule: Schedule } | null;
  streak: Pick<HabitAnalysis, "current" | "longest" | "unit" | "currentDays" | "longestDays">;
  today: TodayStatus;
  /** This Monday-to-Sunday week, for the strip under the habit's name. */
  week: GridCell[];
}

export interface TodayData {
  date: string;
  habits: HabitView[];
  milestone: { milestone: number; remaining: number; habitId: string; habitName: string } | null;
  /** Whether any entry with text exists for today (TD-2). */
  writtenToday: boolean;
}

export interface HabitHistory {
  habit: HabitView;
  grid: GridCell[][];
  breaks: HabitAnalysis["breaks"];
  versions: ScheduleVersion[];
}

export const TODAY_KEY = ["today"] as const;
export const HABITS_KEY = ["habits"] as const;
export const historyKey = (id: string) => ["habit-history", id] as const;

export function useToday() {
  const api = useApi();
  return useQuery({ queryKey: TODAY_KEY, queryFn: () => api<TodayData>("/api/today"), staleTime: 15_000 });
}

export function useHabits() {
  const api = useApi();
  return useQuery({ queryKey: HABITS_KEY, queryFn: () => api<{ today: string; habits: HabitView[] }>("/api/habits") });
}

export function useHabitHistory(id: string) {
  const api = useApi();
  return useQuery({ queryKey: historyKey(id), queryFn: () => api<HabitHistory>(`/api/habits/${id}/history`) });
}

/** What the habit looks like the instant the user taps, before the server confirms (NF-3). */
export function optimisticLog(habit: HabitView, status: LogStatus | null): HabitView {
  const wasDone = habit.today.logged === "done";
  const willDone = status === "done";
  let current = habit.streak.current;
  if (habit.streak.unit === "days") {
    if (!wasDone && willDone) current += 1;
    if (wasDone && !willDone) current = Math.max(0, current - 1);
  }
  const week = habit.today.week ? { ...habit.today.week, done: Math.max(0, habit.today.week.done + (willDone ? 1 : 0) - (wasDone ? 1 : 0)) } : null;
  // Today is the last cell of the week that is not still to come.
  const cell = status === "done" ? "done" : status === "skipped" ? "skipped" : "open";
  let todayIndex = habit.week.length - 1;
  while (todayIndex > 0 && habit.week[todayIndex]!.state === "future") todayIndex--;
  return {
    ...habit,
    streak: { ...habit.streak, current, longest: Math.max(habit.streak.longest, current), currentDays: habit.streak.unit === "days" ? current : habit.streak.currentDays },
    today: { ...habit.today, logged: status, week },
    week: habit.week.map((c, i) => (i === todayIndex ? { ...c, state: cell } : c)),
  };
}

function replaceHabit(client: QueryClient, habit: HabitView) {
  client.setQueryData<TodayData>(TODAY_KEY, (d) => d && { ...d, habits: d.habits.map((h) => (h.id === habit.id ? habit : h)) });
  client.setQueryData<{ today: string; habits: HabitView[] }>(HABITS_KEY, (d) => d && { ...d, habits: d.habits.map((h) => (h.id === habit.id ? habit : h)) });
}

/** Check in, rest, or undo for a day. Optimistic, with rollback if the server refuses. */
export function useSetLog() {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date, status }: { habitId: string; date: string; status: LogStatus | null }) =>
      status === null
        ? api<{ habit: HabitView }>(`/api/habits/${habitId}/logs/${date}`, { method: "DELETE" })
        : api<{ habit: HabitView }>(`/api/habits/${habitId}/logs/${date}`, { method: "PUT", body: { status } }),
    onMutate: async ({ habitId, status }) => {
      await Promise.all([client.cancelQueries({ queryKey: TODAY_KEY }), client.cancelQueries({ queryKey: HABITS_KEY })]);
      const previous = { today: client.getQueryData<TodayData>(TODAY_KEY), habits: client.getQueryData<{ today: string; habits: HabitView[] }>(HABITS_KEY) };
      const current = previous.today?.habits.find((h) => h.id === habitId) ?? previous.habits?.habits.find((h) => h.id === habitId);
      if (current) replaceHabit(client, optimisticLog(current, status));
      return previous;
    },
    onError: (_err, _vars, previous) => {
      if (previous?.today) client.setQueryData(TODAY_KEY, previous.today);
      if (previous?.habits) client.setQueryData(HABITS_KEY, previous.habits);
    },
    onSuccess: ({ habit }) => replaceHabit(client, habit),
    onSettled: (_data, _err, { habitId }) => {
      invalidateAchievements(client);
      void client.invalidateQueries({ queryKey: TODAY_KEY });
      void client.invalidateQueries({ queryKey: historyKey(habitId) });
    },
  });
}

export interface HabitInput {
  name: string;
  description: string | null;
  category: HabitCategory;
  schedule: Schedule;
}

export function useHabitMutations() {
  const api = useApi();
  const client = useQueryClient();
  const refresh = (id?: string) => {
    void client.invalidateQueries({ queryKey: TODAY_KEY });
    void client.invalidateQueries({ queryKey: HABITS_KEY });
    if (id) void client.invalidateQueries({ queryKey: historyKey(id) });
  };
  return {
    create: useMutation({ mutationFn: (input: HabitInput) => api<{ habit: HabitView }>("/api/habits", { method: "POST", body: input }), onSuccess: () => refresh() }),
    update: useMutation({
      mutationFn: ({ id, ...body }: { id: string } & Partial<Omit<HabitInput, "schedule">>) => api<{ habit: HabitView }>(`/api/habits/${id}`, { method: "PATCH", body }),
      onSuccess: (_r, { id }) => refresh(id),
    }),
    schedule: useMutation({
      mutationFn: ({ id, schedule }: { id: string; schedule: Schedule }) => api<{ effectiveFrom: string; habit: HabitView }>(`/api/habits/${id}/schedule`, { method: "PUT", body: { schedule } }),
      onSuccess: (_r, { id }) => refresh(id),
    }),
    archive: useMutation({ mutationFn: (id: string) => api(`/api/habits/${id}/archive`, { method: "POST" }), onSuccess: (_r, id) => refresh(id) }),
    restore: useMutation({ mutationFn: (id: string) => api(`/api/habits/${id}/restore`, { method: "POST" }), onSuccess: (_r, id) => refresh(id) }),
    remove: useMutation({ mutationFn: (id: string) => api(`/api/habits/${id}?confirm=true`, { method: "DELETE" }), onSuccess: (_r, id) => refresh(id) }),
  };
}

export function errorCode(err: unknown): string | null {
  return err instanceof ApiError ? err.code : null;
}
