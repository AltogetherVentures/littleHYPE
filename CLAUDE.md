# littleHYPE

One journaling and habit-tracking web app wrapped in a choice of immersive themes (Space Log, NoteBook, SpellBook, Day Zero at launch). One-time $49 purchase. The theme is chosen once at onboarding and locked to the account.

**Source of truth:** the PRD is Fieldwerks memo `o4f7ilyjre` ("littleHYPE PRD: Themed Journaling and Habit Tracking"). If this file and the PRD disagree, the PRD wins. Requirement ids (TH-2, PV-1, ...) in code comments refer to it.

## Hard rule: reNudge is read-only

littleHYPE deliberately uses the same stack as reNudge (`AltogetherVentures/renudge`). reNudge may be **read** for patterns. Never edit, commit to, push to, open PRs/issues against, or touch the live infrastructure (Supabase, Cloudflare Workers/Hyperdrive, Clerk, Resend) of reNudge from work on littleHYPE. littleHYPE has its own of each.

## Stack

- **Compute:** Cloudflare Workers (`src/`), with the built SPA served as static assets.
- **Frontend:** React 19 + Vite + React Router 7 + TanStack Query (`web/`). Styling is plain CSS over theme tokens.
- **Auth:** Clerk (users, not organizations). Admin = `metadata.role === "admin"` in the session token.
- **Database:** Supabase Postgres via Hyperdrive, connecting as the restricted `app_user` role.
- **Payments:** Stripe Checkout + signature-verified webhook (`src/billing/`). **Email:** Resend, sent from the Worker cron (`*/15 * * * *`, `src/email/`). Both stay off until their secrets are set.
- **Environments:** `staging` and `production`, each with its own Supabase project, Hyperdrive config and Clerk instance.

## Layout

```
src/         Worker: auth/, db/, profile/, habits/, journal/, prompts/, achievements/, account/, admin/,
             billing/, email/, referrals/, sharing/, routes/, shell.ts (plus the scheduled handler in index.ts)
shared/      Pure code used by both Worker and SPA (theme-routing, streaks, prompts, achievements, sharing, ...)
web/         React SPA (npm workspace)
themes/      registry.ts + one folder per theme (see "Design system" below); emails.ts and cards.ts import each
             theme's email/share-card files by name for the Worker (test/emails.test.ts keeps them in step)
supabase/migrations/   Plain SQL, applied BY HAND to both projects
test/        Unit tests; test/integration needs Postgres (scripts/setup-test-db.sh)
marketing/   The pre-existing static brand site (standalone, not built by CI, not part of the Worker)
```

## Design system: what a theme is

A theme is a distinct world, not a colour swap (PRD "Theme briefs"). Each `themes/<slug>/` folder contains:

- `tokens.css` - colour, font, radius and shadow custom properties in a `[data-theme="<slug>"]` block. The neutral defaults in `themes/default/tokens.css` use `:where(:root)` (zero specificity) so a theme can never lose to them; a test enforces it.
- `theme.css` - atmosphere: textures, panel materials, buttons, motion. It restyles the shared class names (`.panel`, `.hero`, `.button`, `.tab`, ...) and the theme's own header classes. **App structure and behaviour never change per theme.**
- `strings.json` - the theme's voice, using the PRD vocabulary table. Missing keys fall back to `default/strings.json`. Never override `billing.`/`paywall.`/`privacy.`/`delete.`/`refund.`/`export.`/`legal.`/`auth.` keys.
- `Header.tsx`, `Calendar.tsx`, `Unlock.tsx` - the three component overrides (TH-11), receiving `HeaderProps` / `CalendarProps` / `UnlockProps` from `web/src/lib/overrides-types.ts`. `web/src/lib/design-completeness.test.ts` fails if a launch theme lacks one.
- `card.ts` + `card-fonts.generated.ts` - the share-card art (background, frame, palette) and its embedded fonts (regenerate with `node scripts/embed-card-fonts.mjs`); `email-theme.json` - the reminder email's colours. Words for both come from `titles.json`, `break-cards.json`, `email.json`, `strings.json`.
- `assets/hero.svg`, `habits.svg`, `prompt.svg` - original artwork (no franchise references, TH-15; no scripts or external loads). `test/themes.test.ts` checks them; `web/src/lib/design-completeness.test.ts` fails if a launch theme lacks artwork or a header.

Class names are shared, so when a base rule and a theme rule tie on specificity the later stylesheet wins and the bundler decides the order: give theme selectors more specificity (`.hdr-x .hdr-x-nav a`, `[data-theme="x"] .panel`), never rely on order.

**Review designs in a browser, not by reading CSS.** `npm run visual` serves a gallery of the real screens with sample data and Clerk stubbed out (`http://127.0.0.1:4173/?scene=today|journal|picker|showcase|landing&theme=<slug>`; add `&signedout=1` for signed-out screens). `npm run visual:contrast` then measures WCAG AA contrast from real rendered pixels (axe cannot see text over gradients and textures). Do both for every theme at desktop and phone width before shipping a design change (TH-14, NF-4).

## Non-negotiable rules

