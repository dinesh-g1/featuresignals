import { useContext } from "react";
import { FeatureSignalsContext } from "./context.ts";

/**
 * Returns the value of a single flag, or `fallback` if the flag is
 * not yet loaded or doesn't exist.
 */
export function useFlag<T = boolean>(key: string, fallback: T): T {
  const { flags } = useContext(FeatureSignalsContext);
  const value = flags[key];
  if (value === undefined || value === null) return fallback;
  return value as T;
}

/** Returns the full flag map (all flags). */
export function useFlags(): Record<string, unknown> {
  const { flags } = useContext(FeatureSignalsContext);
  return flags;
}

/** Returns true once the initial flag fetch has completed. */
export function useReady(): boolean {
  const { ready } = useContext(FeatureSignalsContext);
  return ready;
}

/** Returns the last fetch error, or null if no error. */
export function useError(): Error | null {
  const { error } = useContext(FeatureSignalsContext);
  return error;
}
