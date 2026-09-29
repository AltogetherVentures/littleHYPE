import type postgres from "postgres";

export interface UserScope {
  userId: string;
  isAdmin?: boolean;
}

/**
 * Runs `fn` inside a transaction scoped to one user via Postgres RLS. Every
 * user-owned table's policy checks current_setting('app.current_user_id'), so
 * a query that forgets this wrapper is denied every row rather than allowed
 * all of them. `app.current_role` is 'admin' only when the verified Clerk
 * token said so; the admin_* SQL functions refuse to run without it.
 */
export async function withUser<T>(
  sql: postgres.Sql,
  scope: UserScope,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${scope.userId}, true)`;
    await tx`select set_config('app.current_role', ${scope.isAdmin ? "admin" : "user"}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/**
 * A transaction for work that is not on behalf of any user: the reminder cron and the signed
 * unsubscribe link. It sets `app.current_role = 'system'`, which the narrow reminder_* SQL
 * functions require. No user id is set, so ordinary tables return no rows in this scope.
 * Only the scheduled handler and the unsubscribe route may call this.
 */
export async function withSystem<T>(sql: postgres.Sql, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', '', true)`;
    await tx`select set_config('app.current_role', 'system', true)`;
    return fn(tx);
  }) as Promise<T>;
}