- **Application code never names a theme.** `src/`, `shared/` and `web/src/` may not contain a theme slug or display name; the active theme comes from the profile and valid names from `themes/registry.ts`. Adding a theme is files under `themes/<slug>/` plus one line in the registry. `test/theme-isolation.test.ts` enforces this (NF-6).
- **The profile is the single source of truth for theme.** The URL is corrected to match it, in the Worker before first paint and mirrored in the SPA using the same `shared/theme-routing.ts` function.
- **`profiles.theme` is write-protected by the database** (column grants + SECURITY DEFINER functions `set_onboarding_theme` / `admin_set_theme`). Never add a direct write path. Every change writes `theme_changes`.
- **Isolation is enforced in Postgres.** Every user table has FORCE ROW LEVEL SECURITY keyed on `app.current_user_id`, set per transaction by `withUser`. Every query on user data goes through `withUser`. `test/integration/user-isolation.test.ts` is a CI gate.
- **Money, privacy, deletion and data-loss copy is never theme voice** (TH-13). Keys under `billing.`, `paywall.`, `privacy.`, `delete.`, `refund.`, `export.`, `legal.`, `auth.` live only in `themes/default/strings.json`; a test fails if a theme defines one.
- **Every UI string goes through `t()`** with a key that exists in the default table (typed as `StringKey`, so a typo fails typecheck).
- **Access is gated server-side** from the `purchases` table, never from the client.
- **Nothing silently degrades.** If a fallback exists (e.g. theme lookup failing on page load), it logs a greppable line (`theme-resolve-failed`).
- **Journal text never appears** in logs, analytics, share cards, emails or admin tools (PV-3, PV-4, SH-10). Achievements, prompts and reminders are judged from counts and dates only; "written" means `body ~ '[^[:space:]]'`.
- **Database function convention:** every function in a migration is `SECURITY DEFINER` only when it must be, pins `set search_path = public, pg_temp`, is revoked from PUBLIC/anon/authenticated and granted to `app_user`. Catalog-wide tests enforce all three. Cross-user work (reminder cron, Stripe webhook, referral settling, unsubscribe) runs through `withSystem` (`app.current_role = 'system'`) and narrow functions that check it; admin work through `withUser` with the verified admin claim and functions that check it. Never widen `app_user`'s table grants for these.
- **Pool connections run with `fetch_types: false`** (Hyperdrive), so array parameters don't serialise: pass lists as JSON (`tx.json(list)` + `jsonb_array_elements_text`), never `= any($1)`. In tagged templates write regex classes as `[^[:space:]]`, not `\S` (the escape is eaten).
- **Money is only recorded by the signature-verified Stripe webhook** (`record_purchase`, system-only). The browser returning from checkout proves nothing.
- **Nothing is deleted by a side effect.** Account deletion, refund-and-delete and deletion of a habit/entry each require an explicit confirmation from the person or admin; a refund seen in Stripe only marks the purchase refunded.
- **Integration tests fail loudly** without `PG_SUPERUSER_URL` / `PG_APP_URL`; never make them skip.

## Working notes

- Migrations are applied by hand to **both** Supabase projects. CI applies them only to its throwaway container.
- `wrangler.toml` has `REPLACE_WITH_*` placeholders until the setup in `docs/setup.md` is done; `scripts/check-deploy-config.sh` blocks deploys while any remain and refuses identical staging/production Hyperdrive ids.
- Any new Worker-owned page route must be reachable given `run_worker_first` in `wrangler.toml`.
- `npm install` uses `legacy-peer-deps` (see `.npmrc`): npm 10 crashes resolving vitest/vite peers otherwise.
- The Cloudflare MCP `hyperdrive_config_edit` silently drops passwords; use `wrangler` or the dashboard to change Hyperdrive credentials.

## Commands

```
npm run dev:web            # SPA on :5173, proxies /api to the Worker
npm run dev                # Worker (wrangler dev --env staging) on :8787
npm run typecheck && npm run lint && npm test
PG_SUPERUSER_URL=... PG_APP_URL=... npm run test:integration
npm run deploy:staging     # after docs/setup.md
```

## Build status

The whole PRD MVP is built. What is verified where:

- **Tested (unit, component, integration against real Postgres; contrast checked from rendered pixels):** themes and routing, accounts and the theme lock, habits and streaks, journal (autosave, Markdown-lite, search, calendar), daily prompts, onboarding, achievements, settings, export, self-serve deletion, titles, streak-break cards, share cards, referrals and credits, reminder emails, admin tools, Stripe checkout/webhook/refund logic.
- **Not verified against live services (needs the keys in `docs/setup.md` Parts 9 to 12):** Stripe (checkout, webhook, refund), Resend (sending), Clerk user deletion and search from the Worker, the cron trigger on Cloudflare. Each is off or returns a clear 503 / `reminders-disabled` log until its secrets exist.
- **Deliberate deviations from the PRD:** the journal editor is a plain-text editor with Markdown-lite (bold, italic, headings, lists, quotes, links) and a preview, not a rich-text editor; share cards are composed as SVG in the Worker and rasterised to PNG in the browser (fonts embedded), not rendered to PNG server-side; `habits` has no schedule columns (schedules live only in `habit_schedule_versions`).
- **Before launch (people, not code):** a lawyer's review of `legal.*` (marked DRAFT in the app), a real Stripe account with a $49 price and a $5-off promotion code, a verified Resend sending domain, a production Supabase/Clerk/Hyperdrive and the domain decision (`docs/launch-checklist.md`).
