import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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

  const body = await request.json().catch(() => null);
  const subscription = body?.subscription;

  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return NextResponse.json(
      { error: "Invalid subscription payload" },
      { status: 400 },
    );
  }

  const { error: subError } = await supabase.from("bot_watch_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: typeof body?.userAgent === "string" ? body.userAgent : null,
      last_seen: new Date().toISOString(),
      disabled_at: null,
    },
    { onConflict: "endpoint" },
  );

  if (subError) {
    console.error("Failed to store Watch push subscription:", subError.message);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  const { error: prefError } = await supabase.from("bot_watch_notification_preferences").upsert(
    {
      user_id: user.id,
      push_enabled: true,
      hard_fail_only: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (prefError) {
    console.error("Failed to update Watch notification preferences:", prefError.message);
  }

  return NextResponse.json({ success: true });
}
