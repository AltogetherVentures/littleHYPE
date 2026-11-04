import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
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

const EXCERPT = 160;

/** The list's view of an entry, built the same way the server builds it, so the list can show a save at once. */
export function summarise(entry: EntryView): EntrySummary {
  const flat = entry.body.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  return { id: entry.id, date: entry.date, excerpt: flat.length > EXCERPT ? `${flat.slice(0, EXCERPT).trimEnd()}…` : flat, mood: entry.mood, promptKey: entry.promptKey, updatedAt: entry.updatedAt };
}

type Pages = { pages: { entries: EntrySummary[]; hasMore: boolean }[]; pageParams: unknown[] };

/**
 * Put a just-saved entry into every cached list (unfiltered lists and the one for its day)
 * before the server is asked again, so going back to the journal never shows a list that
 * is missing what was just written. The refetch that follows settles the exact order.
 */
function placeInLists(client: QueryClient, entry: EntryView) {
  const summary = summarise(entry);
  // Only lists that would include it: no search, and either every day or this entry's day.
  const relevant = (key: readonly unknown[]) => key[0] === JOURNAL_KEY[0] && key[1] === "" && (key[2] === null || key[2] === entry.date);
  client.setQueriesData<Pages>({ queryKey: JOURNAL_KEY, predicate: (q) => relevant(q.queryKey) }, (data) => {
    if (!data) return data;
    const pages = data.pages.map((p) => ({ ...p, entries: p.entries.filter((e) => e.id !== entry.id) }));
    const first = pages[0];
    if (!first) return data;
    const at = first.entries.findIndex((e) => e.date <= entry.date);
    const entries = [...first.entries];
    entries.splice(at === -1 ? entries.length : at, 0, summary);
    return { ...data, pages: [{ ...first, entries }, ...pages.slice(1)] };
  });
}

/** Everything that shows entries or "written today" is stale after a write. */
export function useJournalRefresh() {
  const client = useQueryClient();
  return (entry?: EntryView) => {
    if (entry) placeInLists(client, entry);
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
      refresh(entry);
      return entry;
    },
    update: async (id: string, patch: { body?: string; mood?: number | null }) => {
      const { entry } = await api<{ entry: EntryView }>(`/api/journal/${id}`, { method: "PATCH", body: patch });
      client.setQueryData(entryKey(id), { entry });
      refresh(entry);
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
