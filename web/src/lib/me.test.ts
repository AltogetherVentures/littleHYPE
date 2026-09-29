import { describe, expect, it } from "vitest";
import { homePathFor } from "./me";

describe("homePathFor", () => {
  it("sends unpaid users to the paywall", () => {
    expect(homePathFor({ theme: null, paid: false })).toBe("/paywall");
  });
  it("sends paid users with no theme to onboarding", () => {
    expect(homePathFor({ theme: null, paid: true })).toBe("/onboarding");
  });
  it("sends onboarded users to their own Today", () => {
    expect(homePathFor({ theme: "abc", paid: true })).toBe("/abc/today");
  });
});
