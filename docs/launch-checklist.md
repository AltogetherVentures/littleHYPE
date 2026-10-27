# Launch checklist: what only a person can do

Everything in the PRD MVP is built and tested. These are the steps that need an account, a decision or a professional. Work top to bottom; `docs/setup.md` has the click-by-click for each.

## Accounts and keys
- [ ] **Stripe**: account, $49 one-time price, webhook endpoint, secret key, signing secret, Stripe Tax (Setup Part 9). Then a $5 coupon and promotion code for referrals (Part 11).
- [ ] **Resend**: verified sending domain and API key (Part 10).
- [ ] **Clerk production instance**: production keys, your domain's DNS records, session-token claim `{ "metadata": "{{user.public_metadata}}" }`, admin metadata on your user, and Clerk's own "delete account" switched **off** (Part 12).
- [ ] **Production Supabase** (US region, its own `app_user` password), **production Hyperdrive** (a different id from staging), production Worker secrets (Part 8).

## Decisions
- [ ] **Where the app lives.** `littlehype.com` currently serves the old static site (`marketing/`). Choose `app.littlehype.com` or move the apex, then enable the commented-out production route in `wrangler.toml`.
- [ ] **Add-on themes and credits**: referral credits are stored but not redeemable until add-on themes exist (PRD PY-6).

## People
- [ ] **Legal review** of the privacy policy and terms (`legal.*` in `themes/default/strings.json`; the app shows a DRAFT banner until you change `legal.draft`). GD-3 also asks for processing records and a data-processing agreement with Supabase.
- [ ] A support contact for account and refund requests (the deletion messages mention "contact support").

## Before the first real customer
- [ ] Buy once with a real card and refund it from `/admin` (proves Stripe, the webhook, the refund and deletion path end to end).
- [ ] Send yourself a reminder email and click Unsubscribe.
- [ ] Look at every theme on a real phone (the design gallery and contrast checks pass, but a real device is the last word).
- [ ] Turn on Supabase's point-in-time backups if your plan has them (GD-2 promises deletion from backups within 30 days).
