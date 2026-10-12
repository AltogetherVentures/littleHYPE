import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "../shared/achievement-defs";
import { EMPTY_STATS, earnedKeys, familyOf, progressFor, type AchievementStats } from "../shared/achievements";

const stats = (over: Partial<AchievementStats>): AchievementStats => ({ ...EMPTY_STATS, ...over });
const rule = (key: string) => ACHIEVEMENTS.find((a) => a.key === key)!.rule;

describe("achievement rules", () => {
  it("earns nothing from nothing", () => {
    expect(earnedKeys(EMPTY_STATS)).toEqual([]);
  });

  it("earns first_entry and first_checkin from one of each", () => {
    expect(earnedKeys(stats({ entries: 1 }))).toEqual(["first_entry"]);
    expect(earnedKeys(stats({ checkins: 1 }))).toEqual(["first_checkin"]);
  });

  it("earns streak achievements at exactly their threshold, and not a day before", () => {
    for (const days of [3, 7, 14, 30, 60, 100]) {
      expect(earnedKeys(stats({ bestStreakDays: days - 1 }))).not.toContain(`streak_${days}`);
      expect(earnedKeys(stats({ bestStreakDays: days }))).toContain(`streak_${days}`);
    }
    // a long streak earns every lower one too
    expect(earnedKeys(stats({ bestStreakDays: 100 })).filter((k) => k.startsWith("streak_"))).toHaveLength(6);
  });

  it("counts writing days, not entries: ten entries in one day is one day", () => {
    expect(earnedKeys(stats({ entries: 10, entryDays: 1 }))).not.toContain("entries_7");
    expect(earnedKeys(stats({ entries: 7, entryDays: 7 }))).toContain("entries_7");
    expect(earnedKeys(stats({ entries: 30, entryDays: 30 }))).toContain("entries_30");
    expect(earnedKeys(stats({ entries: 100, entryDays: 99 }))).not.toContain("entries_100");
    expect(earnedKeys(stats({ entries: 100, entryDays: 100 }))).toContain("entries_100");
  });

  it("counts answered prompts", () => {
    expect(earnedKeys(stats({ promptsAnswered: 9 }))).not.toContain("prompts_10");
    expect(earnedKeys(stats({ promptsAnswered: 10 }))).toContain("prompts_10");
    expect(earnedKeys(stats({ promptsAnswered: 50 }))).toContain("prompts_50");
  });

  it("needs three habits at seven days at the same time", () => {
    expect(earnedKeys(stats({ currentStreakDays: [7, 7] }))).not.toContain("habits_3");
    expect(earnedKeys(stats({ currentStreakDays: [7, 7, 6] }))).not.toContain("habits_3");
    expect(earnedKeys(stats({ currentStreakDays: [7, 20, 8, 1] }))).toContain("habits_3");
  });

  it("reports progress capped at the target, so a bar never overflows", () => {
    expect(progressFor(rule("streak_30"), stats({ bestStreakDays: 12 }))).toEqual({ current: 12, target: 30 });
    expect(progressFor(rule("streak_30"), stats({ bestStreakDays: 400 }))).toEqual({ current: 30, target: 30 });
    expect(progressFor(rule("habits_3"), stats({ currentStreakDays: [9, 3] }))).toEqual({ current: 1, target: 3 });
    expect(progressFor(rule("first_entry"), EMPTY_STATS)).toEqual({ current: 0, target: 1 });
  });

  it("never rewards volume: no rule reads a word or character count", () => {
    for (const a of ACHIEVEMENTS) expect(JSON.stringify(a.rule)).not.toMatch(/word|char|length|volume/i);
  });

  it("gives every achievement an emblem family", () => {
    for (const a of ACHIEVEMENTS) expect(familyOf(a.key)).toBeTruthy();
  });
});
