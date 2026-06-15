import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerEnv } from "@/lib/env";
import { getCookieDomain } from "@/utils/supabase/cookie-domain";

export async function createClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const cookieDomain = getCookieDomain({ appUrl: env.NEXT_PUBLIC_WATCH_URL });

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_CLIENT_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          if (typeof cookieStore.set !== "function") return;
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...(options ?? {}),
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            });
          }
        } catch {
          // Ignored when called from a Server Component without mutable cookies.
        }
      },
    },
  });
}
