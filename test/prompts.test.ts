import { describe, expect, it } from "vitest";
import { addDays } from "../shared/dates";
import { PROMPT_KEYS } from "../shared/prompt-keys";
import { MAX_SEQ, NO_REPEAT_DAYS, choosePrompt, hash32, type ShownPrompt } from "../shared/prompts";

describe("choosePrompt", () => {
  it("is deterministic for the same user, day and history", () => {
    const a = choosePrompt({ userId: "u1", day: "2026-09-30", seq: 1, history: [] });
    for (let i = 0; i < 5; i++) expect(choosePrompt({ userId: "u1", day: "2026-09-30", seq: 1, history: [] })).toBe(a);
  });

  it("varies between users and between days", () => {
    const keys = new Set<string>();
    for (let u = 0; u < 40; u++) keys.add(choosePrompt({ userId: `user_${u}`, day: "2026-09-30", seq: 1, history: [] }));
    expect(keys.size).toBeGreaterThan(20);
    const days = new Set<string>();
    for (let d = 0; d < 40; d++) days.add(choosePrompt({ userId: "u1", day: addDays("2026-09-01", d), seq: 1, history: [] }));
    expect(days.size).toBeGreaterThan(20);
  });

  it("gives a skip a different prompt from the ones already shown that day", () => {
    const history: ShownPrompt[] = [];
    const seen: string[] = [];
    for (let seq = 1; seq <= MAX_SEQ; seq++) {
      const key = choosePrompt({ userId: "u1", day: "2026-09-30", seq, history });
      expect(seen).not.toContain(key);
      seen.push(key);
      history.push({ day: "2026-09-30", key });
    }
  });

  it("never repeats a prompt within 30 days for someone who skips now and then", () => {
    const history: ShownPrompt[] = [];
    const shownOn = new Map<string, string>();
    for (let d = 0; d < 150; d++) {
      const day = addDays("2026-01-01", d);
      // a skip every third day: about 40 prompts inside any 30-day window, out of 60
      for (let seq = 1; seq <= (d % 3 === 0 ? 2 : 1); seq++) {
        const key = choosePrompt({ userId: "skipper", day, seq, history });
        const previous = shownOn.get(key);
        if (previous) expect((Date.parse(day) - Date.parse(previous)) / 86_400_000).toBeGreaterThanOrEqual(NO_REPEAT_DAYS);
        shownOn.set(key, day);
        history.push({ day, key });
      }
    }
  });

  it("with a normal one prompt a day, no repeat inside 30 days either", () => {
    const history: ShownPrompt[] = [];
    const last = new Map<string, number>();
    for (let d = 0; d < 200; d++) {
      const day = addDays("2026-01-01", d);
      const key = choosePrompt({ userId: "u1", day, seq: 1, history });
      if (last.has(key)) expect(d - last.get(key)!).toBeGreaterThanOrEqual(NO_REPEAT_DAYS);
      last.set(key, d);
      history.push({ day, key });
    }
  });

  it("degrades gracefully, without repeating the most recent, when the window is exhausted", () => {
    const history: ShownPrompt[] = PROMPT_KEYS.map((key, i) => ({ day: addDays("2026-09-30", -(i % 5)), key }));
    const key = choosePrompt({ userId: "u1", day: "2026-09-30", seq: 1, history });
    expect(PROMPT_KEYS).toContain(key);
    const recent = new Set(history.filter((h) => h.day === "2026-09-30").map((h) => h.key));
    expect(recent.has(key)).toBe(false);
  });

  it("ignores history from later days and picks only real prompt keys", () => {
    const future: ShownPrompt[] = PROMPT_KEYS.map((key) => ({ day: "2026-12-01", key }));
    expect(choosePrompt({ userId: "u1", day: "2026-09-30", seq: 1, history: future })).toBe(choosePrompt({ userId: "u1", day: "2026-09-30", seq: 1, history: [] }));
    for (let i = 0; i < 100; i++) expect(PROMPT_KEYS).toContain(choosePrompt({ userId: `u${i}`, day: "2026-09-30", seq: 1, history: [] }));
  });

  it("hashes stably (fixed values, so a change here is a change to everyone's prompts)", () => {
    expect(hash32("")).toBe(0x811c9dc5);
    expect(hash32("a")).toBe(0xe40c292c);
    expect(hash32("u1|2026-09-30|1")).toBe(hash32("u1|2026-09-30|1"));
  });
});
