import { NextResponse } from "next/server";

import { getFleetOverview } from "@/lib/stats/fleet-overview";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const stats = await getFleetOverview(admin);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to load fleet stats:", error);
    return NextResponse.json(
      { error: "Failed to load fleet stats" },
      { status: 500 },
    );
  }
}
