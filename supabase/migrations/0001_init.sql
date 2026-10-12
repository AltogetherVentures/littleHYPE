-- littleHYPE 0001: accounts, theme lock, purchases.
--
-- Access model (mirrors how the Worker connects):
--   * The Worker connects through Hyperdrive as `app_user`, a login role with no
--     BYPASSRLS. Every table below has FORCE ROW LEVEL SECURITY keyed off
--     current_setting('app.current_user_id'), which the Worker sets, per
--     transaction, from the verified Clerk session (src/db/user.ts). Forgetting
--     to set it means RLS returns no rows rather than every row.
--   * `profiles.theme` is write-protected at the database level: app_user has no
--     INSERT/UPDATE privilege on that column. It changes only through the
--     SECURITY DEFINER functions at the bottom of this file.
--   * `purchases` has no write grant for app_user at all. The Stripe webhook
--     slice adds a definer function for it.
--
-- Migrations are applied by hand to BOTH the staging and production projects.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    -- Password is set out-of-band: ALTER ROLE app_user WITH PASSWORD '...';
    create role app_user login;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Theme slugs are validated by the Worker against themes/registry.ts. The
-- database only checks the shape, so adding a theme never needs a migration.
create table profiles (
  user_id       text primary key,                 -- Clerk user id (JWT `sub`)
  theme         text check (theme ~ '^[a-z]{2,32}$'),
  timezone      text not null default 'UTC',
  reminder_time time,
  created_at    timestamptz not null default now()
);

create table purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null references profiles(user_id) on delete cascade,
  stripe_session_id text not null unique,
  product           text not null default 'lifetime',
  amount            integer not null check (amount >= 0),   -- minor units
  currency          text not null,
  status            text not null check (status in ('paid', 'refunded')),
  paid_at           timestamptz not null default now()
);
create index purchases_user_idx on purchases (user_id);

-- Themes a user owns. One row in MVP; add-on themes add rows later (TH-3a).
create table user_themes (
  user_id     text not null references profiles(user_id) on delete cascade,
  theme       text not null check (theme ~ '^[a-z]{2,32}$'),
  source      text not null check (source in ('included', 'purchase', 'admin')),
  purchase_id uuid references purchases(id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, theme)
);

-- Audit log for every theme change: who, when, old value, new value (TH-3).
create table theme_changes (
  id         bigint generated always as identity primary key,
  user_id    text not null references profiles(user_id) on delete cascade,
  old_theme  text,
  new_theme  text not null,
  changed_by text not null,
  changed_at timestamptz not null default now()
);
create index theme_changes_user_idx on theme_changes (user_id);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

-- Supabase grants new tables AND functions to its Data API roles by default. We
-- never use the Data API, so take those grants away rather than lean on RLS
-- alone: both what exists now and what later migrations will create.
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
    end if;
  end loop;
end
$$;

-- CONVENTION for every function a migration adds: Postgres lets PUBLIC execute
-- new functions by default, and that reaches Supabase's Data API roles. So each
-- function must `revoke all on function ... from public;` and then grant execute
-- to app_user explicitly. (A schema-level default cannot subtract PUBLIC's
-- built-in grant, so this is enforced by test/integration/user-isolation.test.ts,
-- which inspects every function in the schema after all migrations are applied.)

grant usage on schema public to app_user;
grant select on profiles, purchases, user_themes, theme_changes to app_user;

-- Column-level grants: theme (and everything else) is deliberately absent.
grant insert (user_id, timezone)        on profiles to app_user;
grant update (timezone, reminder_time)  on profiles to app_user;

alter table profiles      enable row level security;
alter table profiles      force  row level security;
alter table purchases     enable row level security;
alter table purchases     force  row level security;
alter table user_themes   enable row level security;
alter table user_themes   force  row level security;
alter table theme_changes enable row level security;
alter table theme_changes force  row level security;

create policy profiles_own on profiles
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));

create policy purchases_own_read on purchases
  for select to app_user
  using (user_id = current_setting('app.current_user_id', true));

create policy user_themes_own_read on user_themes
  for select to app_user
  using (user_id = current_setting('app.current_user_id', true));

create policy theme_changes_own_read on theme_changes
  for select to app_user
  using (user_id = current_setting('app.current_user_id', true));

-- ---------------------------------------------------------------------------
-- Theme functions (the only way profiles.theme is ever written)
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER runs as the migration owner, which is not subject to the
-- FORCE'd policies (it has BYPASSRLS / is a superuser). Each function therefore
-- scopes every statement to the user itself.

-- Onboarding: the user's one-time theme choice (TH-1, TH-2). Requires a paid
-- purchase (ON-1) and refuses if a theme was ever chosen.
create function set_onboarding_theme(p_theme text) returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user     text := nullif(current_setting('app.current_user_id', true), '');
  v_current  text;
  v_purchase uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_theme is null or p_theme !~ '^[a-z]{2,32}$' then
    raise exception 'invalid_theme' using errcode = '22023';
  end if;

  select theme into v_current from profiles where user_id = v_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if v_current is not null then
    raise exception 'theme_already_chosen' using errcode = '42501';
  end if;

  select id into v_purchase from purchases
   where user_id = v_user and status = 'paid'
   order by paid_at limit 1;
  if v_purchase is null then
    raise exception 'payment_required' using errcode = '42501';
  end if;

  update profiles set theme = p_theme where user_id = v_user;
  insert into user_themes (user_id, theme, source, purchase_id)
    values (v_user, p_theme, 'included', v_purchase);
  insert into theme_changes (user_id, old_theme, new_theme, changed_by)
    values (v_user, null, p_theme, v_user);
  return p_theme;
end
$$;

-- Admin change (TH-3). The Worker sets app.current_role = 'admin' only from a
-- verified Clerk claim. Touches the profile and audit log only (PV-3).
create function admin_set_theme(p_target text, p_theme text) returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_admin   text := nullif(current_setting('app.current_user_id', true), '');
  v_role    text := current_setting('app.current_role', true);
  v_current text;
begin
  if v_admin is null or v_role is distinct from 'admin' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_theme is null or p_theme !~ '^[a-z]{2,32}$' then
    raise exception 'invalid_theme' using errcode = '22023';
  end if;

  select theme into v_current from profiles where user_id = p_target for update;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if v_current is not distinct from p_theme then
    return p_theme;  -- nothing to change, nothing to audit
  end if;

  update profiles set theme = p_theme where user_id = p_target;
  insert into user_themes (user_id, theme, source)
    values (p_target, p_theme, 'admin')
    on conflict (user_id, theme) do nothing;
  insert into theme_changes (user_id, old_theme, new_theme, changed_by)
    values (p_target, v_current, p_theme, v_admin);
  return p_theme;
end
$$;

revoke all on function set_onboarding_theme(text) from public;
revoke all on function admin_set_theme(text, text) from public;
grant execute on function set_onboarding_theme(text) to app_user;
grant execute on function admin_set_theme(text, text) to app_user;

-- PUBLIC is not the same as Supabase's anon/authenticated roles, which hold
-- their own direct grants on anything created above. Revoke explicitly, now
-- that the functions exist (the default-privilege revoke above should already
-- have prevented the grant; this is the belt to that pair of braces).
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function set_onboarding_theme(text), admin_set_theme(text, text) from %I', r);
    end if;
  end loop;
end
$$;
