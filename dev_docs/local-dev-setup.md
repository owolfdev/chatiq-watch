# Watch local dev setup

## Prerequisites

- Node 20+
- Platform **admin** login on ChatIQ
- Ops team + `watch-canary` bot (see below)

## 1) Ops team + canary (prod or staging)

In **`chatiq`** as platform admin:

1. Open **Dashboard → Admin → Watch Ops setup**
2. **Create team** (e.g. `ChatIQ Ops`) — switches your session to the new team
3. **Create canary + API key** — copy the one-time key

Apply the Watch migration if not yet on your Supabase project:

```bash
cd chatiq
# your usual db push / migration flow
```

## 2) Run smoke locally

```bash
cd chatiq-watch
npm run smoke:dry          # no network / no key
```

Against prod:

```bash
export BASE_URL=https://www.chatiq.io
export WATCH_SMOKE_API_KEY=sk_live_…
export BOT_SLUG=watch-canary
npm run smoke
```

Optional tuning:

| Env | Default | Purpose |
|-----|---------|---------|
| `BASE_URL` | `https://www.chatiq.io` | Target deployment |
| `WATCH_SMOKE_API_KEY` | — | Runner bearer token |
| `BOT_SLUG` | `watch-canary` | Canary bot |
| `REQUEST_TIMEOUT_MS` | `15000` | Per-request timeout |
| `MAX_RETRIES` | `1` | Retry count |
| `DRY_RUN` | `0` | Set `1` for local dry run |

## 3) GitHub Actions (optional backup)

GitHub workflow in `.github/workflows/watch-smoke.yml` is optional if you use **Vercel Cron** (recommended).

## 4) Vercel deploy + cron (recommended)

1. Create Vercel project from `chatiq-watch/` → domain `watch.chatiq.io`
2. Set environment variables (same as `.env.example`):
   - Supabase URL + anon + service role
   - `MAIN_APP_URL`, `WATCH_SMOKE_API_KEY`, `WATCH_BOT_SLUG`
   - `CRON_SECRET` (Vercel sends `Authorization: Bearer …` on cron invocations)
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - `NEXT_PUBLIC_WATCH_URL=https://watch.chatiq.io`
3. Deploy — `vercel.json` registers cron `*/15 * * * *` → `/api/cron/smoke`
4. Sign in → **Alerts** → enable push

Test cron manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://watch.chatiq.io/api/cron/smoke
```

## 5) Watch PWA local dev

```bash
npm run dev   # http://localhost:3002
```

## 6) Push notifications

Reuse Inbox **VAPID** keys. Watch stores subscriptions in `bot_watch_push_subscriptions` (platform admin users opt in via Watch settings — UI pending).

## Verify isolation

After a smoke run:

- **Ops team** Inbox may show synthetic conversations (`source_detail.origin = synthetic`)
- **Support team** Inbox should show **no** new conversations from the run

Switch teams in the dashboard team switcher to confirm.
