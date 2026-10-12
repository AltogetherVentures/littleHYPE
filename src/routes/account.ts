import type { Env } from "../index";
import { buildExport, journalMarkdown } from "../account/export";
import { requireAuth } from "../auth/context";
import { deleteClerkUser } from "../auth/clerk-admin";
import { getDb } from "../db/client";
import { withUser } from "../db/user";
import { errorResponse, json } from "../lib/http";
import { getOrCreateMe } from "../profile/service";

/** The person's own data: take a copy of it (PV-5) or delete the account (PV-6). */
export async function handleAccountRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname, searchParams } = new URL(request.url);
  const method = request.method;
  const isExport = method === "GET" && pathname === "/api/export";
  const isDelete = method === "DELETE" && pathname === "/api/account";
  if (!isExport && !isDelete) return pathname === "/api/export" || pathname === "/api/account" ? errorResponse(405, "method_not_allowed") : null;

  const claims = await requireAuth(env, request);

  if (isExport) {
    const format = searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "md") return errorResponse(400, "invalid_format");
    const sql = getDb(env);
    try {
      const data = await withUser(sql, claims, async (tx) => {
        await getOrCreateMe(tx, claims.userId);
        return buildExport(tx, claims.userId);
      });
      const stamp = data.exportedAt.slice(0, 10);
      const body = format === "json" ? JSON.stringify(data, null, 2) : journalMarkdown(data);
      return new Response(body, {
        headers: {
          "content-type": format === "json" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
          "content-disposition": `attachment; filename="littlehype-${format === "json" ? "data" : "journal"}-${stamp}.${format === "json" ? "json" : "md"}"`,
          "cache-control": "no-store",
        },
      });
    } finally {
      await sql.end();
    }
  }

  // Deleting is permanent and takes everything with it: an explicit confirmation is required.
  if (searchParams.get("confirm") !== "true") return errorResponse(400, "confirmation_required");
  const sql = getDb(env);
  try {
    await withUser(sql, claims, async (tx) => {
      await tx`select delete_my_account()`;
    });
  } finally {
    await sql.end();
  }
  const signInRemoved = await deleteClerkUser(env, claims.userId);
  return json({ deleted: true, signInRemoved });
}
