import { getWatchPushPreference } from "@/app/actions/watch-data";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const prefs = await getWatchPushPreference();
  return <SettingsClient initialPushEnabled={prefs.pushEnabled} />;
}
