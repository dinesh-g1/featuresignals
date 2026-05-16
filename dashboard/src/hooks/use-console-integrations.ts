"use client";

import { useEffect, useCallback } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

/**
 * useConsoleIntegrations — fetches integration status for the CONNECT Zone.
 *
 * Fetches on mount and polls every 60 seconds (SDK/agent status changes
 * less frequently than flag state).
 */
export function useConsoleIntegrations() {
  const token = useAppStore((s) => s.token);

  const setIntegrations = useConsoleStore((s) => s.setIntegrations);
  const setZoneLoading = useConsoleStore((s) => s.setZoneLoading);
  const setZoneError = useConsoleStore((s) => s.setZoneError);

  const fetch = useCallback(async () => {
    if (!token) return;
    if (!api.console) {
      if (process.env.NODE_ENV === "development") {
        console.error("[useConsoleIntegrations] api.console is undefined");
      }
      return;
    }
    setZoneLoading("integrations", true);
    setZoneError("integrations", null);
    try {
      const result = await api.console.getIntegrations(token);
      setIntegrations(result);
    } catch (err) {
      setZoneError(
        "integrations",
        err instanceof Error ? err.message : "Failed to load integrations",
      );
    } finally {
      setZoneLoading("integrations", false);
    }
  }, [token, setIntegrations, setZoneLoading, setZoneError]);

  // Fetch on mount
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Poll every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { refetch: fetch };
}
