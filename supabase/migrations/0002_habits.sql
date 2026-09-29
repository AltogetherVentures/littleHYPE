-- littleHYPE 0002: habits, their schedule history, and daily check-ins.
--
-- Same access model as 0001: the Worker connects as app_user, every table has FORCE
-- ROW LEVEL SECURITY keyed on app.current_user_id, and each child row carries user_id
-- with a composite foreign key so a row can never point at another user's habit.

-- Validates the shape of a schedule (see shared/streaks.ts). Used by a CHECK, which runs
-- with the caller's privileges, so app_user is granted EXECUTE below.
create function valid_schedule(s jsonb) returns boolean
language sql immutable set search_path = public, pg_temp
as $$
  select case s->>'type'
    when 'daily' then true
    when 'weekdays' then
      jsonb_typeof(s->'days') = 'array'
      and jsonb_array_length(s->'days') between 1 and 7
      and not exists (
        select 1 from jsonb_array_elements(s->'days') d
        where jsonb_typeof(d) <> 'number' or (d #>> '{}')::numeric not in (1, 2, 3, 4, 5, 6, 7)
      )
    when 'weekly' then
      jsonb_typeof(s->'target') = 'number'
      and (s->>'target')::numeric between 1 and 7
      and (s->>'target')::numeric = trunc((s->>'target')::numeric)
    else false
  end
$$;

create table habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references profiles(user_id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  -- Fixed list (HB-9); drives titles, share cards and suggestions without exposing the name.
  category    text not null default 'other'
              check (category in ('hydration', 'exercise', 'sleep', 'reading', 'mindfulness', 'screentime', 'diet', 'other')),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);
create index habits_user_idx on habits (user_id);

-- The schedule in force from a date; a habit's history is judged by the schedule that
-- applied on each day (HB-7). The current schedule is the latest version.
create table habit_schedule_versions (
  habit_id       uuid not null,
  user_id        text not null,
  effective_from date not null,
  schedule       jsonb not null check (valid_schedule(schedule)),
  created_at     timestamptz not null default now(),
  primary key (habit_id, effective_from),
  foreign key (habit_id, user_id) references habits (id, user_id) on delete cascade
);
create index habit_schedule_versions_user_idx on habit_schedule_versions (user_id);

create table habit_logs (
  habit_id   uuid not null,
  user_id    text not null,
  log_date   date not null,
  status     text not null check (status in ('done', 'skipped')),
  updated_at timestamptz not null default now(),
  primary key (habit_id, log_date),
  foreign key (habit_id, user_id) references habits (id, user_id) on delete cascade
);
create index habit_logs_user_date_idx on habit_logs (user_id, log_date);

-- At most 20 active habits per user (HB-8). The advisory lock serialises concurrent
-- creates so two requests cannot both slip under the limit.
create function enforce_active_habit_limit() returns trigger
language plpgsql set search_path = public, pg_temp
as $$
begin
  if new.archived_at is null then
    perform pg_advisory_xact_lock(hashtext('habit-limit:' || new.user_id));
    if (select count(*) from habits h
         where h.user_id = new.user_id and h.archived_at is null and h.id <> new.id) >= 20 then
      raise exception 'habit_limit_reached' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

create trigger habits_active_limit
  before insert or update of archived_at on habits
  for each row execute function enforce_active_habit_limit();

-- ---------------------------------------------------------------------------
-- Privileges and row-level security
-- ---------------------------------------------------------------------------
grant select, delete on habits, habit_schedule_versions, habit_logs to app_user;
grant insert (user_id, name, description, category) on habits to app_user;
grant update (name, description, category, archived_at) on habits to app_user;
grant insert (habit_id, user_id, effective_from, schedule) on habit_schedule_versions to app_user;
grant update (schedule) on habit_schedule_versions to app_user;
grant insert (habit_id, user_id, log_date, status) on habit_logs to app_user;
grant update (status, updated_at) on habit_logs to app_user;

alter table habits                  enable row level security;
alter table habits                  force  row level security;
alter table habit_schedule_versions enable row level security;
alter table habit_schedule_versions force  row level security;
alter table habit_logs              enable row level security;
alter table habit_logs              force  row level security;

create policy habits_own on habits
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));
create policy habit_schedule_versions_own on habit_schedule_versions
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));
create policy habit_logs_own on habit_logs
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));

-- Function convention (see 0001): revoke from PUBLIC and the Data API roles, then grant
-- to app_user explicitly.
revoke all on function valid_schedule(jsonb) from public;
revoke all on function enforce_active_habit_limit() from public;
grant execute on function valid_schedule(jsonb) to app_user;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function valid_schedule(jsonb), enforce_active_habit_limit() from %I', r);
    end if;
  end loop;
end
$$;
