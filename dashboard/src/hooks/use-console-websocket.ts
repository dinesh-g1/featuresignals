"use client";

/**
 * useConsoleWebSocket — auto-reconnecting WebSocket hook for Console live updates.
 *
 * Connects to ws://<API_URL>/v1/console/live?token=<JWT> and dispatches
 * events into the console store. Handles:
 * - Exponential backoff reconnection (1s → 2s → 4s → 8s → max 30s)
 * - Heartbeat via server pings
 * - Connection state tracking (connected / reconnecting / offline)
 * - Event dispatching to useConsoleStore
 *
 * Usage: Call once in the Console shell (AppLayout). The hook manages its
 * own lifecycle — connects on mount, disconnects on unmount.
 */

import { useEffect, useRef, useCallback } from "react";
import { useConsoleStore, consoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  FlagUpdatedPayload,
  FlagAdvancedPayload,
  FlagShippedPayload,
  IntegrationChangedPayload,
  EvalBatchPayload,
  ConsoleEvent,
  FeatureCardData,
} from "@/lib/console-types";

// ─── Configuration ──────────────────────────────────────────────────────

const WS_BASE_URL =
  (typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_WS_URL
    : undefined) ||
  (typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws")
    : undefined) ||
  "ws://localhost:8080";

// Normalize: strip trailing slash so we don't produce double slashes
// when joining with WS_PATH (which always starts with "/").
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

const WS_PATH = "/v1/console/live";

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MIN_AUTH_FAILURE_DELAY_MS = 5_000; // Minimum backoff for auth failures (prevents retry storms)
const MAX_RECONNECT_DELAY_MS = 30_000;
const RECONNECT_MULTIPLIER = 2;
const MAX_FAILED_ATTEMPTS = 5;

// ─── JWT Helpers ────────────────────────────────────────────────────

/**
 * Decode the JWT payload (without verification). Returns null on failure.
 * Only used to check the `exp` claim client-side before attempting a
 * WebSocket connection, so we can proactively refresh instead of hitting 401.
 */
function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Decode base64url → base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Check whether a JWT is expired (or will expire within `graceSec` seconds).
 */
export function isTokenExpired(token: string, graceSec = 30): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    // Can't decode — assume expired to be safe.
    return true;
  }
  // exp is in seconds since epoch.
  return payload.exp * 1000 < Date.now() + graceSec * 1000;
}

/**
 * Attempt to refresh the JWT using the stored refresh token.
 * Mirrors the logic in api.ts's attemptTokenRefresh, but lives here
 * to avoid a circular dependency on @/lib/api.
 */
async function tryRefreshToken(): Promise<boolean> {
  const { refresh_token, setAuth } = useAppStore.getState();
  if (!refresh_token) return false;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh_token }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    const user = data.user ?? useAppStore.getState().user;
    const org = data.organization ?? useAppStore.getState().organization;
    setAuth(data.access_token, data.refresh_token, user, org, data.expires_at);
    return true;
  } catch {
    return false;
  }
}

// ─── Event Type Guards ──────────────────────────────────────────────────

function isFlagUpdatedPayload(p: unknown): p is FlagUpdatedPayload {
  return typeof p === "object" && p !== null && "key" in p;
}

function isFlagAdvancedPayload(p: unknown): p is FlagAdvancedPayload {
  return typeof p === "object" && p !== null && "key" in p && "new_stage" in p;
}

function isFlagShippedPayload(p: unknown): p is FlagShippedPayload {
  return (
    typeof p === "object" && p !== null && "key" in p && "target_percent" in p
  );
}

function isIntegrationChangedPayload(
  p: unknown,
): p is IntegrationChangedPayload {
  return (
    typeof p === "object" && p !== null && "integration_type" in p && "id" in p
  );
}

