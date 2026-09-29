/**
 * Signed unsubscribe links (RM-3). The token is an HMAC of the user id under a server-only
 * secret, so a link works without signing in, can't be forged for someone else, and never
 * needs storing. It does not expire: an old email must still be able to switch reminders off.
 */
const encoder = new TextEncoder();

async function key(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

const toHex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string): Uint8Array | null => (/^[0-9a-f]{64}$/.test(hex) ? Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16))) : null);
const message = (userId: string) => encoder.encode(`unsubscribe:${userId}`);

export async function signUnsubscribe(secret: string, userId: string): Promise<string> {
  return toHex(await crypto.subtle.sign("HMAC", await key(secret, "sign"), message(userId)));
}

/** Constant-time check (crypto.subtle.verify compares in constant time). */
export async function verifyUnsubscribe(secret: string, userId: string, token: string): Promise<boolean> {
  const signature = fromHex(token);
  if (!signature || userId.length === 0 || userId.length > 200) return false;
  return crypto.subtle.verify("HMAC", await key(secret, "verify"), signature, message(userId));
}
