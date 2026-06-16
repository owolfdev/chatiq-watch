"use server";

import { requireWatchAdmin } from "@/lib/auth/require-watch-admin";
import {
  getFleetOverview,
  type FleetOverview,
} from "@/lib/stats/fleet-overview";
import { createAdminClient } from "@/utils/supabase/admin";

export async function fetchFleetOverview(): Promise<FleetOverview> {
  await requireWatchAdmin();
  const admin = createAdminClient();
  return getFleetOverview(admin);
}
