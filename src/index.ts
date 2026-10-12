import { AuthError } from "./auth/context";
import { errorResponse } from "./lib/http";
import { DomainError } from "./profile/service";
import { handleAdminRoutes } from "./routes/admin";
import { handleConfigRoutes } from "./routes/config";
import { handleHabitRoutes } from "./routes/habits";
import { handleAccountRoutes } from "./routes/account";
import { handleBillingRoutes } from "./routes/billing";
import { handleAchievementRoutes } from "./routes/achievements";
import { handleJournalRoutes } from "./routes/journal";
import { handlePromptRoutes } from "./routes/prompts";
import { handleHealthRoutes } from "./routes/health";
import { handleMeRoutes } from "./routes/me";
import { handlePageRoutes } from "./routes/pages";
import { handleSharingRoutes } from "./routes/sharing";
import { handleUnsubscribeRoutes } from "./routes/unsubscribe";
import { runReminders } from "./email/reminders";
import { settleAllReferrals } from "./referrals/settle";

export interface Env {
  ENVIRONMENT: string;
  HYPERDRIVE: Hyperdrive;
  /** Static assets binding: the built SPA (web/dist). */
  ASSETS: Fetcher;
  /** Safe to embed client-side (served via GET /api/config) - not a secret. */
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  /** PEM public key for networkless JWT verification (see auth/clerk.ts). */
  CLERK_JWT_KEY: string;
  /** The origin the browser loads the app from; checked against the token's `azp`. */
  PUBLIC_BASE_URL: string;
  /** Reminder emails stay off until all three of these are set (docs/setup.md). Secrets, never in wrangler.toml. */
  RESEND_API_KEY?: string;
  /** e.g. "littleHYPE <reminders@your-verified-domain>" */
  RESEND_FROM?: string;
  /** Signs unsubscribe links; any long random string. */
  EMAIL_TOKEN_SECRET?: string;
  /** Payments stay off until these are set (docs/setup.md). Secrets except the price id and tax flag. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  /** "true" once Stripe Tax is set up in the Stripe dashboard. */
  STRIPE_AUTOMATIC_TAX?: string;
  /** A Stripe promotion code id ("promo_...") for the $5-off referral discount (SH-16); optional until created in Stripe. */
  STRIPE_REFERRAL_PROMOTION_ID?: string;
}

const apiHandlers = [handleHealthRoutes, handleConfigRoutes, handleMeRoutes, handleHabitRoutes, handleJournalRoutes, handlePromptRoutes, handleAchievementRoutes, handleAccountRoutes, handleBillingRoutes, handleSharingRoutes, handleUnsubscribeRoutes, handleAdminRoutes];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      for (const handler of apiHandlers) {
        const response = await handler(request, env);
        if (response) return response;
      }
      if (pathname === "/api" || pathname.startsWith("/api/")) return errorResponse(404, "not_found");
      return await handlePageRoutes(request, env);
    } catch (err) {
      if (err instanceof AuthError) return errorResponse(err.status, err.code);
      if (err instanceof DomainError) return errorResponse(err.status, err.code);
      console.error("unhandled-error", err instanceof Error ? (err.stack ?? err.message) : err);
      return errorResponse(500, "internal_error");
    }
  },

  /** Cron trigger (wrangler.toml): the reminder emails, every 15 minutes. */
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runReminders(env).catch((err) => {
        console.error("reminders-failed", err instanceof Error ? (err.stack ?? err.message) : err);
      }),
    );
    ctx.waitUntil(
      settleAllReferrals(env).catch((err) => {
        console.error("referral-settle-failed", err instanceof Error ? (err.stack ?? err.message) : err);
      }),
    );
  },
} satisfies ExportedHandler<Env>;
