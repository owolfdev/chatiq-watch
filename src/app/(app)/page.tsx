import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { getRecentWatchRuns } from "@/app/actions/watch-data";
import { StatusRefreshButton } from "@/app/(app)/status-refresh-button";

export const dynamic = "force-dynamic";

function statusColor(status: string) {
  if (status === "pass") return "text-[var(--color-primary)]";
  if (status === "fail") return "text-[var(--color-danger)]";
  return "text-[var(--color-warning)]";
}

export default async function StatusPage() {
  const runs = await getRecentWatchRuns(20);
  const latest = runs[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platform status</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Synthetic smoke checks against prod — health, canned chat, and LLM path.
          </p>
        </div>
        <StatusRefreshButton />
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start gap-4">
          {latest?.status === "pass" ? (
            <CheckCircle2 className="h-8 w-8 text-[var(--color-primary)]" />
          ) : latest ? (
            <AlertTriangle className="h-8 w-8 text-[var(--color-danger)]" />
          ) : (
            <Clock3 className="h-8 w-8 text-[var(--color-muted-foreground)]" />
          )}
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {latest
                ? latest.status === "pass"
                  ? "All checks passing"
                  : "Latest smoke run failed"
                : "No runs recorded yet"}
            </p>
            {latest ? (
              <>
                <p className={`text-sm font-medium ${statusColor(latest.status)}`}>
                  {latest.status.toUpperCase()} · {latest.target_url}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatDistanceToNow(new Date(latest.started_at), {
                    addSuffix: true,
                  })}{" "}
                  · {latest.duration_ms}ms
                  {latest.anomaly_count > 0
                    ? ` · ${latest.anomaly_count} anomal${latest.anomaly_count === 1 ? "y" : "ies"}`
                    : ""}
                  {latest.failed_signals.length > 0
                    ? ` (${latest.failed_signals.join(", ")})`
                    : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Runs appear here after the Vercel cron executes or you trigger{" "}
                <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5">
                  /api/cron/smoke
                </code>
                .
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Recent runs</h2>
        {runs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted-foreground)]">
            No synthetic run history in the database yet. Apply the Watch migration on
            Supabase if you have not already.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Failed checks</th>
                  <th className="px-4 py-3 font-medium">Run ID</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-t border-[var(--color-border)] bg-[var(--color-card)]"
                  >
                    <td className={`px-4 py-3 font-medium ${statusColor(run.status)}`}>
                      {run.status}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                      {formatDistanceToNow(new Date(run.started_at), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-4 py-3">{run.duration_ms}ms</td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                      {run.failed_signals.length > 0
                        ? run.failed_signals.join(", ")
                        : run.anomaly_count > 0
                          ? `${run.anomaly_count}`
                          : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">
                      {run.run_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
