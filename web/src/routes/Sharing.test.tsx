import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_SLUGS } from "@themes/registry";
import { pickVariant } from "@shared/sharing";
import { breakCardCopy, titleText } from "../lib/content";
import type { Me } from "../lib/me";
import { translate } from "../lib/strings";
import { ThemedApp } from "./ThemedApp";

vi.mock("@clerk/clerk-react", () => ({ useClerk: () => ({ signOut: vi.fn() }), useAuth: () => ({ getToken: async () => "tok" }) }));

const [theme] = THEME_SLUGS as unknown as [string];
const me: Me = { userId: "u1", theme, timezone: "UTC", paid: true, onboarded: true, reminderTime: null, isAdmin: false, createdAt: "2026-01-01T00:00:00.000Z" };
const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string>) => translate(theme, key, vars);
const CARD_ID = "0b7d2f0e-1111-4222-8333-444455556666";

let title: unknown;
let breakCard: unknown;
let unseen: unknown[];
const dismissed: string[] = [];
const shares: string[] = [];
const apiMock = vi.fn(async (path: string, init?: { method?: string; body?: { cardType?: string } }) => {
  if (path === "/api/title") return { title };
  if (path === "/api/break-card") return { card: breakCard };
  if (path === "/api/achievements/unseen") return { unseen };
  if (/^\/api\/break-card\/.+\/dismiss$/.test(path)) {
    dismissed.push(path.split("/")[3]!);
    return { ok: true };
  }
  if (path === "/api/share-events") {
    shares.push(init!.body!.cardType!);
    return { ok: true };
  }
  if (path === "/api/referrals") return { code: "k7m2q9xa", link: "https://app.example/r/k7m2q9xa", pending: 1, confirmed: 2, creditsEarned: 0, creditsRedeemed: 0, nextCreditIn: 1 };
  if (path === "/api/today") return { date: "2026-09-30", habits: [], milestone: null, writtenToday: false };
  if (path === "/api/prompt") return { date: "2026-09-30", promptKey: "reflect.proud_of", skipsLeft: 3, answeredBy: null };
  return {};
});
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), useApi: () => apiMock }));

