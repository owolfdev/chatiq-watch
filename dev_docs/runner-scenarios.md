# Watch smoke scenarios

Hard smoke runs every **15 minutes** (Vercel Cron → `/api/cron/smoke`). Each run produces one JSON report and exit code `0` (pass) or `1` (fail).

## Budget guardrails

- Max **1** health request + **2** chat turns per run
- **15s** request timeout; **1** retry per request
- Ops team **`watch-canary`** bot + runner API key only
- Conversations tagged `source_detail.origin = "synthetic"`

## Checks (v1)

| Step | Signal | What it proves |
|------|--------|----------------|
| 1 | `vercel_health` | `GET /api/v1/health` returns `{ status: "healthy" }` |
| 2 | `chat_canned` | `POST /api/chat` with `hello` → `response_source: "canned"` (deterministic path + Supabase write) |
| 3 | `chat_llm` | Follow-up LLM prompt → `response_source: "llm"` or `"cache"` |

## Prompts

- **Canned:** `hello`
- **LLM:** `Reply in one short English sentence confirming you received this Watch smoke test.`

## Synthetic marker

Every chat request includes:

```json
{
  "source": "watch_smoke",
  "source_detail": {
    "origin": "synthetic",
    "run_id": "watch-smoke-…",
    "scenario": "smoke",
    "step": "chat_canned | chat_llm"
  }
}
```

## Out of scope (v1 smoke)

- Daily stress / multi-turn Thai scenarios — **deferred** (see below)
- LINE / Twilio webhook replay
- Per-tenant profiles
- Client stats (containment, FRT) — Phase B+ Watch dashboard

## Daily stress (deferred — post v1 close)

Port patterns from `chatiq/scripts/thai-stress-sim.mjs` into `run-stress.mjs`:

- **Schedule:** once per day (separate Vercel cron or manual)
- **Scope:** multi-turn Thai + handoff paths on Ops canary only
- **Alerts:** same hard-fail push rules; optional soft scoring via `analyze-run.mjs`
- **Budget:** higher turn cap than smoke — tune before enabling cron

Not required for v1 DoD. Enable when smoke is stable for a week and you want deeper regression signal.
