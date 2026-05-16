"use client";

import { useEffect, useRef } from "react";
import { consoleStore } from "@/stores/console-store";
import type { FeatureCardData } from "@/lib/console-types";

// ─── Constants ──────────────────────────────────────────────────────

const AI_CHECK_INTERVAL_MS = 15_000; // Check every 15s (less frequent than proactive detection)
const AI_CONFIDENCE_THRESHOLD = 0.5; // Only surface suggestions with confidence >= 0.5

// ─── Types ──────────────────────────────────────────────────────────

interface SuggestionAlert {
  type: "suggestion";
  priority: "red" | "amber";
  title: string;
  description: string;
  action?: { label: string; handler: () => void };
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Determine if an AI suggestion on a feature warrants a proactive alert.
 * Returns null if no alert is needed.
 */
function alertFromSuggestion(feature: FeatureCardData): SuggestionAlert | null {
  const { aiSuggestion, aiSuggestionType, aiConfidence, key, name, stage } =
    feature;

  // Guard: skip if no suggestion or confidence too low.
  if (!aiSuggestion || !aiSuggestionType) return null;
  if (aiConfidence !== undefined && aiConfidence < AI_CONFIDENCE_THRESHOLD)
    return null;

  const selectFeature = () => {
    consoleStore.getState().selectFeature(key);
  };

  switch (aiSuggestionType) {
    case "critical":
      return {
        type: "suggestion",
        priority: "red",
        title: name,
        description: aiSuggestion,
        action: { label: "View feature", handler: selectFeature },
      };
    case "warning":
      return {
        type: "suggestion",
        priority: "amber",
        title: `${name} needs attention`,
        description: aiSuggestion,
        action: { label: "Review", handler: selectFeature },
      };
    case "info":
      // Info-level suggestions are rendered directly on the card.
      // Only trigger a soft alert if the feature is in an early stage
      // and the suggestion signals potential staleness.
      if (stage === "plan" || stage === "spec") {
        return {
          type: "suggestion",
          priority: "amber",
          title: `${name} — ${stage} stage`,
          description: aiSuggestion,
          action: { label: "View feature", handler: selectFeature },
        };
      }
      return null;
    default:
      return null;
  }
}

/**
 * Build a stable alert ID from a feature key.
 */
function alertId(featureKey: string): string {
  return `ai:${featureKey}`;
}

/**
 * useConsoleAI — Layer 2 Predictive Suggestions and Layer 3 Autonomous
 * detection hook.
 *
 * Reads features from the console store. For each feature that carries
 * an AI suggestion (populated by the backend ConsoleSuggester), surfaces
 * it appropriately:
 *   - Critical priority → red proactive alert
 *   - Warning priority → amber proactive alert
 *   - Info priority → rendered on the FeatureCard itself (no alert)
 *
 * This hook defers to the existing `useProactiveDetection` hook for
 * non-AI alerts (error storms, health critical, stuck, stale).
 * It only handles AI-sourced suggestions.
 *
 * Wire this in ConsoleShell alongside useProactiveDetection.
 */
export function useConsoleAI(): void {
  const alertRef = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = consoleStore.getState();
      const { features, proactiveAlert: currentAlert } = state;

      // ── Find the highest-priority AI suggestion ─────────────────
      // Critical takes precedence over warning over info.
      let bestAlert: SuggestionAlert | null = null;
      let bestFeature: FeatureCardData | null = null;

      for (const feature of features) {
        const alert = alertFromSuggestion(feature);
        if (!alert) continue;

        if (
          !bestAlert ||
          (alert.priority === "red" && bestAlert.priority !== "red")
        ) {
          bestAlert = alert;
          bestFeature = feature;
        }

        // Stop at first critical — highest urgency.
        if (bestAlert.priority === "red") break;
      }

      // ── Set or clear the alert ─────────────────────────────────
      if (bestAlert && bestFeature) {
        const id = alertId(bestFeature.key);
        if (alertRef.current !== id) {
          alertRef.current = id;
          consoleStore.getState().setProactiveAlert({
            type: bestAlert.type,
            priority: bestAlert.priority,
            title: bestAlert.title,
            description: bestAlert.description,
            action: bestAlert.action,
          });
        }
      } else if (currentAlert?.type === "suggestion") {
        // Clear AI-originated alerts when no AI suggestions remain.
        // Don't clear non-AI alerts (error, stuck, stale).
        alertRef.current = null;
        consoleStore.getState().setProactiveAlert(null);
      }
    }, AI_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);
}
