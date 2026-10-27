import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_KEYS } from "../shared/achievement-defs";
import { progressUnitOf, tierOf } from "../shared/achievement-tiers";
import { familyOf } from "../shared/achievements";

describe("achievement tiers", () => {
  it("numbers each family's rungs from zero, in rule order", () => {
    expect(tierOf("streak_3")).toBe(0);
    expect(tierOf("streak_7")).toBe(1);
    expect(tierOf("streak_100")).toBe(5);
    expect(tierOf("entries_30")).toBe(1);
    expect(tierOf("first_entry")).toBe(0);
  });
  it("gives every key a tier its family really has, so no emblem is skipped or repeated", () => {
    for (const key of ACHIEVEMENT_KEYS) {
      const siblings = ACHIEVEMENT_KEYS.filter((k) => familyOf(k) === familyOf(key));
      expect(tierOf(key)).toBeGreaterThanOrEqual(0);
      expect(tierOf(key)).toBeLessThan(siblings.length);
      expect(siblings.filter((k) => tierOf(k) === tierOf(key))).toEqual([key]);
    }
  });
  it("knows which rules count days and which count things", () => {
    expect(progressUnitOf("streak_14")).toBe("days");
    expect(progressUnitOf("entries_7")).toBe("days");
    expect(progressUnitOf("prompts_10")).toBe("count");
    expect(progressUnitOf("habits_3")).toBe("count");
  });
});
