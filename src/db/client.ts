import postgres from "postgres";
import type { Env } from "../index";

/**
 * Postgres client for the Supabase database, routed through the Hyperdrive
 * connection pool binding. Call once per request and close it (`sql.end()`)
 * before the Worker invocation ends.
 */
export function getDb(env: Env) {
  return postgres(env.HYPERDRIVE.connectionString, {
    max: 5,
    // postgres.js's automatic type-introspection query isn't supported over
    // the Hyperdrive connection, so it must be disabled.
    fetch_types: false,
  });
}
