/**
 * Verifies a Stripe webhook signature (the `Stripe-Signature` header) without the Stripe
 * SDK: HMAC-SHA256 of `<timestamp>.<raw body>` under the endpoint's signing secret, compared
 * in constant time, and rejected if the timestamp is more than five minutes from now so a
 * captured request can't be replayed later. Any one of several `v1` signatures may match
 * (Stripe sends more than one while a secret is being rotated).
 */
const encoder = new TextEncoder();
export const TOLERANCE_SECONDS = 300;

const fromHex = (hex: string): Uint8Array | null => (/^[0-9a-f]{64}$/.test(hex) ? Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16))) : null);

export async function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds: number = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header || !secret) return false;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2) as [string, string | undefined];
    if (k.trim() === "t" && v && /^\d{1,12}$/.test(v)) timestamp = Number(v);
    if (k.trim() === "v1" && v) signatures.push(v.trim());
  }
  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const message = encoder.encode(`${timestamp}.${rawBody}`);
  for (const signature of signatures) {
    const bytes = fromHex(signature);
    if (bytes && (await crypto.subtle.verify("HMAC", key, bytes, message))) return true;
  }
  return false;
}

/** For tests and local tooling: produce the header Stripe would send. */
export async function signStripePayload(rawBody: string, secret: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  return `t=${timestamp},v1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
