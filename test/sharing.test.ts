import { describe, expect, it } from "vitest";
import { HABIT_CATEGORIES } from "../shared/categories";
import { REFERRAL_CODE_ALPHABET, REFERRAL_CODE_PATTERN, breakLengthDays, pickVariant, qualifiesForBreakCard, strongestHabit, titleFor } from "../shared/sharing";

describe("streak-break cards", () => {
  it("are earned by seven days or more, and two weeks or more for weekly habits", () => {
    expect(qualifiesForBreakCard("days", 6)).toBe(false);
    expect(qualifiesForBreakCard("days", 7)).toBe(true);
    expect(qualifiesForBreakCard("weeks", 1)).toBe(false);
    expect(qualifiesForBreakCard("weeks", 2)).toBe(true);
    expect(breakLengthDays("weeks", 3)).toBe(21);
    expect(breakLengthDays("days", 12)).toBe(12);
  });

  it("choose a joke deterministically, and use all of them across cards", () => {
    expect(pickVariant("card-1", 4)).toBe(pickVariant("card-1", 4));
    const used = new Set(Array.from({ length: 200 }, (_, i) => pickVariant(`card-${i}`, 4)));
    expect([...used].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe("titles", () => {
  it("come from the habit with the longest current streak, by category", () => {
    const best = strongestHabit([
      { category: "reading" as const, streakDays: 4 },
      { category: "hydration" as const, streakDays: 31 },
      { category: "sleep" as const, streakDays: 12 },
    ]);
    expect(best).toEqual({ category: "hydration", streakDays: 31 });
    expect(titleFor(best!)).toEqual({ key: "hydration.rank3", rank: 3, streakDays: 31 });
  });

  it("need a streak, and rank up at 1, 7, 30 and 100 days", () => {
    expect(strongestHabit([])).toBeNull();
    expect(strongestHabit([{ category: "diet" as const, streakDays: 0 }])).toBeNull();
    const rank = (d: number) => titleFor({ category: "exercise", streakDays: d })?.rank ?? null;
    expect([0, 1, 6, 7, 29, 30, 99, 100, 400].map(rank)).toEqual([null, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("have a key for every category", () => {
    for (const c of HABIT_CATEGORIES) expect(titleFor({ category: c, streakDays: 8 })!.key).toBe(`${c}.rank2`);
  });
});

describe("referral codes", () => {
  it("use an alphabet with no look-alike characters that matches the database check", () => {
    expect(REFERRAL_CODE_ALPHABET).not.toMatch(/[io01]/);
    expect(REFERRAL_CODE_ALPHABET).toHaveLength(31);
    for (const ch of REFERRAL_CODE_ALPHABET) expect(REFERRAL_CODE_PATTERN.test(ch.repeat(8))).toBe(true);
    for (const bad of ["abcdefg", "abcdefghi", "ABCDEFGH", "abcdefg0", "abcdefgi", "abcdefg-"]) expect(REFERRAL_CODE_PATTERN.test(bad), bad).toBe(false);
  });
});
