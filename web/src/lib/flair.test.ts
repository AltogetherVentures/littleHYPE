import { describe, expect, it } from "vitest";
import { daysSince, flairFor, longDate, moonPhase, stardate } from "./flair";

describe("flair", () => {
  it("counts the sign-up day as day 1 and ticks over at the user's midnight, not after 24 hours", () => {
    const start = "2026-09-28T23:58:00.000Z";
    expect(daysSince(start, new Date("2026-09-28T23:59:00.000Z"))).toBe(1);
    expect(daysSince(start, new Date("2026-09-29T00:01:00.000Z"))).toBe(2); // three minutes later, new UTC day
    expect(daysSince(start, new Date("2026-09-29T23:57:00.000Z"))).toBe(2); // nearly 24h later, same day
    expect(daysSince(start, new Date("2026-11-14T00:00:00.000Z"))).toBe(48);
  });

  it("uses the user's timezone for the day boundary", () => {
    const start = "2026-09-28T23:58:00.000Z"; // 08:58 on 29 Sept in Tokyo, 19:58 on 28 Sept in New York
    const now = new Date("2026-09-29T02:00:00.000Z"); // 11:00 on the 29th in Tokyo, 22:00 on the 28th in New York
    expect(daysSince(start, now, "Asia/Tokyo")).toBe(1);
    expect(daysSince(start, now, "America/New_York")).toBe(1);
    expect(daysSince(start, new Date("2026-09-29T05:00:00.000Z"), "America/New_York")).toBe(2); // 01:00 on the 29th
  });

  it("never returns less than 1, even for a bad or future date", () => {
    expect(daysSince("not a date")).toBe(1);
    expect(daysSince("2999-01-01T00:00:00.000Z")).toBe(1);
  });

  it("formats a stardate as year.day-of-year", () => {
    expect(stardate(new Date("2026-01-01T12:00:00Z"))).toBe("2026.001");
    expect(stardate(new Date("2026-09-29T12:00:00Z"))).toBe("2026.272");
    expect(stardate(new Date("2024-12-31T12:00:00Z"))).toBe("2024.366");
  });

  it("finds sensible moon phases", () => {
    expect(moonPhase(new Date("2000-01-06T18:14:00Z"))).toBe("New moon");
    expect(moonPhase(new Date("2026-01-03T10:03:00Z"))).toBe("Full moon");
    expect(moonPhase(new Date("2026-02-17T12:01:00Z"))).toBe("New moon");
  });

  it("formats the date in the user's timezone, not the server's", () => {
    const instant = new Date("2026-09-29T23:30:00Z");
    expect(longDate(instant, "UTC")).toBe("Tuesday 29 September");
    expect(longDate(instant, "Pacific/Auckland")).toBe("Wednesday 30 September");
  });

  it("falls back to UTC for an unknown timezone", () => {
    expect(longDate(new Date("2026-09-29T12:00:00Z"), "Nowhere/Land")).toBe("Tuesday 29 September");
  });

  it("bundles everything as strings for interpolation", () => {
    const f = flairFor("2026-09-28T00:00:00Z", "UTC", new Date("2026-09-29T12:00:00Z"));
    expect(f).toEqual({ date: "Tuesday 29 September", day: "2", stardate: "2026.272", moon: expect.any(String) });
  });
});
