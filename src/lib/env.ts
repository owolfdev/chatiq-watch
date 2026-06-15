const SUPABASE_CLIENT_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUPABASE_ADMIN_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function readRequired(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPublicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: SUPABASE_CLIENT_KEY || "",
    watchUrl: process.env.NEXT_PUBLIC_WATCH_URL || "http://localhost:3002",
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  };
}

export function getServerEnv() {
  return {
    SUPABASE_URL: readRequired(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    SUPABASE_CLIENT_KEY: readRequired("SUPABASE client key", SUPABASE_CLIENT_KEY),
    SUPABASE_ADMIN_KEY: readRequired("SUPABASE admin key", SUPABASE_ADMIN_KEY),
    NEXT_PUBLIC_WATCH_URL:
      process.env.NEXT_PUBLIC_WATCH_URL || "http://localhost:3002",
    MAIN_APP_URL: process.env.MAIN_APP_URL || "https://www.chatiq.io",
    WATCH_SMOKE_API_KEY: process.env.WATCH_SMOKE_API_KEY || "",
    WATCH_BOT_SLUG: process.env.WATCH_BOT_SLUG || "watch-canary",
    CRON_SECRET: process.env.CRON_SECRET || "",
    VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
    VAPID_SUBJECT: process.env.VAPID_SUBJECT || "mailto:support@chatiq.io",
  } as const;
}

/** @deprecated use getServerEnv() in server-only code */
export const env = {
  get SUPABASE_URL() {
    return getServerEnv().SUPABASE_URL;
  },
  get SUPABASE_CLIENT_KEY() {
    return getServerEnv().SUPABASE_CLIENT_KEY;
  },
  get SUPABASE_ADMIN_KEY() {
    return getServerEnv().SUPABASE_ADMIN_KEY;
  },
  get NEXT_PUBLIC_WATCH_URL() {
    return getServerEnv().NEXT_PUBLIC_WATCH_URL;
  },
  get MAIN_APP_URL() {
    return getServerEnv().MAIN_APP_URL;
  },
  get WATCH_SMOKE_API_KEY() {
    return getServerEnv().WATCH_SMOKE_API_KEY;
  },
  get WATCH_BOT_SLUG() {
    return getServerEnv().WATCH_BOT_SLUG;
  },
  get CRON_SECRET() {
    return getServerEnv().CRON_SECRET;
  },
  get VAPID_PUBLIC_KEY() {
    return getServerEnv().VAPID_PUBLIC_KEY;
  },
  get VAPID_PRIVATE_KEY() {
    return getServerEnv().VAPID_PRIVATE_KEY;
  },
  get VAPID_SUBJECT() {
    return getServerEnv().VAPID_SUBJECT;
  },
};
