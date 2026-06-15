export type SmokeCheck = {
  signal: string;
  ok: boolean;
  status: number;
  durationMs: number;
  attempt?: number;
  responseSource?: string | null;
  responseText?: string;
  conversationId?: string | null;
  detail?: Record<string, unknown>;
};

export type SmokeAnomaly = {
  severity: "hard" | "soft";
  signal: string;
  message: string;
  metadata: Record<string, unknown>;
};

export type SmokeReport = {
  run_id: string;
  scenario: string;
  target_url: string;
  bot_slug: string;
  status: "pass" | "fail" | "error";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  checks: SmokeCheck[];
  anomalies: SmokeAnomaly[];
  error?: string;
};

const CANNED_PROMPT = "hello";
const LLM_PROMPT =
  "Reply in one short English sentence confirming you received this Watch smoke test.";

function buildRunId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `watch-smoke-${stamp}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeResponseText(payload: Record<string, unknown> | null) {
  if (Array.isArray(payload?.responses) && payload.responses.length > 0) {
    return payload.responses.filter((v) => typeof v === "string").join("\n\n").trim();
  }
  if (typeof payload?.response === "string") {
    return payload.response.trim();
  }
  return "";
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  requestTimeoutMs: number,
  maxRetries: number,
) {
  let lastError: unknown = null;
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

function toAnomalies(checks: SmokeCheck[]): SmokeAnomaly[] {
  return checks
    .filter((check) => !check.ok)
    .map((check) => ({
      severity: "hard" as const,
      signal: check.signal,
      message:
        (typeof check.detail?.error === "string" && check.detail.error) ||
        `Check failed (${check.signal}) with status ${check.status}`,
      metadata: {
        status: check.status,
        durationMs: check.durationMs,
        ...check.detail,
      },
    }));
}

export async function runSmokeTest(options: {
  baseUrl: string;
  apiKey: string;
  botSlug: string;
  dryRun?: boolean;
  requestTimeoutMs?: number;
  maxRetries?: number;
}): Promise<SmokeReport> {
  const {
    baseUrl,
    apiKey,
    botSlug,
    dryRun = false,
    requestTimeoutMs = 15000,
    maxRetries = 1,
  } = options;

  const runId = buildRunId();
  const startedAt = new Date();
  const t0 = Date.now();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  async function checkHealth(): Promise<SmokeCheck> {
    const started = Date.now();
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
      const { response, attempt } = await fetchWithRetry(
        `${baseUrl}/api/v1/health`,
        { method: "GET", headers: { Accept: "application/json" } },
        requestTimeoutMs,
        maxRetries,
      );
      const text = await response.text();
      let json: Record<string, unknown> | null = null;
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = null;
      }
      const ok = response.ok && json?.status === "healthy";
      return {
        signal: "vercel_health",
        ok,
        status: response.status,
        durationMs: Date.now() - started,
        attempt,
        detail: ok ? { status: json?.status } : { body: text.slice(0, 200) },
      };
    } catch (error) {
      return {
        signal: "vercel_health",
        ok: false,
        status: 599,
        durationMs: Date.now() - started,
        detail: {
          error: error instanceof Error ? error.message : "health_check_failed",
        },
      };
    }
  }

  async function postChat({
    message,
    conversationId,
    label,
  }: {
    message: string;
    conversationId?: string | null;
    label: string;
  }): Promise<SmokeCheck> {
    const started = Date.now();
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
      const { response, attempt } = await fetchWithRetry(
        `${baseUrl}/api/chat`,
        { method: "POST", headers, body: JSON.stringify(body) },
        requestTimeoutMs,
        maxRetries,
      );
      const text = await response.text();
      let json: Record<string, unknown> | null = null;
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = null;
      }

      const responseText = normalizeResponseText(json);
      const responseSource =
        typeof json?.response_source === "string" ? json.response_source : null;
      const ok =
        response.ok &&
        responseText.length > 0 &&
        (label !== "chat_canned" || responseSource === "canned") &&
        (label !== "chat_llm" || responseSource === "llm");

      return {
        signal: label,
        ok,
        status: response.status,
        durationMs: Date.now() - started,
        attempt,
        responseSource,
        responseText: responseText.slice(0, 500),
        conversationId:
          typeof json?.conversationId === "string"
            ? json.conversationId
            : conversationId ?? null,
        detail: ok
          ? undefined
          : { responseSource, body: text.slice(0, 300) },
      };
    } catch (error) {
      return {
        signal: label,
        ok: false,
        status: 599,
        durationMs: Date.now() - started,
        detail: {
          error: error instanceof Error ? error.message : "chat_request_failed",
        },
      };
    }
  }

  try {
    const health = await checkHealth();
    const canned = await postChat({ message: CANNED_PROMPT, label: "chat_canned" });
    const llm = await postChat({
      message: LLM_PROMPT,
      conversationId: canned.conversationId,
      label: "chat_llm",
    });

    const checks = [health, canned, llm];
    const anomalies = toAnomalies(checks);
    const finishedAt = new Date();

    return {
      run_id: runId,
      scenario: "smoke",
      target_url: baseUrl,
      bot_slug: botSlug,
      status: anomalies.length === 0 ? "pass" : "fail",
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: Date.now() - t0,
      checks,
      anomalies,
    };
  } catch (error) {
    const finishedAt = new Date();
    return {
      run_id: runId,
      scenario: "smoke",
      target_url: baseUrl,
      bot_slug: botSlug,
      status: "error",
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: Date.now() - t0,
      checks: [],
      anomalies: [],
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
