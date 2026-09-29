# Setup: staging first, then production

littleHYPE runs on its own Cloudflare Worker, Supabase project and Clerk application. Nothing here touches reNudge; do not reuse any reNudge project, key, database or Hyperdrive config.

You need four accounts you probably already have: **Cloudflare**, **Supabase**, **Clerk**, **GitHub**. Do staging end to end first (Parts 1 to 7). Production is Part 8, the same steps with the production instance/project.

Things marked **[secret]** are never pasted into chat, committed to git, or put in `wrangler.toml`.

---

## 1. Supabase (database)

1. Supabase dashboard, **New project**. Name it `littlehype-staging`. Pick a **US** region (the PRD hosts in the US). Generate and save the **database password** in your password manager **[secret]**.
2. When it is ready, open **SQL Editor**, paste the whole of [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) and run it. It should end with no errors.
3. Still in the SQL editor, give the app role a password. Generate a new long random one, save it **[secret]**, and run:
   ```sql
   alter role app_user with password 'PASTE-THE-NEW-PASSWORD-HERE';
   ```
4. Settings, **Data API**: turn it **off** if the option is offered. littleHYPE never uses it (the migration also revokes the Data API roles' access, so this is belt and braces).
5. Note the project's **direct connection** details: Settings, **Database**, Connection string, the **Direct connection** tab. You need the host, which looks like `db.<project-ref>.supabase.co`, port `5432`, database `postgres`. The user is `app_user`, not `postgres`.

## 2. Cloudflare Hyperdrive (database connection pool)

1. On your machine: `npm install`, then `npx wrangler login` (opens a browser).
2. Create the Hyperdrive config, substituting your password and host:
   ```bash
   npx wrangler hyperdrive create littlehype-staging \
     --connection-string="postgresql://app_user:APP_USER_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
   ```
   It prints an **id**. Copy it.
3. Put that id in `wrangler.toml`, under `[[env.staging.hyperdrive]]`, replacing `REPLACE_WITH_STAGING_HYPERDRIVE_ID`.

> Passwords with special characters must be URL-encoded in the connection string. Easiest is a long alphanumeric password.

## 3. Clerk (sign-in)

1. Clerk dashboard, **Create application**, name it `littleHYPE`. Enable **Email** (with password) and **Google**. This creates a *development instance*, which is what staging uses.
2. **Configure, Email, Phone, Username**: make sure email **verification at sign-up is required** (the PRD requires verified email addresses before payment).
3. **API keys**:
   - Copy the **Publishable key** (`pk_test_...`). It is not secret. Put it in `wrangler.toml` as `CLERK_PUBLISHABLE_KEY` under `[env.staging.vars]`.
   - Copy the **Secret key** (`sk_test_...`) **[secret]**.
   - Copy the **JWKS Public Key** (the PEM block). It is a public key, not sensitive: it goes in `wrangler.toml` as `CLERK_JWT_KEY` under `[env.staging.vars]`.
4. **Sessions, Customize session token**: set the claims to
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```
   This is what lets the Worker recognise an admin without another lookup.
5. Make yourself an admin (needed later for the admin theme-change action): **Users**, open your user, **Public metadata**, set `{ "role": "admin" }`.

## 4. Cloudflare Worker (secrets and config)

1. Decide the staging URL. Cloudflare gives you `https://littlehype-staging.<your-workers-subdomain>.workers.dev` (your subdomain is under Cloudflare, Workers & Pages). Put it in `wrangler.toml` as `PUBLIC_BASE_URL` under `[env.staging.vars]`. It must match the address you open in the browser exactly, with no trailing slash.
2. Set the one secret. The command prompts for the value; paste it once at that prompt, never into the shell itself:
   ```bash
   npx wrangler secret put CLERK_SECRET_KEY --env staging
   ```
   If wrangler offers to create the Worker, answer `y`.

## 5. First deploy of staging

```bash
npm run deploy:staging
```
This checks `wrangler.toml` has no `REPLACE_WITH_*` left, builds the web app and deploys. Open `https://littlehype-staging.<subdomain>.workers.dev/health/db`. You should see `{"ok":true}`.

If the deploy guard complains, it lists exactly which placeholders remain.

## 6. Try it (before Stripe exists)

There is no checkout yet, so you mark yourself as having paid by hand. This is for **staging only**.

1. Open the staging URL, **Get started**, sign up with your email and verify it. You should land on a "Complete your purchase" page. That is the paywall working.
2. In Clerk, **Users**, open your user, copy the **User ID** (`user_...`).
3. In the Supabase SQL editor for the **staging** project:
   ```sql
   insert into purchases (user_id, stripe_session_id, amount, currency, status)
   values ('user_XXXXXXXX', 'manual_test_1', 4900, 'usd', 'paid');
   ```
4. Reload the app. You should now see the theme picker with four previewed themes.
5. Pick one and confirm. You should land on `/<theme>/today` in that theme's look and wording.
6. Check the locks:
   - Edit the URL to a different theme (e.g. change `/spacelog/journal` to `/dayzero/journal`). You are sent back to your own theme with the rest of the path kept.
   - View the page source: `<html ... data-theme="...">` is already present before any script runs.
   - Try to choose a theme again: not possible from the UI, and the API returns 409.

To re-run the picker for the same user, delete the account's rows in the SQL editor (`delete from profiles where user_id = 'user_XXXXXXXX';` removes its purchases, themes and audit rows too) and sign in again.

## 7. Auto-deploy for staging (the same method as reNudge)

CI runs on every pull request. Every push to `main` (a merged PR) then deploys staging from GitHub Actions, the same way reNudge deploys. The job needs two secrets:

1. GitHub repository, Settings, **Environments**, create `staging`.
2. In that environment add secrets `CLOUDFLARE_API_TOKEN` (create at Cloudflare, My Profile, API Tokens, template **Edit Cloudflare Workers**; the one reNudge uses works if both Workers live in the same Cloudflare account) and `CLOUDFLARE_ACCOUNT_ID`.

Until the secrets exist the deploy job fails on `main`; PR checks are unaffected.

Migrations are **never** deployed automatically. When a new file appears in `supabase/migrations/`, run it in the SQL editor of **both** projects.

## 8. Production

Repeat Parts 1 to 5 with:
- a Supabase project `littlehype-production` (its own `app_user` password),
- `wrangler hyperdrive create littlehype-production ...` (a **different** id from staging; the deploy guard refuses identical ids),
- Clerk's **production instance** (Clerk dashboard, instance switcher, "Create production instance"; it has its own `pk_live_`, secret key, JWT key, and needs your domain and DNS records; repeat the session-token customisation and admin metadata there),
- `wrangler secret put ... --env production`,
- filling the `[env.production]` placeholders,
- `npm run deploy:production` (always manual).

**Domain:** `littlehype.com` currently serves the existing static site (now in `marketing/`). The production route in `wrangler.toml` is deliberately commented out. Decide where the app lives (for example `app.littlehype.com`, or move the apex) before enabling it.

---

## 9. Payments (Stripe)

Until this is done the paywall's button says checkout isn't available (the API returns 503 `checkout_unavailable`) and nobody can pay; staging users can still be marked paid by SQL (Part 6).

1. Stripe dashboard, **Products**: create "littleHYPE" with a **one-time** price of **$49.00 USD**. Copy the **price id** (`price_...`).
2. **Developers, API keys**: copy the **secret key** (`sk_test_...` for staging, `sk_live_...` for production) **[secret]**.
3. **Developers, Webhooks, Add endpoint**: URL `https://<your app>/api/stripe/webhook`; events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`. Copy its **signing secret** (`whsec_...`) **[secret]**.
4. Set them (each prompts for the value):
   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY --env staging
   npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
   ```
   The price id is not secret: add `STRIPE_PRICE_ID = "price_..."` under `[env.staging.vars]` in `wrangler.toml`.
5. **Stripe Tax** (PY-2, EU VAT): set it up in the Stripe dashboard (Tax), then add `STRIPE_AUTOMATIC_TAX = "true"` to the same vars block. Do not set it before Tax is configured; Stripe rejects the request.
6. Receipts (PY-4): Settings, Emails, **Successful payments** on.
7. Try it with a Stripe test card (`4242 4242 4242 4242`). The purchase appears in `purchases` within seconds and the browser leaves the "Confirming your payment" page.

## 10. Reminder emails (Resend)

The cron trigger runs every 15 minutes and logs `reminders-disabled` until all three secrets exist.

1. Resend, **Domains**: add and verify the domain you will send from (DNS records).
2. Resend, **API keys**: create a key **[secret]**.
3. Choose a long random string for signing unsubscribe links **[secret]** (for example `openssl rand -hex 32`).
   ```bash
   npx wrangler secret put RESEND_API_KEY --env staging
   npx wrangler secret put EMAIL_TOKEN_SECRET --env staging
   npx wrangler secret put RESEND_FROM --env staging     # e.g. littleHYPE <reminders@your-domain>
   ```
4. In the app, Settings, set a reminder a few minutes ahead. The next 15-minute tick sends one email, in the theme's voice, with a one-click unsubscribe. Check `npx wrangler tail --env staging` for `reminders-run`.

## 11. Referrals

- `littlehype.com/r/<code>` opens the sharer's theme showcase and remembers the referrer for 30 days.
- **The friend's $5 off (SH-16):** in Stripe create a **coupon** ($5.00 off, once) and a **promotion code** for it; put the promotion code's id (`promo_...`) in `wrangler.toml` as `STRIPE_REFERRAL_PROMOTION_ID`. Until then friends can still enter a code by hand at checkout, and referrals are still tracked.
- Rewards: a referral counts once the friend's 14-day refund window has passed with the purchase still paid; every three earn one credit (stored, redeemable when add-on themes exist). The cron settles these automatically.

## 12. Admin tools

Sign in with the account whose Clerk public metadata is `{ "role": "admin" }` (Part 3, step 5) and open `/admin` (or Settings, Admin tools). You can find an account, change its theme (audited) and refund-and-delete (the purchase is refunded in Stripe first; nothing is deleted if that fails). Admins see accounts and purchases only, never journals, habits or check-ins (PV-3). Turn Clerk's own "delete account" off (Clerk dashboard, User & authentication) so deletion always goes through the app, which also removes the data.

**Migrations:** apply every new file in `supabase/migrations/` (0002 to 0010 so far) to each Supabase project, in order, before deploying the Worker that needs it.

---

## Local development

Needs Node 22 and a local Postgres 16.

```bash
npm install
# throwaway database + migrations + app_user password
createdb littlehype_dev
export PG_SUPERUSER_URL=postgresql://postgres:postgres@localhost:5432/littlehype_dev
bash scripts/setup-test-db.sh

npm run typecheck && npm run lint && npm test
PG_APP_URL=postgresql://app_user:ci_only_password@localhost:5432/littlehype_dev npm run test:integration
```

To run the whole app locally, copy `.dev.vars.example` to `.dev.vars` (staging Clerk keys), then in two terminals:

```bash
# 1. the Worker, using local Postgres instead of Hyperdrive
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://app_user:ci_only_password@localhost:5432/littlehype_dev \
  npm run dev -- --var PUBLIC_BASE_URL:http://localhost:5173 --var CLERK_PUBLISHABLE_KEY:pk_test_...
# 2. the web app
npm run dev:web
```
Open http://localhost:5173. (`setup-test-db.sh` is for disposable databases only; never point it at Supabase.)

**Design gallery.** To review every theme without signing in: `npm run visual` (builds and serves on http://127.0.0.1:4173), then for example `/?scene=today&theme=<slug>` or `scene=picker`. Try a phone width in your browser's device toolbar. `npm run visual:contrast` (with the gallery running) checks text contrast from the real pixels; it needs Chromium (`CHROMIUM_PATH` or `npx playwright-core install chromium`).

Integration tests **fail** rather than skip when `PG_SUPERUSER_URL` / `PG_APP_URL` are missing, on purpose.
