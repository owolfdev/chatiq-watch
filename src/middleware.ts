import { type NextRequest } from "next/server";

import { enforceWatchAccess } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return enforceWatchAccess(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