function isEvalBatchPayload(p: unknown): p is EvalBatchPayload {
  return typeof p === "object" && p !== null && "features" in p;
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useConsoleWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const failedAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const intentionalCloseRef = useRef(false);

  const setWsConnected = useConsoleStore((s) => s.setWsConnected);
  const setWsOffline = useConsoleStore((s) => s.setWsOffline);
  const advanceFeature = useConsoleStore((s) => s.advanceFeature);
  const wsRetryTrigger = useConsoleStore((s) => s.wsRetryTrigger);

  const connect = useCallback(async () => {
    const token = useAppStore.getState().token;
    if (!token) {
      // No auth token yet — try again in 2 seconds.
      if (mountedRef.current) {
        reconnectTimerRef.current = setTimeout(connect, 2000);
      }
      return;
    }

    // ── Proactive token refresh ──────────────────────────
    // If the JWT is expired (or within 30s of expiry), refresh it
    // before attempting the WebSocket connection. This prevents the
    // 401-on-connect cycle that fills the console with errors.
    if (isTokenExpired(token)) {
      const refreshed = await tryRefreshToken();
      if (!refreshed) {
        // Refresh failed — use a minimum 5s backoff for auth failures
        // to prevent rapid retry storms when the token is invalid.
        if (process.env.NODE_ENV === "development") {
          console.debug("[ws] token expired and refresh failed — will retry");
        }
        failedAttemptsRef.current += 1;
        if (failedAttemptsRef.current >= MAX_FAILED_ATTEMPTS) {
          setWsOffline(true);
          return;
        }
        // Auth failures get a minimum 5-second backoff, regardless of current delay.
        if (mountedRef.current) {
          const delay = Math.max(
            reconnectDelayRef.current,
            MIN_AUTH_FAILURE_DELAY_MS,
          );
          reconnectTimerRef.current = setTimeout(connect, delay);
          reconnectDelayRef.current = Math.min(
            delay * RECONNECT_MULTIPLIER,
            MAX_RECONNECT_DELAY_MS,
          );
        }
        return;
      }
      // Refresh succeeded — token in store is now fresh.
      // Reset backoff since we have a valid token.
      failedAttemptsRef.current = 0;
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
    }

    const freshToken = useAppStore.getState().token;
    if (!freshToken) return;

    const url = `${normalizeBaseUrl(WS_BASE_URL)}${WS_PATH}?token=${encodeURIComponent(freshToken)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        failedAttemptsRef.current = 0;
        setWsConnected(true);
        setWsOffline(false);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const consoleEvent: ConsoleEvent = JSON.parse(event.data as string);
          handleEvent(consoleEvent, { advanceFeature });
        } catch {
          // Ignore malformed messages.
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        setWsConnected(false);

        if (intentionalCloseRef.current) return;

        // Track consecutive failures.
        failedAttemptsRef.current += 1;

        if (failedAttemptsRef.current >= MAX_FAILED_ATTEMPTS) {
          // Give up — mark offline and stop reconnecting.
          setWsOffline(true);
          if (process.env.NODE_ENV === "development") {
            console.debug(
              `[ws] ${MAX_FAILED_ATTEMPTS} consecutive failures — going offline`,
            );
          }
          return;
        }

        // Auth failures (1008 Policy Violation or 4xxx codes) get a minimum
        // 5-second backoff to prevent retry storms when the token is bad.
        const isAuthFailure =
          event.code === 1008 || // Policy Violation (common auth rejection)
          (event.code >= 4000 && event.code < 5000); // App-level auth codes

        const delay = isAuthFailure
          ? Math.max(reconnectDelayRef.current, MIN_AUTH_FAILURE_DELAY_MS)
          : reconnectDelayRef.current;

        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, delay);

        reconnectDelayRef.current = Math.min(
          delay * RECONNECT_MULTIPLIER,
          MAX_RECONNECT_DELAY_MS,
        );
      };

      ws.onerror = () => {
        // onclose will fire after onerror — reconnect logic lives in onclose.
        // However, we bump the backoff here so that onclose uses an
        // appropriately inflated delay for this failure.
        failedAttemptsRef.current += 1;
        reconnectDelayRef.current = Math.min(
          Math.max(
            reconnectDelayRef.current * RECONNECT_MULTIPLIER,
            MIN_AUTH_FAILURE_DELAY_MS,
          ),
          MAX_RECONNECT_DELAY_MS,
        );
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `[ws] connection error (attempt ${failedAttemptsRef.current}/${MAX_FAILED_ATTEMPTS})`,
          );
        }
      };
    } catch {
      // WebSocket constructor failed (e.g., invalid URL).
      failedAttemptsRef.current += 1;

      if (failedAttemptsRef.current >= MAX_FAILED_ATTEMPTS) {
        setWsOffline(true);
        if (process.env.NODE_ENV === "development") {
          console.debug(
            `[ws] ${MAX_FAILED_ATTEMPTS} consecutive failures — going offline`,
          );
        }
        return;
      }

      if (mountedRef.current) {
        const delay = reconnectDelayRef.current;
        reconnectTimerRef.current = setTimeout(connect, delay);
        reconnectDelayRef.current = Math.min(
          delay * RECONNECT_MULTIPLIER,
          MAX_RECONNECT_DELAY_MS,
        );
      }
    }
  }, [setWsConnected, setWsOffline, advanceFeature]);

  useEffect(() => {
    mountedRef.current = true;
    intentionalCloseRef.current = false;
    connect();

    return () => {
      mountedRef.current = false;
      intentionalCloseRef.current = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setWsConnected(false);
      setWsOffline(true);
    };
  }, [connect, setWsConnected, setWsOffline]);

  // ── Manual Retry — watch wsRetryTrigger from store ───────────────
  // When the user clicks "Retry" in the BottomBar, triggerWsRetry()
  // increments wsRetryTrigger, which triggers a fresh connection attempt.

  useEffect(() => {
    if (wsRetryTrigger > 0) {
      // Clear any pending reconnect timer.
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      // Close existing socket if any.
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Reset backoff and failure count.
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
      failedAttemptsRef.current = 0;
      intentionalCloseRef.current = false;

      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsRetryTrigger]);
}

// ─── Event Handler ─────────────────────────────────────────────────────

interface EventHandlers {
  advanceFeature: (
    key: string,
    newStage: import("@/lib/console-types").LifecycleStage,
    updatedFeature?: FeatureCardData,
  ) => void;
}

/** Apply a mutation to all cached console feature query results. */
function updateFeaturesInCache(
  mutateFn: (f: FeatureCardData) => FeatureCardData,
): void {
  queryClient.setQueriesData(
    { queryKey: queryKeys.console.all, exact: false },
    (old: unknown) => {
      const p = old as { data: FeatureCardData[]; total: number } | null;
      if (!p?.data) return old;
      return { ...p, data: p.data.map(mutateFn) };
    },
  );
}

function handleEvent(event: ConsoleEvent, handlers: EventHandlers): void {
  const { type, payload } = event;

  switch (type) {
    case "flag_updated": {
      if (isFlagUpdatedPayload(payload)) {
        updateFeaturesInCache((f) => {
          if (f.key !== payload.key) return f;
          return {
            ...f,
            ...(payload.name !== undefined && { name: payload.name }),
            ...(payload.stage !== undefined && {
              stage:
                payload.stage as import("@/lib/console-types").LifecycleStage,
            }),
            ...(payload.status !== undefined && {
              status:
                payload.status as import("@/lib/console-types").FeatureStatus,
            }),
            ...(payload.health_score !== undefined && {
              health_score: payload.health_score,
            }),
            ...(payload.rollout_percent !== undefined && {
              rollout_percent: payload.rollout_percent,
            }),
          };
        });
      }
      break;
    }

    case "flag_advanced": {
      if (isFlagAdvancedPayload(payload)) {
        const newStage =
          payload.new_stage as import("@/lib/console-types").LifecycleStage;
        updateFeaturesInCache((f) =>
          f.key === payload.key ? { ...f, stage: newStage } : f,
        );
        handlers.advanceFeature(payload.key, newStage);
      }
      break;
    }

    case "flag_shipped": {
      if (isFlagShippedPayload(payload)) {
        updateFeaturesInCache((f) =>
          f.key === payload.key
            ? { ...f, rollout_percent: payload.target_percent }
            : f,
        );
      }
      break;
    }

    case "integration_changed": {
      if (isIntegrationChangedPayload(payload)) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.console.integrations(),
        });
      }
      break;
    }

    case "eval_batch": {
      if (isEvalBatchPayload(payload)) {
        const volumeMap = new Map(
          payload.features.map((f) => [f.key, f] as const),
        );
        updateFeaturesInCache((f) => {
          const vol = volumeMap.get(f.key);
          if (!vol) return f;
          return {
            ...f,
            eval_volume: vol.eval_volume,
            eval_trend: vol.eval_trend,
          };
        });
      }
      break;
    }

    default:
      // Unknown event type — silently ignored.
      break;
  }
}
