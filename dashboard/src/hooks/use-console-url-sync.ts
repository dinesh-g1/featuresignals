"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useConsoleStore } from "@/stores/console-store";
import type { LifecycleStage, EnvironmentType } from "@/lib/console-types";

const VALID_STAGES = new Set<string>([
  "plan", "spec", "design", "flag", "implement", "test",
  "configure", "approve", "ship", "monitor", "decide", "analyze", "learn",
]);

const VALID_ENVS = new Set<string>(["production", "staging", "development"]);

/**
 * useConsoleUrlSync — bidirectional sync between URL query parameters
 * and the console store.
 *
 * Reads on mount / URL change:
 *   ?stage=flag        — filter lifecycle zone to a specific stage
 *   ?environment=dev   — set environment filter
 *   ?search=dark-mode  — set search query
 *   ?feature=my-flag   — select a specific feature
 *
 * Writes when store state changes (so URL is shareable/bookmarkable):
 *   selectStage        → ?stage=...
 *   setEnvironment     → ?environment=...
 *   setSearchQuery     → ?search=...
 *   selectFeature      → ?feature=...
 */
export function useConsoleUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectStage = useConsoleStore((s) => s.selectStage);
  const setEnvironment = useConsoleStore((s) => s.setEnvironment);
  const setSearchQuery = useConsoleStore((s) => s.setSearchQuery);
  const selectFeature = useConsoleStore((s) => s.selectFeature);

  const selectedStage = useConsoleStore((s) => s.selectedStage);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const searchQuery = useConsoleStore((s) => s.searchQuery);
  const selectedFeature = useConsoleStore((s) => s.selectedFeature);

  // Guard to prevent writing URL when we just read from it
  const isReadingRef = useRef(false);

  // Ref to prevent redundant writes of the same URL
  const lastWrittenRef = useRef<string | null>(null);

  // ── URL → Store (read) ──────────────────────────────────────────

  useEffect(() => {
    isReadingRef.current = true;

    const stage = searchParams.get("stage");
    const env = searchParams.get("environment");
    const search = searchParams.get("search");
    const feature = searchParams.get("feature");

    if (stage && VALID_STAGES.has(stage)) {
      selectStage(stage as LifecycleStage);
    }

    if (env && VALID_ENVS.has(env)) {
      setEnvironment(env as EnvironmentType);
    }

    if (search) {
      setSearchQuery(search);
    }

    if (feature) {
      selectFeature(feature);
    }

    // Reset the guard after a tick so writes can proceed
    const timer = setTimeout(() => {
      isReadingRef.current = false;
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, selectStage, setEnvironment, setSearchQuery, selectFeature]);

  // ── Store → URL (write) ─────────────────────────────────────────

  useEffect(() => {
    if (isReadingRef.current) return;

    const params = new URLSearchParams(searchParams.toString());

    // Stage
    if (selectedStage && VALID_STAGES.has(selectedStage)) {
      params.set("stage", selectedStage);
    } else {
      params.delete("stage");
    }

    // Environment (only write non-default)
    if (selectedEnvironment && selectedEnvironment !== "development") {
      params.set("environment", selectedEnvironment);
    } else {
      params.delete("environment");
    }

    // Search
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }

    // Feature
    if (selectedFeature) {
      params.set("feature", selectedFeature);
    } else {
      params.delete("feature");
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Avoid redundant writes (prevents potential loops)
    if (newUrl === lastWrittenRef.current) return;
    lastWrittenRef.current = newUrl;

    router.replace(newUrl, { scroll: false });
  }, [
    selectedStage,
    selectedEnvironment,
    searchQuery,
    selectedFeature,
    pathname,
    router,
    searchParams,
  ]);
}
