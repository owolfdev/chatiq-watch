#!/usr/bin/env node

/**
 * Watch smoke runner — hard checks only (≈15 min cron).
 * See dev_docs/runner-scenarios.md for scenario definitions.
 */

const baseUrl = process.env.BASE_URL || "https://www.chatiq.io";
const apiKey = process.env.WATCH_SMOKE_API_KEY || process.env.API_KEY;
const botSlug = process.env.BOT_SLUG || "watch-canary";
const dryRun = process.env.DRY_RUN === "1";
const requestTimeoutMs = Math.max(
  1000,
  Number(process.env.REQUEST_TIMEOUT_MS || 15000),
);
const maxRetries = Math.max(0, Number(process.env.MAX_RETRIES || 1));

const CANNED_PROMPT = "hello";
const LLM_PROMPT =
  "Reply in one short English sentence confirming you received this Watch smoke test.";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${apiKey}`,
};

function buildRunId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `watch-smoke-${stamp}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeResponseText(payload) {
  if (Array.isArray(payload?.responses) && payload.responses.length > 0) {
    return payload.responses.filter((v) => typeof v === "string").join("\n\n").trim();
  }
  if (typeof payload?.response === "string") {
    return payload.response.trim();
  }
  return "";
}

async function fetchWithRetry(url, options) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      return { response, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(200 * (attempt + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("request_failed");
}

async function checkHealth(runId) {
  const startedAt = Date.now();
  if (dryRun) {
    return {
      signal: "vercel_health",
      ok: true,
      status: 200,
      durationMs: 0,
      detail: { dryRun: true, runId },
    };
  }

  try {
    const { response, attempt } = await fetchWithRetry(`${baseUrl}/api/v1/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-json health response is a failure
    }

    const ok = response.ok && json?.status === "healthy";
    return {
      signal: "vercel_health",
      ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      attempt,
      detail: ok ? { status: json.status } : { body: text.slice(0, 200) },
    };
  } catch (error) {
    return {
      signal: "vercel_health",
      ok: false,
      status: 599,
      durationMs: Date.now() - startedAt,
      detail: {
        error: error instanceof Error ? error.message : "health_check_failed",
      },
    };
  }
}

async function postChat({ message, conversationId, runId, label }) {
  const startedAt = Date.now();
  if (dryRun) {
    return {
      signal: label,
      ok: true,
      status: 200,
      durationMs: 0,
      responseSource: label === "chat_canned" ? "canned" : "llm",
      responseText: `DRY_RUN: ${message.slice(0, 40)}`,
      conversationId: conversationId || `dry-${Math.random().toString(16).slice(2)}`,
    };
  }

  const body = {
    message,
    bot_slug: botSlug,
    stream: false,
    conversation_id: conversationId || null,
    source: "watch_smoke",
    source_detail: {
      origin: "synthetic",
      run_id: runId,
      scenario: "smoke",
      step: label,
    },
  };

  try {
    const { response, attempt } = await fetchWithRetry(`${baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // keep null
    }

    const responseText = normalizeResponseText(json);
    const responseSource = json?.response_source ?? null;
    const ok =
      response.ok &&
      responseText.length > 0 &&
      (label !== "chat_canned" || responseSource === "canned") &&
      (label !== "chat_llm" ||
        responseSource === "llm" ||
        responseSource === "cache");

    return {
      signal: label,
      ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      attempt,
      responseSource,
      responseText: responseText.slice(0, 500),
      conversationId: json?.conversationId ?? conversationId ?? null,
      detail: ok
        ? undefined
        : {
            responseSource,
            body: text.slice(0, 300),
          },
    };
  } catch (error) {
    return {
      signal: label,
      ok: false,
      status: 599,
      durationMs: Date.now() - startedAt,
      detail: {
        error: error instanceof Error ? error.message : "chat_request_failed",
      },
    };
  }
}

function toAnomalies(checks) {
  return checks
    .filter((check) => !check.ok)
    .map((check) => ({
      severity: "hard",
      signal: check.signal,
      message:
        check.detail?.error ||
        `Check failed (${check.signal}) with status ${check.status}`,
      metadata: {
        status: check.status,
        durationMs: check.durationMs,
        ...check.detail,
      },
    }));
}

async function main() {
  if (!dryRun && !apiKey) {
    console.error("Missing WATCH_SMOKE_API_KEY (or API_KEY) env var.");
    process.exit(1);
  }

  const runId = buildRunId();
  const startedAt = new Date();
  const t0 = Date.now();

  const health = await checkHealth(runId);
  const canned = await postChat({
    message: CANNED_PROMPT,
    runId,
    label: "chat_canned",
  });
  const llm = await postChat({
    message: LLM_PROMPT,
    conversationId: canned.conversationId,
    runId,
    label: "chat_llm",
  });

  const checks = [health, canned, llm];
  const anomalies = toAnomalies(checks);
  const finishedAt = new Date();
  const status = anomalies.length === 0 ? "pass" : "fail";

  const report = {
    run_id: runId,
    scenario: "smoke",
    target_url: baseUrl,
    bot_slug: botSlug,
    status,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: Date.now() - t0,
    checks,
    anomalies,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(status === "pass" ? 0 : 1);
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      run_id: buildRunId(),
      scenario: "smoke",
      status: "error",
      error: error instanceof Error ? error.message : "unknown_error",
    }),
  );
  process.exit(1);
});
