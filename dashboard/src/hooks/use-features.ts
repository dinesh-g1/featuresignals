"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { FeatureItem } from "@/lib/types";

interface FeatureState {
  features: FeatureItem[];
  loading: boolean;
}

const PLAN_RANK: Record<string, number> = {
  free: 0,
  trial: 2,
  pro: 2,
  enterprise: 3,
};

const FEATURE_MIN_PLAN: Record<string, string> = {
  approvals: "pro",
  webhooks: "pro",
  scheduling: "pro",
  audit_export: "pro",
  mfa: "pro",
  data_export: "pro",
  sso: "enterprise",
  scim: "enterprise",
  ip_allowlist: "enterprise",
  custom_roles: "enterprise",
};

function isFeatureEnabledForPlan(plan: string, feature: string): boolean {
  const minPlan = FEATURE_MIN_PLAN[feature];
  if (!minPlan) return true;
  return (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[minPlan] ?? 0);
}

export function useFeatures() {
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);
  const plan = organization?.plan ?? "free";
  const [state, setState] = useState<FeatureState>({ features: [], loading: true });

  useEffect(() => {
    if (!token) {
      setState({ features: [], loading: false });
      return;
    }

    let cancelled = false;
    api.getFeatures(token).then((res) => {
      if (!cancelled) {
        setState({ features: res.features, loading: false });
      }
    }).catch(() => {
      if (!cancelled) {
        setState({ features: [], loading: false });
      }
    });

    return () => { cancelled = true; };
  }, [token, plan]);

  const isEnabled = useCallback(
    (feature: string): boolean => {
      if (state.features.length > 0) {
        const f = state.features.find((item) => item.feature === feature);
        return f?.enabled ?? true;
      }
      return isFeatureEnabledForPlan(plan, feature);
    },
    [state.features, plan],
  );

  const minPlanFor = useCallback(
    (feature: string): string => {
      if (state.features.length > 0) {
        const f = state.features.find((item) => item.feature === feature);
        return f?.min_plan ?? "free";
      }
      return FEATURE_MIN_PLAN[feature] ?? "free";
    },
    [state.features],
  );

  return { isEnabled, minPlanFor, loading: state.loading, plan };
}
