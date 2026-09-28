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
   - Click **Show JWT public key**, copy the **PEM public key**. It is not sensitive, but it is set as a secret to keep one process for all values.
4. **Sessions, Customize session token**: set the claims to
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```
   This is what lets the Worker recognise an admin without another lookup.
5. Make yourself an admin (needed later for the admin theme-change action): **Users**, open your user, **Public metadata**, set `{ "role": "admin" }`.

## 4. Cloudflare Worker (secrets and config)

1. Decide the staging URL. Cloudflare gives you `https://littlehype-staging.<your-workers-subdomain>.workers.dev` (your subdomain is under Cloudflare, Workers & Pages). Put it in `wrangler.toml` as `PUBLIC_BASE_URL` under `[env.staging.vars]`. It must match the address you open in the browser exactly, with no trailing slash.
2. Set the two secrets. Each command prompts for the value:
   ```bash
   npx wrangler secret put CLERK_SECRET_KEY --env staging
   npx wrangler secret put CLERK_JWT_KEY --env staging
   ```
   For the JWT key, paste the PEM including the `-----BEGIN/END PUBLIC KEY-----` lines.
   (If wrangler says the Worker doesn't exist yet, do step 5.1 first and come back.)

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

## 7. Turn on auto-deploy for staging (optional)

CI runs on every pull request. To have merges to `main` deploy staging:

1. GitHub repository, Settings, **Environments**, create `staging`. Add secrets `CLOUDFLARE_API_TOKEN` (create at Cloudflare, My Profile, API Tokens, template **Edit Cloudflare Workers**) and `CLOUDFLARE_ACCOUNT_ID`.
2. Settings, Secrets and variables, **Variables**, add `STAGING_DEPLOY_ENABLED` = `true`.

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

Integration tests **fail** rather than skip when `PG_SUPERUSER_URL` / `PG_APP_URL` are missing, on purpose.
