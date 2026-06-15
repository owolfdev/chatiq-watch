# Mission: Watch v1 — synthetic monitoring + owner alerts

Last updated: 2026-06-15  
Status: **In progress** — Phase A PWA scaffold landed; deploy + env + push opt-in pending.  
Owner: Engineering (platform)

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| **Target** | Prod `https://www.chatiq.io` |
| **Watch host** | `watch.chatiq.io` (Vercel) |
| **Auth** | One platform **admin** login; **Ops** team via switcher (no second email) |
| **Ops team** | Generic team (name e.g. ChatIQ Ops); **no** special team type v1 |
| **Canary** | Slug `watch-canary`; **one per Ops team**; admin **Create Watch canary** in `chatiq` (+ find/create from Watch) |
| **Smoke turns** | **1 canned** (deterministic) + **1 LLM** (proves OpenAI path) per run |
| **Smoke interval** | **15 min** hard smoke; **daily** optional deeper stress |
| **Scheduler Phase 1** | **Vercel Cron** on Watch app (`/api/cron/smoke`); GitHub Actions optional |
| **Push v1** | Reuse **Inbox VAPID** keys; **logged-in user** opts in via Watch settings (not broadcast to all admins) |
| **Synthetic marker** | Yes — `source_detail.origin = synthetic` (+ `run_id`) for filtering |
| **Ops data** | Shared Supabase; ops run/anomaly tables + Watch push subscriptions |
| **Client stats list** | Phase 2+ dashboard/API — **not** Watch smoke v1 (see Progress Log 2026-06-15) |

**`chatiq` pre-Watch (small):** admin Create team → Ops team → Create Watch canary (+ API key).

**Budget guardrails:** max 1 health + 2 chat turns/smoke; 15s timeouts; 1 retry; no self-retrigger loops; Ops team/API key only.

## 1) Why this exists

Surface platform health problems **before customers do** across **Vercel**, **Supabase**, **LLM (OpenAI)**, and the **chat product** (synthetic runs). Deliver alerts to owners via a **dedicated PWA**, without cluttering `chatiq` or polluting the Inbox with synthetic conversations.

Signal catalog: [`watch-signals.md`](./watch-signals.md).

## 2) Definition of Done (v1)

The mission is **complete** when all are true:

1. **Isolation** — Synthetic runs use **ChatIQ Ops** team + canary bot only; Support team Inbox does not show simulation traffic.
2. **Runner** — Scheduled smoke (≈15 min) checks **Vercel (HTTP/health), Supabase (via canary DB path), LLM (canary chat turn), chat gates**; daily deeper stress run; pass/fail exit codes and JSON reports.
3. **Hard anomalies** — Infra or chat hard failures (see `watch-signals.md`) trigger a notification within one run cycle.
4. **Watch PWA** — Owner can sign in (platform admin), see last run status + recent anomalies, subscribe to push.
5. **Main app touch** — Minimal: canary bot config, ops DB tables (if used), optional synthetic marker on conversations; **no** Watch UI in `chatiq`.
6. **Docs** — Runner env documented in `local-dev-setup.md`; scenario list in `runner-scenarios.md`. *(done)*

Out of scope for v1: per-tenant synthetic profiles, LINE live webhook replay, moving existing `/dashboard/admin` pages into Watch.

## 3) Workstreams

### WS-A — Foundation & isolation

- [x] **Admin: Create team** (platform admin only) in `chatiq`.
- [x] **Admin: Create Watch canary** on active team (one per team, slug `watch-canary`).
- [ ] Create **ChatIQ Ops** team on prod; canary + runner API key.
- [x] Document Support vs Ops team usage (`dev_docs/data-isolation.md`).
- [x] Synthetic conversation marker in `chatiq` chat path (runner sends `source_detail`; API already persists).

### WS-B — Runner

- [ ] Port / rewrite `thai-stress-sim.mjs` patterns into `chatiq-watch/scripts/`.
- [x] `run-smoke.mjs` — hard checks only (health + 2 deterministic chat turns).
- [ ] `run-stress.mjs` — multi-turn + handoff scenario (daily).
- [ ] `analyze-run.mjs` — anomaly scoring (port `analyze-thai-stress.mjs`).
- [ ] `notify.mjs` — push on hard fail; configurable soft threshold.
- [ ] GitHub Actions scheduled workflow (Phase 1 scheduler). *(workflow file added; secrets + repo hookup pending)*

### WS-C — Data & API

