# Deployment

| Part | Host | Deploys from |
|---|---|---|
| Next.js app and its API routes (`frontend/`) | Vercel | `main`, root directory `frontend` |
| FastAPI backend (`Dockerfile`) | Render (Docker web service) | `main` |
| Auth and Postgres | Supabase | migrations in `frontend/supabase/migrations`, applied by hand |
| Maps JavaScript, Static Maps, Solar API | Google Cloud | n/a |
| PVWatts | NREL | n/a |

## Environment variables

Never commit real values. `.env` and `.env.local` are gitignored; production values live in the Render and Vercel dashboards.

| Variable | Where | Purpose |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | Render, Vercel | Server key: Static Maps (backend), Solar API (both) |
| `NREL_API_KEY` | Render | PVWatts |
| `HUGGING_FACE_TOKEN` | Render, optional | Only if the model repo is private |
| `BACKEND_API_TOKEN` | Render **and** Vercel, same value | Shared secret: the backend rejects `/api/*` calls without it. Generate with `openssl rand -hex 32` |
| `DEBUG` | Render: leave unset | Defaults to off; `true` only for local auto-reload |
| `PYTHON_BACKEND_URL` | Vercel | e.g. `https://<service>.onrender.com`, no trailing slash |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Vercel | Browser key for the map |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Supabase project |
| `NEXT_PUBLIC_ENABLE_GUEST_DEMO` | Vercel, optional | `true` shows the "Try the demo" button (see below) |

`NEXT_PUBLIC_*` values are baked in at build time: redeploy after changing them.

## How the paid APIs are protected

Every Google or NREL call costs quota, so no request reaches them unchecked:

1. **Every Next.js API route** calls `guardApiCall` ([`shared/lib/apiGuard.ts`](../frontend/shared/lib/apiGuard.ts)). It verifies the Supabase session with the auth server (not just the cookie), then spends one call of the user's daily quota. A Jest test fails if a new route forgets the guard.
2. **The quota lives in Postgres** (`consume_api_call()`), because Vercel's serverless instances share no memory. Limits per day: 500 calls per account and 60 per guest, plus 1,500 for all guests together. That last cap means minting guest sessions can't run up the bill. The CI `database` job tests these limits.
3. **The backend accepts only the Next.js server**: every `/api/*` route requires the `X-Backend-Token` shared secret, compared in constant time. `/health` stays public for health checks and warm-up pings.
4. **Google Cloud quotas are the hard backstop** if anything above is misconfigured (next section).

## Google Cloud hardening (one-time, in the console)

- **Browser key** (`NEXT_PUBLIC_GOOGLE_MAPS_KEY`): Application restriction "Websites", with your production domain plus `localhost:3000`. API restriction: Maps JavaScript API and Places API only.
- **Server key** (`GOOGLE_MAPS_API_KEY`): API restriction to Solar API and Maps Static API. Vercel and Render use changing egress IPs, so an IP restriction isn't practical. Keep this key server-side only.
- **Quotas:** APIs & Services → Solar API → Quotas: cap requests per day (and the same for Maps Static API) at a level you're happy to pay for in the worst case.
- **Billing:** Billing → Budgets & alerts: add a monthly budget with email alerts at 50/90/100%.

## Rolling out the API protection (one-time, in this order)

The order avoids downtime: each step works with both the old and the new version of the next one.

1. **Supabase, SQL editor:** run `20251112000000_add_show_tutorial_column.sql` (a no-op if the column already exists) and `20261013000000_api_quota_and_guest_demo.sql`. Don't re-run the older migrations. If you later adopt the Supabase CLI, mark the ones already applied with `supabase migration repair --status applied <version>`.
   *Until this is applied, every metered API route answers 503: the guard fails closed when it can't check the quota.*
2. **Vercel:** add `BACKEND_API_TOKEN`, then redeploy. The old backend ignores the extra header.
3. **Render:** add the same `BACKEND_API_TOKEN` and make sure `DEBUG` isn't `true`, then redeploy. From now on the backend rejects anything without the token.
4. **Check:** `curl -X POST https://<service>.onrender.com/api/detect` should return `401`, and the app should still detect roofs.

## Live demo link

1. **Production URL:** Vercel → your project → *Settings → Domains*. The default is `https://<project>.vercel.app`. You can change the `.vercel.app` subdomain there if the name is free, or add your own domain.
2. **Supabase → Authentication → URL Configuration:** set *Site URL* to that URL and add `https://<your-domain>/auth/callback` to *Redirect URLs*. That's where sign-up confirmation emails land.
3. **Let recruiters in without signing up (recommended):**
   - Supabase → Authentication → Sign In / Providers → enable **Allow anonymous sign-ins**.
   - Vercel: set `NEXT_PUBLIC_ENABLE_GUEST_DEMO=true` and redeploy. The login screen then shows **Try the demo, no sign-up**.
   - Guests are real (anonymous) Supabase users: row-level security applies, they get the smaller quota, and they can't create organizations.
   - Supabase also rate-limits anonymous sign-ins per IP (Authentication → Rate Limits).
   - Anonymous users pile up over time. Delete old ones occasionally, e.g. `delete from auth.users where is_anonymous and created_at < now() - interval '30 days';` in the SQL editor.
4. **Publish the link:** put it at the top of the README, and in the GitHub repo's *About → Website* field. Pin the repository on your GitHub profile.
5. **Keep it warm (optional):** free Render services sleep after 15 idle minutes, and the next visitor waits for a cold start.
   - The app already pings the backend on page load and shows a "waking up" toast.
   - To avoid the wait entirely, set the repository variable `BACKEND_HEALTH_URL` (*Settings → Secrets and variables → Actions → Variables*) to `https://<service>.onrender.com/health`. That turns on [`keep-warm.yml`](../.github/workflows/keep-warm.yml), which is free on public repositories.
   - An external uptime monitor pinging `/health` every 10 minutes works too.

## Before making the repository public

API keys were hardcoded in commits before `7f6e4d5` (two Google keys and an NREL key). Removing them from the current code doesn't remove them from git history.

1. **Rotate them first:** create new keys, put the new values in Render and Vercel, then delete the old keys in Google Cloud and NREL. Do this whatever else you choose.
2. Then either publish a fresh repository with a single initial commit, or rewrite history with `git filter-repo`. Rewriting can't be undone, breaks existing clones and the Render/Vercel links to the repository, and the old commits may already be cached elsewhere, so rotation is what actually protects you.
