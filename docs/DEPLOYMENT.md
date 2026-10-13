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
