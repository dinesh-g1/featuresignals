"use client";

/**
 * useConsoleSetupProgress — derives a coordinated setup phase from the
 * console store's integrations, features, and projects data.
 *
 * Used by ConnectZone and LearnZone to coordinate first-time user
 * experience across zones, telling a coherent onboarding story.
 *
 * Phase progression:
 *   'new'             → no project
 *   'has_project'     → project exists, no features
 *   'has_features'    → features exist, no integrations
 *   'has_integrations'→ integrations exist (some but not all 4 steps)
 *   'complete'        → all 4 setup steps satisfied
 *
 * The 4 setup steps are:
 *   1. Connect a repository
 *   2. Install an SDK
 *   3. Create an API key
 *   4. Register agents OR create governance policies
 */

import { useMemo } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { useProjects, useConsoleFeatures } from "@/hooks/use-console-data";
import { useConsoleIntegrations } from "@/hooks/use-console-integrations";
import { useAppStore } from "@/stores/app-store";

// ─── Types ──────────────────────────────────────────────────────────

export type SetupPhase =
  | "new"
  | "has_project"
  | "has_features"
  | "has_integrations"
  | "complete";

export interface SetupProgress {
  phase: SetupPhase;
  hasProject: boolean;
  hasFeature: boolean;
  hasIntegration: boolean;
  hasRepo: boolean;
  hasSdk: boolean;
  hasApiKey: boolean;
  hasAgent: boolean;
  hasPolicy: boolean;
  projectCount: number;
  featureCount: number;
  completedSteps: number;
  totalSteps: number; // always 4
}

// ─── Default / Null-safe Fallback ───────────────────────────────────
// Used when stores are not yet hydrated (e.g., SSR, loading states).
// Always assumes 'new' phase so the UI shows appropriate guidance.

const NULL_PROGRESS: SetupProgress = {
  phase: "new",
  hasProject: false,
  hasFeature: false,
  hasIntegration: false,
  hasRepo: false,
  hasSdk: false,
  hasApiKey: false,
  hasAgent: false,
  hasPolicy: false,
  projectCount: 0,
  featureCount: 0,
  completedSteps: 0,
  totalSteps: 4,
};

// ─── Hook ───────────────────────────────────────────────────────────

export function useConsoleSetupProgress(): SetupProgress {
  const currentProjectId = useAppStore((s) => s.current_project_id);
  const { data: projects = [] } = useProjects();
  const { data: featuresData } = useConsoleFeatures();
  const features = featuresData?.data ?? [];
  const featuresTotal = featuresData?.total ?? 0;
  const { data: integrations } = useConsoleIntegrations();

  return useMemo<SetupProgress>(() => {
    // ── Guard: no data available ──────────────────────────────────
    // If stores haven't hydrated, return sensible defaults.
    if (projects === undefined || features === undefined) {
      return NULL_PROGRESS;
    }

    // ── Derive state ─────────────────────────────────────────────
    const projectCount = currentProjectId
      ? projects.filter((p) => p.id === currentProjectId).length
      : projects.length;

    const hasProject = projectCount > 0;
    const hasFeature = (featuresTotal ?? features.length) > 0;

    // Integration booleans — defensive null checks for not-yet-loaded data
    const repos = integrations?.repositories?.data ?? [];
    const sdks = integrations?.sdks?.data ?? [];
    const apiKeys = integrations?.api_keys?.data ?? [];
    const agents = integrations?.agents?.data ?? [];
    const policies = integrations?.policies?.data ?? [];

    const hasRepo = repos.length > 0;
    const hasSdk = sdks.length > 0;
    const hasApiKey = apiKeys.length > 0;
    const hasAgent = agents.length > 0;
    const hasPolicy = policies.length > 0;

    // "Has any integration" = at least one card section has data
    const hasIntegration =
      hasRepo || hasSdk || hasApiKey || hasAgent || hasPolicy;

    // ── Compute phase ────────────────────────────────────────────
    let phase: SetupPhase;
    if (!hasProject) {
      phase = "new";
    } else if (!hasFeature) {
      phase = "has_project";
    } else if (!hasIntegration) {
      phase = "has_features";
    } else {
      // Check if all 4 steps are complete
      const step1 = hasRepo;
      const step2 = hasSdk;
      const step3 = hasApiKey;
      const step4 = hasAgent || hasPolicy;
      const allStepsComplete = step1 && step2 && step3 && step4;
      phase = allStepsComplete ? "complete" : "has_integrations";
    }

    // ── Compute completed steps ──────────────────────────────────
    let completedSteps = 0;
    if (hasRepo) completedSteps++;
    if (hasSdk) completedSteps++;
    if (hasApiKey) completedSteps++;
    if (hasAgent || hasPolicy) completedSteps++;

    return {
      phase,
      hasProject,
      hasFeature,
      hasIntegration,
      hasRepo,
      hasSdk,
      hasApiKey,
      hasAgent,
      hasPolicy,
      projectCount,
      featureCount: featuresTotal ?? features.length,
      completedSteps,
      totalSteps: 4,
    };
  }, [currentProjectId, projects, features, featuresTotal, integrations]);
}
