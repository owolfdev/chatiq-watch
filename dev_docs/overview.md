# Watch — overview

Last updated: 2026-06-15

## What Watch is

A **separate, lightweight PWA** for ChatIQ platform owners to:

- Run **synthetic customer** chat scenarios against production-like surfaces (`POST /api/chat`, health checks).
- Detect **anomalies** across **Vercel**, **Supabase**, **LLM (OpenAI)**, and the **chat product** (synthetic customer runs).
- Receive **push alerts** when something looks wrong — before customers report it.
- Review **run history** and flagged turns without cluttering the Inbox.

Watch is **not** the main app admin panel (`/dashboard/admin` in `chatiq`). That panel stays for business ops: users, costs, Stripe, request metrics. Watch is **reliability ops**.

## Why a separate app

| Concern | Main `chatiq` | Watch |
|---------|---------------|-------|
| Deploy coupling | Ships with every product change | Independent; should alert when main app misbehaves |
| Audience | Teams using the product | Platform owners only |
| UI | Desktop dashboard | Mobile-first PWA (status strip, anomaly feed) |
| Data noise | Inbox shows all team conversations | Synthetic traffic isolated on **Ops team** |

Pattern matches **Inbox** (`chatiq-conversations-standalone`): thin shell, same Supabase auth, talks to `chatiq` via API — but Watch owns runner scheduling and ops-specific UI.

## Problem we are solving

Stress tests and synthetic chat runs create real `bot_conversations` / `bot_messages`. When those hit the same team as support bots, they **pollute Inbox** — counts, filters, and push notifications mix simulated traffic with work you care about.

**Primary fix:** dedicated **ChatIQ Ops** team + canary bot(s). Runner API key scoped to Ops only. Inbox stays on **ChatIQ Support** team.

**Secondary:** tag synthetic traffic (`source_detail.origin = "synthetic"`) and optional TTL cleanup on Ops team (housekeeping, not isolation).

## What Watch does *not* do (v1)

- Replace Sentry / Vercel monitoring.
- Test every customer bot configuration (only canary bots on Ops team).
- Live inside `chatiq` or extend `/dashboard/admin`.
- Show customer Inbox conversations (use Inbox app for that).

## Related existing tooling in `chatiq`

These scripts inform the Watch runner; they will move or be reimplemented under `chatiq-watch/scripts/`:

| Script | Role today |
|--------|------------|
| `scripts/thai-stress-sim.mjs` | Multi-turn `/api/chat` load against live URL |
| `scripts/analyze-thai-stress.mjs` | Heuristic anomaly scoring on run JSON |
| `scripts/takeover-thai-stress.mjs` | Handoff on/off cycle testing |

Validation matrix reference: `chatiq/dev_docs/_gtm-core-chat-validation-matrix.md` (staging scenarios M1–M6).

Signal catalog: [`watch-signals.md`](./watch-signals.md).
