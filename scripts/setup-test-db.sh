#!/usr/bin/env bash
# Builds a disposable Postgres for the integration tests: the real migrations,
# applied the way they are applied to Supabase, plus a login password for
# app_user. Used by CI and by local development (docs/setup.md).
#
#   PG_SUPERUSER_URL=postgresql://postgres:postgres@localhost:5432/postgres \
#     bash scripts/setup-test-db.sh
set -euo pipefail

: "${PG_SUPERUSER_URL:?set PG_SUPERUSER_URL to a superuser connection string for a THROWAWAY database}"

# Supabase creates these roles and grants new tables to them by default. Recreate
# that here so the tests prove migration 0001 takes those grants away.
psql "$PG_SUPERUSER_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
SQL

# ON_ERROR_STOP matters: plain psql exits 0 after a failed statement, so a
# half-applied schema would otherwise look like success.
for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  psql "$PG_SUPERUSER_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

psql "$PG_SUPERUSER_URL" -v ON_ERROR_STOP=1 -q -c "alter role app_user with password 'ci_only_password'"
echo "Test database ready."
