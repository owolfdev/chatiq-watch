# ChatIQ Watch — dev docs

Last updated: 2026-06-15

## Execution queue

### Current

1. **Primary mission:** [`_mission-watch-v1.md`](./_mission-watch-v1.md) — platform health alerts (Vercel, Supabase, LLM, chat).
2. **Signals:** [`watch-signals.md`](./watch-signals.md) — what we monitor and alert on.
3. **Architecture:** [`architecture.md`](./architecture.md) — boundaries with `chatiq`, runner, data model, API surface.
4. **Overview:** [`overview.md`](./overview.md) — why Watch exists and how it relates to Inbox / main admin.

### Planned (write when implementation starts)

| Doc | Purpose |
|-----|---------|
| `local-dev-setup.md` | Env vars, proxy to main app, canary bot setup |
| `runner-scenarios.md` | Smoke + stress scenario catalog (M1–M6 aligned) |
| `notifications.md` | Watch-specific web push (separate from Inbox team alerts) |
| `data-isolation.md` | Ops team vs Support team, synthetic markers, TTL cleanup |

## Sibling apps (context)

| App | Role |
|-----|------|
| [`chatiq/`](../chatiq/) | Main SaaS — chat API, bots, dashboard admin |
| [`chatiq-conversations-standalone/`](../chatiq-conversations-standalone/) | Inbox PWA — conversations for support team |
| **chatiq-watch** (this repo) | Watch PWA — platform health, synthetic runs, owner alerts |

## Naming

- **Product / PWA title:** Watch
- **Repo folder:** `chatiq-watch`
- **Subdomain:** `watch.chatiq.io`
