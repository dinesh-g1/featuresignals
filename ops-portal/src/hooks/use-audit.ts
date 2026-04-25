"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { AuditFilters } from "@/types/api";

// ─── Use Audit Log ────────────────────────────────────────────────────────

export interface UseAuditLogOptions {
  filters?: AuditFilters;
  enabled?: boolean;
}

export function useAuditLog({
  filters,
  enabled = true,
}: UseAuditLogOptions = {}) {
  return useQuery({
    queryKey: ["audit", filters],
    queryFn: () => api.getAuditLog(filters),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    enabled,
  });
}
