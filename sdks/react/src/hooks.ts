import { useContext } from "react";
import { FeatureSignalsContext } from "./context.js";

/** Optional behavior for {@link useFlag}. */
export interface UseFlagOptions<T> {
  /**
   * When set, the flag value is returned only if this guard returns true;
   * otherwise `fallback` is used. Prefer this when the flag payload must
   * match `T` at runtime (e.g. after a schema change on the server).
   */
  validate?: (value: unknown) => value is T;
}

/**
 * Returns the value of a single flag, or `fallback` if the flag is not yet
 * loaded, is null/undefined, or fails optional validation.
 *
 * **Type safety:** Generic `T` is compile-time only. The server may return a
 * different JSON shape than you expect. You are responsible for ensuring the
 * runtime value matches `T`—for example by passing {@link UseFlagOptions.validate},
 * parsing in your app layer, or treating non-primitive flags as `unknown` and
 * narrowing explicitly.
 */
export function useFlag<T = boolean>(
  key: string,
  fallback: T,
  options?: UseFlagOptions<T>
): T {
  const { flags } = useContext(FeatureSignalsContext);
  const value = flags[key];
  if (value === undefined || value === null) return fallback;
  if (options?.validate !== undefined && !options.validate(value)) {
    return fallback;
  }
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
