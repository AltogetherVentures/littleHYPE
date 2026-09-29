import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarDay } from "./calendar";
import { invalidateAchievements } from "./achievements";
import { useApi } from "./api";
import { TODAY_KEY } from "./habits";

export interface EntryView {
  id: string;
  date: string;
  body: string;
  mood: number | null;
  promptKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntrySummary {
  id: string;
  date: string;
  excerpt: string;
  mood: number | null;
  promptKey: string | null;
  updatedAt: string;
}

export const JOURNAL_KEY = ["journal"] as const;
export const entryKey = (id: string) => ["journal-entry", id] as const;
export const calendarKey = (month: string) => ["journal-calendar", month] as const;

const PAGE = 20;

/** Entries newest first, optionally narrowed to a search or a single day. */
export function useEntries(filter: { q: string; date: string | null }) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: [...JOURNAL_KEY, filter.q, filter.date] as const,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(pageParam) });
      if (filter.q) params.set("q", filter.q);
      if (filter.date) params.set("date", filter.date);
      return api<{ entries: EntrySummary[]; hasMore: boolean }>(`/api/journal?${params}`);
    },
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length * PAGE : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useEntry(id: string | null) {
  const api = useApi();
  return useQuery({ queryKey: entryKey(id ?? "none"), queryFn: () => api<{ entry: EntryView }>(`/api/journal/${id}`), enabled: id !== null, staleTime: Infinity });
}

export function useCalendar(month: string) {
  const api = useApi();
  return useQuery({
    queryKey: calendarKey(month),
    queryFn: () => api<{ month: string; today: string; days: CalendarDay[] }>(`/api/journal/calendar?month=${month}`),
    placeholderData: keepPreviousData,
  });
}

/** Everything that shows entries or "written today" is stale after a write. */
export function useJournalRefresh() {
  const client = useQueryClient();
  return () => {
    invalidateAchievements(client);
    void client.invalidateQueries({ queryKey: JOURNAL_KEY });
    void client.invalidateQueries({ queryKey: ["journal-calendar"] });
    void client.invalidateQueries({ queryKey: TODAY_KEY });
  };
}

export function useEntryTransport(opts: { date?: string; promptKey?: string | null }) {
  const api = useApi();
  const client = useQueryClient();
  const refresh = useJournalRefresh();
  return {
    create: async (draft: { body: string; mood: number | null }) => {
      const { entry } = await api<{ entry: EntryView }>("/api/journal", {
        method: "POST",
        body: { ...draft, ...(opts.date ? { date: opts.date } : {}), ...(opts.promptKey ? { promptKey: opts.promptKey } : {}) },
      });
      client.setQueryData(entryKey(entry.id), { entry });
      refresh();
      return entry;
    },
    update: async (id: string, patch: { body?: string; mood?: number | null }) => {
      const { entry } = await api<{ entry: EntryView }>(`/api/journal/${id}`, { method: "PATCH", body: patch });
      client.setQueryData(entryKey(id), { entry });
      refresh();
      return entry;
    },
  };
}

export function useDeleteEntry() {
  const api = useApi();
  const client = useQueryClient();
  const refresh = useJournalRefresh();
  return useMutation({
    mutationFn: (id: string) => api(`/api/journal/${id}?confirm=true`, { method: "DELETE" }),
    onSuccess: (_r, id) => {
      client.removeQueries({ queryKey: entryKey(id) });
      refresh();
    },
  });
}
