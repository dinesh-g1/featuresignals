import { createContext } from "react";

export interface FeatureSignalsContextValue {
  flags: Record<string, unknown>;
  ready: boolean;
}

export const FeatureSignalsContext = createContext<FeatureSignalsContextValue>({
  flags: {},
  ready: false,
});
