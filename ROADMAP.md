# What’s next — `chatiq-watch`

Last updated: 2026-10-28

**Start here for this repo.** Mission & DoD: [`dev_docs/_mission-watch-v1.md`](./dev_docs/_mission-watch-v1.md). Docs index: [`dev_docs/README.md`](./dev_docs/README.md).

Workspace-wide index (not in git): [`../ROADMAP.md`](../ROADMAP.md).

Live at `watch.chatiq.io` — 15‑min smoke cron + Status + push on hard fail.

| Status | Item |
|--------|------|
| Done | Ops team + `watch-canary`, Vercel cron, PWA, push opt-in |
| Done | Cache-aware smoke (LLM step accepts `cache`) |
| Verify | Inbox on **Support** team shows no synthetic rows ([`dev_docs/data-isolation.md`](./dev_docs/data-isolation.md)) |
| **Next** | **Phase B** — client health stats dashboard + API (containment, volume, plan usage) |
| Deferred | Daily stress run (`run-stress.mjs`), soft alerts, run detail pages, Ops TTL cleanup |

## Related

| Repo | Roadmap |
|------|---------|
| Main app | [`../chatiq/ROADMAP.md`](../chatiq/ROADMAP.md) |
| Booking | [`../chatiq-booking/ROADMAP.md`](../chatiq-booking/ROADMAP.md) |
| Inbox | [`../chatiq-conversations-standalone/ROADMAP.md`](../chatiq-conversations-standalone/ROADMAP.md) |
