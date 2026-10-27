import { isDateString } from "../../shared/dates";
import { PROMPT_KEYS } from "../../shared/prompt-keys";
import { DomainError } from "../profile/service";

export const MAX_BODY = 50_000;

export function parseBody(value: unknown): string {
  if (typeof value !== "string") throw new DomainError(400, "invalid_body_text");
  if (value.length > MAX_BODY) throw new DomainError(400, "entry_too_long");
  return value;
}

/** A mood is 1 to 5, or null for "not set". */
export function parseMood(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) throw new DomainError(400, "invalid_mood");
  return value as number;
}

export function parsePromptKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !(PROMPT_KEYS as readonly string[]).includes(value)) throw new DomainError(400, "invalid_prompt");
  return value;
}

export function parseEntryDate(value: unknown, today: string): string {
  if (value === null || value === undefined) return today;
  if (!isDateString(value)) throw new DomainError(400, "invalid_date");
  if (value > today) throw new DomainError(400, "date_in_future");
  return value;
}

/** A search query is plain words; anything longer than a sentence is not a search. */
export function parseQuery(value: string | null): string | null {
  const q = (value ?? "").trim();
  if (q === "") return null;
  if (q.length > 200) throw new DomainError(400, "invalid_query");
  return q;
}
