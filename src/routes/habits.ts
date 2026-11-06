import type { Env } from "../index";
import { requireAuth } from "../auth/context";
import { getDb } from "../db/client";
import { withUser } from "../db/user";
import { parseCategory, parseDescription, parseName, parseSchedule } from "../habits/validation";
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  getHabit,
  getUserToday,
  habitHistory,
  listHabits,
  removeLog,
  restoreHabit,
  setLog,
  setSchedule,
  todayPayload,
  updateHabit,
} from "../habits/service";
import { errorResponse, json, readJsonObject } from "../lib/http";
import { matchPath } from "../lib/router";
import { getOrCreateMe } from "../profile/service";

/** Habits, their schedules, check-ins and the Today payload. All under the user's RLS scope. */
export async function handleHabitRoutes(request: Request, env: Env): Promise<Response | null> {
  const { pathname, searchParams } = new URL(request.url);
  const method = request.method;
  if (!pathname.startsWith("/api/habits") && pathname !== "/api/today") return null;

  const claims = await requireAuth(env, request);
  const body = method === "POST" || method === "PUT" || method === "PATCH" ? await readJsonObject(request) : null;
  const needsBody = method === "PUT" || method === "PATCH" || (method === "POST" && pathname === "/api/habits");
  if (needsBody && !body) return errorResponse(400, "invalid_body");

  const sql = getDb(env);
  try {
    return await withUser(sql, claims, async (tx) => {
      await getOrCreateMe(tx, claims.userId);
      const userId = claims.userId;
      const today = await getUserToday(tx, userId);
      let params: Record<string, string> | null;

      if (pathname === "/api/today" && method === "GET") return json(await todayPayload(tx, userId, today));

      if (pathname === "/api/habits" && method === "GET") return json({ today, habits: await listHabits(tx, userId, today) });

      if (pathname === "/api/habits" && method === "POST") {
        const id = await createHabit(
          tx,
          userId,
          { name: parseName(body!.name), description: parseDescription(body!.description), category: parseCategory(body!.category), schedule: parseSchedule(body!.schedule ?? { type: "daily" }) },
          today,
        );
        return json({ habit: await getHabit(tx, userId, id, today) }, 201);
      }

      if ((params = matchPath("/api/habits/:id", pathname))) {
        const id = params.id!;
        if (method === "PATCH") {
          await updateHabit(tx, userId, id, {
            ...(body!.name !== undefined ? { name: parseName(body!.name) } : {}),
            ...(body!.description !== undefined ? { description: parseDescription(body!.description) } : {}),
            ...(body!.category !== undefined ? { category: parseCategory(body!.category) } : {}),
          });
          return json({ habit: await getHabit(tx, userId, id, today) });
        }
        if (method === "DELETE") {
          // Permanent, and it takes the habit's whole history with it: require an explicit confirmation.
          if (searchParams.get("confirm") !== "true") return errorResponse(400, "confirmation_required");
          await deleteHabit(tx, userId, id);
          return json({ ok: true });
        }
        if (method === "GET") return json({ habit: await getHabit(tx, userId, id, today) });
      }

      if ((params = matchPath("/api/habits/:id/schedule", pathname)) && method === "PUT") {
        const effectiveFrom = await setSchedule(tx, userId, params.id!, parseSchedule(body!.schedule), today);
        return json({ effectiveFrom, habit: await getHabit(tx, userId, params.id!, today) });
      }

      if ((params = matchPath("/api/habits/:id/archive", pathname)) && method === "POST") {
        await archiveHabit(tx, userId, params.id!);
        return json({ ok: true });
      }
      if ((params = matchPath("/api/habits/:id/restore", pathname)) && method === "POST") {
        await restoreHabit(tx, userId, params.id!);
        return json({ habit: await getHabit(tx, userId, params.id!, today) });
      }

      if ((params = matchPath("/api/habits/:id/history", pathname)) && method === "GET") {
        const weeks = Math.min(52, Math.max(1, Number(searchParams.get("weeks") ?? 12) || 12));
        return json(await habitHistory(tx, userId, params.id!, today, weeks));
      }

      if ((params = matchPath("/api/habits/:id/logs/:date", pathname))) {
        if (method === "PUT") {
          await setLog(tx, userId, params.id!, params.date!, body!.status as never, today);
          return json({ habit: await getHabit(tx, userId, params.id!, today) });
        }
        if (method === "DELETE") {
          await removeLog(tx, userId, params.id!, params.date!);
          return json({ habit: await getHabit(tx, userId, params.id!, today) });
        }
      }
      return errorResponse(404, "not_found");
    });
  } finally {
    await sql.end();
  }
}
