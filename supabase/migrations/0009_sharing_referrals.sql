-- littleHYPE 0009: streak-break cards, referrals and share counts (SH-4 to SH-16).
--
-- Nothing here holds journal text or a habit's custom name. Break cards keep only the
-- category and the length of the streak that ended; referrals keep counts and dates; share
-- events keep counts only. A referrer can see how many people bought through their link but
-- never who: the referred user's id is not readable by anyone but the system.

-- --------------------------------------------------------------- break cards --
-- One row per broken streak that earned a card, so the card is offered once (SH-6).
create table streak_break_cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references profiles(user_id) on delete cascade,
  habit_id     uuid not null,
  category     text not null,
  length_days  integer not null check (length_days >= 1),
  broken_on    date not null,
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz,
  foreign key (habit_id, user_id) references habits (id, user_id) on delete cascade,
  unique (habit_id, broken_on)
);
create index streak_break_cards_user_idx on streak_break_cards (user_id, created_at desc);

grant select on streak_break_cards to app_user;
grant insert (user_id, habit_id, category, length_days, broken_on) on streak_break_cards to app_user;
grant update (dismissed_at) on streak_break_cards to app_user;
alter table streak_break_cards enable row level security;
alter table streak_break_cards force  row level security;
create policy streak_break_cards_own on streak_break_cards
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));

-- --------------------------------------------------------------- share events --
-- Counts only: that a card of this type was shared, in this theme (never its content).
create table share_events (
  id        bigint generated always as identity primary key,
  user_id   text not null references profiles(user_id) on delete cascade,
  card_type text not null check (card_type in ('title', 'break')),
  theme     text not null check (theme ~ '^[a-z]{2,32}$'),
  shared_at timestamptz not null default now()
);
create index share_events_user_idx on share_events (user_id);

grant select on share_events to app_user;
grant insert (user_id, card_type, theme) on share_events to app_user;
alter table share_events enable row level security;
alter table share_events force  row level security;
create policy share_events_own on share_events
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));

-- ------------------------------------------------------------------ referrals --
create table referral_codes (
  user_id text primary key references profiles(user_id) on delete cascade,
  code    text not null unique check (code ~ '^[a-hj-np-z2-9]{8}$')
);
grant select on referral_codes to app_user;
grant insert (user_id, code) on referral_codes to app_user;
alter table referral_codes enable row level security;
alter table referral_codes force  row level security;
create policy referral_codes_own on referral_codes
  for all to app_user
  using      (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));

create table referrals (
  referrer_id      text not null references profiles(user_id) on delete cascade,
  referral_code    text not null,
  referred_user_id text not null unique references profiles(user_id) on delete cascade,
  clicked_at       timestamptz not null default now(),
  purchased_at     timestamptz,
  -- Set once the friend's 14-day refund window has passed with the purchase still paid (SH-14).
  confirmed_at     timestamptz,
  check (referrer_id <> referred_user_id)
);
create index referrals_referrer_idx on referrals (referrer_id);

-- A referrer may read their own rows but not WHO was referred: that column is not granted.
grant select (referrer_id, referral_code, clicked_at, purchased_at, confirmed_at) on referrals to app_user;
alter table referrals enable row level security;
alter table referrals force  row level security;
create policy referrals_referrer_read on referrals
  for select to app_user
  using (referrer_id = current_setting('app.current_user_id', true));

create table referral_credits (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null references profiles(user_id) on delete cascade,
  earned_at      timestamptz not null default now(),
  redeemed_at    timestamptz,
  redeemed_theme text
);
create index referral_credits_user_idx on referral_credits (user_id);
grant select on referral_credits to app_user;
alter table referral_credits enable row level security;
alter table referral_credits force  row level security;
create policy referral_credits_own_read on referral_credits
  for select to app_user
  using (user_id = current_setting('app.current_user_id', true));

