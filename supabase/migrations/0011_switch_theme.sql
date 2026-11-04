-- littleHYPE 0011: every paid account may switch between the included themes.
--
-- The offering changed: the four launch themes are all included with the one-time
-- purchase, and a person may move between them whenever they like. Everything they have
-- written stays exactly where it is (entries, habits, badges are not tied to a theme);
-- only the presentation follows the profile. profiles.theme stays write-protected: this
-- is the one path a person may use, it still requires a paid purchase, and every change
-- is recorded in theme_changes. set_onboarding_theme remains the first pick (write-once);
-- admin_set_theme remains the admin's path.

create function switch_theme(p_theme text) returns text
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
  if v_current is null then
    raise exception 'theme_required' using errcode = '42501';
  end if;

  select id into v_purchase from purchases
   where user_id = v_user and status = 'paid'
   order by paid_at limit 1;
  if v_purchase is null then
    raise exception 'payment_required' using errcode = '42501';
  end if;

  if v_current = p_theme then
    return p_theme;
  end if;

  update profiles set theme = p_theme where user_id = v_user;
  insert into user_themes (user_id, theme, source, purchase_id)
    values (v_user, p_theme, 'included', v_purchase)
    on conflict (user_id, theme) do nothing;
  insert into theme_changes (user_id, old_theme, new_theme, changed_by)
    values (v_user, v_current, p_theme, v_user);
  return p_theme;
end
$$;

revoke all on function switch_theme(text) from public;
grant execute on function switch_theme(text) to app_user;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function switch_theme(text) from %I', r);
    end if;
  end loop;
end
$$;
