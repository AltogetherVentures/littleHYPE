import { EMAILS } from "../../themes/emails";

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * The daily reminder in the person's theme (RM-1): themed subject, words and colours in
 * email-safe HTML (tables, inline styles, no images or scripts) with a plain-text twin. It
 * never mentions streak numbers, names, or anything from the journal.
 */
export function renderReminder(input: { theme: string; openUrl: string; unsubscribeUrl: string }): RenderedEmail | null {
  const entry = EMAILS[input.theme];
  if (!entry) return null;
  const { copy, style, name } = entry;
  const h = escapeHtml;
  const heading = `font-family:${style.headingFont};font-size:26px;line-height:1.2;margin:0 0 12px 0;color:${style.text};text-transform:${style.headingTransform};letter-spacing:${style.headingTransform === "uppercase" ? "0.06em" : "0"};`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${h(copy.subject)}</title></head>
<body style="margin:0;padding:0;background:${style.background};">
<span style="display:none;font-size:1px;color:${style.background};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${h(copy.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${style.background}" style="background:${style.background};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td bgcolor="${style.accent}" style="background:${style.accent};padding:12px 24px;font-family:${style.headingFont};font-size:15px;letter-spacing:0.14em;text-transform:uppercase;color:${style.accentText};">${h(name)}</td></tr>
<tr><td bgcolor="${style.card}" style="background:${style.card};border:1px solid ${style.border};border-top:0;padding:28px 24px;font-family:${style.bodyFont};color:${style.text};">
<h1 style="${heading}">${h(copy.heading)}</h1>
<p style="margin:0 0 24px 0;font-size:17px;line-height:1.55;color:${style.text};">${h(copy.body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${style.accent}" style="background:${style.accent};border-radius:4px;"><a href="${h(input.openUrl)}" style="display:inline-block;padding:14px 26px;font-family:${style.headingFont};font-size:16px;font-weight:bold;letter-spacing:0.06em;text-transform:${style.headingTransform};color:${style.accentText};text-decoration:none;">${h(copy.cta)}</a></td></tr></table>
</td></tr>
<tr><td style="padding:16px 8px;font-family:${style.bodyFont};font-size:13px;line-height:1.5;color:${style.muted};text-align:center;">${h(copy.footer)}<br><a href="${h(input.unsubscribeUrl)}" style="color:${style.muted};text-decoration:underline;">${h(copy.unsubscribe)}</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${copy.heading}\n\n${copy.body}\n\n${copy.cta}: ${input.openUrl}\n\n--\n${copy.footer}\n${copy.unsubscribe}: ${input.unsubscribeUrl}\n`;
  return { subject: copy.subject, html, text };
}
