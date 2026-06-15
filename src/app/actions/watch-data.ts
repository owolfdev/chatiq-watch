"use server";

import { createClient } from "@/utils/supabase/server";
import { requireWatchAdmin } from "@/lib/auth/require-watch-admin";

export type WatchRunSummary = {
  id: string;
  run_id: string;
  scenario: string;
  status: string;
  target_url: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  anomaly_count: number;
  failed_signals: string[];
};

export async function getRecentWatchRuns(limit = 20): Promise<WatchRunSummary[]> {
  await requireWatchAdmin();
  const supabase = await createClient();

  const { data: runs, error } = await supabase
    .from("bot_synthetic_runs")
    .select("id, run_id, scenario, status, target_url, started_at, finished_at, duration_ms")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !runs) {
    console.error("Failed to load Watch runs:", error?.message);
    return [];
  }

  const runIds = runs.map((run) => run.id);
  const { data: anomalies } = await supabase
    .from("bot_synthetic_anomalies")
    .select("run_id, signal")
    .in("run_id", runIds);

  const counts = new Map<string, number>();
  const signalsByRun = new Map<string, string[]>();
  for (const row of anomalies ?? []) {
    counts.set(row.run_id, (counts.get(row.run_id) ?? 0) + 1);
    const existing = signalsByRun.get(row.run_id) ?? [];
    existing.push(row.signal);
    signalsByRun.set(row.run_id, existing);
  }

  return runs.map((run) => ({
    ...run,
    anomaly_count: counts.get(run.id) ?? 0,
    failed_signals: signalsByRun.get(run.id) ?? [],
  }));
}

export async function getWatchPushPreference() {
  const { user, supabase } = await requireWatchAdmin();
  const { data } = await supabase
    .from("bot_watch_notification_preferences")
    .select("push_enabled, hard_fail_only")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    pushEnabled: data?.push_enabled ?? false,
    hardFailOnly: data?.hard_fail_only ?? true,
  };
}
