-- littleHYPE 0004: the daily prompt and finishing onboarding.
--
-- prompt_history records which prompt a user was shown each day (PR-3 to PR-5): the first
-- one is chosen deterministically from the user and the date, and each skip adds a row.
-- The Worker enforces "at most 3 skips a day" and "no repeat within 30 days"; the table
-- only keeps the shape sane. It stores prompt KEYS, never wording, so themes can rewrite
-- their prompts without touching user data (PR-6).

alter table profiles add column onboarded_at timestamptz;
grant update (onboarded_at) on profiles to app_user;

create table prompt_history (
  user_id    text not null references profiles(user_id) on delete cascade,
  day        date not null,
  -- 1 is the prompt first offered that day; 2 to 4 are what a skip swapped in.
  seq        smallint not null check (seq between 1 and 4),
  prompt_key text not null check (prompt_key ~ '^[a-z_]+\.[a-z_]+$'),
  shown_at   timestamptz not null default now(),
  primary key (user_id, day, seq)
);

grant select on prompt_history to app_user;
grant insert (user_id, day, seq, prompt_key) on prompt_history to app_user;

alter table prompt_history enable row level security;
alter table prompt_history force  row level security;

create policy prompt_history_own on prompt_history
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));
