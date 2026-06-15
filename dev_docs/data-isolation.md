# Watch data isolation — Support vs Ops

Watch synthetic traffic must not pollute day-to-day Support work.

## Teams

| Team | Purpose | Example name |
|------|---------|--------------|
| **Support** | Real customer bots, Inbox triage | Your primary team |
| **Ops** | Watch canary + runner API key only | `ChatIQ Ops` |

One platform admin login; use the **team switcher** to move between Support and Ops. No second email account.

## Canary bot

- Global slug: **`watch-canary`** (one per platform)
- Lives on the **Ops** team only
- `booking_mode: off`, `locations_mode: off`
- Not used for customer-facing support

## Synthetic marker

Runner chat requests set:

```json
"source_detail": {
  "origin": "synthetic",
  "run_id": "watch-smoke-…",
  "scenario": "smoke"
}
```

Use this field to filter Inbox lists and analytics. TTL cleanup on Ops-team synthetic rows is optional hygiene (WS-E) — not the primary isolation boundary.

## API keys

- Runner key is scoped to **`watch-canary`** on the Ops team
- Do not reuse Support bot keys for smoke tests
- Rotate via **Dashboard → API keys** if leaked

## What Watch does not do (v1)

- Does not replace Sentry or Vercel observability
- Does not run synthetic checks against customer bots
- Does not broadcast push to all admins — subscribed user only
