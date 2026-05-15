/**
 * ABM React Hooks — useABM, useABMFresh, useABMTrack.
 *
 * These hooks provide React-idiomatic access to the ABM client for
 * resolving agent behaviors and tracking events.
 *
 * PRS Requirement IDs: FS-S1-ABM-001 through FS-S1-ABM-008
 *
 * @module abm/hooks
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useABMClient } from "./context.js";
import type {
  ResolveResponse,
  UseABMResult,
  UseABMTrackResult,
} from "./types.js";

// ── Fallback Response ─────────────────────────────────────────────────────

function fallbackResult(_behaviorKey: string): UseABMResult {
  return {
    variant: "",
    configuration: {},
    reason: "fallback",
    loading: false,
    error: "ABM client not available — ensure <ABMProvider> wraps your app",
    refetch: () => {},
  };
}

// ── useABM ────────────────────────────────────────────────────────────────

/**
 * Resolve an agent behavior variant with caching.
 *
 * On mount and whenever `behaviorKey` or `agentId` change, resolves the
 * behavior via the ABM client. Results are cached per the client's TTL.
 * Returns loading state while the request is in-flight.
 */
export function useABM(
  behaviorKey: string,
  agentId: string,
  attributes?: Record<string, unknown>,
): UseABMResult {
  const client = useABMClient();
  const [result, setResult] = useState<UseABMResult>({
    variant: "",
    configuration: {},
    reason: "default",
    loading: true,
    error: null,
    refetch: () => {},
  });
  const mountedRef = useRef(true);
  const resolveIdRef = useRef(0);
  const attributesRef = useRef(attributes);
  attributesRef.current = attributes;

  const doResolve = useCallback(
    async (fresh: boolean) => {
      if (!client) {
        setResult(fallbackResult(behaviorKey));
        return;
      }

      const resolveId = ++resolveIdRef.current;
      setResult((prev: UseABMResult) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response: ResolveResponse = fresh
          ? await client.resolveFresh(
              behaviorKey,
              agentId,
              attributesRef.current,
            )
          : await client.resolve(behaviorKey, agentId, attributesRef.current);

        if (!mountedRef.current || resolveId !== resolveIdRef.current) return;

        setResult({
          variant: response.variant,
          configuration: response.configuration,
          reason: response.reason,
          loading: false,
          error:
            response.reason === "fallback"
              ? "ABM resolve returned fallback"
              : null,
          refetch: () => doResolve(true),
        });
      } catch {
        if (!mountedRef.current || resolveId !== resolveIdRef.current) return;
        setResult((prev: UseABMResult) => ({
          ...prev,
          variant: "",
          configuration: {},
          reason: "fallback",
          loading: false,
          error: "Unexpected error during ABM resolve",
          refetch: () => doResolve(true),
        }));
      }
    },
    [client, behaviorKey, agentId],
  );

  useEffect(() => {
    mountedRef.current = true;
    void doResolve(false);
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [behaviorKey, agentId, doResolve]);

  return result;
}

// ── useABMFresh ───────────────────────────────────────────────────────────

/**
 * Resolve an agent behavior variant **bypassing the cache**.
 *
 * Like {@link useABM}, but always fetches from the server. Use this when
 * you need the latest configuration regardless of cache state.
 */
export function useABMFresh(
  behaviorKey: string,
  agentId: string,
  attributes?: Record<string, unknown>,
): UseABMResult {
  const client = useABMClient();
  const [result, setResult] = useState<UseABMResult>({
    variant: "",
    configuration: {},
    reason: "default",
    loading: true,
    error: null,
    refetch: () => {},
  });
  const mountedRef = useRef(true);
  const resolveIdRef = useRef(0);
  const attributesRef = useRef(attributes);
  attributesRef.current = attributes;

  const doResolve = useCallback(
    async (fresh: boolean) => {
      if (!client) {
        setResult(fallbackResult(behaviorKey));
        return;
      }

      const resolveId = ++resolveIdRef.current;
      setResult((prev: UseABMResult) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response: ResolveResponse = fresh
          ? await client.resolveFresh(
              behaviorKey,
              agentId,
              attributesRef.current,
            )
          : await client.resolve(behaviorKey, agentId, attributesRef.current);

        if (!mountedRef.current || resolveId !== resolveIdRef.current) return;

        setResult({
          variant: response.variant,
          configuration: response.configuration,
          reason: response.reason,
          loading: false,
          error:
            response.reason === "fallback"
              ? "ABM resolve returned fallback"
              : null,
          refetch: () => doResolve(true),
        });
      } catch {
        if (!mountedRef.current || resolveId !== resolveIdRef.current) return;
        setResult((prev: UseABMResult) => ({
          ...prev,
          variant: "",
          configuration: {},
          reason: "fallback",
          loading: false,
          error: "Unexpected error during ABM resolveFresh",
          refetch: () => doResolve(true),
        }));
      }
    },
    [client, behaviorKey, agentId],
  );

  useEffect(() => {
    mountedRef.current = true;
    void doResolve(true); // Always resolve fresh on mount.
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [behaviorKey, agentId, doResolve]);

  return result;
}

// ── useABMTrack ───────────────────────────────────────────────────────────

/**
 * Returns a `track` function for recording agent behavior events.
 *
 * The returned function is stable across re-renders. Tracking is
 * fire-and-forget — events are buffered and flushed asynchronously.
 *
 * @param behaviorKey - The behavior key for tracked events.
 * @param agentId - The agent identifier for tracked events.
 * @param variant - The variant being tracked (usually from useABM result).
 */
export function useABMTrack(
  behaviorKey: string,
  agentId: string,
  variant: string,
): UseABMTrackResult {
  const client = useABMClient();

  const track = useCallback(
    (event: string, value?: number) => {
      if (!client) return;
      client.track(behaviorKey, agentId, variant, event, value);
    },
    [client, behaviorKey, agentId, variant],
  );

  return { track };
}
