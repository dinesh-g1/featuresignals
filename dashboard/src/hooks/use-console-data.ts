"use client";

import { useEffect, useCallback } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

/**
 * useConsoleData — fetches Console flag data for the Lifecycle Zone
 * and the shared project list.
 *
 * Reads filter state from `useConsoleStore` (stage, environment, project,
 * sort) and writes results back via `setFeatures`, `setZoneLoading`,
 * `setZoneError`, and `setLastUpdated`.
 *
 * Fetches on mount + filter changes, and polls every 30 seconds.
 * Projects are fetched once on mount (not polled).
 */
export function useConsoleData() {
  const token = useAppStore((s) => s.token);
  const expiresAt = useAppStore((s) => s.expires_at);
  const currentProjectId = useAppStore((s) => s.current_project_id);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);

  const selectedStage = useConsoleStore((s) => s.selectedStage);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const sortBy = useConsoleStore((s) => s.sortBy);
  const projectFilter = useConsoleStore((s) => s.projectFilter);
  const retryTrigger = useConsoleStore((s) => s.retryTrigger);

  const setFeatures = useConsoleStore((s) => s.setFeatures);
  const setZoneLoading = useConsoleStore((s) => s.setZoneLoading);
  const setZoneError = useConsoleStore((s) => s.setZoneError);
  const setLastUpdated = useConsoleStore((s) => s.setLastUpdated);
  const setProjects = useConsoleStore((s) => s.setProjects);
  const setProjectsLoading = useConsoleStore((s) => s.setProjectsLoading);
  const setProjectsError = useConsoleStore((s) => s.setProjectsError);

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

  // ── Fetch Projects (once on mount, not polled) ──────────────────
  useEffect(() => {
    if (!token) {
      setProjectsLoading(false);
      return;
    }

    setProjectsLoading(true);
    setProjectsError(null);

    api
      .listProjects(token)
      .then((result) => {
        const arr: Project[] = Array.isArray(result)
          ? result
          : ((result as { data?: Project[] })?.data ?? []);
        setProjects(arr);

        // Auto-select first project if none selected
        if (!currentProjectId && arr.length > 0) {
          setCurrentProject(arr[0].id);
        }
      })
      .catch((err) => {
        setProjectsError(
          err instanceof Error ? err.message : "Failed to load projects",
        );
      })
      .finally(() => {
        setProjectsLoading(false);
      });
    // Intentionally exclude currentProjectId & setCurrentProject to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, expiresAt, retryTrigger]);

  return { refetch: fetch };
}
