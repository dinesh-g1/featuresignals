import React, { useEffect, useState, useCallback, useRef } from "react";
import { FeatureSignalsContext } from "./context.js";

function parseFlagsResponse(data: unknown): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("flags response must be a JSON object");
  }
  return data as Record<string, unknown>;
}

export interface FeatureSignalsProviderProps {
  /** Environment API key (client-side key, e.g. "fs_cli_..."). */
  sdkKey: string;
  /** Environment slug (e.g. "production", "staging"). Required. */
  envKey: string;
  /** Base URL of the FeatureSignals API. */
  baseURL?: string;
  /** User key for targeting. Defaults to "anonymous". */
  userKey?: string;
  /**
   * Polling interval in ms. Default 30 000. Set 0 to disable polling.
   * Polling is automatically disabled when streaming is enabled.
   */
  pollingIntervalMs?: number;
  /** Enable SSE streaming for real-time flag updates. Default false. */
  streaming?: boolean;
  children: React.ReactNode;
}

export function FeatureSignalsProvider({
  sdkKey,
  envKey,
  baseURL = "https://api.featuresignals.com",
  userKey = "anonymous",
  pollingIntervalMs = 30_000,
  streaming = false,
  children,
}: FeatureSignalsProviderProps) {
  const [flags, setFlags] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchFlags = useCallback(async () => {
    try {
      const encodedKey = encodeURIComponent(userKey);
      const encodedEnv = encodeURIComponent(envKey);
      const res = await fetch(
        `${baseURL}/v1/client/${encodedEnv}/flags?key=${encodedKey}`,
        { headers: { "X-API-Key": sdkKey } }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const raw: unknown = await res.json();
      const data = parseFlagsResponse(raw);
      if (mountedRef.current) {
        setFlags(data);
        setReady(true);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [sdkKey, envKey, baseURL, userKey]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchFlags();

    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let es: EventSource | null = null;

    const onFlagUpdate = () => {
      if (mountedRef.current) void fetchFlags();
    };
    const onConnected = () => {
      if (mountedRef.current) setError(null);
    };
    const onSseError = () => {
      if (mountedRef.current) {
        setError(new Error("SSE connection error"));
      }
    };

    if (streaming && typeof EventSource !== "undefined") {
      const encodedEnv = encodeURIComponent(envKey);
      const sseUrl = `${baseURL}/v1/stream/${encodedEnv}?api_key=${encodeURIComponent(sdkKey)}`;
      es = new EventSource(sseUrl);
      es.addEventListener("flag-update", onFlagUpdate);
      es.addEventListener("connected", onConnected);
      es.addEventListener("error", onSseError);
    } else if (pollingIntervalMs > 0) {
      pollTimer = setInterval(() => void fetchFlags(), pollingIntervalMs);
    }

    return () => {
      mountedRef.current = false;
      if (pollTimer !== undefined) {
        clearInterval(pollTimer);
      }
      if (es !== null) {
        es.removeEventListener("flag-update", onFlagUpdate);
        es.removeEventListener("connected", onConnected);
        es.removeEventListener("error", onSseError);
        es.close();
      }
    };
  }, [fetchFlags, pollingIntervalMs, streaming, envKey, sdkKey, baseURL]);

  return (
    <FeatureSignalsContext.Provider value={{ flags, ready, error }}>
      {children}
    </FeatureSignalsContext.Provider>
  );
}
