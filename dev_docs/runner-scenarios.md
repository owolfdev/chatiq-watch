# Watch smoke scenarios

Hard smoke runs every **15 minutes** (GitHub Actions Phase 1). Each run produces one JSON report and exit code `0` (pass) or `1` (fail).

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

- Daily stress / multi-turn Thai scenarios (see `run-stress.mjs` — not implemented yet)
- LINE / Twilio webhook replay
- Per-tenant profiles
- Client stats (containment, FRT) — Phase 2+ Watch dashboard

## Daily stress (planned)

Port patterns from `chatiq/scripts/thai-stress-sim.mjs` into `run-stress.mjs` with higher turn counts and anomaly scoring via `analyze-run.mjs`.
