import { addDays, dayNum } from "./dates";
import { PROMPT_KEYS, type PromptKey } from "./prompt-keys";

/**
 * Choosing the prompt of the day (PR-3 to PR-5). Pure, so the Worker and its tests agree.
 * The same user on the same day with the same history always gets the same prompt, so a
 * reload never changes it; a skip asks for the next `seq`, which lands somewhere else.
 */
export const SKIPS_PER_DAY = 3;
export const MAX_SEQ = SKIPS_PER_DAY + 1;
export const NO_REPEAT_DAYS = 30;

export interface ShownPrompt {
  day: string;
  key: string;
}

/** 32-bit FNV-1a: tiny, stable across runtimes, and good enough to spread a choice. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function choosePrompt(input: { userId: string; day: string; seq: number; history: ShownPrompt[] }): PromptKey {
  const { userId, day, seq, history } = input;
  const today = dayNum(day);
  const lastShown = new Map<string, number>();
  for (const h of history) {
    const n = dayNum(h.day);
    if (n > today) continue; // never let a later day's choice influence an earlier one
    lastShown.set(h.key, Math.max(lastShown.get(h.key) ?? -Infinity, n));
  }
  const fresh = PROMPT_KEYS.filter((k) => {
    const last = lastShown.get(k);
    return last === undefined || today - last >= NO_REPEAT_DAYS;
  });
  // Every prompt used inside the window (a heavy skipper on a small library): fall back to
  // the ones shown longest ago rather than repeat the most recent.
  const pool = fresh.length >= 2 ? fresh : [...PROMPT_KEYS].sort((a, b) => (lastShown.get(a) ?? -Infinity) - (lastShown.get(b) ?? -Infinity)).slice(0, 12);
  return pool[hash32(`${userId}|${day}|${seq}`) % pool.length]!;
}

/** Days of history worth loading to apply the no-repeat rule for `day`. */
export const historySince = (day: string) => addDays(day, -NO_REPEAT_DAYS);
