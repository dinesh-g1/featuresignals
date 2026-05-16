"use client";

import { useEffect, useCallback } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

/**
 * useConsoleData — fetches Console flag data for the Lifecycle Zone.
 *
 * Reads filter state from `useConsoleStore` (stage, environment, project,
 * sort) and writes results back via `setFeatures`, `setZoneLoading`,
 * `setZoneError`, and `setLastUpdated`.
 *
 * Fetches on mount + filter changes, and polls every 30 seconds.
 */
export function useConsoleData() {
  const token = useAppStore((s) => s.token);

  const selectedStage = useConsoleStore((s) => s.selectedStage);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const sortBy = useConsoleStore((s) => s.sortBy);
  const projectFilter = useConsoleStore((s) => s.projectFilter);
  const retryTrigger = useConsoleStore((s) => s.retryTrigger);

  const setFeatures = useConsoleStore((s) => s.setFeatures);
  const setZoneLoading = useConsoleStore((s) => s.setZoneLoading);
  const setZoneError = useConsoleStore((s) => s.setZoneError);
  const setLastUpdated = useConsoleStore((s) => s.setLastUpdated);

  const fetch = useCallback(async () => {
    if (!token) return;
    if (!api.console) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[useConsoleData] api.console is undefined — cannot fetch features",
        );
      }
      return;
    }
    setZoneLoading("features", true);
    setZoneError("features", null);
    try {
      const result = await api.console.listFlags(token, {
        limit: 100,
        offset: 0,
        stage: selectedStage ?? undefined,
        environment: selectedEnvironment,
        projectId: projectFilter || undefined,
        sort: sortBy,
      });
      setFeatures(result.data, result.total);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setZoneError(
        "features",
        err instanceof Error ? err.message : "Failed to load features",
      );
    } finally {
      setZoneLoading("features", false);
    }
  }, [
    token,
    selectedStage,
    selectedEnvironment,
    sortBy,
    projectFilter,
    retryTrigger,
    setFeatures,
    setZoneLoading,
    setZoneError,
    setLastUpdated,
  ]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { refetch: fetch };
}
