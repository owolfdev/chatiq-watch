"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

export function StatusRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastRefreshedAt(new Date());
    });
  }, [router]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={refresh}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm hover:bg-[var(--color-card)] disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Refresh
      </button>
      {lastRefreshedAt ? (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Updated {lastRefreshedAt.toLocaleTimeString()}
        </span>
      ) : (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Cron runs every 15 min — not live
        </span>
      )}
    </div>
  );
}
