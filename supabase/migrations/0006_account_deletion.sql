-- littleHYPE 0006: self-serve account deletion.
--
-- app_user has no DELETE on profiles (or on purchases, theme_changes or achievements), on
-- purpose: nothing in normal operation removes those. Deleting an account is one deliberate
-- act, done by this function for the calling user only. Every user table references
-- profiles ON DELETE CASCADE, so removing the profile row removes the person's habits,
-- check-ins, journal entries, prompt history, achievements, purchase records and theme
-- audit rows in the same transaction. The Worker then removes the Clerk user.

create function delete_my_account() returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user text := nullif(current_setting('app.current_user_id', true), '');
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from profiles where user_id = v_user;
end
$$;

revoke all on function delete_my_account() from public;
grant execute on function delete_my_account() to app_user;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function delete_my_account() from %I', r);
    end if;
  end loop;
end
$$;
