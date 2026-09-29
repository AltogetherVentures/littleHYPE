import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Autosaver, type Draft, type SaveStatus } from "./autosave";

type Entry = { id: string };

function setup(opts: { id?: string | null; initial?: Draft; fail?: () => boolean } = {}) {
  const calls: string[] = [];
  const statuses: SaveStatus[] = [];
  let seq = 0;
  const gate: { release: (() => void) | null } = { release: null };
  const transport = {
    create: vi.fn(async (d: Draft) => {
      calls.push(`create:${d.body}`);
      if (opts.fail?.()) throw new Error("boom");
      return { id: `e${++seq}` } as Entry;
    }),
    update: vi.fn(async (id: string, patch: Partial<Draft>) => {
      calls.push(`update:${id}:${JSON.stringify(patch)}`);
      if (opts.fail?.()) throw new Error("boom");
      return { id };
    }),
  };
  const created = vi.fn();
  const saver = new Autosaver<Entry>({
    transport,
    id: opts.id ?? null,
    initial: opts.initial ?? { body: "", mood: null },
    onStatus: (s) => statuses.push(s),
    onCreated: created,
  });
  return { saver, calls, statuses, transport, created, gate };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("autosave", () => {
  it("waits for a pause in typing, then creates the entry once", async () => {
    const { saver, calls, statuses, created } = setup();
    saver.set({ body: "H", mood: null });
    await vi.advanceTimersByTimeAsync(500);
    saver.set({ body: "Hello", mood: null });
    await vi.advanceTimersByTimeAsync(500);
    expect(calls).toEqual([]); // still typing
    await vi.advanceTimersByTimeAsync(400);
    expect(calls).toEqual(["create:Hello"]);
    expect(created).toHaveBeenCalledWith({ id: "e1" });
    expect(saver.entryId).toBe("e1");
    expect(statuses).toEqual(["unsaved", "saving", "saved"]);
  });

  it("never creates an empty entry", async () => {
    const { saver, calls, statuses } = setup();
    saver.set({ body: "   \n", mood: null });
    await saver.flush();
    expect(calls).toEqual([]);
    expect(saver.hasUnsavedChanges).toBe(false);
    expect(statuses.at(-1)).not.toBe("saved");
  });

  it("creates on a mood alone", async () => {
    const { saver, calls } = setup();
    saver.set({ body: "", mood: 4 });
    await saver.flush();
    expect(calls).toEqual(["create:"]);
  });

  it("sends only what changed on later saves", async () => {
    const { saver, calls } = setup({ id: "abc", initial: { body: "one", mood: 3 } });
    saver.set({ body: "one two", mood: 3 });
    await saver.flush();
    saver.set({ body: "one two", mood: null });
    await saver.flush();
    expect(calls).toEqual(['update:abc:{"body":"one two"}', 'update:abc:{"mood":null}']);
  });

  it("does not save when text returns to what is already saved", async () => {
    const { saver, calls } = setup({ id: "abc", initial: { body: "one", mood: null } });
    saver.set({ body: "one!", mood: null });
    saver.set({ body: "one", mood: null });
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toEqual([]);
  });

  it("keeps saves in order: the create finishes before the first update is sent", async () => {
    const { saver, calls, transport } = setup();
    let release!: () => void;
    transport.create.mockImplementationOnce(
      (d) =>
        new Promise((resolve) => {
          calls.push(`create:${d.body}`);
          release = () => resolve({ id: "e1" });
        }),
    );
    saver.set({ body: "first", mood: null });
    const flushing = saver.flush();
    saver.set({ body: "first and more", mood: null });
    void saver.flush(); // blur while the create is still in flight
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual(["create:first"]);
    release();
    await flushing;
    expect(calls).toEqual(["create:first", 'update:e1:{"body":"first and more"}']);
  });

  it("keeps the text and retries with backoff after a failure, then succeeds", async () => {
    let failing = 2;
    const { saver, calls, statuses } = setup({ fail: () => failing-- > 0 });
    saver.set({ body: "precious", mood: null });
    await saver.flush();
    expect(statuses.at(-1)).toBe("error");
    expect(saver.hasUnsavedChanges).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(statuses.at(-1)).toBe("error");
    await vi.advanceTimersByTimeAsync(5000);
    expect(statuses.at(-1)).toBe("saved");
    expect(calls).toEqual(["create:precious", "create:precious", "create:precious"]);
    expect(saver.hasUnsavedChanges).toBe(false);
  });

  it("stops retrying after the last backoff but recovers on the next edit", async () => {
    let failing = true;
    const { saver, calls, statuses } = setup({ fail: () => failing });
    saver.set({ body: "x", mood: null });
    await saver.flush();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(4); // first attempt + three retries
    expect(statuses.at(-1)).toBe("error");
    failing = false;
    saver.set({ body: "x y", mood: null });
    await vi.advanceTimersByTimeAsync(1000);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("does nothing further once stopped, so a deleted entry is never recreated", async () => {
    const { saver, calls } = setup({ id: "abc", initial: { body: "a", mood: null } });
    saver.set({ body: "ab", mood: null });
    saver.stop();
    await saver.flush();
    await vi.advanceTimersByTimeAsync(5000);
    saver.set({ body: "abc", mood: null });
    expect(calls).toEqual([]);
    expect(saver.hasUnsavedChanges).toBe(false);
  });

  it("flush with nothing to send is a no-op", async () => {
    const { saver, calls } = setup({ id: "abc", initial: { body: "a", mood: null } });
    await saver.flush();
    expect(calls).toEqual([]);
  });
});
