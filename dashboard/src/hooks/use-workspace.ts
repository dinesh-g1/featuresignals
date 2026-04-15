"use client";

import { useAppStore } from "@/stores/app-store";

/**
 * useWorkspace bundles the auth token and current workspace context
 * (project ID, environment ID) into a single hook.
 *
 * This replaces the pattern of calling useAppStore((s) => s.token),
 * useAppStore((s) => s.currentProjectId), etc. separately across 57+ locations.
 */
export function useWorkspace() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);
  const user = useAppStore((s) => s.user);
  const organization = useAppStore((s) => s.organization);

  return {
    token,
    currentProjectId,
    currentEnvId,
    setCurrentProject,
    setCurrentEnv,
    user,
    organization,
    isAuthenticated: !!token,
    hasWorkspace: !!token && !!currentProjectId,
  };
}
