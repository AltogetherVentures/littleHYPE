-- littleHYPE 0003: journal entries with full-text search.
--
-- Same access model as 0001/0002: app_user only, FORCE ROW LEVEL SECURITY keyed on
-- app.current_user_id, column-level grants. Journal text is the most private data in the
-- product (PV-3): it is never logged, never in analytics, and never reaches admin tools.

create table journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references profiles(user_id) on delete cascade,
  -- The calendar day in the user's own timezone when the entry was started (JN-2).
  entry_date  date not null,
  -- Markdown-lite text (see web/src/lib/markdown.tsx). May be empty while being written.
  body        text not null default '' check (char_length(body) <= 50000),
  mood        smallint check (mood between 1 and 5),
  -- Which prompt this entry answers, if any (a key from shared/prompt-keys.ts).
  prompt_key  text check (prompt_key ~ '^[a-z_]+\.[a-z_]+$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  search      tsvector generated always as (to_tsvector('english'::regconfig, body)) stored,
  unique (id, user_id)
);
create index journal_entries_user_date_idx on journal_entries (user_id, entry_date desc, created_at desc);
create index journal_entries_search_idx on journal_entries using gin (search);

grant select, delete on journal_entries to app_user;
grant insert (user_id, entry_date, body, mood, prompt_key) on journal_entries to app_user;
grant update (body, mood, updated_at) on journal_entries to app_user;

alter table journal_entries enable row level security;
alter table journal_entries force  row level security;

create policy journal_entries_own on journal_entries
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));