- [x] Migration in `chatiq/supabase/migrations/`: `bot_synthetic_runs`, `bot_synthetic_anomalies`.
- [x] Migration: `bot_watch_push_subscriptions`, `bot_watch_notification_preferences`.
- [x] Runner writes run + anomaly rows (service role via cron route).

### WS-D — Watch PWA

- [x] Next.js scaffold (port 3002), PWA manifest **Watch**.
- [x] Supabase auth; gate on `bot_user_profiles.role === 'admin'`.
- [x] Pages: `/` status, `/settings` (push).
- [x] Push subscribe/unsubscribe routes (Watch-specific table).
- [x] Vercel cron route `/api/cron/smoke` + push on hard fail.
- [ ] Deploy to `watch.chatiq.io` with env vars + verify cron.

### WS-E — Hygiene (optional before v1 close)

- [ ] TTL cleanup script: delete Ops-team synthetic conversations older than N days.
- [ ] Staging pass recorded in Progress Log below.

## 4) Phasing

| Phase | Deliverable | Target |
|-------|-------------|--------|
| **0** | Docs + Ops team + canary bot (manual) | Now |
| **1** | Runner smoke + GitHub cron + **push** on hard fail | First alert path |
| **2** | Ops tables + Watch PWA status page | Visible history |
| **3** | Push + soft heuristics + trends | Full v1 DoD |

## 5) Verification

- Runner: exit code 0 on green staging smoke; non-zero injects failure.
- Isolation: run smoke; confirm zero new rows on Support team in Inbox.
- PWA: admin login; last run matches DB; test push received.
- `chatiq`: `npm run typecheck` + `npm run test:gtm-ws4` after any synthetic-marker change.

## 6) Progress Log

### 2026-06-15 — Phase A Watch PWA

- Next.js app on port **3002**: admin auth, status dashboard (recent smoke runs), alert settings (web push).
- `/api/cron/smoke` — runs smoke, persists to ops tables, sends push on hard fail; `vercel.json` cron every 15 min.
- Reuses shared Supabase + Inbox VAPID keys; subscriptions in `bot_watch_push_subscriptions`.
- **Verified:** `npm run typecheck`, `npm run build`.
- **Approx. DoD:** ~60% — deploy Watch to Vercel, set env, enable push, confirm cron + isolation still open.
- **Next:** Deploy `watch.chatiq.io` → env vars → opt in to push on Alerts page → confirm cron run appears in Status.

### 2026-06-15 — Phase 0 implementation

- **`chatiq`:** Admin **Watch Ops setup** card — Create team, Create Watch canary (+ optional runner API key); `ensureWatchCanary` helper; ops tables migration.
- **`chatiq-watch`:** `run-smoke.mjs`, `runner-scenarios.md`, `local-dev-setup.md`, `data-isolation.md`, GitHub workflow template.
- **Verified:** `npm run smoke:dry` locally (dry run JSON report).
- **Approx. DoD:** ~35% — runner + admin foundation; prod Ops setup, DB push, cron secrets, PWA, push still open.
- **Next (human):** Apply migration → Admin panel create Ops team + canary + copy API key → add `WATCH_SMOKE_API_KEY` to GitHub → run live smoke once → confirm Support Inbox isolation.

### 2026-06-15 — Planning decisions locked

- Prod target; smoke **15 min**; GitHub Actions first; reuse Inbox VAPID; push to **subscribed logged-in user** only.
- Canary: **1 canned + 1 LLM** turn per smoke (deterministic + full path).
- Admin **Create team** + **Create Watch canary** in `chatiq`; Watch discovers `watch-canary` on Ops team.
- Client health stats (containment, FRT, etc.) = later Watch dashboard/API — separate from smoke runner.
- **Next:** implement `chatiq` admin team + canary actions → prod Ops setup → `runner-scenarios.md` + smoke cron → Watch scaffold.

### 2026-06-15 — Watch scope: Vercel, Supabase, LLM

- Added [`watch-signals.md`](./watch-signals.md): four layers (Vercel, Supabase, LLM/OpenAI, chat product).
- Watch alerts on any layer; reuses `chatiq` cost/request metrics for LLM usage where possible.
- **Next:** unchanged — Ops team + canary bot; runner smoke covers all four layers minimally.

### 2026-06-15 — Project bootstrap

- Created `chatiq-watch/` with `dev_docs/`: overview, architecture, this mission.
- Decisions captured: product name **Watch**, subdomain `watch.chatiq.io`, separate app via API, Ops vs Support team isolation, delete as TTL hygiene only.
- **Next:** Create Ops team + canary bot on staging; draft `local-dev-setup.md` and `runner-scenarios.md`; scaffold Next.js app.
