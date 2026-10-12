import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import type { Me } from "../lib/me";
import { translate } from "../lib/strings";
import { CheckoutSuccess } from "./CheckoutSuccess";
import { Paywall } from "./Paywall";

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }), useClerk: () => ({}) }));

let me: Me;
let checkoutError: ApiError | null;
const apiMock = vi.fn(async (path: string) => {
  if (path === "/api/me") return me;
  if (path === "/api/checkout") {
    if (checkoutError) throw checkoutError;
    return { url: "https://checkout.stripe.test/pay" };
  }
  return {};
});
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), useApi: () => apiMock }));

const base: Me = { userId: "u", theme: null, timezone: "UTC", paid: false, onboarded: false, reminderTime: null, isAdmin: false, createdAt: "2026-01-01T00:00:00Z" };
const t = (key: Parameters<typeof translate>[1]) => translate(null, key);
const Where = () => <output data-testid="where">{useLocation().pathname}</output>;
const assign = vi.fn();

function renderPage(element: React.ReactNode, path: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <Routes>
          <Route path="/paywall" element={element} />
          <Route path="/checkout/success" element={element} />
          <Route path="/onboarding" element={<p>picker</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  me = { ...base };
  checkoutError = null;
  apiMock.mockClear();
  assign.mockClear();
  vi.stubGlobal("location", { ...window.location, assign });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("paywall", () => {
  it("states the price plainly and sends the buyer to Stripe's checkout", async () => {
    renderPage(<Paywall />, "/paywall");
    expect(await screen.findByText(t("paywall.body"))).toBeTruthy();
    expect(t("paywall.body")).toContain("$49");
    await userEvent.click(screen.getByRole("button", { name: t("paywall.buy") }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.test/pay"));
    expect(apiMock).toHaveBeenCalledWith("/api/checkout", { method: "POST" });
  });

  it("says checkout is unavailable when the server says so, and offers another go", async () => {
    checkoutError = new ApiError(503, "checkout_unavailable");
    renderPage(<Paywall />, "/paywall");
    await userEvent.click(await screen.findByRole("button", { name: t("paywall.buy") }));
    expect(await screen.findByText(t("paywall.unavailable"))).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: t("paywall.buy") }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("says nothing was charged on any other failure", async () => {
    checkoutError = new ApiError(502, "checkout_failed");
    renderPage(<Paywall />, "/paywall");
    await userEvent.click(await screen.findByRole("button", { name: t("paywall.buy") }));
    expect(await screen.findByText(t("paywall.error"))).toBeTruthy();
  });

  it("moves a buyer who has already paid straight on", async () => {
    me = { ...base, paid: true };
    renderPage(<Paywall />, "/paywall");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/onboarding"));
  });
});

describe("after checkout", () => {
  it("waits for the webhook, then continues to the theme picker once the server says paid", async () => {
    renderPage(<CheckoutSuccess />, "/checkout/success");
    expect(await screen.findByText(t("billing.success.waiting"))).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("/checkout/success");
    me = { ...base, paid: true };
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/onboarding"), { timeout: 5000 });
  }, 8000);

  it("never treats the browser returning from Stripe as proof of payment", async () => {
    renderPage(<CheckoutSuccess />, "/checkout/success?session_id=cs_test_123");
    await screen.findByText(t("billing.success.waiting"));
    expect(screen.getByTestId("where").textContent).toBe("/checkout/success");
  });
});
