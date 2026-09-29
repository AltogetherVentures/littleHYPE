import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_SLUGS } from "@themes/registry";
import type { Me } from "../lib/me";
import { translate } from "../lib/strings";
import { ThemedApp } from "./ThemedApp";

vi.mock("@clerk/clerk-react", () => ({ useClerk: () => ({ signOut: vi.fn() }), useAuth: () => ({}) }));

const [theme] = THEME_SLUGS as unknown as [string];
const me: Me = { userId: "u1", theme, timezone: "UTC", paid: true, onboarded: true, reminderTime: null, isAdmin: false, createdAt: "2026-01-01T00:00:00.000Z" };
const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string>) => translate(theme, key, vars);

interface Row { id: string; date: string; body: string; mood: number | null; promptKey: string | null }
let rows: Row[];
let calls: { path: string; method: string; body?: unknown }[];
let failSaves = false;

const full = (r: Row) => ({ ...r, createdAt: "2026-09-30T00:00:00Z", updatedAt: "2026-09-30T00:00:00Z" });
const apiMock = vi.fn(async (path: string, init?: { method?: string; body?: Record<string, unknown> }) => {
  const method = init?.method ?? "GET";
  calls.push({ path, method, body: init?.body });
  const url = new URL(path, "http://x");
  if (url.pathname === "/api/journal" && method === "GET") {
    const q = url.searchParams.get("q");
    const date = url.searchParams.get("date");
    const list = rows.filter((r) => (!q || r.body.includes(q)) && (!date || r.date === date));
    return { entries: list.map((r) => ({ id: r.id, date: r.date, excerpt: r.body, mood: r.mood, promptKey: r.promptKey, updatedAt: "" })), hasMore: false };
  }
  if (url.pathname === "/api/journal/calendar") return { month: "2026-09", today: "2026-09-30", days: [{ date: "2026-09-12", count: 1, mood: null }] };
  if (url.pathname === "/api/journal" && method === "POST") {
    if (failSaves) throw new Error("offline");
    const row: Row = { id: `id${rows.length + 1}`, date: "2026-09-30", body: String(init!.body!.body ?? ""), mood: (init!.body!.mood as number | null) ?? null, promptKey: null };
    rows.push(row);
    return { entry: full(row) };
  }
  const one = /^\/api\/journal\/([^/]+)$/.exec(url.pathname);
  if (one) {
    const row = rows.find((r) => r.id === one[1]);
    if (!row) throw new Error("404");
    if (method === "PATCH") Object.assign(row, init!.body);
    if (method === "DELETE") rows = rows.filter((r) => r !== row);
    return method === "DELETE" ? { ok: true } : { entry: full(row) };
  }
  if (url.pathname === "/api/today") return { date: "2026-09-30", habits: [], milestone: null, writtenToday: false };
  return {};
});
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), useApi: () => apiMock }));

