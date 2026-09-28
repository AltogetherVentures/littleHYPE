import { AuthError } from "./auth/context";
import { errorResponse } from "./lib/http";
import { DomainError } from "./profile/service";
import { handleAdminRoutes } from "./routes/admin";
import { handleConfigRoutes } from "./routes/config";
import { handleHealthRoutes } from "./routes/health";
import { handleMeRoutes } from "./routes/me";
import { handlePageRoutes } from "./routes/pages";

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
}

const apiHandlers = [handleHealthRoutes, handleConfigRoutes, handleMeRoutes, handleAdminRoutes];

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
} satisfies ExportedHandler<Env>;
