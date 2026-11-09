import { isHabitCategory, type HabitCategory } from "../../shared/categories";
import type { Schedule } from "../../shared/streaks";
import { DomainError } from "../profile/service";

/** Parses a schedule from request JSON, rejecting anything not exactly one of the three shapes. */
export function parseSchedule(value: unknown): Schedule {
  if (!value || typeof value !== "object") throw new DomainError(400, "invalid_schedule");
  const s = value as Record<string, unknown>;
  if (s.type === "daily") return { type: "daily" };
  if (s.type === "weekdays") {
    const days = s.days;
    if (!Array.isArray(days) || days.length < 1 || days.length > 7) throw new DomainError(400, "invalid_schedule");
    const unique = [...new Set(days)];
    if (!unique.every((d) => Number.isInteger(d) && (d as number) >= 1 && (d as number) <= 7)) throw new DomainError(400, "invalid_schedule");
    return { type: "weekdays", days: (unique as number[]).sort((a, b) => a - b) };
  }
  if (s.type === "weekly") {
    const target = s.target;
    if (!Number.isInteger(target) || (target as number) < 1 || (target as number) > 7) throw new DomainError(400, "invalid_schedule");
    return { type: "weekly", target: target as number };
  }
  throw new DomainError(400, "invalid_schedule");
}

export function parseName(value: unknown): string {
  if (typeof value !== "string") throw new DomainError(400, "invalid_name");
  const name = value.trim();
  if (name.length < 1 || name.length > 80) throw new DomainError(400, "invalid_name");
  return name;
}

export function parseDescription(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 300) throw new DomainError(400, "invalid_description");
  return value.trim() || null;
}

export function parseCategory(value: unknown): HabitCategory {
  if (value === undefined || value === null) return "other";
  if (!isHabitCategory(value)) throw new DomainError(400, "invalid_category");
  return value;
}
