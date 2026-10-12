/**
 * Autosave for the journal editor (JN-4). The person never presses "save": edits are sent
 * shortly after they pause, when the editor loses focus, and when they leave. The engine
 * is plain TypeScript so its rules can be tested without a browser:
 *
 * - Nothing is created until there is something to keep: opening the editor and closing it
 *   leaves no empty entry behind.
 * - Saves are strictly one at a time, so the create always finishes before the first
 *   update, and edits made while a save is in flight are sent right after it.
 * - A failed save is retried with backoff and never discards the text; the status says so.
 */
export interface Draft {
  body: string;
  mood: number | null;
}

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export interface SaveTransport<E> {
  create(draft: Draft): Promise<E & { id: string }>;
  update(id: string, patch: Partial<Draft>): Promise<E>;
}

export interface AutosaverOptions<E> {
  transport: SaveTransport<E>;
  /** The saved entry's id, or null for a brand-new entry. */
  id: string | null;
  initial: Draft;
  delay?: number;
  retryDelays?: number[];
  onStatus: (status: SaveStatus) => void;
  onCreated?: (entry: E & { id: string }) => void;
  onSaved?: (entry: E) => void;
}

const sameDraft = (a: Draft, b: Draft) => a.body === b.body && a.mood === b.mood;
const isEmpty = (d: Draft) => d.body.trim() === "" && d.mood === null;

export class Autosaver<E> {
  private id: string | null;
  private saved: Draft;
  private latest: Draft;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private failures = 0;
  private stopped = false;
  private status: SaveStatus;
  private readonly delay: number;
  private readonly retryDelays: number[];

  constructor(private readonly opts: AutosaverOptions<E>) {
    this.id = opts.id;
    this.saved = { ...opts.initial };
    this.latest = { ...opts.initial };
    this.delay = opts.delay ?? 800;
    this.retryDelays = opts.retryDelays ?? [2000, 5000, 15000];
    this.status = opts.id ? "saved" : "idle";
  }

  get entryId(): string | null {
    return this.id;
  }

  get hasUnsavedChanges(): boolean {
    return !this.stopped && !sameDraft(this.latest, this.saved) && !(this.id === null && isEmpty(this.latest));
  }

  /** Record an edit and schedule a save. */
  set(draft: Draft): void {
    if (this.stopped) return;
    this.latest = { ...draft };
    this.clearRetry();
    this.failures = 0;
    if (this.timer) clearTimeout(this.timer);
    if (this.hasUnsavedChanges) {
      this.emit("unsaved");
      this.timer = setTimeout(() => void this.flush(), this.delay);
    } else {
      this.timer = null;
      if (!this.running) this.emit(this.id ? "saved" : "idle");
    }
  }

  /** Send anything outstanding now (blur, leaving the page). Resolves when the queue is empty. */
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.clearRetry();
    if (this.stopped) return this.running ?? Promise.resolve();
    if (!this.running) this.running = this.drain().finally(() => (this.running = null));
    return this.running;
  }

  /** Stop for good (the entry was deleted): no further saves. */
  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.clearRetry();
    this.timer = null;
  }

  private async drain(): Promise<void> {
    while (!this.stopped && this.hasUnsavedChanges) {
      const sending = { ...this.latest };
      this.emit("saving");
      try {
        if (this.id === null) {
          const entry = await this.opts.transport.create(sending);
          this.id = entry.id;
          this.saved = sending;
          this.opts.onCreated?.(entry);
        } else {
          const patch: Partial<Draft> = {};
          if (sending.body !== this.saved.body) patch.body = sending.body;
          if (sending.mood !== this.saved.mood) patch.mood = sending.mood;
          const entry = await this.opts.transport.update(this.id, patch);
          this.saved = sending;
          this.opts.onSaved?.(entry);
        }
        this.failures = 0;
      } catch {
        if (this.stopped) return;
        this.emit("error");
        const wait = this.retryDelays[this.failures];
        this.failures++;
        if (wait !== undefined) this.retryTimer = setTimeout(() => void this.flush(), wait);
        return;
      }
    }
    if (!this.stopped) this.emit(this.id ? "saved" : "idle");
  }

  private clearRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private emit(status: SaveStatus) {
    if (status === this.status) return;
    this.status = status;
    this.opts.onStatus(status);
  }
}
