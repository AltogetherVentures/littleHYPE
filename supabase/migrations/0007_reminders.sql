-- littleHYPE 0007: reminder emails (RM-1 to RM-3).
--
-- The cron job has to look across every user (who is due a reminder right now), which
-- row-level security forbids for app_user. So the cross-user work is done by a few narrow
-- SECURITY DEFINER functions that refuse to run unless the Worker says the caller is the
-- system (app.current_role = 'system', set only by the scheduled handler and the
-- signed-link unsubscribe route, never from a user's request). They return only what a
-- reminder needs: who, their theme, their local day. They never read journal text.

create table reminder_log (
  user_id text not null references profiles(user_id) on delete cascade,
  -- The user's LOCAL date the reminder was for: at most one reminder per person per day.
  sent_on date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, sent_on)
);

grant select on reminder_log to app_user;
alter table reminder_log enable row level security;
alter table reminder_log force  row level security;
create policy reminder_log_own_read on reminder_log
  for select to app_user
  using (user_id = current_setting('app.current_user_id', true));

-- Who should be sent a reminder at p_now. A person is due once their local time has passed
-- their chosen reminder time, for up to p_grace_minutes (so a missed cron tick is caught up,
-- but nobody is emailed at midnight), if they have not been sent one for that local day, and
-- if they have not already both checked in and written (RM-2). "Checked in" means any habit
-- logged (done or rested) today, or having no active habits at all.
create function reminder_candidates(p_now timestamptz, p_grace_minutes integer default 120)
returns table (user_id text, theme text, local_day date)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  return query
  with due as (
    select p.user_id, p.theme, p.reminder_time,
           (p_now at time zone p.timezone)::date as local_day,
           (p_now at time zone p.timezone)::time as local_time
      from profiles p
     where p.reminder_time is not null
       and p.theme is not null
       and p.onboarded_at is not null
       and exists (select 1 from pg_timezone_names z where z.name = p.timezone)
       and exists (select 1 from purchases x where x.user_id = p.user_id and x.status = 'paid')
  )
  select d.user_id, d.theme, d.local_day
    from due d
   where d.local_time >= d.reminder_time
     and d.local_time < d.reminder_time + make_interval(mins => p_grace_minutes)
     and not exists (select 1 from reminder_log l where l.user_id = d.user_id and l.sent_on = d.local_day)
     and not (
       (not exists (select 1 from habits h where h.user_id = d.user_id and h.archived_at is null)
         or exists (select 1 from habit_logs g where g.user_id = d.user_id and g.log_date = d.local_day))
       and exists (select 1 from journal_entries j where j.user_id = d.user_id and j.entry_date = d.local_day and j.body ~ '[^[:space:]]')
     );
end
$$;

-- Take the day's slot for a user before sending, so two overlapping runs cannot both send.
create function claim_reminder(p_user text, p_day date) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_rows integer;
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  insert into reminder_log (user_id, sent_on) values (p_user, p_day) on conflict do nothing;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end
$$;

-- Give the slot back when the email could not be sent, so the next run tries again.
create function release_reminder(p_user text, p_day date) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  delete from reminder_log where user_id = p_user and sent_on = p_day;
end
$$;

-- One-click unsubscribe (RM-3): the Worker has verified the signed link, this turns the reminder off.
create function unsubscribe_reminders(p_user text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_rows integer;
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  update profiles set reminder_time = null where user_id = p_user and reminder_time is not null;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end
$$;

revoke all on function reminder_candidates(timestamptz, integer) from public;
revoke all on function claim_reminder(text, date) from public;
revoke all on function release_reminder(text, date) from public;
revoke all on function unsubscribe_reminders(text) from public;
grant execute on function reminder_candidates(timestamptz, integer) to app_user;
grant execute on function claim_reminder(text, date) to app_user;
grant execute on function release_reminder(text, date) to app_user;
grant execute on function unsubscribe_reminders(text) to app_user;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function reminder_candidates(timestamptz, integer), claim_reminder(text, date), release_reminder(text, date), unsubscribe_reminders(text) from %I', r);
    end if;
  end loop;
end
$$;
