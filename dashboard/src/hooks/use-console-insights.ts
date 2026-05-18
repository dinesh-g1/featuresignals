"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

/**
 * useConsoleInsights — TanStack Query hook for the LEARN Zone insights.
 *
 * Polls every 60 seconds (insights change less frequently than flag state).
 * Components that previously read `insights`, `loading.insights`, and
 * `errors.insights` from the Zustand store should use this instead.
 */
export function useConsoleInsights() {
  const token = useAppStore((s) => s.token);

  return useQuery({
    queryKey: queryKeys.console.insights({
      report_limit: 5,
      learning_limit: 3,
      activity_limit: 10,
    }),
    queryFn: () =>
      api.console.getInsights(token!, {
        report_limit: 5,
        learning_limit: 3,
        activity_limit: 10,
      }),
    enabled: !!token,
    refetchInterval: 60_000,
  });
}
