import { fetchFleetOverview } from "@/app/actions/fleet-stats";

function formatChange(value: number | null) {
  if (value === null) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}%`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function StatsPage() {
  const stats = await fetchFleetOverview();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Fleet stats</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Last {stats.periodDays} days vs previous {stats.periodDays} days.
          {stats.opsTeamExcluded
            ? " ChatIQ Ops / synthetic traffic excluded."
            : ""}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Conversations"
          value={stats.conversations.thisPeriod.toLocaleString()}
          hint={`Previous: ${stats.conversations.previousPeriod.toLocaleString()} (${formatChange(stats.conversations.changePercent)})`}
        />
        <StatCard
          label="AI containment"
          value={
            stats.containment.rate !== null
              ? `${stats.containment.rate}%`
              : "—"
          }
          hint={`${stats.containment.withoutTakeover} of ${stats.containment.total} without human takeover`}
        />
        <StatCard
          label="Teams near plan limit"
          value={String(stats.planPressure.length)}
          hint="≥80% of monthly message quota"
        />
        <StatCard
          label="Active channels"
          value={String(stats.channels.length)}
          hint={
            stats.channelsTruncated
              ? "Channel mix sampled (large volume)"
              : "By conversation source"
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="text-lg font-medium">Plan pressure</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Teams at or above 80% of monthly OpenAI message quota.
          </p>
          {stats.planPressure.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              No teams near limit this month.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.planPressure.map((team) => (
                <li
                  key={team.teamId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>
                    {team.teamName}{" "}
                    <span className="text-[var(--color-muted-foreground)]">
                      ({team.plan})
                    </span>
                  </span>
                  <span className="font-medium">
                    {team.used.toLocaleString()} / {team.limit?.toLocaleString()}{" "}
                    ({team.percentUsed}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="text-lg font-medium">Volume by channel</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Conversation sources this period.
          </p>
          {stats.channels.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
              No conversations in this period.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.channels.map((row) => (
                <li
                  key={row.source}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{row.source}</span>
                  <span className="text-[var(--color-muted-foreground)]">
                    {row.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="text-lg font-medium">Teams by volume</h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Top teams by conversations this period.
        </p>
        {stats.topTeams.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
            No team activity in this period.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="pb-2 font-medium">Team</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Conversations</th>
                  <th className="pb-2 font-medium">WoW</th>
                  <th className="pb-2 font-medium">Containment</th>
                </tr>
              </thead>
              <tbody>
                {stats.topTeams.map((team) => (
                  <tr
                    key={team.teamId}
                    className="border-t border-[var(--color-border)]"
                  >
                    <td className="py-2">{team.teamName}</td>
                    <td className="py-2 text-[var(--color-muted-foreground)]">
                      {team.plan}
                    </td>
                    <td className="py-2">{team.conversationsThisPeriod}</td>
                    <td className="py-2">{formatChange(team.changePercent)}</td>
                    <td className="py-2">
                      {team.containmentRate !== null
                        ? `${team.containmentRate}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        API:{" "}
        <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5">
          GET /api/stats/fleet
        </code>{" "}
        (platform admin session)
      </p>
    </div>
  );
}
