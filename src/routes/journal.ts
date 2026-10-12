import type { Env } from "../index";
import { requireAuth } from "../auth/context";
import { getDb } from "../db/client";
import { withUser } from "../db/user";
import { getUserToday } from "../habits/service";
import { errorResponse, json, readJsonObject } from "../lib/http";
import { matchPath } from "../lib/router";
import { getOrCreateMe } from "../profile/service";
import { calendarMonth, createEntry, deleteEntry, getEntry, listEntries, updateEntry } from "../journal/service";
import { parseBody, parseEntryDate, parseMood, parsePromptKey, parseQuery } from "../journal/validation";

/**
 * The journal. Nothing here logs request or response bodies: entry text never leaves the
 * database except in the response to its own owner (PV-3).
 */
export async function handleJournalRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname, searchParams } = new URL(request.url);
  const method = request.method;
  if (!pathname.startsWith("/api/journal")) return null;

  const claims = await requireAuth(env, request);
  const body = method === "POST" || method === "PATCH" ? await readJsonObject(request) : null;
  if ((method === "POST" || method === "PATCH") && !body) return errorResponse(400, "invalid_body");

  const sql = getDb(env);
  try {
    return await withUser(sql, claims, async (tx) => {
      await getOrCreateMe(tx, claims.userId);
      const userId = claims.userId;
      const today = await getUserToday(tx, userId);
      let params: Record<string, string> | null;

      if (pathname === "/api/journal" && method === "GET") {
        const date = searchParams.get("date");
        if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return errorResponse(400, "invalid_date");
        const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));
        const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
        return json(await listEntries(tx, userId, { query: parseQuery(searchParams.get("q")), date, limit, offset }));
      }

      if (pathname === "/api/journal" && method === "POST") {
        const entry = await createEntry(tx, userId, {
          date: parseEntryDate(body!.date, today),
          body: parseBody(body!.body ?? ""),
          mood: parseMood(body!.mood),
          promptKey: parsePromptKey(body!.promptKey),
        });
        return json({ entry }, 201);
      }

      if (pathname === "/api/journal/calendar" && method === "GET") {
        const month = searchParams.get("month") ?? today.slice(0, 7);
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return errorResponse(400, "invalid_month");
        return json({ month, today, days: await calendarMonth(tx, userId, month) });
      }

      if ((params = matchPath("/api/journal/:id", pathname))) {
        const id = params.id!;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return errorResponse(404, "entry_not_found");
        if (method === "GET") return json({ entry: await getEntry(tx, userId, id) });
        if (method === "PATCH") {
          const patch: { body?: string; mood?: number | null } = {};
          if (body!.body !== undefined) patch.body = parseBody(body!.body);
          if (body!.mood !== undefined) patch.mood = parseMood(body!.mood);
          return json({ entry: await updateEntry(tx, userId, id, patch) });
        }
        if (method === "DELETE") {
          if (searchParams.get("confirm") !== "true") return errorResponse(400, "confirmation_required");
          await deleteEntry(tx, userId, id);
          return json({ ok: true });
        }
      }
      return errorResponse(404, "not_found");
    });
  } finally {
    await sql.end();
  }
}
