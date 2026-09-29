import type { Env } from "../index";

export function stripeConfigured(env: Env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID);
}

/**
 * Creates the Checkout Session for the one-time purchase (PY-1, PY-2). The person's user id
 * rides along as client_reference_id and metadata: it is how the webhook knows whose payment
 * it is. Stripe Tax is switched on with STRIPE_AUTOMATIC_TAX=true once it is set up in the
 * Stripe dashboard (Stripe refuses the request if it is on and Tax is not configured).
 */
export async function createCheckoutSession(env: Env, input: { userId: string; email?: string | null; promotionCodeId?: string | null }): Promise<{ url: string } | null> {
  const base = env.PUBLIC_BASE_URL;
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": env.STRIPE_PRICE_ID!,
    "line_items[0][quantity]": "1",
    client_reference_id: input.userId,
    "metadata[user_id]": input.userId,
    "payment_intent_data[metadata][user_id]": input.userId,
    success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/paywall`,
  });
  if (input.email) form.set("customer_email", input.email);
  if (input.promotionCodeId) form.set("discounts[0][promotion_code]", input.promotionCodeId);
  else form.set("allow_promotion_codes", "true");
  if (env.STRIPE_AUTOMATIC_TAX === "true") form.set("automatic_tax[enabled]", "true");

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) {
      console.error("stripe-checkout-failed", { status: res.status });
      return null;
    }
    const session = (await res.json()) as { url?: string | null };
    return session.url ? { url: session.url } : null;
  } catch (err) {
    console.error("stripe-checkout-failed", { error: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

/**
 * Refunds a payment in full (used by the admin refund-and-delete step, PY-5). A payment that
 * was already refunded counts as done, so the step can be safely retried after a partial failure.
 */
export async function refundPaymentIntent(env: Env, paymentIntent: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded", "idempotency-key": `refund-${paymentIntent}` },
      body: new URLSearchParams({ payment_intent: paymentIntent }),
    });
    if (res.ok) return true;
    const body = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
    if (body.error?.code === "charge_already_refunded") return true;
    console.error("stripe-refund-failed", { status: res.status, code: body.error?.code, paymentIntent });
    return false;
  } catch (err) {
    console.error("stripe-refund-failed", { paymentIntent, error: err instanceof Error ? err.message : "unknown" });
    return false;
  }
}
