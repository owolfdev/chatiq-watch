import webpush from "web-push";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/utils/supabase/admin";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const env = getServerEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

export async function sendWatchPushAlert({
  title,
  body,
  url,
}: {
  title: string;
  body: string;
  url?: string;
}) {
  if (!ensureVapidConfigured()) {
    console.warn("Watch push skipped: missing VAPID keys.");
    return { sent: 0 };
  }

  const supabase = createAdminClient();
  const watchUrl = getServerEnv().NEXT_PUBLIC_WATCH_URL;

  const { data: preferences, error: prefsError } = await supabase
    .from("bot_watch_notification_preferences")
    .select("user_id, push_enabled, hard_fail_only")
    .eq("push_enabled", true);

  if (prefsError) {
    console.error("Failed to load Watch notification preferences:", prefsError);
    return { sent: 0 };
  }

  const userIds = (preferences ?? []).map((pref) => pref.user_id).filter(Boolean);
  if (userIds.length === 0) return { sent: 0 };

  const { data: subscriptions, error: subsError } = await supabase
    .from("bot_watch_push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", userIds)
    .is("disabled_at", null);

  if (subsError) {
    console.error("Failed to load Watch push subscriptions:", subsError);
    return { sent: 0 };
  }

  const payload = JSON.stringify({
    title,
    body,
    url: url || watchUrl,
    tag: "chatiq-watch-alert",
  });

  let sent = 0;
  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("bot_watch_push_subscriptions")
            .update({ disabled_at: new Date().toISOString() })
            .eq("id", subscription.id);
          return;
        }

        console.error("Failed to send Watch push notification:", error);
      }
    }),
  );

  return { sent };
}
