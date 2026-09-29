import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown, parseInline, parseMarkdown, safeHref } from "./markdown";

const html = (text: string) => render(<Markdown text={text} />).container.innerHTML;

describe("markdown-lite blocks", () => {
  it("renders headings one level down from the page title, lists, quotes and rules", () => {
    const blocks = parseMarkdown("# Big\n## Mid\n### Small\n\n- a\n- b\n\n1. one\n2) two\n\n> quoted\n> more\n\n---\n\nplain");
    expect(blocks.map((b) => b.t)).toEqual(["heading", "heading", "heading", "ul", "ol", "quote", "hr", "p"]);
    expect(blocks.filter((b) => b.t === "heading").map((b) => (b as { level: number }).level)).toEqual([2, 3, 4]);
  });

  it("joins consecutive lines of a paragraph with line breaks and splits on blank lines", () => {
    expect(html("one\ntwo\n\nthree")).toBe('<div class="entry-body"><p>one<br>two</p><p>three</p></div>');
  });

  it("handles Windows line endings and empty text", () => {
    expect(parseMarkdown("a\r\n\r\nb")).toHaveLength(2);
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("  \n\n ")).toEqual([]);
  });

  it("does not treat a lone # or a dash inside text as structure", () => {
    expect(parseMarkdown("#hashtag")[0]!.t).toBe("p");
    expect(parseMarkdown("well - that was odd")[0]!.t).toBe("p");
  });
});

describe("markdown-lite inline", () => {
  it("renders bold, italic, code and nesting", () => {
    expect(html("**bold** and *it* and _also_ and `code`")).toContain("<strong>bold</strong> and <em>it</em> and <em>also</em> and <code>code</code>");
    expect(html("**bold *both***")).toContain("<strong>bold <em>both</em></strong>");
  });

  it("leaves snake_case, unmatched markers and lone asterisks alone", () => {
    expect(html("snake_case_word")).toContain("snake_case_word");
    expect(html("2 * 3 = 6")).toContain("2 * 3 = 6");
    expect(html("**never closed")).toContain("**never closed");
    expect(html("*")).toContain("*");
  });

  it("honours backslash escapes", () => {
    expect(html("\\*not italic\\*")).toContain("*not italic*");
    expect(html("\\*not italic\\*")).not.toContain("<em>");
  });
});

describe("markdown-lite safety", () => {
  it("never interprets HTML: markup is shown as text", () => {
    const out = html('<script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("only links http and https, and opens them safely", () => {
    const out = html("[site](https://example.com/a?b=1)");
    expect(out).toContain('href="https://example.com/a?b=1"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('target="_blank"');
  });

  it("refuses javascript:, data:, mixed-case tricks, relative and protocol-relative links (shown as plain text)", () => {
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "//evil.example", "/local", "vbscript:x", " javascript:alert(1)"]) {
      const out = html(`[click](${bad})`);
      expect(out, bad).not.toContain("<a");
      expect(out, bad).not.toContain("href");
    }
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("ftp://x.example")).toBeNull();
    expect(safeHref("https://ok.example")).toBe("https://ok.example/");
  });

  it("keeps attribute-breaking characters in link text and urls inert", () => {
    const out = html('[a"><script>x</script>](https://e.example/"onmouseover="x)');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onmouseover=\"x");
  });

  it("copes with very long and pathological input without hanging", () => {
    const start = Date.now();
    html("*".repeat(20000) + "_".repeat(20000) + "[".repeat(5000) + "`".repeat(5000));
    html("a ".repeat(25000));
    expect(Date.now() - start).toBeLessThan(3000);
    expect(parseInline("").length).toBe(0);
  });
});
