"use client";

import { useEffect, useCallback } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

/**
 * useConsoleInsights — fetches Console insights for the LEARN Zone.
 *
 * Fetches on mount and polls every 60 seconds (insights change less
 * frequently than flag state).
 */
export function useConsoleInsights() {
  const token = useAppStore((s) => s.token);

  const setInsights = useConsoleStore((s) => s.setInsights);
  const setZoneLoading = useConsoleStore((s) => s.setZoneLoading);
  const setZoneError = useConsoleStore((s) => s.setZoneError);

  const fetch = useCallback(async () => {
    if (!token) return;
    if (!api.console) {
      if (process.env.NODE_ENV === "development") {
        console.error("[useConsoleInsights] api.console is undefined");
      }
      return;
    }
    setZoneLoading("insights", true);
    setZoneError("insights", null);
    try {
      const result = await api.console.getInsights(token);
      setInsights(result);
    } catch (err) {
      setZoneError(
        "insights",
        err instanceof Error ? err.message : "Failed to load insights",
      );
    } finally {
      setZoneLoading("insights", false);
    }
  }, [token, setInsights, setZoneLoading, setZoneError]);

  // Fetch on mount
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Poll every 60 seconds (insights change less frequently)
  useEffect(() => {
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { refetch: fetch };
}
