import type { PromptKey } from "@shared/prompt-keys";
import { PROMPT_KEYS } from "@shared/prompt-keys";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MoodPicker } from "../components/MoodPicker";
import { Autosaver, type SaveStatus } from "../lib/autosave";
import { dayLabel } from "../lib/calendar";
import { promptText } from "../lib/content";
import { applyFormat, type FormatKind } from "../lib/format";
import { useDeleteEntry, useEntry, useEntryTransport, type EntryView } from "../lib/journal";
import { Markdown } from "../lib/markdown";
import type { Me } from "../lib/me";
import { useT, type StringKey } from "../lib/strings";

const TOOLS: { kind: FormatKind; label: StringKey; glyph: string }[] = [
  { kind: "bold", label: "journal.editor.bold", glyph: "B" },
  { kind: "italic", label: "journal.editor.italic", glyph: "I" },
  { kind: "heading", label: "journal.editor.heading", glyph: "H" },
  { kind: "list", label: "journal.editor.list", glyph: "•" },
  { kind: "quote", label: "journal.editor.quote", glyph: "“" },
  { kind: "link", label: "journal.editor.link", glyph: "↗" },
];

/**
 * /<theme>/journal/new and /<theme>/journal/<id>. Both render the same <Editor> at the
 * same place in the tree, so when the first autosave creates the entry and the address
 * changes from "new" to its id, the editor (and the person's cursor) is not remounted.
 */
export function EntryPage({ me }: { me: Me }) {
  const t = useT();
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const query = useEntry(isNew ? null : id);

  if (!isNew && query.isPending) return <p className="status">{t("common.loading")}</p>;
  if (!isNew && (query.isError || !query.data)) {
    return (
      <div className="entry-page">
        <p role="alert">{t("journal.error.load")}</p>
        <Link to={`/${me.theme}/journal`}>{t("journal.editor.back")}</Link>
      </div>
    );
  }
  return <Editor key="editor" me={me} initial={isNew ? null : query.data!.entry} />;
}

