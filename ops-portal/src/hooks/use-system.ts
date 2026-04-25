"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { SystemHealth } from "@/types/api";
import type { ServiceStatusEntry } from "@/lib/api";

// ─── Use System Health ────────────────────────────────────────────────────

export interface UseSystemHealthOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useSystemHealth({
  enabled = true,
  refetchInterval = 30_000,
}: UseSystemHealthOptions = {}) {
  return useQuery<SystemHealth>({
    queryKey: ["system", "health"],
    queryFn: () => api.getSystemHealth(),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    enabled,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

// ─── Use Service Statuses ─────────────────────────────────────────────────

export interface UseServiceStatusesOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useServiceStatuses({
  enabled = true,
  refetchInterval = 30_000,
}: UseServiceStatusesOptions = {}) {
  return useQuery<ServiceStatusEntry[]>({
    queryKey: ["system", "services"],
    queryFn: () => api.getServiceStatuses(),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    enabled,
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}
