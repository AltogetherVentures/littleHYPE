import type { Env } from "../index";
import { getClerkEmail } from "../auth/clerk-admin";
import { requireAuth } from "../auth/context";
import { verifyStripeSignature } from "../billing/signature";
import { createCheckoutSession, stripeConfigured } from "../billing/stripe";
import { getDb } from "../db/client";
import { withSystem, withUser } from "../db/user";
import { errorResponse, json } from "../lib/http";
import { getOrCreateMe } from "../profile/service";

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, any> };
}

/**
 * Payments (PY-1 to PY-4). Checkout is created here for the signed-in user; the purchase is
 * recorded ONLY by the signature-verified webhook, never by anything the browser says, and
 * access is judged from the purchases table on the server (PY-3).
 */
export async function handleBillingRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/checkout") {
    if (request.method !== "POST") return errorResponse(405, "method_not_allowed");
    return createCheckout(request, env);
  }
  if (pathname === "/api/stripe/webhook") {
    if (request.method !== "POST") return errorResponse(405, "method_not_allowed");
    return receiveWebhook(request, env);
  }
  return null;
}

async function createCheckout(request: Request, env: Env): Promise<Response> {
  const claims = await requireAuth(env, request);
  if (!stripeConfigured(env)) {
    console.warn("checkout-unavailable: STRIPE_SECRET_KEY and STRIPE_PRICE_ID are not set");
    return errorResponse(503, "checkout_unavailable");
  }
  const sql = getDb(env);
  let alreadyPaid = false;
  try {
    alreadyPaid = await withUser(sql, claims, async (tx) => (await getOrCreateMe(tx, claims.userId)).paid);
  } finally {
    await sql.end();
  }
  if (alreadyPaid) return errorResponse(409, "already_paid");

  const session = await createCheckoutSession(env, { userId: claims.userId, email: await getClerkEmail(env, claims.userId) });
  return session ? json(session) : errorResponse(502, "checkout_failed");
}

async function receiveWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.warn("stripe-webhook-unavailable: STRIPE_WEBHOOK_SECRET is not set");
    return errorResponse(503, "webhook_unavailable");
  }
  // The signature is over the exact bytes received, so read the body as text before parsing.
  const raw = await request.text();
  if (!(await verifyStripeSignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) {
    console.warn("stripe-webhook-bad-signature");
    return errorResponse(400, "invalid_signature");
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return errorResponse(400, "invalid_body");
  }

  const object = event.data?.object ?? {};
  const sql = getDb(env);
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        // A completed session with payment still pending (a delayed method) is recorded only
        // when the async event says the money arrived.
        if (object.payment_status !== "paid") break;
        const userId: unknown = object.client_reference_id ?? object.metadata?.user_id;
        if (typeof userId !== "string" || userId === "" || typeof object.id !== "string") {
          console.error("stripe-purchase-unattributable", { event: event.id, session: object.id });
          break;
        }
        const outcome = await withSystem(
          sql,
          async (tx) =>
            (
              await tx<{ result: string }[]>`
                select record_purchase(${userId}, ${object.id}, ${typeof object.payment_intent === "string" ? object.payment_intent : null},
                                       ${Number.isInteger(object.amount_total) ? object.amount_total : 0}, ${String(object.currency ?? "usd")}) as result`
            )[0]?.result,
        );
        if (outcome === "unknown_user") console.error("stripe-purchase-unknown-user", { event: event.id, session: object.id, userId });
        else console.log("stripe-purchase", { event: event.id, outcome });
        break;
      }
      case "charge.refunded": {
        const paymentIntent = object.payment_intent;
        // Only a full refund revokes access; a partial one (a goodwill gesture) leaves it alone.
        if (typeof paymentIntent === "string" && object.refunded === true) {
          const changed = await withSystem(sql, async (tx) => (await tx<{ ok: boolean }[]>`select mark_purchase_refunded(${paymentIntent}) as ok`)[0]?.ok === true);
          console.log("stripe-refund", { event: event.id, changed });
        }
        break;
      }
      default:
        break; // every other event is acknowledged and ignored
    }
  } catch (err) {
    // A database failure must not look like success, or Stripe would stop retrying a real payment.
    console.error("stripe-webhook-failed", { event: event.id, error: err instanceof Error ? err.message : "unknown" });
    return errorResponse(500, "webhook_failed");
  } finally {
    await sql.end();
  }
  return json({ received: true });
}
