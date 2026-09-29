import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { THEME_SLUGS } from "@themes/registry";
import { translate } from "../lib/strings";
import type { Me } from "../lib/me";
import { ThemedApp } from "./ThemedApp";

vi.mock("@clerk/clerk-react", () => ({ useClerk: () => ({ signOut: vi.fn() }), useAuth: () => ({}) }));

// A tiny in-memory API: one daily habit that can be checked in, undone and refused.
let habit = { id: "h1", name: "Drink water", description: null, category: "hydration", archivedAt: null, createdAt: "2026-09-01T00:00:00Z", schedule: { type: "daily" }, pendingSchedule: null, streak: { current: 2, longest: 5, unit: "days", currentDays: 2, longestDays: 5 }, today: { due: true, logged: null as string | null, week: null } };
let failNext = false;
const apiMock = vi.fn(async (path: string, init?: { method?: string; body?: { status?: string } }) => {
  if (path === "/api/today") return { date: "2026-09-30", habits: [habit], milestone: { milestone: 3, remaining: 1 } };
  if (path.startsWith("/api/habits/h1/logs/")) {
    if (failNext) throw new Error("boom");
    const done = init?.method === "PUT" && init.body?.status === "done";
    habit = { ...habit, streak: { ...habit.streak, current: done ? 3 : 2 }, today: { ...habit.today, logged: init?.method === "PUT" ? (init.body?.status ?? null) : null } };
    return { habit };
  }
  return {};
});
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), useApi: () => apiMock }));

const [mine, other] = THEME_SLUGS as unknown as [string, string];
const me = (theme: string | null, paid = true): Me => ({ userId: "u1", theme, timezone: "UTC", paid, isAdmin: false, createdAt: "2026-01-01T00:00:00.000Z" });

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname}</output>;
}

function renderAt(path: string, user: Me) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <Routes>
          <Route path="/:theme/*" element={<ThemedApp me={user} />} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ThemedApp", () => {
  it("renders Today in the profile theme's own wording", () => {
    renderAt(`/${mine}/today`, me(mine));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(translate(mine, "today.title"));
    expect(document.documentElement.dataset.theme).toBe(mine);
  });

  it("redirects a URL for a different theme to the profile theme, keeping the path", () => {
    renderAt(`/${other}/journal`, me(mine));
    expect(screen.getByTestId("where").textContent).toBe(`/${mine}/journal`);
  });

  it("sends an unpaid user with no theme to the paywall route", () => {
    renderAt(`/${mine}/today`, me(null, false));
    expect(screen.getByTestId("where").textContent).toBe("/paywall");
  });

  it("sends a paid user with no theme to onboarding", () => {
    renderAt(`/${mine}/today`, me(null, true));
    expect(screen.getByTestId("where").textContent).toBe("/onboarding");
  });

  it("shows today's habits and checks one in instantly, then settles on the server's answer", async () => {
    habit = { ...habit, streak: { ...habit.streak, current: 2 }, today: { ...habit.today, logged: null } };
    failNext = false;
    renderAt(`/${mine}/today`, me(mine));
    const check = await screen.findByRole("button", { name: /Drink water/ });
    expect(check).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(check);
    await waitFor(() => expect(screen.getByRole("button", { name: /Drink water/ })).toHaveAttribute("aria-pressed", "true"));
    expect(apiMock).toHaveBeenCalledWith(expect.stringMatching(/logs\/2026-09-30$/), expect.objectContaining({ method: "PUT", body: { status: "done" } }));
  });

  it("rolls the check-in back and says so when the server refuses", async () => {
    habit = { ...habit, streak: { ...habit.streak, current: 2 }, today: { ...habit.today, logged: null } };
    failNext = true;
    renderAt(`/${mine}/today`, me(mine));
    await userEvent.click(await screen.findByRole("button", { name: /Drink water/ }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Drink water/ })).toHaveAttribute("aria-pressed", "false");
    failNext = false;
  });

  it("shows the nearest milestone from the API", async () => {
    habit = { ...habit, today: { ...habit.today, logged: null } };
    renderAt(`/${mine}/today`, me(mine));
    expect(await screen.findByText(/1 day|One (more )?day|Just one/i)).toBeInTheDocument();
  });
});
