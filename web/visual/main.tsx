import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemePicker } from "../src/components/ThemePicker";
import type { Me } from "../src/lib/me";
import { Landing } from "../src/routes/Landing";
import { Paywall } from "../src/routes/Paywall";
import { Showcase } from "../src/routes/Showcase";
import { ThemedApp } from "../src/routes/ThemedApp";
import "../src/styles.css";
import.meta.glob("../../themes/*/*.css", { eager: true });
import { installMockApi } from "./mock-api";

installMockApi();

/**
 * Design gallery: the real screens with sample data.
 *   ?scene=today|journal|picker|showcase|landing|paywall   &theme=<slug>
 * Not shipped: it exists so every theme can be reviewed without signing in.
 */
const params = new URLSearchParams(window.location.search);
const scene = params.get("scene") ?? "today";
const theme = params.get("theme") ?? "";
const day = Number(params.get("day") ?? "47");

const me: Me = {
  userId: "gallery",
  theme,
  timezone: "Europe/Dublin",
  paid: true,
  onboarded: scene !== "welcome",
  reminderTime: "20:00",
  isAdmin: false,
  createdAt: new Date(Date.now() - (day - 1) * 86_400_000).toISOString(),
};

const sceneRoute = (s: string) =>
  ({ journal: "journal", habits: "habits", habit: "habits/h3", entry: "journal/e1", newentry: "journal/new?prompt=reflect.proud_of", welcome: "welcome" })[s] ?? "today";

function Scene() {
  switch (scene) {
    case "picker":
      return (
        <main className="page-wide">
          <ThemePicker busy={false} error={null} onChoose={() => {}} />
        </main>
      );
    case "showcase":
      return <Showcase slug={theme} />;
    case "landing":
      return <Landing />;
    case "paywall":
      return <Paywall />;
    default:
      return (
        <Routes>
          <Route path="/:theme/*" element={<ThemedApp me={me} />} />
        </Routes>
      );
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/${theme}/${sceneRoute(scene)}`]}>
        <Scene />
      </MemoryRouter>
    </QueryClientProvider>
  </StrictMode>,
);
