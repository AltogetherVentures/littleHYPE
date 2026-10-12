import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import type { Me } from "../lib/me";
import { translate } from "../lib/strings";
import { AdminPage } from "./AdminPage";

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));

let me: Me;
let purchase: { status: string; amount: number; currency: string; paidAt: string; paymentIntent: string | null; refundEligible: boolean } | null;
let refundError: ApiError | null;
const calls: { path: string; method: string; body?: unknown }[] = [];
const apiMock = vi.fn(async (path: string, init?: { method?: string; body?: unknown }) => {
  calls.push({ path, method: init?.method ?? "GET", body: init?.body });
  if (path === "/api/me") return me;
  if (path === "/api/admin/actions") return { actions: [{ id: "1", admin: "admin_1", action: "theme_change", target: "user_9", at: "2026-09-29T10:00:00Z", detail: {} }] };
  if (path.startsWith("/api/admin/users?q=")) return { users: [{ id: "user_9", email: "bea@mail.test", name: "Bea", summary: { userId: "user_9" } }, { id: "user_10", email: "ghost@mail.test", name: null, summary: null }] };
  if (path.endsWith("/refund-and-delete")) {
    if (refundError) throw refundError;
    return { deleted: true, refunded: true, signInRemoved: false };
  }
  if (path.endsWith("/theme")) return { theme: "notebook" };
  if (path === "/api/admin/users/user_9")
    return { summary: { userId: "user_9", theme: "spacelog", timezone: "Europe/Dublin", createdAt: "2026-09-20T10:00:00Z", onboarded: true, purchase }, history: [{ from: null, to: "spacelog", by: "user_9", at: "2026-09-20T10:05:00Z" }], email: "bea@mail.test", name: "Bea" };
  return {};
});
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), useApi: () => apiMock }));

const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string>) => translate(null, key, vars);
const base: Me = { userId: "admin_1", theme: "spacelog", timezone: "UTC", paid: true, onboarded: true, reminderTime: null, isAdmin: true, createdAt: "2026-01-01T00:00:00Z" };

function renderAdmin() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const open = async () => {
  renderAdmin();
  await userEvent.type(await screen.findByLabelText(t("admin.search.label")), "bea");
  await userEvent.click(screen.getByRole("button", { name: t("admin.search.button") }));
  await userEvent.click(await screen.findByRole("button", { name: /bea@mail.test/ }));
};
const paid = { status: "paid", amount: 4900, currency: "usd", paidAt: "2026-09-27T10:00:00Z", paymentIntent: "pi_1", refundEligible: true };

beforeEach(() => {
  me = { ...base };
  purchase = { ...paid };
  refundError = null;
  calls.length = 0;
});
afterEach(cleanup);

describe("admin page", () => {
  it("does not exist for anyone who is not an admin", async () => {
    me = { ...base, isAdmin: false };
    renderAdmin();
    expect(await screen.findByText("Page not found")).toBeTruthy();
    expect(calls.some((c) => c.path.startsWith("/api/admin"))).toBe(false);
  });

  it("uses no theme at all, so it is plain whatever the admin's own theme", async () => {
    renderAdmin();
    await screen.findByText(t("admin.title"));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("finds an account and shows its summary: profile and purchase, never content", async () => {
    await open();
    expect(await screen.findByText("Europe/Dublin")).toBeTruthy();
    expect(screen.getByText(/\$49\.00, paid/)).toBeTruthy();
    expect(screen.getByText(new RegExp(t("admin.user.refundable")))).toBeTruthy();
    expect(screen.getByText(t("admin.noProfile"))).toBeTruthy();
    expect(screen.getByText(/theme_change on user_9 by admin_1/)).toBeTruthy();
  });

  it("changes a theme through the audited endpoint", async () => {
    await open();
    await screen.findByText("Europe/Dublin");
    await userEvent.selectOptions(screen.getByRole("combobox"), "notebook");
    await userEvent.click(screen.getByRole("button", { name: t("admin.theme.apply") }));
    await waitFor(() => expect(calls.some((c) => c.path === "/api/admin/users/user_9/theme" && (c.body as { theme: string }).theme === "notebook")).toBe(true));
  });
});

describe("refund and delete", () => {
  const confirmBox = () => screen.getByLabelText(t("admin.refund.confirmLabel"));
  const action = () => screen.getByRole("button", { name: t("admin.refund.action") }) as HTMLButtonElement;

  it("cannot be run until the exact user id is typed", async () => {
    await open();
    await screen.findByText("Europe/Dublin");
    expect(action().disabled).toBe(true);
    await userEvent.type(confirmBox(), "user_");
    expect(action().disabled).toBe(true);
    await userEvent.clear(confirmBox());
    await userEvent.type(confirmBox(), "user_9");
    expect(action().disabled).toBe(false);
    expect(calls.some((c) => c.path.endsWith("/refund-and-delete"))).toBe(false);
  });

  it("refunds and deletes, and reports what happened", async () => {
    await open();
    await screen.findByText("Europe/Dublin");
    await userEvent.type(confirmBox(), "user_9");
    await userEvent.click(action());
    expect(await screen.findByText(t("admin.refund.done", { refunded: "yes", signIn: "no" }))).toBeTruthy();
    expect(calls.find((c) => c.path.endsWith("/refund-and-delete"))).toMatchObject({ method: "POST", body: { confirm: "user_9" } });
  });

  it("offers a force option only outside the refund window, and sends it", async () => {
    purchase = { ...paid, refundEligible: false };
    await open();
    await screen.findByText("Europe/Dublin");
    await userEvent.type(confirmBox(), "user_9");
    await userEvent.click(screen.getByRole("checkbox", { name: t("admin.refund.force") }));
    await userEvent.click(action());
    await waitFor(() => expect(calls.find((c) => c.path.endsWith("/refund-and-delete"))?.body).toEqual({ confirm: "user_9", force: true }));
  });

  it("shows no force option inside the window", async () => {
    await open();
    await screen.findByText("Europe/Dublin");
    expect(screen.queryByRole("checkbox", { name: t("admin.refund.force") })).toBeNull();
  });

  it("says plainly what went wrong, and that nothing was deleted", async () => {
    refundError = new ApiError(502, "refund_failed");
    await open();
    await screen.findByText("Europe/Dublin");
    await userEvent.type(confirmBox(), "user_9");
    await userEvent.click(action());
    expect(await screen.findByText(t("admin.refund.error.refund_failed"))).toBeTruthy();
  });

  it("uses the delete-only wording when there is nothing to refund", async () => {
    purchase = null;
    await open();
    await screen.findByText("Europe/Dublin");
    expect(screen.getByText(t("admin.refund.bodyNoPurchase"))).toBeTruthy();
    expect(screen.getByRole("button", { name: t("admin.refund.actionNoPurchase") })).toBeTruthy();
  });
});
