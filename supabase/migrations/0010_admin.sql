-- littleHYPE 0010: internal admin tools (TH-3, PY-5, PV-3).
--
-- Admin tools see accounts, never content: a summary of the profile and purchase, the theme
-- history, and a log of what admins did. Nothing here can read habits, check-ins, journal
-- entries or prompts. Every function requires the Worker to have set app.current_role =
-- 'admin', which it does only from a verified Clerk session claim.

-- What admins did, kept after the person's own data is gone. No foreign keys on purpose.
create table admin_actions (
  id             bigint generated always as identity primary key,
  admin_id       text not null,
  action         text not null check (action in ('theme_change', 'refund_and_delete')),
  target_user_id text not null,
  detail         jsonb not null default '{}'::jsonb,
  at             timestamptz not null default now()
);
create index admin_actions_at_idx on admin_actions (at desc);

grant select on admin_actions to app_user;
alter table admin_actions enable row level security;
alter table admin_actions force  row level security;
create policy admin_actions_admin_read on admin_actions
  for select to app_user
  using (current_setting('app.current_role', true) = 'admin');

create function require_admin_role() returns text
language plpgsql set search_path = public, pg_temp
as $$
declare v_admin text := nullif(current_setting('app.current_user_id', true), '');
begin
  if v_admin is null or current_setting('app.current_role', true) is distinct from 'admin' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return v_admin;
end
$$;

-- The account at a glance: no habits, no entries, no text of any kind.
create function admin_user_summary(p_target text)
returns table (user_id text, theme text, timezone text, created_at timestamptz, onboarded boolean,
               purchase_status text, amount integer, currency text, paid_at timestamptz, payment_intent text)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform require_admin_role();
  return query
    select p.user_id, p.theme, p.timezone, p.created_at, p.onboarded_at is not null,
           x.status, x.amount, x.currency, x.paid_at, x.stripe_payment_intent
      from profiles p
      left join lateral (select * from purchases q where q.user_id = p.user_id order by q.paid_at desc limit 1) x on true
     where p.user_id = p_target;
end
$$;

create function admin_theme_history(p_target text)
returns table (old_theme text, new_theme text, changed_by text, changed_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform require_admin_role();
  return query select c.old_theme, c.new_theme, c.changed_by, c.changed_at from theme_changes c where c.user_id = p_target order by c.changed_at desc, c.id desc;
end
$$;

-- Deletes a person and everything of theirs (the cascade), and records that it happened.
create function admin_delete_account(p_target text, p_detail jsonb) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_admin text := require_admin_role(); v_rows integer;
begin
  delete from profiles where user_id = p_target;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;
  end if;
  insert into admin_actions (admin_id, action, target_user_id, detail) values (v_admin, 'refund_and_delete', p_target, coalesce(p_detail, '{}'::jsonb));
  return true;
end
$$;

-- The audited theme change from 0001, now also written to the admin log.
create or replace function admin_set_theme(p_target text, p_theme text) returns text
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
    return p_theme;
  end if;

  update profiles set theme = p_theme where user_id = p_target;
  insert into user_themes (user_id, theme, source)
    values (p_target, p_theme, 'admin')
    on conflict (user_id, theme) do nothing;
  insert into theme_changes (user_id, old_theme, new_theme, changed_by)
    values (p_target, v_current, p_theme, v_admin);
  insert into admin_actions (admin_id, action, target_user_id, detail)
    values (v_admin, 'theme_change', p_target, jsonb_build_object('from', v_current, 'to', p_theme));
  return p_theme;
end
$$;

revoke all on function require_admin_role() from public;
revoke all on function admin_user_summary(text) from public;
revoke all on function admin_theme_history(text) from public;
revoke all on function admin_delete_account(text, jsonb) from public;
revoke all on function admin_set_theme(text, text) from public;
grant execute on function require_admin_role() to app_user;
grant execute on function admin_user_summary(text) to app_user;
grant execute on function admin_theme_history(text) to app_user;
grant execute on function admin_delete_account(text, jsonb) to app_user;
grant execute on function admin_set_theme(text, text) to app_user;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function require_admin_role(), admin_user_summary(text), admin_theme_history(text), admin_delete_account(text, jsonb), admin_set_theme(text, text) from %I', r);
    end if;
  end loop;
end
$$;
