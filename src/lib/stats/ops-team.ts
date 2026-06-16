import type { SupabaseClient } from "@supabase/supabase-js";

const WATCH_BOT_SLUG = process.env.WATCH_BOT_SLUG || "watch-canary";

/** Ops team owns the canary — exclude from fleet/client stats. */
export async function resolveOpsTeamId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data: bot } = await supabase
    .from("bot_bots")
    .select("team_id")
    .eq("slug", WATCH_BOT_SLUG)
    .maybeSingle();

  return bot?.team_id ?? null;
}
