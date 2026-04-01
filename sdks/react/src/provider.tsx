import React, { useEffect, useState, useCallback, useRef } from "react";
import { FeatureSignalsContext } from "./context.ts";

export interface FeatureSignalsProviderProps {
  /** Environment API key (client-side key, e.g. "fs_cli_..."). */
  sdkKey: string;
  /** Environment slug (e.g. "production", "staging"). Required. */
  envKey: string;
  /** Base URL of the FeatureSignals API. */
  baseURL?: string;
  /** User key for targeting. Defaults to "anonymous". */
  userKey?: string;
  /** Polling interval in ms. Default 30 000. Set 0 to disable polling. */
  pollingIntervalMs?: number;
  children: React.ReactNode;
}

export function FeatureSignalsProvider({
  sdkKey,
  envKey,
  baseURL = "https://api.featuresignals.com",
  userKey = "anonymous",
  pollingIntervalMs = 30_000,
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
      const data = await res.json();
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
    fetchFlags();

    let interval: ReturnType<typeof setInterval> | undefined;
    if (pollingIntervalMs > 0) {
      interval = setInterval(fetchFlags, pollingIntervalMs);
    }

    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchFlags, pollingIntervalMs]);

  return (
    <FeatureSignalsContext.Provider value={{ flags, ready, error }}>
      {children}
    </FeatureSignalsContext.Provider>
  );
}
