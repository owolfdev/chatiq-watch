# ChatIQ Watch

**Watch** is the platform admin PWA for synthetic health monitoring and critical alerts.

| | |
|--|--|
| **Host** | `watch.chatiq.io` (Vercel) |
| **Local dev** | port **3002** — `npm run dev` |
| **Docs** | [`dev_docs/README.md`](./dev_docs/README.md) |

## Quick start

```bash
cp .env.example .env.local
# fill Supabase, WATCH_SMOKE_API_KEY, VAPID, CRON_SECRET
npm install
npm run dev
```

Open http://localhost:3002 — sign in with your **platform admin** ChatIQ account.

## What it does (Phase A)

- **Status** — recent synthetic smoke runs from `bot_synthetic_runs`
- **Alerts** — opt in to web push on hard smoke failures
- **Cron** — Vercel hits `GET /api/cron/smoke` every 15 min (see `vercel.json`)

Manual smoke (CLI):

```bash
npm run smoke
```

## Related repos

- `chatiq/` — main app + canary bot (`watch-canary` on Ops team)
- `chatiq-conversations-standalone/` — Inbox (separate product surface)
