"use client";

/**
 * useConsoleMaturity — Fetches and manages the org's Progressive
 * Disclosure maturity level (L1–L5) for the Console.
 *
 * The maturity config controls which lifecycle stages are visible,
 * whether approvals/policies/workflows are enabled, and what
 * CONNECT/LEARN zone features are surfaced.
 *
 * Uses TanStack Query with a 5-minute staleTime (maturity rarely changes).
 * Provides convenience booleans and a filtered visibleStages array.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { LIFECYCLE_STAGES } from "@/lib/console-constants";
import type {
  MaturityConfig,
  MaturityLevel,
  LifecycleStage,
} from "@/lib/console-types";

// ─── Default Maturity Config (L1 Solo) ──────────────────────────────
// Used when the API returns no config (org hasn't configured yet) or
// when the API is unreachable.

const DEFAULT_MATURITY: MaturityConfig = {
  level: 1,
  visibleStages: ["flag", "ship", "monitor", "analyze"],
  enableApprovals: false,
  enablePolicies: false,
  enableWorkflows: false,
  enableCompliance: false,
  autoAdvance: true,
  requireDualControl: false,
  retentionDays: 90,
};

// ─── Hook ───────────────────────────────────────────────────────────

export interface UseConsoleMaturityReturn {
  config: MaturityConfig;
  isLoading: boolean;
  error: string | null;
  isL1: boolean;
  isL2: boolean;
  isL3: boolean;
  isL4: boolean;
  isL5: boolean;
  level: MaturityLevel;
  visibleStages: LifecycleStage[];
  refetch: () => void;
}

export function useConsoleMaturity(): UseConsoleMaturityReturn {
  const token = useAppStore((s) => s.token);

  const query = useQuery({
    queryKey: queryKeys.console.maturity,
    queryFn: () => api.console.getMaturity(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });

  const currentConfig = query.data ?? DEFAULT_MATURITY;
  const level = (currentConfig.level as MaturityLevel) || 1;

  // ── Derived values ──────────────────────────────────────────────

  const visibleStages = useMemo<LifecycleStage[]>(() => {
    if (
      !currentConfig.visibleStages ||
      currentConfig.visibleStages.length === 0
    ) {
      return LIFECYCLE_STAGES.map((s) => s.id);
    }
    const allStageIds = new Set<string>(
      LIFECYCLE_STAGES.map((s) => s.id as string),
    );
    return currentConfig.visibleStages.filter((id): id is LifecycleStage =>
      allStageIds.has(id),
    );
  }, [currentConfig.visibleStages]);

  return {
    config: currentConfig,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    isL1: level === 1,
    isL2: level === 2,
    isL3: level === 3,
    isL4: level === 4,
    isL5: level === 5,
    level,
    visibleStages,
    refetch: () => query.refetch(),
  };
}
