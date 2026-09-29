import { describe, expect, it } from "vitest";
import { applyFormat, plainExcerpt } from "./format";

describe("editor formatting", () => {
  it("wraps a selection and keeps it selected", () => {
    expect(applyFormat("say hello now", 4, 9, "bold")).toEqual({ text: "say **hello** now", start: 6, end: 11 });
    expect(applyFormat("say hello now", 4, 9, "italic")).toEqual({ text: "say *hello* now", start: 5, end: 10 });
  });

  it("puts the cursor between markers when nothing is selected", () => {
    const r = applyFormat("ab", 1, 1, "bold");
    expect(r.text).toBe("a****b");
    expect([r.start, r.end]).toEqual([3, 3]);
  });

  it("toggles bold and italic off again", () => {
    expect(applyFormat("say **hello** now", 6, 11, "bold").text).toBe("say hello now");
    expect(applyFormat("say *hello* now", 5, 10, "italic").text).toBe("say hello now");
  });

  it("does not mistake bold for italic when toggling", () => {
    expect(applyFormat("**hello**", 2, 7, "italic").text).toBe("***hello***");
  });

  it("prefixes every line the selection touches, and toggles", () => {
    const text = "one\ntwo\nthree";
    const listed = applyFormat(text, 1, 6, "list");
    expect(listed.text).toBe("- one\n- two\nthree");
    expect(applyFormat(listed.text, 2, 10, "list").text).toBe(text);
    expect(applyFormat("plain", 0, 0, "heading").text).toBe("## plain");
    expect(applyFormat("a\nb", 2, 3, "quote").text).toBe("a\n> b");
  });

  it("fills in the rest of a partly prefixed selection instead of stripping it", () => {
    expect(applyFormat("- one\ntwo", 0, 9, "list").text).toBe("- one\n- two");
  });

  it("inserts a link template with the address selected", () => {
    const r = applyFormat("see docs here", 4, 8, "link");
    expect(r.text).toBe("see [docs](https://) here");
    expect(r.text.slice(r.start, r.end)).toBe("https://");
    const empty = applyFormat("", 0, 0, "link");
    expect(empty.text).toBe("[link text](https://)");
  });

  it("strips Markdown furniture from list excerpts", () => {
    expect(plainExcerpt("## A heading")).toBe("A heading.");
    expect(plainExcerpt("- item with **bold** and [a link](https://x.example)")).toBe("item with bold and a link");
    expect(plainExcerpt("plain text")).toBe("plain text");
    expect(plainExcerpt("## A good day\nWoke up early\n- one\n- two")).toBe("A good day. Woke up early one two");
    expect(plainExcerpt("tried the *breathing* thing and _this_ too")).toBe("tried the breathing thing and this too");
    expect(plainExcerpt("2 * 3 and snake_case_word")).toBe("2 * 3 and snake_case_word");
  });
});
