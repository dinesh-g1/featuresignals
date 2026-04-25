"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";

// ─── Use Audit Log ────────────────────────────────────────────────────────

export interface UseAuditLogOptions {
  filters?: Record<string, string | number | boolean | undefined>;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useAuditLog({
  filters,
  enabled = true,
  refetchInterval,
}: UseAuditLogOptions = {}) {
  return useQuery({
    queryKey: ["audit", filters],
    queryFn: () =>
      api.getAuditLog(
        filters as Record<string, string | number | boolean | undefined>,
      ),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    enabled,
    refetchInterval,
  });
}
