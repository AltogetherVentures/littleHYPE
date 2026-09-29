/**
 * Formatting buttons for the journal editor: pure text transforms over a selection, so the
 * textarea stays the single source of truth (and the result is plain Markdown the person
 * could have typed).
 */
export type FormatKind = "bold" | "italic" | "heading" | "list" | "quote" | "link";

export interface Edit {
  text: string;
  start: number;
  end: number;
}

const WRAP: Record<"bold" | "italic", string> = { bold: "**", italic: "*" };
const PREFIX: Record<"heading" | "list" | "quote", string> = { heading: "## ", list: "- ", quote: "> " };

export function applyFormat(text: string, start: number, end: number, kind: FormatKind): Edit {
  if (kind === "bold" || kind === "italic") {
    const mark = WRAP[kind];
    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);
    // Already wrapped just outside the selection: take the markers off.
    if (before.endsWith(mark) && after.startsWith(mark) && !(kind === "italic" && (before.endsWith("**") || after.startsWith("**")))) {
      return { text: before.slice(0, -mark.length) + selected + after.slice(mark.length), start: start - mark.length, end: end - mark.length };
    }
    return { text: `${before}${mark}${selected}${mark}${after}`, start: start + mark.length, end: end + mark.length };
  }

  if (kind === "link") {
    const selected = text.slice(start, end) || "link text";
    const url = "https://";
    const inserted = `[${selected}](${url})`;
    const urlStart = start + selected.length + 3;
    return { text: text.slice(0, start) + inserted + text.slice(end), start: urlStart, end: urlStart + url.length };
  }

  const prefix = PREFIX[kind];
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = text.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const allPrefixed = lines.every((l) => l.startsWith(prefix));
  const changed = lines.map((l) => (allPrefixed ? l.slice(prefix.length) : l.startsWith(prefix) ? l : prefix + l));
  const block = changed.join("\n");
  const delta = block.length - (lineEnd - lineStart);
  return { text: text.slice(0, lineStart) + block + text.slice(lineEnd), start: Math.max(lineStart, start + (allPrefixed ? -prefix.length : prefix.length)), end: end + delta };
}

/** A one-line preview of an entry with the Markdown furniture taken off. */
export function plainExcerpt(excerpt: string): string {
  return excerpt
    .split("\n")
    .map((line) => {
      const heading = /^#{1,3} +/.test(line);
      const text = line
        .replace(/^(#{1,3} +|> ?|[-*] +|\d{1,3}[.)] +)/, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\*\*|`/g, "")
        .replace(/(^|\s)[*_]([^*_\s][^*_]*?)[*_](?=\s|[.,;:!?]|$)/g, "$1$2")
        .trim();
      return heading && text && !/[.!?:]$/.test(text) ? `${text}.` : text;
    })
    .filter(Boolean)
    .join(" ");
}
