"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 10_000;

export function DashboardRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPolling, setIsPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (pollInFlight.current) return;

    pollInFlight.current = true;
    setIsPolling(true);
    setPollError(null);

    try {
      const response = await fetch("/api/cron/poll-devin", {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Polling failed with ${response.status}`);
      }

      setLastRefresh(new Date());
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setPollError(error instanceof Error ? error.message : String(error));
    } finally {
      pollInFlight.current = false;
      setIsPolling(false);
    }
  }, [router]);

  useEffect(() => {
    setLastRefresh(new Date());
    const interval = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return (
    <div className="refreshStatus" aria-live="polite">
      <span>{isPending || isPolling ? "Polling Devin..." : "Auto-poll on"}</span>
      <small>
        {pollError
          ? "Last poll failed"
          : lastRefresh
          ? `Last checked ${lastRefresh.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}`
          : "Starting"}
      </small>
      <button type="button" onClick={() => void refresh()} disabled={isPolling}>
        Poll now
      </button>
    </div>
  );
}
