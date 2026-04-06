"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { FeatureItem } from "@/lib/types";

interface FeatureState {
  features: FeatureItem[];
  loading: boolean;
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
      const f = state.features.find((item) => item.feature === feature);
      return f?.enabled ?? true;
    },
    [state.features],
  );

  const minPlanFor = useCallback(
    (feature: string): string => {
      const f = state.features.find((item) => item.feature === feature);
      return f?.min_plan ?? "free";
    },
    [state.features],
  );

  return { isEnabled, minPlanFor, loading: state.loading, plan };
}
