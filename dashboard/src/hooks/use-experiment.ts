"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";

/**
 * Internal experiment definitions used to A/B test FeatureSignals product
 * changes using FeatureSignals' own feature flag engine. Each experiment
 * maps to a feature flag key in the internal "featuresignals" project.
 *
 * Evaluation is deterministic (hash of user ID + experiment key). This avoids
 * network calls during render and keeps the decision consistent per session.
 */

export interface Experiment {
  key: string;
  variants: string[];
  defaultVariant: string;
}

export const EXPERIMENTS: Record<string, Experiment> = {
  onboarding_flow: {
    key: "exp_onboarding_flow",
    variants: ["control", "simplified"],
    defaultVariant: "control",
  },
  dashboard_layout: {
    key: "exp_dashboard_layout",
    variants: ["control", "compact"],
    defaultVariant: "control",
  },
  upgrade_cta_copy: {
    key: "exp_upgrade_cta_copy",
    variants: ["control", "value_focused", "urgency"],
    defaultVariant: "control",
  },
  empty_state_style: {
    key: "exp_empty_state_style",
    variants: ["control", "illustrated"],
    defaultVariant: "control",
  },
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns the variant for a given experiment for the current user.
 * Deterministic per user — consistent across sessions.
 */
export function useExperiment(experimentName: string): string {
  const userId = useAppStore((s) => s.user?.id);

  return useMemo(() => {
    const exp = EXPERIMENTS[experimentName];
    if (!exp || !userId) return exp?.defaultVariant ?? "control";

    const sessionOverride = typeof window !== "undefined"
      ? sessionStorage.getItem(`fs-exp-${exp.key}`)
      : null;
    if (sessionOverride && exp.variants.includes(sessionOverride)) {
      return sessionOverride;
    }

    const hash = hashCode(`${userId}:${exp.key}`);
    const index = hash % exp.variants.length;
    return exp.variants[index];
  }, [experimentName, userId]);
}

/**
 * Override a specific experiment variant for the current session (used by Super Mode).
 */
export function setExperimentOverride(experimentKey: string, variant: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(`fs-exp-${experimentKey}`, variant);
  }
}

export function clearExperimentOverrides(): void {
  if (typeof window === "undefined") return;
  Object.values(EXPERIMENTS).forEach((exp) => {
    sessionStorage.removeItem(`fs-exp-${exp.key}`);
  });
}
