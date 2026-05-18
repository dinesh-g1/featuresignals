"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

/**
 * useConsoleIntegrations — TanStack Query hook for the CONNECT Zone
 * integration status.
 *
 * Polls every 60 seconds (SDK/agent status changes less frequently than
 * flag state). Components that previously read `integrations`,
 * `loading.integrations`, and `errors.integrations` from the Zustand
 * store should use this instead.
 */
export function useConsoleIntegrations() {
  const token = useAppStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.console.integrations({
      repo_limit: 5,
      sdk_limit: 5,
      agent_limit: 5,
      key_limit: 5,
      policy_limit: 5,
    }),
    queryFn: () =>
      api.console.getIntegrations(token!, {
        repo_limit: 5,
        sdk_limit: 5,
        agent_limit: 5,
        key_limit: 5,
        policy_limit: 5,
      }),
    enabled: !!token,
    refetchInterval: 60_000,
  });
}
