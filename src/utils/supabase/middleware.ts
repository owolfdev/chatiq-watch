import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getCookieDomain } from "@/utils/supabase/cookie-domain";

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    clientKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const pathname = request.nextUrl.pathname;
  const { url, clientKey } = getSupabaseConfig();

  if (!url || !clientKey) {
    return response;
  }

  const cookieDomain = getCookieDomain({
    hostname: request.nextUrl.hostname,
  });

  const supabase = createServerClient(url, clientKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...(options ?? {}),
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          });
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export function isPublicPath(pathname: string) {
  return (
    pathname === "/sign-in" ||
    pathname === "/not-authorized" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icon-")
  );
}

export async function enforceWatchAccess(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname)) {
    return updateSession(request);
  }

  const { url, clientKey } = getSupabaseConfig();
  if (!url || !clientKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const response = NextResponse.next({ request: { headers: request.headers } });
  const cookieDomain = getCookieDomain({
    hostname: request.nextUrl.hostname,
  });

  const supabase = createServerClient(url, clientKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...(options ?? {}),
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          });
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return NextResponse.redirect(new URL("/not-authorized", request.url));
  }

  return response;
}
