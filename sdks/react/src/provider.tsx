import React, { useEffect, useState } from "react";
import { FeatureSignalsContext } from "./context";

interface ProviderProps {
  sdkKey: string;
  baseURL?: string;
  children: React.ReactNode;
}

export function FeatureSignalsProvider({ sdkKey, baseURL = "https://api.featuresignals.com", children }: ProviderProps) {
  const [flags, setFlags] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function fetchFlags() {
      try {
        const res = await fetch(`${baseURL}/v1/client/env/flags?key=anonymous`, {
          headers: { "X-API-Key": sdkKey },
        });
        if (res.ok) {
          const data = await res.json();
          setFlags(data);
          setReady(true);
        }
      } catch {
        console.warn("[featuresignals] failed to fetch flags");
      }
    }

    fetchFlags();

    // Poll every 30s
    const interval = setInterval(fetchFlags, 30000);
    return () => clearInterval(interval);
  }, [sdkKey, baseURL]);

  return (
    <FeatureSignalsContext.Provider value={{ flags, ready }}>
      {children}
    </FeatureSignalsContext.Provider>
  );
}
