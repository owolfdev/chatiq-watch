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

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;

  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const { error: subError } = await supabase
    .from("bot_watch_push_subscriptions")
    .update({ disabled_at: new Date().toISOString() })
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (subError) {
    console.error("Failed to disable Watch push subscription:", subError.message);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }

  const { error: prefError } = await supabase
    .from("bot_watch_notification_preferences")
    .upsert(
      {
        user_id: user.id,
        push_enabled: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (prefError) {
    console.error("Failed to update Watch notification preferences:", prefError.message);
  }

  return NextResponse.json({ success: true });
}
