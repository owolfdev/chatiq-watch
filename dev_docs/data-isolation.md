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

Use this field to filter analytics and future Inbox filters. **Inbox v1 does not auto-hide synthetic rows** — team separation is the isolation boundary.

## Inbox (Support) — is it safe?

**Yes, if your active team is Support** (e.g. Oliver's Team), not ChatIQ Ops.

Inbox loads conversations for the **active team only** (`getUserTeamId` + team cookie on `.chatiq.io`). Synthetic smoke writes to **`watch-canary` on the Ops team**, so those rows **do not appear** while Support is selected.

| Situation | Inbox shows synthetic? |
|-----------|------------------------|
| Active team = **Support** | **No** — expected daily use |
| Active team = **ChatIQ Ops** | **Yes** — useful for debugging smoke |
| Same login, switched team in main app | Follows **active team** everywhere |

**Not a bug:** switching to Ops in the team switcher will show canary conversations.

**Watch push vs Inbox push:** separate tables. Smoke failures alert via **Watch → Alerts** only, not Inbox conversation notifications.

**Optional hygiene (later):** TTL script to delete old Ops-team synthetic conversations so Ops Inbox stays tidy — not required for Support isolation.

## API keys

- Runner key is scoped to **`watch-canary`** on the Ops team
- Do not reuse Support bot keys for smoke tests
- Rotate via **Dashboard → API keys** if leaked

## What Watch does not do (v1)

- Does not replace Sentry or Vercel observability
- Does not run synthetic checks against customer bots
- Does not broadcast push to all admins — subscribed user only
