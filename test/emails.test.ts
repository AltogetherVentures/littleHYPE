import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EMAILS } from "../themes/emails";
import { renderReminder } from "../src/email/render";
import { signUnsubscribe, verifyUnsubscribe } from "../src/email/token";
import { THEME_SLUGS } from "../themes/registry";

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe("theme email registry", () => {
  it("covers exactly the registered themes", () => {
    expect(Object.keys(EMAILS).sort()).toEqual([...THEME_SLUGS].sort());
    const root = join(import.meta.dirname, "..", "themes");
    const folders = readdirSync(root).filter((name) => name !== "default" && statSync(join(root, name)).isDirectory());
    expect(folders.sort()).toEqual([...THEME_SLUGS].sort());
  });

  it("every theme's email colours are readable (WCAG AA) for the text, the button and the footer", () => {
    for (const [slug, { style }] of Object.entries(EMAILS)) {
      expect(contrast(style.text, style.card), `${slug} body`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(style.muted, style.background), `${slug} footer`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(style.accentText, style.accent), `${slug} button and banner`).toBeGreaterThanOrEqual(4.5);
      for (const key of ["background", "card", "text", "muted", "accent", "accentText", "border"] as const) expect(style[key], `${slug} ${key}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("reminder email", () => {
  const open = "https://app.example/spacelog/today";
  const unsub = "https://app.example/unsubscribe?u=user_1&t=abc";

  it("renders in each theme's own words and colours, with the open and unsubscribe links", () => {
    const seen = new Set<string>();
    for (const slug of THEME_SLUGS) {
      const email = renderReminder({ theme: slug, openUrl: open, unsubscribeUrl: unsub })!;
      const { copy, style } = EMAILS[slug]!;
      expect(email.subject).toBe(copy.subject);
      expect(email.html).toContain(copy.heading);
      expect(email.html).toContain(copy.body);
      expect(email.html).toContain(style.accent);
      expect(email.html).toContain(`href="${open}"`);
      expect(email.html).toContain(`href="${unsub.replace(/&/g, "&amp;")}"`);
      expect(email.text).toContain(open);
      expect(email.text).toContain(unsub);
      seen.add(email.html);
    }
    expect(seen.size).toBe(THEME_SLUGS.length);
  });

  it("is email-safe: no scripts, images, external styles or web fonts", () => {
    for (const slug of THEME_SLUGS) {
      const { html } = renderReminder({ theme: slug, openUrl: open, unsubscribeUrl: unsub })!;
      expect(html).not.toMatch(/<script|<img|<link|<iframe|@import|@font-face|url\(/i);
      expect(html).toMatch(/^<!doctype html>/i);
    }
  });

  it("escapes anything in a link so it cannot break out of the markup", () => {
    const { html } = renderReminder({ theme: "dayzero", openUrl: 'https://x.example/"><script>alert(1)</script>', unsubscribeUrl: unsub })!;
    expect(html).not.toContain("<script");
  });

  it("returns nothing for a theme it has no content for, rather than a broken email", () => {
    expect(renderReminder({ theme: "nosuchtheme", openUrl: open, unsubscribeUrl: unsub })).toBeNull();
  });

  it("carries no streak numbers, names or journal content: the copy has no digits or placeholders", () => {
    for (const { copy } of Object.values(EMAILS)) for (const v of Object.values(copy)) expect(v).not.toMatch(/[{}\d]/);
  });
});

describe("unsubscribe tokens", () => {
  const secret = "s3cret-for-tests-only";

  it("verify for the right user and fail for anything else", async () => {
    const token = await signUnsubscribe(secret, "user_1");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyUnsubscribe(secret, "user_1", token)).toBe(true);
    expect(await verifyUnsubscribe(secret, "user_2", token)).toBe(false);
    expect(await verifyUnsubscribe("another-secret", "user_1", token)).toBe(false);
  });

  it("reject malformed, empty, truncated and oversized input without throwing", async () => {
    const token = await signUnsubscribe(secret, "user_1");
    for (const bad of ["", "abc", token.slice(1), `${token}0`, token.toUpperCase(), "z".repeat(64)]) expect(await verifyUnsubscribe(secret, "user_1", bad), bad).toBe(false);
    expect(await verifyUnsubscribe(secret, "", token)).toBe(false);
    expect(await verifyUnsubscribe(secret, "u".repeat(500), token)).toBe(false);
  });

  it("are stable, so an old email still works", async () => {
    expect(await signUnsubscribe(secret, "user_1")).toBe(await signUnsubscribe(secret, "user_1"));
  });
});
