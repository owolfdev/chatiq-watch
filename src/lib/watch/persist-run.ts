import type { SupabaseClient } from "@supabase/supabase-js";

import type { SmokeAnomaly, SmokeReport } from "@/lib/watch/run-smoke";

export async function persistSmokeRun({
  supabase,
  report,
  teamId,
  botId,
}: {
  supabase: SupabaseClient;
  report: SmokeReport;
  teamId?: string | null;
  botId?: string | null;
}) {
  const { data: runRow, error: runError } = await supabase
    .from("bot_synthetic_runs")
    .insert({
      run_id: report.run_id,
      team_id: teamId ?? null,
      bot_id: botId ?? null,
      scenario: report.scenario,
      target_url: report.target_url,
      status: report.status,
      started_at: report.started_at,
      finished_at: report.finished_at,
      duration_ms: report.duration_ms,
      report,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    throw new Error(runError?.message || "Failed to persist synthetic run");
  }

  if (report.anomalies.length > 0) {
    const rows = report.anomalies.map((anomaly: SmokeAnomaly) => ({
      run_id: runRow.id,
      severity: anomaly.severity,
      signal: anomaly.signal,
      message: anomaly.message,
      metadata: anomaly.metadata,
    }));

    const { error: anomalyError } = await supabase
      .from("bot_synthetic_anomalies")
      .insert(rows);

    if (anomalyError) {
      throw new Error(anomalyError.message || "Failed to persist anomalies");
    }
  }

  return runRow.id;
}

export async function resolveWatchCanaryIds(supabase: SupabaseClient) {
  const botSlug = process.env.WATCH_BOT_SLUG || "watch-canary";
  const { data: bot } = await supabase
    .from("bot_bots")
    .select("id, team_id, slug")
    .eq("slug", botSlug)
    .maybeSingle();

  return {
    botId: bot?.id ?? null,
    teamId: bot?.team_id ?? null,
    slug: bot?.slug ?? botSlug,
  };
}
