import { ACHIEVEMENTS, type AchievementKey } from "./achievement-defs";
import { familyOf } from "./achievements";

/**
 * Where an achievement sits within its family (0 for the first rung, 1 for the next, ...),
 * so the emblem can grow with the milestone instead of repeating one icon. Derived from
 * the rule order in achievement-defs, never stored.
 */
export function tierOf(key: AchievementKey): number {
  const family = familyOf(key);
  return ACHIEVEMENTS.filter((a) => familyOf(a.key) === family).findIndex((a) => a.key === key);
}

/** What one more unit of progress is, for "3 more days" style copy. */
export type ProgressUnit = "days" | "count";
export function progressUnitOf(key: AchievementKey): ProgressUnit {
  const rule = ACHIEVEMENTS.find((a) => a.key === key)!.rule;
  return rule.kind === "streak" || rule.kind === "entry_days" ? "days" : "count";
}
