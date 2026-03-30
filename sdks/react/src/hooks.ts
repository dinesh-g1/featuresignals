import { useContext } from "react";
import { FeatureSignalsContext } from "./context";

export function useFlag<T = boolean>(key: string, fallback: T): T {
  const { flags } = useContext(FeatureSignalsContext);
  const value = flags[key];
  if (value === undefined || value === null) return fallback;
  return value as T;
}

export function useFlags(): Record<string, unknown> {
  const { flags } = useContext(FeatureSignalsContext);
  return flags;
}
