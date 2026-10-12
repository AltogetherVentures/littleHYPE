-- littleHYPE 0005: unlocked achievements.
--
-- Rules live in shared/achievement-defs.ts and are judged by the Worker after a check-in or
-- a saved entry. A row means "unlocked" and is never removed by the app (AC-5): app_user
-- can insert and mark a row seen, but has no DELETE and no way to change unlocked_at, so
-- undoing a check-in or deleting an entry cannot take an achievement away.

create table user_achievements (
  user_id     text not null references profiles(user_id) on delete cascade,
  key         text not null check (key ~ '^[a-z0-9_]{1,40}$'),
  unlocked_at timestamptz not null default now(),
  -- Null until the unlock moment has been shown, so it appears once, on any device.
  seen_at     timestamptz,
  primary key (user_id, key)
);

grant select on user_achievements to app_user;
grant insert (user_id, key) on user_achievements to app_user;
grant update (seen_at) on user_achievements to app_user;

alter table user_achievements enable row level security;
alter table user_achievements force  row level security;

create policy user_achievements_own on user_achievements
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));
