import type { Env } from "../index";
import { getClerkUser, deleteClerkUser, searchClerkUsers } from "../auth/clerk-admin";
import { requireAdmin } from "../auth/context";
import { adminDeleteAccount, adminRecentActions, adminSummary, adminThemeHistory } from "../admin/service";
import { refundPaymentIntent, stripeConfigured } from "../billing/stripe";
import { getDb } from "../db/client";
import { withSystem, withUser } from "../db/user";
import { errorResponse, json, readJsonObject } from "../lib/http";
import { matchPath } from "../lib/router";
import { adminSetTheme } from "../profile/service";

/**
 * Internal-team actions. They touch accounts, purchases and the audit log only: staff never
 * read journal content, habits or check-ins through admin tools (PV-3). Every action is
 * checked twice: the Worker requires a verified admin claim, and the database functions
 * refuse to run without it.
 */
export async function handleAdminRoutes(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;
  if (!pathname.startsWith("/api/admin/")) return null;
  const method = request.method;

  const theme = matchPath("/api/admin/users/:userId/theme", pathname);
  const refund = matchPath("/api/admin/users/:userId/refund-and-delete", pathname);
  const one = matchPath("/api/admin/users/:userId", pathname);
  const isKnown = (method === "POST" && (theme || refund)) || (method === "GET" && (one || pathname === "/api/admin/users" || pathname === "/api/admin/actions"));
  if (!isKnown) return errorResponse(404, "not_found");

  const claims = await requireAdmin(env, request);
  const sql = getDb(env);
  try {
    if (method === "POST" && theme) {
      const body = await readJsonObject(request);
      if (!body) return errorResponse(400, "invalid_body");
      return json({ theme: await withUser(sql, claims, (tx) => adminSetTheme(tx, theme.userId!, body.theme)) });
    }

    if (method === "GET" && pathname === "/api/admin/actions") {
      return json({ actions: await withUser(sql, claims, (tx) => adminRecentActions(tx)) });
    }

    if (method === "GET" && pathname === "/api/admin/users") {
      const q = (url.searchParams.get("q") ?? "").trim();
      if (q.length < 2 || q.length > 100) return errorResponse(400, "invalid_query");
      const found = /^user_[A-Za-z0-9]+$/.test(q) ? [await getClerkUser(env, q)].filter((u) => u !== null) : await searchClerkUsers(env, q);
      if (found === null) return errorResponse(502, "directory_unavailable");
      const users = await withUser(sql, claims, async (tx) => Promise.all(found.map(async (u) => ({ ...u, summary: await adminSummary(tx, u.id) }))));
      return json({ users });
    }

    if (method === "GET" && one) {
      const id = one.userId!;
      const [summary, history] = await withUser(sql, claims, async (tx) => [await adminSummary(tx, id), await adminThemeHistory(tx, id)] as const);
      if (!summary) return errorResponse(404, "user_not_found");
      const clerk = await getClerkUser(env, id);
      return json({ summary, history, email: clerk?.email ?? null, name: clerk?.name ?? null });
    }

    if (method === "POST" && refund) {
      const id = refund.userId!;
      const body = await readJsonObject(request);
      // The admin must type the account's id back: a slip cannot delete the wrong person.
      if (!body || body.confirm !== id) return errorResponse(400, "confirmation_required");
      const summary = await withUser(sql, claims, (tx) => adminSummary(tx, id));
      if (!summary) return errorResponse(404, "user_not_found");
      const purchase = summary.purchase;
      const needsRefund = purchase?.status === "paid";
      if (needsRefund && !purchase.refundEligible && body.force !== true) return errorResponse(409, "outside_refund_window");
      if (needsRefund && purchase.paymentIntent && !stripeConfigured(env)) return errorResponse(503, "refunds_unavailable");

      let refunded = false;
      if (needsRefund && purchase.paymentIntent) {
        // Money first, and only then data: if Stripe refuses, nothing has been deleted.
        if (!(await refundPaymentIntent(env, purchase.paymentIntent))) return errorResponse(502, "refund_failed");
        refunded = true;
        await withSystem(sql, async (tx) => tx`select mark_purchase_refunded(${purchase.paymentIntent})`);
      }
      await withUser(sql, claims, (tx) => adminDeleteAccount(tx, id, { refunded, hadPurchase: purchase !== null, amount: purchase?.amount ?? null, currency: purchase?.currency ?? null }));
      const signInRemoved = await deleteClerkUser(env, id);
      return json({ deleted: true, refunded, signInRemoved });
    }
    return errorResponse(404, "not_found");
  } finally {
    await sql.end();
  }
}
