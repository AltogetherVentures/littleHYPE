-- littleHYPE 0008: recording Stripe purchases and refunds (PY-3, PY-5).
--
-- app_user still cannot write purchases directly. The Stripe webhook route (signature
-- verified in the Worker) records them through these system-only functions, so a request
-- from a signed-in user, however crafted, can never mark itself paid.

alter table purchases add column stripe_payment_intent text;
create unique index purchases_payment_intent_key on purchases (stripe_payment_intent) where stripe_payment_intent is not null;

-- Records a paid Checkout Session. Idempotent on the session id (Stripe retries webhooks).
-- Returns 'recorded', 'duplicate', or 'unknown_user' (paid, but the account no longer exists:
-- the Worker logs that loudly so the payment can be refunded by hand).
create function record_purchase(p_user text, p_session text, p_payment_intent text, p_amount integer, p_currency text)
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
  return case when v_rows = 1 then 'recorded' else 'duplicate' end;
end
$$;

-- A refund seen in Stripe (from the dashboard or the admin tool). Access is revoked at once
-- because access is judged from status = 'paid'; deleting the person's data is the separate
-- admin refund-and-delete step (PY-5), never a side effect of a webhook.
create function mark_purchase_refunded(p_payment_intent text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_rows integer;
begin
  if current_setting('app.current_role', true) is distinct from 'system' then
    raise exception 'system_required' using errcode = '42501';
  end if;
  update purchases set status = 'refunded' where stripe_payment_intent = p_payment_intent and status = 'paid';
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end
$$;

revoke all on function record_purchase(text, text, text, integer, text) from public;
revoke all on function mark_purchase_refunded(text) from public;
grant execute on function record_purchase(text, text, text, integer, text) to app_user;
grant execute on function mark_purchase_refunded(text) to app_user;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function record_purchase(text, text, text, integer, text), mark_purchase_refunded(text) from %I', r);
    end if;
  end loop;
end
$$;
