# Watch — signals (what we monitor)

Last updated: 2026-06-15

Watch alerts the platform owner when **any layer** of ChatIQ health degrades. Push on problems; dashboard for history.

## Signal layers

| Layer | What “healthy” means | How Watch checks | Alert examples |
|-------|------------------------|------------------|----------------|
| **Vercel** | App deployed and serving | HTTP probe to prod URL; `/api/v1/health`; optional Vercel API (deploy status, function errors) | 5xx, timeout, failed deploy, edge/runtime errors spike |
| **Supabase** | DB + auth reachable | App health that touches DB; direct ping (simple query via service role); [Supabase status](https://status.supabase.com/) optional | Connection errors, auth failure, migration/RLS breakage surfaced by canary |
| **LLM (OpenAI)** | Model calls succeed; usage sane | Canary chat turn must return LLM or expected canned path; read platform usage from existing cost/metrics tables in `chatiq` | OpenAI 429/5xx, empty replies, latency spike, daily spend / call volume anomaly |
| **Chat product** | End-user chat path works | Synthetic runner on Ops canary bot (`POST /api/chat`) | Gate leaks, handoff broken, quality heuristics, missing `conversationId` |

Layers 1–3 are **infrastructure**. Layer 4 is **product behavior** (synthetic customer). All can trigger push.

## Phase mapping

| Phase | Signals |
|-------|---------|
| **1** | Vercel (HTTP + health), Supabase (via health/canary DB path), chat smoke (1–3 turns) |
| **2** | Run history UI; request error rates from `bot_request_metrics` (if exposed to Watch) |
| **3** | LLM usage thresholds; soft quality heuristics; trends |

## LLM usage (detail)

Reuse data **`chatiq` already collects** where possible:

- Platform admin **cost dashboard** (`/dashboard/admin/costs`) — token spend, model mix
- **Request metrics** (`/dashboard/admin/requests`) — volume, errors, hot routes
- Team **quota** enforcement in chat handler — canary should never hit quota on Ops team (configure plan/limits accordingly)

Watch thresholds (draft — tune in settings):

- OpenAI errors on canary run (hard)
- Platform-wide OpenAI call count or estimated cost **> N×** 7-day rolling average (soft)
- Single canary reply latency **> N ms** (soft)

Provider note: OpenAI today; signal layer should be named **LLM** so a future provider swap doesn’t rename the product.

## Vercel (detail)

Minimum (no Vercel API token required):

- `GET ${MAIN_APP_URL}/api/v1/health` — status + latency
- Optional `HEAD` on homepage

Optional later:

- Vercel REST API: latest deployment state, serverless error rate (needs `VERCEL_TOKEN` + project id in Watch env)

Sentry complements Watch but is **not** a substitute for owner push — Watch owns proactive scheduled checks.

## Supabase (detail)

Minimum:

- Canary chat persistence implies DB write path works
- Health endpoint extended to verify DB (if not already — small `chatiq` addition)

Optional later:

- Scheduled `SELECT 1` via service role from Watch runner
- Supabase Management API project health (ops token)

## Notification rule

**Push when any layer fails hard checks** or crosses a configured soft threshold. One consolidated alert per run cycle (digest), not four separate pings for the same root cause.

## Related `chatiq` admin (not duplicated in Watch UI v1)

These stay in main admin for deep dives; Watch **reads/alerts**, doesn’t rebuild full dashboards:

- `/dashboard/admin/costs`
- `/dashboard/admin/requests`

Watch PWA links out when you need detail.
