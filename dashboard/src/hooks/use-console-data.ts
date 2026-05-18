"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppStore } from "@/stores/app-store";
import { useConsoleStore } from "@/stores/console-store";
import { api } from "@/lib/api";
import type { Project, Environment } from "@/lib/types";

/**
 * useConsoleFeatures — TanStack Query hook for the Lifecycle Zone flag list.
 *
 * Reads filter state (stage, environment, project, sort) from the Console
 * store. Polls every 30 seconds. Components that previously read
 * `features`, `featuresTotal`, `featuresHasMore`, `loading.features`,
 * and `errors.features` from the Zustand store should use this instead.
 */
export function useConsoleFeatures() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.current_project_id);
  const selectedStage = useConsoleStore((s) => s.selectedStage);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const sortBy = useConsoleStore((s) => s.sortBy);
  const projectFilter = useConsoleStore((s) => s.projectFilter);
  const featuresLimit = useConsoleStore((s) => s.featuresLimit);

  return useQuery({
    queryKey: queryKeys.console.features({
      projectId: currentProjectId || projectFilter || undefined,
      stage: selectedStage ?? undefined,
      environment: selectedEnvironment,
      sort: sortBy,
      limit: featuresLimit,
    }),
    queryFn: () =>
      api.console.listFlags(token!, {
        limit: featuresLimit,
        offset: 0,
        projectId: currentProjectId || projectFilter || undefined,
        stage: selectedStage ?? undefined,
        environment: selectedEnvironment,
        sort: sortBy,
      }),
    enabled: !!token,
    refetchInterval: 30_000,
  });
}

/**
 * useProjects — TanStack Query hook for the organization's project list.
 *
 * Fetched once and cached for 5 minutes. Components that previously read
 * `projects`, `projectsLoading`, and `projectsError` from the Zustand
 * store should use this instead.
 */
export function useProjects() {
  const token = useAppStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => api.listProjects(token!, { limit: 50 }).then((r) => r.data),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
}

/**
 * useEnvironments — TanStack Query hook for a project's environment list.
 *
 * Automatically fetches when `currentProjectId` changes. Cached for
 * 5 minutes. Components that previously read `environments`,
 * `environmentsLoading`, and `environmentsError` from the Zustand
 * store should use this instead.
 */
export function useEnvironments() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.current_project_id);

  return useQuery({
    queryKey: queryKeys.environments.list(currentProjectId!),
    queryFn: () =>
      api
        .listEnvironments(token!, currentProjectId!, { limit: 20 })
        .then((r) => r.data),
    enabled: !!token && !!currentProjectId,
    staleTime: 5 * 60_000,
    retry: false, // 404 won't change on retry; avoid wasteful re-fetches
  });
}

/**
 * useConsoleData — triggers all console data queries for side-effect-only
 * mounting (used by ConsoleDataLayer).
 *
 * Components that need specific data should use the individual hooks
 * (useConsoleFeatures, useProjects, useEnvironments) instead.
 */
export function useConsoleData() {
  useConsoleFeatures();
  useProjects();
  useEnvironments();
}
