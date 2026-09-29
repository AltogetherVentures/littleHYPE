import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACHIEVEMENT_KEYS } from "@shared/achievement-defs";
import { THEME_SLUGS } from "@themes/registry";
import { achievementCopy } from "../lib/content";
import type { Me } from "../lib/me";
import { translate } from "../lib/strings";
import { ThemedApp } from "./ThemedApp";

vi.mock("@clerk/clerk-react", () => ({ useClerk: () => ({ signOut: vi.fn() }), useAuth: () => ({}) }));

const [theme] = THEME_SLUGS as unknown as [string];
const me = (over: Partial<Me> = {}): Me => ({ userId: "u1", theme, timezone: "UTC", paid: true, onboarded: true, reminderTime: null, isAdmin: false, createdAt: "2026-01-01T00:00:00.000Z", ...over });

let unseen: { key: string; family: string; unlockedAt: string }[];
const seenCalls: string[][] = [];
const apiMock = vi.fn(async (path: string, init?: { method?: string; body?: { keys?: string[] } }) => {
  if (path === "/api/achievements/unseen") return { unseen };
  if (path === "/api/achievements/seen") {
    seenCalls.push(init!.body!.keys!);
    unseen = unseen.filter((u) => !init!.body!.keys!.includes(u.key));
    return { ok: true };
  }
  if (path === "/api/achievements") {
    return {
      achievements: ACHIEVEMENT_KEYS.map((key, i) => ({ key, family: "streak", unlockedAt: i < 2 ? "2026-09-20T10:00:00Z" : null, seen: i < 2, progress: { current: i < 2 ? 1 : 2, target: i < 2 ? 1 : 7 } })),
    };
  }
  if (path === "/api/today") return { date: "2026-09-30", habits: [], milestone: null, writtenToday: false };
  if (path === "/api/prompt") return { date: "2026-09-30", promptKey: "reflect.proud_of", skipsLeft: 3, answeredBy: null };
  return {};
});
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), useApi: () => apiMock }));

function renderAt(path: string, user: Me) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/:theme/*" element={<ThemedApp me={user} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  unseen = [];
  seenCalls.length = 0;
  apiMock.mockClear();
});
afterEach(cleanup);

describe("the achievements collection", () => {
  it("lists every achievement in the theme's words, with progress on the ones still to earn", async () => {
    renderAt(`/${theme}/achievements`, me());
    const first = achievementCopy(theme, "first_entry");
    expect(await screen.findByText(first.name)).toBeTruthy();
    expect(screen.getAllByRole("listitem").filter((li) => li.classList.contains("badge"))).toHaveLength(ACHIEVEMENT_KEYS.length);
    expect(screen.getByText(translate(theme, "achievements.count", { n: "2", total: String(ACHIEVEMENT_KEYS.length) }))).toBeTruthy();
    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(ACHIEVEMENT_KEYS.length - 2);
    expect(bars[0]!.getAttribute("aria-valuenow")).toBe("2");
    expect(bars[0]!.getAttribute("aria-valuemax")).toBe("7");
  });
});

describe("the unlock moment", () => {
  it("shows a new achievement in the theme's own copy, once, and marks it seen when dismissed", async () => {
    unseen = [{ key: "streak_7", family: "streak", unlockedAt: "2026-09-30T10:00:00Z" }];
    renderAt(`/${theme}/today`, me());
    const dialog = await screen.findByRole("dialog");
    const copy = achievementCopy(theme, "streak_7");
    expect(within(dialog).getByText(copy.name)).toBeTruthy();
    expect(within(dialog).getByText(copy.unlock)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole("button", { name: translate(theme, "achievements.unlock.dismiss") }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(seenCalls).toEqual([["streak_7"]]);
  });

  it("shows several one after another, oldest first, and closes with Escape", async () => {
    unseen = [
      { key: "first_entry", family: "entry", unlockedAt: "2026-09-30T10:00:00Z" },
      { key: "first_checkin", family: "checkin", unlockedAt: "2026-09-30T10:01:00Z" },
    ];
    renderAt(`/${theme}/today`, me());
    expect(await screen.findByText(achievementCopy(theme, "first_entry").name)).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    expect(await screen.findByText(achievementCopy(theme, "first_checkin").name)).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(seenCalls).toEqual([["first_entry"], ["first_checkin"]]);
  });

  it("stays out of the way of the welcome step", async () => {
    unseen = [{ key: "first_entry", family: "entry", unlockedAt: "2026-09-30T10:00:00Z" }];
    renderAt(`/${theme}/welcome`, me({ onboarded: false }));
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(apiMock.mock.calls.some(([p]) => p === "/api/achievements/unseen")).toBe(false);
  });

  it("shows nothing when nothing is new", async () => {
    renderAt(`/${theme}/today`, me());
    await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(apiMock.mock.calls.some(([p]) => p === "/api/achievements/unseen")).toBe(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
