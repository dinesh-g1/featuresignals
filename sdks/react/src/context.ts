import { createContext } from "react";

export interface FeatureSignalsContextValue {
  flags: Record<string, unknown>;
  ready: boolean;
  error: Error | null;
}

export const FeatureSignalsContext = createContext<FeatureSignalsContextValue>({
  flags: {},
  ready: false,
  error: null,
});