function Editor({ me, initial }: { me: Me; initial: EntryView | null }) {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedPrompt = params.get("prompt");
  const promptKey = (initial?.promptKey ?? (requestedPrompt && (PROMPT_KEYS as readonly string[]).includes(requestedPrompt) ? requestedPrompt : null)) as PromptKey | null;
  const requestedDate = params.get("date");

  const [body, setBody] = useState(initial?.body ?? "");
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const [status, setStatus] = useState<SaveStatus>(initial ? "saved" : "idle");
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(initial?.id ?? null);
  const [date, setDate] = useState(initial?.date ?? (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : null));
  const text = useRef<HTMLTextAreaElement>(null);
  const remove = useDeleteEntry();

  const transport = useEntryTransport({ ...(requestedDate && !initial ? { date: requestedDate } : {}), promptKey });
  const transportRef = useRef(transport);
  transportRef.current = transport;

  const saver = useMemo(
    () =>
      new Autosaver<EntryView>({
        transport: { create: (d) => transportRef.current.create(d), update: (i, p) => transportRef.current.update(i, p) },
        id: initial?.id ?? null,
        initial: { body: initial?.body ?? "", mood: initial?.mood ?? null },
        onStatus: setStatus,
        onCreated: (entry) => {
          setEntryId(entry.id);
          setDate(entry.date);
          navigate(`/${me.theme}/journal/${entry.id}`, { replace: true });
        },
      }),
    // One saver per mounted editor; it is deliberately not rebuilt when the entry is created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Leaving the editor (or the tab) sends whatever is outstanding; an unsaved edit also
  // asks the browser to confirm before the page is closed.
  useEffect(() => {
    const flush = () => void saver.flush();
    const hidden = () => document.visibilityState === "hidden" && flush();
    const guard = (e: BeforeUnloadEvent) => {
      if (saver.hasUnsavedChanges) {
        flush();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", guard);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", guard);
      flush();
    };
  }, [saver]);

  useEffect(() => {
    if (!initial) text.current?.focus();
  }, [initial]);

  // Grow the box with the text so the page scrolls, not a small inner box (a phone keyboard
  // leaves little room for a scrolling textarea).
  useEffect(() => {
    const el = text.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 220)}px`;
  }, [body, previewing]);

  const edit = (next: string, nextMood = mood) => {
    setBody(next);
    saver.set({ body: next, mood: nextMood });
  };

  const format = (kind: FormatKind) => {
    const el = text.current;
    if (!el) return;
    const r = applyFormat(el.value, el.selectionStart, el.selectionEnd, kind);
    edit(r.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.start, r.end);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    if (key.length !== 1) return;
    const shortcut = { b: () => format("bold"), i: () => format("italic"), s: () => void saver.flush() }[key];
    if (!shortcut) return;
    e.preventDefault();
    shortcut();
  };

  const back = `/${me.theme}/journal`;
  const statusKey = `journal.save.${status}` as StringKey;

  return (
    <div className="entry-page">
      <div className="entry-top">
        <Link className="back-link" to={back} onClick={() => void saver.flush()}>
          ← {t("journal.editor.back")}
        </Link>
        <p className={`save-state save-${status}`} role="status" aria-live="polite">
          {t(statusKey)}
        </p>
      </div>

      <header className="entry-head">
        <h1>{date ? dayLabel(date) : t("journal.editor.title")}</h1>
        {promptKey && (
          <p className="entry-prompt">
            <span className="entry-prompt-label">{t("journal.editor.answering")}</span> {promptText(me.theme, promptKey)}
          </p>
        )}
      </header>

      <div className="editor-bar">
        <div className="editor-tools" role="toolbar" aria-label={t("journal.editor.toolbar")}>
          {TOOLS.map((tool) => (
            <button key={tool.kind} type="button" className="tool" title={t(tool.label)} aria-label={t(tool.label)} disabled={previewing} onClick={() => format(tool.kind)}>
              <span aria-hidden="true">{tool.glyph}</span>
            </button>
          ))}
        </div>
        <div className="segmented" role="group">
          <button type="button" className="segment" aria-pressed={!previewing} onClick={() => setPreviewing(false)}>
            {t("journal.editor.write")}
          </button>
          <button type="button" className="segment" aria-pressed={previewing} onClick={() => { setPreviewing(true); void saver.flush(); }}>
            {t("journal.editor.preview")}
          </button>
        </div>
      </div>

      {previewing ? (
        <div className="editor-preview">{body.trim() ? <Markdown text={body} /> : <p className="empty-note">{t("journal.editor.previewEmpty")}</p>}</div>
      ) : (
        <textarea
          ref={text}
          className="editor-text"
          aria-label={t("journal.editor.label")}
          placeholder={t("journal.editor.placeholder")}
          value={body}
          spellCheck
          onChange={(e) => edit(e.target.value)}
          onBlur={() => void saver.flush()}
          onKeyDown={onKeyDown}
        />
      )}

      <MoodPicker
        value={mood}
        onChange={(m) => {
          setMood(m);
          saver.set({ body, mood: m });
          void saver.flush();
        }}
      />

      {entryId && (
        <section className="danger-zone">
          {!confirming ? (
            <button type="button" className="link-button" onClick={() => setConfirming(true)}>
              {t("delete.entry.action")}
            </button>
          ) : (
            <div className="confirm" role="alertdialog" aria-labelledby="del-h">
              <h2 id="del-h">{t("delete.entry.heading")}</h2>
              <p>{t("delete.entry.body")}</p>
              <div className="actions">
                <button
                  type="button"
                  className="button danger-button"
                  disabled={remove.isPending}
                  onClick={() => {
                    saver.stop();
                    remove.mutate(entryId, { onSuccess: () => navigate(back, { replace: true }), onError: () => setConfirming(false) });
                  }}
                >
                  {t("delete.entry.confirm")}
                </button>
                <button type="button" className="link-button" onClick={() => setConfirming(false)}>
                  {t("delete.entry.cancel")}
                </button>
              </div>
              {remove.isError && <p role="alert">{t("common.error")}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
