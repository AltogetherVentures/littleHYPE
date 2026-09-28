import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { THEME_SLUGS } from "@themes/registry";
import { translate } from "../lib/strings";
import type { Me } from "../lib/me";
import { ThemedApp } from "./ThemedApp";

vi.mock("@clerk/clerk-react", () => ({ useClerk: () => ({ signOut: vi.fn() }), useAuth: () => ({}) }));

const [mine, other] = THEME_SLUGS as unknown as [string, string];
const me = (theme: string | null, paid = true): Me => ({ userId: "u1", theme, timezone: "UTC", paid, isAdmin: false });

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname}</output>;
}

function renderAt(path: string, user: Me) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes>
        <Route path="/:theme/*" element={<ThemedApp me={user} />} />
        <Route path="*" element={<p>elsewhere</p>} />
      </Routes>
    </MemoryRouter>,
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
});
