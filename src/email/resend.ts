import type { Env } from "../index";

/** What is needed to send at all. If any is missing the reminder job says so and does nothing. */
export function emailConfig(env: Env): { apiKey: string; from: string; tokenSecret: string } | null {
  const { RESEND_API_KEY, RESEND_FROM, EMAIL_TOKEN_SECRET } = env;
  return RESEND_API_KEY && RESEND_FROM && EMAIL_TOKEN_SECRET ? { apiKey: RESEND_API_KEY, from: RESEND_FROM, tokenSecret: EMAIL_TOKEN_SECRET } : null;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export async function sendViaResend(config: { apiKey: string; from: string }, email: OutgoingEmail, idempotencyKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify({ from: config.from, to: [email.to], subject: email.subject, html: email.html, text: email.text, headers: email.headers }),
    });
    if (!res.ok) console.error("reminder-send-failed", { status: res.status });
    return res.ok;
  } catch (err) {
    console.error("reminder-send-failed", { error: err instanceof Error ? err.message : "unknown" });
    return false;
  }
}