const fetchMock = vi.fn();
const canvas = { drawImage: vi.fn() };

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/:theme/*" element={<ThemedApp me={me} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  title = { category: "hydration", key: "hydration.rank3", rank: 3, streakDays: 43, habitId: "h" };
  breakCard = null;
  unseen = [];
  dismissed.length = 0;
  shares.length = 0;
  apiMock.mockClear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("<svg xmlns='http://www.w3.org/2000/svg'/>", { headers: { "content-type": "image/svg+xml" } }));
  vi.stubGlobal("fetch", fetchMock);
  // happy-dom cannot draw an SVG onto a canvas: stand in for the browser
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 0;
      height = 0;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvas as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => cb(new Blob(["png"], { type: "image/png" })));
  URL.createObjectURL = vi.fn(() => "blob:card");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("title on Today", () => {
  it("shows the person's title in the theme's words", async () => {
    renderAt(`/${theme}/today`);
    expect(await screen.findByText(titleText(theme, "hydration.rank3", 43))).toBeTruthy();
  });

  it("invites them to earn one when there is none", async () => {
    title = null;
    renderAt(`/${theme}/today`);
    expect(await screen.findByText(t("today.title.empty"))).toBeTruthy();
    expect(screen.queryByRole("button", { name: t("today.title.share") })).toBeNull();
  });
});

describe("share dialog", () => {
  const open = async () => {
    renderAt(`/${theme}/today`);
    await userEvent.click(await screen.findByRole("button", { name: t("today.title.share") }));
    return screen.getByRole("dialog");
  };
  const cardCalls = () => fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith("/api/share/card"));

  it("draws the card without the habit's name at first, and the name only when ticked", async () => {
    const dialog = await open();
    await within(dialog).findByAltText(t("share.previewAlt"));
    expect(cardCalls().at(-1)).toBe("/api/share/card?type=title&format=story");
    expect(fetchMock.mock.calls[0]![1]).toEqual({ headers: { authorization: "Bearer tok" } });
    await userEvent.click(within(dialog).getByRole("checkbox", { name: t("share.showName") }));
    await waitFor(() => expect(cardCalls().at(-1)).toBe("/api/share/card?type=title&format=story&showName=1"));
    await userEvent.click(within(dialog).getByRole("button", { name: t("share.square") }));
    await waitFor(() => expect(cardCalls().at(-1)).toBe("/api/share/card?type=title&format=square&showName=1"));
  });

  it("downloads the image and records only that a card was shared", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const dialog = await open();
    await within(dialog).findByAltText(t("share.previewAlt"));
    await userEvent.click(within(dialog).getByRole("button", { name: t("share.download") }));
    expect(click).toHaveBeenCalled();
    await waitFor(() => expect(shares).toEqual(["title"]));
    expect(apiMock).toHaveBeenCalledWith("/api/share-events", { method: "POST", body: { cardType: "title" } });
  });

  it("uses the phone's share sheet when there is one, and counts nothing if the sheet is cancelled", async () => {
    const shareFn = vi.fn().mockRejectedValueOnce(new DOMException("cancelled", "AbortError")).mockResolvedValueOnce(undefined);
    Object.assign(navigator, { canShare: () => true, share: shareFn });
    const dialog = await open();
    await within(dialog).findByAltText(t("share.previewAlt"));
    const button = within(dialog).getByRole("button", { name: t("share.share") });
    await userEvent.click(button);
    expect(shares).toEqual([]);
    await userEvent.click(button);
    await waitFor(() => expect(shares).toEqual(["title"]));
    const args = shareFn.mock.calls[1]![0] as { files: File[]; url: string };
    expect(args.files[0]!.type).toBe("image/png");
    expect(args.url).toBe("https://app.example/r/k7m2q9xa");
    Object.assign(navigator, { canShare: undefined, share: undefined });
  });

  it("copies the invite link, and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const dialog = await open();
    await userEvent.click(within(dialog).getByRole("button", { name: t("share.copyLink") }));
    expect(writeText).toHaveBeenCalledWith("https://app.example/r/k7m2q9xa");
    expect(await within(dialog).findByText(t("share.copied"))).toBeTruthy();
  });

  it("says so if the card cannot be made, and closes with Escape", async () => {
    fetchMock.mockResolvedValue(new Response("no", { status: 500 }));
    const dialog = await open();
    expect(await within(dialog).findByText(t("share.error"))).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("promises that cards never contain the journal", async () => {
    const dialog = await open();
    expect(within(dialog).getByText(t("share.privacy"))).toBeTruthy();
  });
});

describe("streak-break card", () => {
  const card = { id: CARD_ID, category: "hydration", lengthDays: 12, brokenOn: "2026-09-28" };

  it("offers the theme's joke about the broken streak, filled in, with a way to start again", async () => {
    breakCard = card;
    renderAt(`/${theme}/today`);
    const dialog = await screen.findByRole("dialog");
    const copy = breakCardCopy(theme);
    const joke = copy.variants[pickVariant(CARD_ID, copy.variants.length)]!.replace("{category}", t("category.hydration")).replace("{length}", "12");
    expect(within(dialog).getByText(joke)).toBeTruthy();
    expect(within(dialog).getByText(copy.name)).toBeTruthy();
    expect(within(dialog).getByText(copy.restart)).toBeTruthy();
    expect(joke).not.toMatch(/[{}]/);
  });

  it("is dismissed for good by starting again, by not now, or by Escape", async () => {
    breakCard = card;
    renderAt(`/${theme}/today`);
    await userEvent.click(await screen.findByRole("button", { name: t("share.startAgain") }));
    await waitFor(() => expect(dismissed).toEqual([CARD_ID]));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes with Escape", async () => {
    breakCard = card;
    renderAt(`/${theme}/today`);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dismissed).toEqual([CARD_ID]));
  });

  it("can be shared as an image from the card itself", async () => {
    breakCard = card;
    renderAt(`/${theme}/today`);
    await userEvent.click(await screen.findByRole("button", { name: t("share.share") }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u) === `/api/share/card?type=break&format=story&card=${CARD_ID}`)).toBe(true));
  });

  it("waits its turn behind an achievement that is being celebrated", async () => {
    breakCard = card;
    unseen = [{ key: "first_entry", family: "entry", unlockedAt: "2026-09-30T10:00:00Z" }];
    renderAt(`/${theme}/today`);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByText(breakCardCopy(theme).name)).toBeNull();
  });

  it("does not appear when there is no broken streak", async () => {
    renderAt(`/${theme}/today`);
    await screen.findByText(titleText(theme, "hydration.rank3", 43));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("referrals in settings", () => {
  it("show the invite link and progress, counts only", async () => {
    renderAt(`/${theme}/settings`);
    const link = (await screen.findByDisplayValue("https://app.example/r/k7m2q9xa")) as HTMLInputElement;
    expect(link.readOnly).toBe(true);
    expect(screen.getByText(translate(null, "settings.referral.confirmed", { n: "2" }))).toBeTruthy();
    expect(screen.getByText(translate(null, "settings.referral.pending", { n: "1" }))).toBeTruthy();
    expect(screen.getByText(translate(null, "settings.referral.next", { n: "1" }))).toBeTruthy();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await userEvent.click(screen.getByRole("button", { name: translate(null, "settings.referral.copy") }));
    expect(writeText).toHaveBeenCalledWith("https://app.example/r/k7m2q9xa");
    expect(await screen.findByText(translate(null, "settings.referral.copied"))).toBeTruthy();
  });
});