-- ----------------------------------------------------------------- functions --
-- The friend, signed in, arrives with a referral code (from the cookie the /r/<code> link set).
-- Records who referred them, once, unless it is their own code or they have already paid.
-- Returns whether the referral is valid (so checkout can apply the discount).
create function attach_referral(p_code text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user text := nullif(current_setting('app.current_user_id', true), '');
  v_referrer text;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select user_id into v_referrer from referral_codes where code = p_code;
  if v_referrer is null or v_referrer = v_user then
    return false;
  end if;
  if exists (select 1 from purchases where user_id = v_user and status = 'paid') then
    return false;
  end if;
  insert into referrals (referrer_id, referral_code, referred_user_id) values (v_referrer, p_code, v_user)
  on conflict (referred_user_id) do nothing;
  -- valid if the recorded referral (this one or an earlier one) is still un-purchased
  return exists (select 1 from referrals where referred_user_id = v_user and purchased_at is null);
end
$$;

-- Where a referral link should land: the referrer's theme showcase (SH-11). Reveals only the theme.
create function referral_landing(p_code text) returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_theme text;
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  select p.theme into v_theme from referral_codes c join profiles p on p.user_id = c.user_id where c.code = p_code;
  return v_theme;
end
$$;

-- After a purchase is recorded, stamp the referral (if any) so its 14-day clock starts.
create or replace function record_purchase(p_user text, p_session text, p_payment_intent text, p_amount integer, p_currency text)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_rows integer;
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where user_id = p_user) then
    return 'unknown_user';
  end if;
  insert into purchases (user_id, stripe_session_id, stripe_payment_intent, amount, currency, status)
  values (p_user, p_session, p_payment_intent, p_amount, lower(p_currency), 'paid')
  on conflict (stripe_session_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    update referrals set purchased_at = now() where referred_user_id = p_user and purchased_at is null;
  end if;
  return case when v_rows = 1 then 'recorded' else 'duplicate' end;
end
$$;

-- A refund seen in Stripe also takes the purchase out of the referral count straight away.
create or replace function mark_purchase_refunded(p_payment_intent text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_rows integer;
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  update purchases set status = 'refunded' where stripe_payment_intent = p_payment_intent and status = 'paid';
  get diagnostics v_rows = row_count;
  update referrals set purchased_at = null
   where confirmed_at is null and referred_user_id in (select user_id from purchases where stripe_payment_intent = p_payment_intent);
  return v_rows > 0;
end
$$;

-- Confirm referrals whose friend's 14-day refund window has passed with the purchase still paid,
-- then grant one credit per three confirmed referrals (SH-13, SH-14). Idempotent; run by the cron.
create function settle_referrals() returns table (confirmed integer, credits integer)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_confirmed integer; v_credits integer;
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  -- A refunded purchase never counts (SH-14): take it out of "pending" too.
  update referrals r set purchased_at = null
   where r.confirmed_at is null and r.purchased_at is not null
     and not exists (select 1 from purchases x where x.user_id = r.referred_user_id and x.status = 'paid');

  update referrals r set confirmed_at = now()
   where r.confirmed_at is null and r.purchased_at is not null and r.purchased_at <= now() - interval '14 days'
     and exists (select 1 from purchases x where x.user_id = r.referred_user_id and x.status = 'paid');
  get diagnostics v_confirmed = row_count;

  insert into referral_credits (user_id)
  select s.referrer_id
    from (select referrer_id, count(*) filter (where confirmed_at is not null) as n from referrals group by referrer_id) s
    cross join lateral generate_series(1, s.n / 3) as g(i)
   where g.i > (select count(*) from referral_credits c where c.user_id = s.referrer_id);
  get diagnostics v_credits = row_count;
  return query select v_confirmed, v_credits;
end
$$;

revoke all on function attach_referral(text) from public;
revoke all on function referral_landing(text) from public;
revoke all on function record_purchase(text, text, text, integer, text) from public;
revoke all on function settle_referrals() from public;
revoke all on function mark_purchase_refunded(text) from public;
grant execute on function attach_referral(text) to app_user;
grant execute on function referral_landing(text) to app_user;
grant execute on function record_purchase(text, text, text, integer, text) to app_user;
grant execute on function settle_referrals() to app_user;
grant execute on function mark_purchase_refunded(text) to app_user;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function attach_referral(text), referral_landing(text), record_purchase(text, text, text, integer, text), settle_referrals(), mark_purchase_refunded(text) from %I', r);
    end if;
  end loop;
end
$$;
