"use client";

import { useEffect, useRef } from "react";
import { consoleStore } from "@/stores/console-store";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { FeatureCardData } from "@/lib/console-types";

// ─── Constants ──────────────────────────────────────────────────────

const PROACTIVE_CHECK_INTERVAL_MS = 10_000;
const API_ERROR_THRESHOLD = 3;
const STUCK_TIMEOUT_MS = 300_000; // 5 minutes in ms
const STALE_STAGE_DAYS = 30;
const HEALTH_CRITICAL_THRESHOLD = 40;

// ─── Helpers ────────────────────────────────────────────────────────

function daysAgo(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24);
}

function isStuckTimeout(lastActionAt: string): boolean {
  const then = new Date(lastActionAt).getTime();
  const now = Date.now();
  return now - then > STUCK_TIMEOUT_MS;
}

function daysBetween(d1: number, d2: number): number {
  return Math.floor(d2 - d1);
}

/**
 * Build a stable alert ID from the scenario type and entity key.
 */
function alertId(type: string, key?: string): string {
  return key ? `${type}:${key}` : type;
}

/**
 * useProactiveDetection — monitors the Console store and surfaces
 * contextual alerts without the user asking.
 *
 * Detects:
 *  1. API error storms (3+ zones with errors)
 *  2. Feature stuck (no action in > 5 min, not "learn" stage)
 *  3. Stale features (> 30 days since last action, not "learn")
 *  4. Health critical (score < 40 in production)
 *
 * Clears alerts when the condition resolves. Sets alerts via
 * `consoleStore.getState().setProactiveAlert(alert)`.
 */
export function useProactiveDetection(): void {
  const alertRef = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = consoleStore.getState();
      const currentAlert = state.proactiveAlert;

      // Read features from TanStack Query cache (replaces removed store fields)
      const featuresData = queryClient.getQueryData(
        queryKeys.console.features({
          projectId: undefined,
          stage: undefined,
          environment: state.selectedEnvironment,
          sort: state.sortBy,
          limit: state.featuresLimit,
        }),
      );
      const features: FeatureCardData[] =
        (featuresData as { data?: FeatureCardData[] } | null)?.data ?? [];
      const isLoading = !featuresData;

      // ── 1. API error storm ──────────────────────────────────
      // Errors are now per-query via TanStack Query. Check the query cache.
      const featureQueryState = queryClient.getQueryState(
        queryKeys.console.features({
          projectId: undefined,
          stage: undefined,
          environment: state.selectedEnvironment,
          sort: state.sortBy,
          limit: state.featuresLimit,
        }),
      );
      const insightsQueryState = queryClient.getQueryState(
        queryKeys.console.insights(),
      );
      const integrationsQueryState = queryClient.getQueryState(
        queryKeys.console.integrations(),
      );
      const errorQueries = [
        featureQueryState,
        insightsQueryState,
        integrationsQueryState,
      ].filter((qs) => qs?.status === "error");

      if (errorQueries.length >= API_ERROR_THRESHOLD) {
        const firstError =
          errorQueries[0]?.error instanceof Error
            ? errorQueries[0].error.message
            : "Unknown error";
        const id = alertId("error-storm", "multi-zone");

        if (alertRef.current !== id) {
          alertRef.current = id;
          consoleStore.getState().setProactiveAlert({
            type: "error",
            priority: "red",
            title: "We noticed repeated errors",
            description: `Errors detected in ${errorQueries.length} zones. Here's what's happening: ${firstError}`,
            action: {
              label: "Open help",
              handler: () => {
                consoleStore.getState().setHelpOpen(true);
              },
            },
          });
        }
        return;
      }

      // ── 2. Health critical in production ────────────────────
      const criticalFeature = features.find(
        (f) =>
          f.health_score < HEALTH_CRITICAL_THRESHOLD &&
          f.environment === "production",
      );

      if (criticalFeature) {
        const id = alertId("health-critical", criticalFeature.key);

        if (alertRef.current !== id) {
          alertRef.current = id;
          consoleStore.getState().setProactiveAlert({
            type: "stuck",
            priority: "red",
            title: `${criticalFeature.name} health is critical`,
            description: `Health score is ${criticalFeature.health_score}/100 in production. Check the Monitor stage for details.`,
            action: {
              label: "View Monitor",
              handler: () => {
                consoleStore.getState().selectFeature(criticalFeature.key);
              },
            },
          });
        }
        return;
      }

      // ── 3. Feature stuck (no recent action, not in learn) ──
      const stuckFeature = features.find(
        (f) => f.stage !== "learn" && isStuckTimeout(f.last_action_at),
      );

      if (stuckFeature) {
        const thenDays =
          new Date(stuckFeature.last_action_at).getTime() /
          (1000 * 60 * 60 * 24);
        const nowDays = Date.now() / (1000 * 60 * 60 * 24);
        const days = daysBetween(thenDays, nowDays);
        const id = alertId("stuck", stuckFeature.key);

        if (alertRef.current !== id) {
          alertRef.current = id;
          consoleStore.getState().setProactiveAlert({
            type: "stuck",
            priority: "amber",
            title: `${stuckFeature.name} has been in ${stuckFeature.stage} for ${days} days`,
            description: `Ready to advance? It's been in the "${stuckFeature.stage}" stage for a while.`,
            action: {
              label: "View feature",
              handler: () => {
                consoleStore.getState().selectFeature(stuckFeature.key);
              },
            },
          });
        }
        return;
      }

      // ── 4. Stale features (> 30 days, not learn) ───────────
      const staleFeature = features.find((f) => {
        if (f.stage === "learn") return false;
        return daysAgo(f.last_action_at) > STALE_STAGE_DAYS;
      });

      if (staleFeature) {
        const days = Math.floor(daysAgo(staleFeature.last_action_at));
        const id = alertId("stale", staleFeature.key);

        if (alertRef.current !== id) {
          alertRef.current = id;
          consoleStore.getState().setProactiveAlert({
            type: "stale",
            priority: "amber",
            title: `${staleFeature.name} has been in ${staleFeature.stage} for ${days} days`,
            description: "Ready to advance or retire?",
            action: {
              label: "Review",
              handler: () => {
                consoleStore.getState().selectFeature(staleFeature.key);
              },
            },
          });
        }
        return;
      }

      // ── 5. No features — don't bug new users ───────────────
      if (features.length === 0 && !isLoading) {
        if (currentAlert && alertRef.current !== null) {
          alertRef.current = null;
          consoleStore.getState().setProactiveAlert(null);
        }
        return;
      }

      // ── Clear alert if all conditions resolved ─────────────
      if (currentAlert && alertRef.current !== null) {
        alertRef.current = null;
        consoleStore.getState().setProactiveAlert(null);
      }
    }, PROACTIVE_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);
}
