import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";
import { sendWatchPushAlert } from "@/lib/notifications/send-watch-push";
import { persistSmokeRun, resolveWatchCanaryIds } from "@/lib/watch/persist-run";
import { runSmokeTest } from "@/lib/watch/run-smoke";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const env = getServerEnv();
  if (!env.CRON_SECRET) {
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${env.CRON_SECRET}`) {
    return true;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === env.CRON_SECRET;
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getServerEnv();
  if (!env.WATCH_SMOKE_API_KEY) {
    return NextResponse.json(
      { error: "WATCH_SMOKE_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const report = await runSmokeTest({
    baseUrl: env.MAIN_APP_URL,
    apiKey: env.WATCH_SMOKE_API_KEY,
    botSlug: env.WATCH_BOT_SLUG,
  });

  const admin = createAdminClient();
  const canary = await resolveWatchCanaryIds(admin);

  try {
    await persistSmokeRun({
      supabase: admin,
      report,
      teamId: canary.teamId,
      botId: canary.botId,
    });
  } catch (error) {
    console.error("Failed to persist smoke run:", error);
  }

  if (report.status === "fail" || report.status === "error") {
    const failedSignals = report.anomalies.map((a) => a.signal).join(", ");
    await sendWatchPushAlert({
      title: "ChatIQ Watch — smoke failed",
      body:
        report.error ||
        (failedSignals
          ? `Failed checks: ${failedSignals}`
          : "Synthetic smoke test failed."),
      url: env.NEXT_PUBLIC_WATCH_URL,
    });
  }

  return NextResponse.json(report, {
    status: report.status === "pass" ? 200 : 500,
  });
}
