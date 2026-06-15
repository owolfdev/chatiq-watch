import Link from "next/link";
import { Activity, Bell, LogOut, Radar } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { requireWatchAdmin } from "@/lib/auth/require-watch-admin";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireWatchAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Radar className="h-6 w-6 text-[var(--color-primary)]" />
            <div>
              <p className="font-semibold">Watch</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                ChatIQ health monitor
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-[var(--color-card)]"
            >
              <Activity className="h-4 w-4" />
              Status
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-[var(--color-card)]"
            >
              <Bell className="h-4 w-4" />
              Alerts
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 hover:bg-[var(--color-card)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </nav>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-3 text-xs text-[var(--color-muted-foreground)]">
          Signed in as {profile.full_name || profile.email || "platform admin"}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