function Where() {
  return <output data-testid="where">{useLocation().pathname + useLocation().search}</output>;
}
function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <Routes>
          <Route path="/:theme/*" element={<ThemedApp me={me} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const saveState = () => document.querySelector(".save-state")?.textContent;
const writes = () => calls.filter((c) => c.method !== "GET");

beforeEach(() => {
  rows = [
    { id: "a", date: "2026-09-12", body: "walked by the river", mood: 4, promptKey: null },
    { id: "b", date: "2026-09-10", body: "quiet day with tea", mood: null, promptKey: null },
  ];
  calls = [];
  failSaves = false;
});
afterEach(cleanup);

describe("journal list", () => {
  it("shows entries newest first with the theme's own wording, and searches", async () => {
    renderAt(`/${theme}/journal`);
    expect(await screen.findByText("walked by the river")).toBeTruthy();
    expect(screen.getByText("quiet day with tea")).toBeTruthy();
    await userEvent.type(screen.getByRole("searchbox"), "tea");
    await waitFor(() => expect(calls.some((c) => c.path.includes("q=tea"))).toBe(true));
    await waitFor(() => expect(screen.queryByText("walked by the river")).toBeNull());
    expect(screen.getByText("quiet day with tea")).toBeTruthy();
  });

  it("says so when a search finds nothing, and when there are no entries at all", async () => {
    renderAt(`/${theme}/journal`);
    await userEvent.type(await screen.findByRole("searchbox"), "zzz");
    expect(await screen.findByText(t("journal.search.empty"))).toBeTruthy();
    cleanup();
    rows = [];
    renderAt(`/${theme}/journal`);
    expect(await screen.findByText(t("journal.empty"))).toBeTruthy();
  });

  it("filters to a day picked on the calendar and clears again", async () => {
    renderAt(`/${theme}/journal`);
    await screen.findByText("walked by the river");
    await userEvent.click(await screen.findByRole("button", { name: /12 September 2026/ }));
    await waitFor(() => expect(screen.queryByText("quiet day with tea")).toBeNull());
    expect(screen.getByTestId("where").textContent).toContain("date=2026-09-12");
    await userEvent.click(screen.getByRole("button", { name: t("journal.filter.clear") }));
    expect(await screen.findByText("quiet day with tea")).toBeTruthy();
  });

  it("offers this week as a strip with a dot on written days, and opens the whole month on request", async () => {
    renderAt(`/${theme}/journal`);
    await screen.findByText("walked by the river");
    const week = screen.getByRole("group", { name: t("journal.week.heading") });
    const days = within(week).getAllByRole("button");
    expect(days).toHaveLength(7);
    // The mock's today is Wednesday 30 September 2026; the strip runs Monday 28 to Sunday 4.
    expect(days[0]!.getAttribute("aria-label")).toContain("28 September 2026");
    expect((days[6] as HTMLButtonElement).disabled).toBe(true);
    const toggle = screen.getByRole("button", { name: t("journal.week.showMonth") });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: t("journal.week.hideMonth") }).getAttribute("aria-expanded")).toBe("true");
  });

  it("colours an entry card by its mood", async () => {
    renderAt(`/${theme}/journal`);
    const card = (await screen.findByText("walked by the river")).closest(".entry-card")!;
    expect(card.getAttribute("data-mood")).toBe("4");
    expect(card.querySelector(".entry-edge")).not.toBeNull();
    expect(screen.getByText("quiet day with tea").closest(".entry-card")!.hasAttribute("data-mood")).toBe(false);
  });

  it("never lets a future day be picked", async () => {
    renderAt(`/${theme}/journal`);
    await screen.findByText("walked by the river");
    await userEvent.click(await screen.findByRole("button", { name: t("journal.calendar.next") }));
    // Once in the month view and once in the week strip: both refuse.
    const october = await screen.findAllByRole("button", { name: /Thursday, 1 October 2026/ });
    expect(october.length).toBeGreaterThan(0);
    for (const b of october) expect((b as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("entry editor", () => {
  it("creates nothing until there is something to keep", async () => {
    renderAt(`/${theme}/journal/new`);
    await screen.findByRole("textbox", { name: t("journal.editor.label") });
    await userEvent.click(screen.getByRole("link", { name: new RegExp(t("journal.editor.back")) }));
    expect(writes()).toEqual([]);
  });

  it("autosaves after a pause: creates once, moves to the entry's address, then patches", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderAt(`/${theme}/journal/new`);
      const box = await screen.findByRole("textbox", { name: t("journal.editor.label") });
      fireEvent.change(box, { target: { value: "First words" } });
      expect(saveState()).toBe(t("journal.save.unsaved"));
      expect(writes()).toEqual([]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(900);
      });
      await waitFor(() => expect(writes()).toHaveLength(1));
      expect(writes()[0]).toMatchObject({ method: "POST", body: { body: "First words", mood: null } });
      await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(`/${theme}/journal/id3`));
      // still the same textbox, with the same text: not remounted
      expect((screen.getByRole("textbox", { name: t("journal.editor.label") }) as HTMLTextAreaElement).value).toBe("First words");
      await waitFor(() => expect(saveState()).toBe(t("journal.save.saved")));

      fireEvent.change(box, { target: { value: "First words and more" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(900);
      });
      await waitFor(() => expect(writes()).toHaveLength(2));
      expect(writes()[1]).toMatchObject({ path: "/api/journal/id3", method: "PATCH", body: { body: "First words and more" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("saves on blur without waiting for the pause, and records a mood straight away", async () => {
    renderAt(`/${theme}/journal/a`);
    const box = (await screen.findByDisplayValue("walked by the river")) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "walked by the sea" } });
    fireEvent.blur(box);
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toMatchObject({ path: "/api/journal/a", method: "PATCH", body: { body: "walked by the sea" } });
    await userEvent.click(screen.getByRole("radio", { name: new RegExp(t("journal.mood.5")) }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes()[1]!.body).toEqual({ mood: 5 });
  });

  it("keeps the words on screen and says so when saving fails", async () => {
    failSaves = true;
    renderAt(`/${theme}/journal/new`);
    const box = await screen.findByRole("textbox", { name: t("journal.editor.label") });
    fireEvent.change(box, { target: { value: "do not lose me" } });
    fireEvent.blur(box);
    await waitFor(() => expect(saveState()).toBe(t("journal.save.error")));
    expect((box as HTMLTextAreaElement).value).toBe("do not lose me");
  });

  it("previews Markdown and shows hostile input as plain text", async () => {
    renderAt(`/${theme}/journal/new`);
    const box = await screen.findByRole("textbox", { name: t("journal.editor.label") });
    fireEvent.change(box, { target: { value: "**bold** <img src=x onerror=alert(1)> [x](javascript:alert(1))" } });
    await userEvent.click(screen.getByRole("button", { name: t("journal.editor.preview") }));
    const preview = document.querySelector(".editor-preview")!;
    expect(preview.querySelector("strong")?.textContent).toBe("bold");
    expect(preview.querySelector("img")).toBeNull();
    expect(preview.querySelector("a")).toBeNull();
    expect(preview.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("formats the selection from the toolbar", async () => {
    renderAt(`/${theme}/journal/new`);
    const box = (await screen.findByRole("textbox", { name: t("journal.editor.label") })) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "make this loud" } });
    box.setSelectionRange(5, 9);
    await userEvent.click(screen.getByRole("button", { name: t("journal.editor.bold") }));
    expect(box.value).toBe("make **this** loud");
  });

  it("shows the prompt being answered when opened from one", async () => {
    renderAt(`/${theme}/journal/new?prompt=gratitude.small_win`);
    expect(await screen.findByText(t("journal.editor.answering"))).toBeTruthy();
    cleanup();
    calls = [];
    renderAt(`/${theme}/journal/new?prompt=not.a.real.one`);
    await screen.findByRole("textbox", { name: t("journal.editor.label") });
    expect(screen.queryByText(t("journal.editor.answering"))).toBeNull();
  });

  it("deletes only after confirmation, then returns to the list", async () => {
    renderAt(`/${theme}/journal/a`);
    await screen.findByDisplayValue("walked by the river");
    await userEvent.click(screen.getByRole("button", { name: t("delete.entry.action") }));
    expect(writes()).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: t("delete.entry.cancel") }));
    expect(writes()).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: t("delete.entry.action") }));
    await userEvent.click(screen.getByRole("button", { name: t("delete.entry.confirm") }));
    await waitFor(() => expect(writes().some((c) => c.method === "DELETE" && c.path.includes("confirm=true"))).toBe(true));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(`/${theme}/journal`));
    // a deleted entry is not recreated by a late autosave
    expect(writes().filter((c) => c.method === "POST")).toEqual([]);
  });

  it("says when an entry does not exist", async () => {
    renderAt(`/${theme}/journal/missing`);
    expect(await screen.findByText(t("journal.error.load"))).toBeTruthy();
  });
});
