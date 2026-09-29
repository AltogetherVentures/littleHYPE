import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_SLUGS } from "@themes/registry";
import type { Me } from "../lib/me";
import { translate } from "../lib/strings";
import { Legal } from "./Legal";
import { ThemedApp } from "./ThemedApp";

const signOut = vi.fn();
const getToken = vi.fn(async () => "tok");
vi.mock("@clerk/clerk-react", () => ({ useClerk: () => ({ signOut }), useAuth: () => ({ getToken }) }));

const [theme] = THEME_SLUGS as unknown as [string];
const me: Me = { userId: "u1", theme, timezone: "Europe/Dublin", paid: true, onboarded: true, reminderTime: "20:00", isAdmin: false, createdAt: "2026-01-01T00:00:00.000Z" };
const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string>) => translate(theme, key, vars);

let deleteResult = { deleted: true, signInRemoved: true };
let deleteFails = false;
const apiMock = vi.fn(async (path: string, _init?: { method?: string; body?: unknown }) => {
  if (path === "/api/account?confirm=true") {
    if (deleteFails) throw new Error("boom");
    return deleteResult;
  }
  if (path.startsWith("/api/achievements/unseen")) return { unseen: [] };
  return { ok: true };
});
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), useApi: () => apiMock }));

const fetchMock = vi.fn();
function renderSettings() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/${theme}/settings`]}>
        <Routes>
          <Route path="/:theme/*" element={<ThemedApp me={me} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const calls = (path: string) => apiMock.mock.calls.filter(([p]) => p === path);

beforeEach(() => {
  apiMock.mockClear();
  signOut.mockClear();
  deleteResult = { deleted: true, signInRemoved: true };
  deleteFails = false;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("settings", () => {
  it("shows the current timezone and saves a new one", async () => {
    renderSettings();
    const select = (await screen.findByRole("combobox")) as HTMLSelectElement;
    expect(select.value).toBe("Europe/Dublin");
    const save = screen.getAllByRole("button", { name: t("settings.save") })[0]!;
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await userEvent.selectOptions(select, "America/New_York");
    await userEvent.click(save);
    await waitFor(() => expect(calls("/api/me/timezone")).toHaveLength(1));
    expect(calls("/api/me/timezone")[0]![1]).toMatchObject({ method: "PUT", body: { timezone: "America/New_York" } });
  });

  it("turns the reminder off, and sets a new time", async () => {
    renderSettings();
    await screen.findByLabelText(t("settings.reminder.time"));
    const saves = screen.getAllByRole("button", { name: t("settings.save") });
    await userEvent.click(screen.getByRole("button", { name: t("settings.reminder.off") }));
    await userEvent.click(saves[1]!);
    await waitFor(() => expect(calls("/api/me/reminder")).toHaveLength(1));
    expect(calls("/api/me/reminder")[0]![1]).toMatchObject({ body: { time: null } });
    await userEvent.click(screen.getByRole("button", { name: t("settings.reminder.on") }));
    const input = screen.getByLabelText(t("settings.reminder.time")) as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, "07:45");
    await userEvent.click(saves[1]!);
    await waitFor(() => expect(calls("/api/me/reminder")).toHaveLength(2));
    expect(calls("/api/me/reminder")[1]![1]).toMatchObject({ body: { time: "07:45" } });
  });

  it("downloads the export with the session token", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { headers: { "content-disposition": 'attachment; filename="littlehype-data-2026-09-30.json"' } }));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderSettings();
    await userEvent.click(await screen.findByRole("button", { name: t("export.json") }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/export?format=json", { headers: { authorization: "Bearer tok" } });
    click.mockRestore();
  });

  it("tells the person when a download fails", async () => {
    fetchMock.mockResolvedValue(new Response("no", { status: 500 }));
    renderSettings();
    await userEvent.click(await screen.findByRole("button", { name: t("export.journal") }));
    expect(await screen.findByText(t("export.error"))).toBeTruthy();
  });
});

describe("account deletion", () => {
  const open = async () => {
    renderSettings();
    await userEvent.click(await screen.findByRole("button", { name: t("delete.account.action") }));
    return screen.getByRole("button", { name: t("delete.account.confirm") }) as HTMLButtonElement;
  };

  it("cannot be confirmed until DELETE is typed exactly", async () => {
    const confirm = await open();
    expect(confirm.disabled).toBe(true);
    const box = screen.getByLabelText(t("delete.account.label"));
    await userEvent.type(box, "delete");
    expect(confirm.disabled).toBe(true);
    await userEvent.clear(box);
    await userEvent.type(box, "DELETE");
    expect(confirm.disabled).toBe(false);
    expect(calls("/api/account?confirm=true")).toHaveLength(0);
  });

  it("uses plain neutral wording, whatever the theme", async () => {
    await open();
    expect(screen.getByText(t("delete.account.body"))).toBeTruthy();
    expect(t("delete.account.body")).toBe(translate(null, "delete.account.body"));
  });

  it("can be cancelled without deleting anything", async () => {
    await open();
    await userEvent.click(screen.getByRole("button", { name: t("delete.account.cancel") }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(calls("/api/account?confirm=true")).toHaveLength(0);
  });

  it("deletes, confirms, and only signs out when the person closes the message", async () => {
    const confirm = await open();
    await userEvent.type(screen.getByLabelText(t("delete.account.label")), "DELETE");
    await userEvent.click(confirm);
    expect(await screen.findByText(t("delete.account.done"))).toBeTruthy();
    expect(screen.queryByText(t("delete.account.signin"))).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: t("delete.account.close") }));
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });

  it("says so when the sign-in itself could not be removed", async () => {
    deleteResult = { deleted: true, signInRemoved: false };
    const confirm = await open();
    await userEvent.type(screen.getByLabelText(t("delete.account.label")), "DELETE");
    await userEvent.click(confirm);
    expect(await screen.findByText(t("delete.account.signin"))).toBeTruthy();
  });

  it("keeps everything and says so when deletion fails", async () => {
    deleteFails = true;
    const confirm = await open();
    await userEvent.type(screen.getByLabelText(t("delete.account.label")), "DELETE");
    await userEvent.click(confirm);
    expect(await screen.findByText(t("delete.account.error"))).toBeTruthy();
    expect(screen.queryByText(t("delete.account.done"))).toBeNull();
  });
});

describe("privacy policy and terms", () => {
  it("are always marked as drafts and cover what the app really does", () => {
    render(
      <MemoryRouter>
        <Legal kind="privacy" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("note").textContent).toBe(translate(null, "legal.draft"));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(translate(null, "legal.privacy.title"));
    const text = document.body.textContent ?? "";
    for (const provider of ["Cloudflare", "Supabase", "Clerk", "Stripe", "Resend"]) expect(text).toContain(provider);
    expect(text).toContain("United States");
    expect(text).toContain("30 days");
  });

  it("terms state the price-free essentials: one-time, lifetime, 14-day refund", () => {
    render(
      <MemoryRouter>
        <Legal kind="terms" />
      </MemoryRouter>,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("one-time");
    expect(text).toContain("lifetime");
    expect(text).toContain("14 days");
  });
});
