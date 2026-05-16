"use client";

/**
 * useConsoleMaturity — Fetches and manages the org's Progressive
 * Disclosure maturity level (L1–L5) for the Console.
 *
 * The maturity config controls which lifecycle stages are visible,
 * whether approvals/policies/workflows are enabled, and what
 * CONNECT/LEARN zone features are surfaced.
 *
 * Fetches once on mount. Provides convenience booleans and a
 * filtered visibleStages array for downstream consumption.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { LIFECYCLE_STAGES } from "@/lib/console-constants";
import type {
  MaturityConfig,
  MaturityLevel,
  LifecycleStage,
} from "@/lib/console-types";

// ─── Module-level cache ─────────────────────────────────────────────
// Avoids re-fetching across remounts within the same session.

let cachedConfig: MaturityConfig | null = null;
let fetchPromise: Promise<MaturityConfig> | null = null;

function clearMaturityCache(): void {
  cachedConfig = null;
  fetchPromise = null;
}

// ─── Default Maturity Config (L1 Solo) ──────────────────────────────
// Used when the API is unavailable or the org has no config yet.

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
  config: MaturityConfig | null;
  loading: boolean;
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
  const [config, setConfig] = useState<MaturityConfig | null>(cachedConfig);
  const [loading, setLoading] = useState<boolean>(!cachedConfig);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Use cached config if available on subsequent calls
    if (cachedConfig && config === cachedConfig) {
      return;
    }

    // Deduplicate concurrent fetches
    if (fetchPromise) {
      try {
        const result = await fetchPromise;
        setConfig(result);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load maturity config",
        );
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (!api.console) {
      if (process.env.NODE_ENV === "development") {
        console.error("[useConsoleMaturity] api.console is undefined");
      }
      setLoading(false);
      return;
    }

    fetchPromise = api.console
      .getMaturity(token)
      .then((data) => {
        cachedConfig = data;
        fetchPromise = null;
        return data;
      })
      .catch((err) => {
        fetchPromise = null;
        // Fall back to default on API failure (org hasn't configured yet)
        cachedConfig = DEFAULT_MATURITY;
        throw err;
      });

    try {
      const data = await fetchPromise;
      setConfig(data);
    } catch (err) {
      setConfig(DEFAULT_MATURITY);
      setError(
        err instanceof Error ? err.message : "Failed to load maturity config",
      );
    } finally {
      setLoading(false);
    }
  }, [token, config]);

  // Fetch on mount
  useEffect(() => {
    fetch();
  }, [fetch]);

  const currentConfig = config ?? DEFAULT_MATURITY;
  const level = (currentConfig.level as MaturityLevel) || 1;

  // ── Derived values ──────────────────────────────────────────────

  const visibleStages = useMemo<LifecycleStage[]>(() => {
    if (
      !currentConfig.visibleStages ||
      currentConfig.visibleStages.length === 0
    ) {
      // If no stages specified, show all 14 (fallback)
      return LIFECYCLE_STAGES.map((s) => s.id);
    }
    // Filter to only valid stage IDs
    const allStageIds = new Set<string>(
      LIFECYCLE_STAGES.map((s) => s.id as string),
    );
    return currentConfig.visibleStages.filter((id): id is LifecycleStage =>
      allStageIds.has(id),
    );
  }, [currentConfig.visibleStages]);

  return {
    config: currentConfig,
    loading,
    error,
    isL1: level === 1,
    isL2: level === 2,
    isL3: level === 3,
    isL4: level === 4,
    isL5: level === 5,
    level,
    visibleStages,
    refetch: fetch,
  };
}

export { clearMaturityCache };
