"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useConsoleStore } from "@/stores/console-store";
import type { LifecycleStage, EnvironmentType } from "@/lib/console-types";

const VALID_STAGES = new Set<string>([
  "plan", "spec", "design", "flag", "implement", "test",
  "configure", "approve", "ship", "monitor", "decide", "analyze", "learn",
]);

const VALID_ENVS = new Set<string>(["production", "staging", "development"]);

/**
 * useConsoleUrlSync — reads URL query parameters and syncs them
 * to the console store on mount and when the URL changes.
 *
 * Supported params:
 *   ?stage=flag        — filter lifecycle zone to a specific stage
 *   ?environment=prod  — set environment filter
 *   ?search=dark-mode  — set search query
 */
export function useConsoleUrlSync() {
  const searchParams = useSearchParams();
  const selectStage = useConsoleStore((s) => s.selectStage);
  const setEnvironment = useConsoleStore((s) => s.setEnvironment);
  const setSearchQuery = useConsoleStore((s) => s.setSearchQuery);

  useEffect(() => {
    const stage = searchParams.get("stage");
    const env = searchParams.get("environment");
    const search = searchParams.get("search");

    if (stage && VALID_STAGES.has(stage)) {
      selectStage(stage as LifecycleStage);
    }

    if (env && VALID_ENVS.has(env)) {
      setEnvironment(env as EnvironmentType);
    }

    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams, selectStage, setEnvironment, setSearchQuery]);
}
