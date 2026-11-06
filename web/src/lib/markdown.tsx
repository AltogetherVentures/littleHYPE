import type { ReactNode } from "react";

/**
 * Markdown-lite for journal entries (JN-3): headings, bold, italic, lists, quotes, links
 * and inline code. Deliberately small. Text is parsed into a tree and rendered as React
 * elements, so entry text is never interpreted as HTML and there is no
 * dangerouslySetInnerHTML anywhere: `<script>` is shown as the characters it is. Links are
 * only ever http(s).
 */
export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] };

export type Block =
  | { t: "heading"; level: 2 | 3 | 4; c: Inline[] }
  | { t: "p"; lines: Inline[][] }
  | { t: "quote"; lines: Inline[][] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "hr" };

/** Returns a normalised http(s) URL, or null for anything else (javascript:, data:, relative...). */
export function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const isAlnum = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
const ESCAPABLE = "\\`*_[]()#>-.!";

const MAX_DEPTH = 4;

export function parseInline(s: string, depth = 0): Inline[] {
  // Nesting deeper than a person would ever write is shown as plain text, so hostile or
  // accidental runs of markers can neither recurse without bound nor blow the stack.
  if (depth > MAX_DEPTH) return s ? [{ t: "text", v: s }] : [];
  const out: Inline[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ t: "text", v: buf });
    buf = "";
  };
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === "\\" && i + 1 < s.length && ESCAPABLE.includes(s[i + 1]!)) {
      buf += s[i + 1];
      i += 2;
      continue;
    }
    if (ch === "*" && s[i + 1] === "*") {
      let end = s.indexOf("**", i + 2);
      while (end > 0 && s[end + 2] === "*") end++; // "***" closes with its last two
      if (end > i + 2) {
        flush();
        out.push({ t: "strong", c: parseInline(s.slice(i + 2, end), depth + 1) });
        i = end + 2;
        continue;
      }
    }
    if (ch === "`") {
      const end = s.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ t: "code", v: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if ((ch === "*" || ch === "_") && s[i + 1] !== ch && s[i + 1] !== undefined && !/\s/.test(s[i + 1]!) && !(ch === "_" && isAlnum(s[i - 1]))) {
      const end = s.indexOf(ch, i + 1);
      if (end > i + 1 && !/\s/.test(s[end - 1]!) && !(ch === "_" && isAlnum(s[end + 1]))) {
        flush();
        out.push({ t: "em", c: parseInline(s.slice(i + 1, end), depth + 1) });
        i = end + 1;
        continue;
      }
    }
    if (ch === "[") {
      const m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(s.slice(i));
      if (m) {
        const href = safeHref(m[2]!);
        if (href) {
          flush();
          out.push({ t: "link", href, c: parseInline(m[1]!, depth + 1) });
          i += m[0].length;
          continue;
        }
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

const HEADING = /^(#{1,3}) +(.*\S)\s*$/;
const BULLET = /^[-*] +(.*)$/;
const NUMBERED = /^\d{1,3}[.)] +(.*)$/;
const QUOTE = /^> ?(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})\s*$/;

export function parseMarkdown(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === "") {
      i++;
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = HEADING.exec(line))) {
      blocks.push({ t: "heading", level: (m[1]!.length + 1) as 2 | 3 | 4, c: parseInline(m[2]!) });
      i++;
    } else if (RULE.test(line)) {
      blocks.push({ t: "hr" });
      i++;
    } else if (BULLET.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && (m = BULLET.exec(lines[i]!))) {
        items.push(parseInline(m[1]!));
        i++;
      }
      blocks.push({ t: "ul", items });
    } else if (NUMBERED.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && (m = NUMBERED.exec(lines[i]!))) {
        items.push(parseInline(m[1]!));
        i++;
      }
      blocks.push({ t: "ol", items });
    } else if (QUOTE.test(line)) {
      const quoted: Inline[][] = [];
      while (i < lines.length && (m = QUOTE.exec(lines[i]!))) {
        quoted.push(parseInline(m[1]!));
        i++;
      }
      blocks.push({ t: "quote", lines: quoted });
    } else {
      const para: Inline[][] = [];
      while (
        i < lines.length &&
        lines[i]!.trim() !== "" &&
        !HEADING.test(lines[i]!) &&
        !BULLET.test(lines[i]!) &&
        !NUMBERED.test(lines[i]!) &&
        !QUOTE.test(lines[i]!) &&
        !RULE.test(lines[i]!)
      ) {
        para.push(parseInline(lines[i]!));
        i++;
      }
      blocks.push({ t: "p", lines: para });
    }
  }
  return blocks;
}

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.t) {
      case "text":
        return n.v;
      case "strong":
        return <strong key={i}>{renderInline(n.c)}</strong>;
      case "em":
        return <em key={i}>{renderInline(n.c)}</em>;
      case "code":
        return <code key={i}>{n.v}</code>;
      case "link":
        return (
          <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow">
            {renderInline(n.c)}
          </a>
        );
    }
  });
}

const withBreaks = (lines: Inline[][]): ReactNode[] => lines.flatMap((line, i) => (i === 0 ? renderInline(line) : [<br key={`br${i}`} />, ...renderInline(line)]));

export function Markdown({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="entry-body">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "heading": {
            const Tag = `h${b.level}` as "h2" | "h3" | "h4";
            return <Tag key={i}>{renderInline(b.c)}</Tag>;
          }
          case "p":
            return <p key={i}>{withBreaks(b.lines)}</p>;
          case "quote":
            return <blockquote key={i}>{withBreaks(b.lines)}</blockquote>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          case "hr":
            return <hr key={i} />;
        }
      })}
    </div>
  );
}
