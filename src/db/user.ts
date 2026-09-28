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
