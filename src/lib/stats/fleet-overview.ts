import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PLAN_MESSAGE_LIMITS,
  PLAN_WARNING_RATIO,
  type PlanId,
  percentUsed,
} from "@/lib/stats/plan-quotas";
import { resolveOpsTeamId } from "@/lib/stats/ops-team";

const PERIOD_DAYS = 7;

export type FleetTeamRow = {
  teamId: string;
  teamName: string;
  plan: string;
  conversationsThisPeriod: number;
  conversationsPreviousPeriod: number;
  changePercent: number | null;
  containmentRate: number | null;
};

export type FleetOverview = {
  periodDays: number;
  generatedAt: string;
  opsTeamExcluded: boolean;
  conversations: {
    thisPeriod: number;
    previousPeriod: number;
    changePercent: number | null;
  };
  containment: {
    rate: number | null;
    withoutTakeover: number;
    total: number;
  };
  planPressure: Array<{
    teamId: string;
    teamName: string;
    plan: string;
    used: number;
    limit: number | null;
    percentUsed: number | null;
  }>;
  channels: Array<{ source: string; count: number }>;
  channelsTruncated: boolean;
  topTeams: FleetTeamRow[];
};

function utcStartOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function changePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current > 0 ? 100 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function excludeOpsFilter<T extends { neq: (col: string, val: string) => T }>(
  query: T,
  opsTeamId: string | null,
): T {
  if (opsTeamId) {
    return query.neq("team_id", opsTeamId);
  }
  return query;
}

async function countConversationsInRange(
  supabase: SupabaseClient,
  opsTeamId: string | null,
  start: Date,
  end: Date,
  teamId?: string,
) {
  let query = supabase
    .from("bot_conversations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  query = excludeOpsFilter(query, teamId ? null : opsTeamId);
  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

async function countTakeoverConversations(
  supabase: SupabaseClient,
  opsTeamId: string | null,
  start: Date,
  end: Date,
  teamId?: string,
) {
  let query = supabase
    .from("bot_conversations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .eq("human_takeover", true);

  query = excludeOpsFilter(query, teamId ? null : opsTeamId);
  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

function aggregateChannels(
  rows: Array<{ source: string | null }>,
  limit: number,
) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.source?.trim() || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const channels = Array.from(counts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    channels,
    truncated: rows.length >= limit,
  };
}

export async function getFleetOverview(
  supabase: SupabaseClient,
): Promise<FleetOverview> {
  const opsTeamId = await resolveOpsTeamId(supabase);
  const now = new Date();
  const thisEnd = utcStartOfDay(addDays(now, 1));
  const thisStart = addDays(thisEnd, -PERIOD_DAYS);
  const previousEnd = thisStart;
  const previousStart = addDays(previousEnd, -PERIOD_DAYS);

  const [
    thisPeriod,
    previousPeriod,
    takeoverCount,
    channelRows,
    teams,
    quotaRows,
  ] = await Promise.all([
    countConversationsInRange(supabase, opsTeamId, thisStart, thisEnd),
    countConversationsInRange(supabase, opsTeamId, previousStart, previousEnd),
    countTakeoverConversations(supabase, opsTeamId, thisStart, thisEnd),
    (async () => {
      let query = supabase
        .from("bot_conversations")
        .select("source")
        .gte("created_at", thisStart.toISOString())
        .lt("created_at", thisEnd.toISOString())
        .limit(5000);
      query = excludeOpsFilter(query, opsTeamId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    })(),
    (async () => {
      let query = supabase.from("bot_teams").select("id, name, plan");
      if (opsTeamId) {
        query = query.neq("id", opsTeamId);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    })(),
    (async () => {
      const monthStart = startOfUtcMonth(now).toISOString();
      const { data, error } = await supabase
        .from("bot_quota_usage")
        .select("team_id, openai_api_calls")
        .eq("month_start", monthStart);
      if (error) throw new Error(error.message);
      return data ?? [];
    })(),
  ]);

  const totalThisPeriod = thisPeriod;
  const withoutTakeover = Math.max(0, totalThisPeriod - takeoverCount);
  const containmentRate =
    totalThisPeriod > 0
      ? Math.round((withoutTakeover / totalThisPeriod) * 1000) / 10
      : null;

  const usageByTeam = new Map(
    quotaRows.map((row) => [row.team_id, row.openai_api_calls ?? 0]),
  );

  const planPressure = teams
    .map((team) => {
      const plan = (team.plan ?? "free") as PlanId;
      const limit = PLAN_MESSAGE_LIMITS[plan] ?? null;
      const used = usageByTeam.get(team.id) ?? 0;
      const pct = percentUsed(used, limit);
      return {
        teamId: team.id,
        teamName: team.name,
        plan,
        used,
        limit,
        percentUsed: pct,
      };
    })
    .filter((row) => {
      if (row.limit === null) return false;
      const ratio = row.used / row.limit;
      return ratio >= PLAN_WARNING_RATIO;
    })
    .sort((a, b) => (b.percentUsed ?? 0) - (a.percentUsed ?? 0));

  const { channels, truncated: channelsTruncated } = aggregateChannels(
    channelRows,
    5000,
  );

  const topTeamsRaw = await Promise.all(
    teams.map(async (team) => {
      const [teamThis, teamPrev, teamTakeover] = await Promise.all([
        countConversationsInRange(
          supabase,
          opsTeamId,
          thisStart,
          thisEnd,
          team.id,
        ),
        countConversationsInRange(
          supabase,
          opsTeamId,
          previousStart,
          previousEnd,
          team.id,
        ),
        countTakeoverConversations(
          supabase,
          opsTeamId,
          thisStart,
          thisEnd,
          team.id,
        ),
      ]);

      const teamTotal = teamThis;
      const teamContainment =
        teamTotal > 0
          ? Math.round(((teamTotal - teamTakeover) / teamTotal) * 1000) / 10
          : null;

      return {
        teamId: team.id,
        teamName: team.name,
        plan: team.plan ?? "free",
        conversationsThisPeriod: teamThis,
        conversationsPreviousPeriod: teamPrev,
        changePercent: changePercent(teamThis, teamPrev),
        containmentRate: teamContainment,
      };
    }),
  );

  topTeamsRaw.sort(
    (a, b) => b.conversationsThisPeriod - a.conversationsThisPeriod,
  );

  return {
    periodDays: PERIOD_DAYS,
    generatedAt: now.toISOString(),
    opsTeamExcluded: Boolean(opsTeamId),
    conversations: {
      thisPeriod: thisPeriod,
      previousPeriod: previousPeriod,
      changePercent: changePercent(thisPeriod, previousPeriod),
    },
    containment: {
      rate: containmentRate,
      withoutTakeover,
      total: totalThisPeriod,
    },
    planPressure,
    channels,
    channelsTruncated,
    topTeams: topTeamsRaw.slice(0, 10),
  };
}
