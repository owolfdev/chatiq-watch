import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function requireWatchAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/not-authorized");
  }

  return { supabase, user, profile };
}
