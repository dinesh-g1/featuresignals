import { inject, computed } from "vue";
import type { ComputedRef } from "vue";
import { FEATURE_SIGNALS_KEY } from "./plugin";
import type { FeatureSignalsState } from "./types";

const DEFAULT_STATE: FeatureSignalsState = {
  flags: {},
  ready: false,
  error: null,
};

/**
 * Returns the value of a single flag, or `fallback` if the flag is
 * not yet loaded or doesn't exist.
 */
export function useFlag<T = boolean>(key: string, fallback: T): ComputedRef<T> {
  const state = inject(FEATURE_SIGNALS_KEY, DEFAULT_STATE);
  return computed(() => {
    const value = state.flags[key];
    if (value === undefined || value === null) return fallback;
    return value as T;
  });
}

/** Returns the full flag map (all flags). */
export function useFlags(): ComputedRef<Record<string, unknown>> {
  const state = inject(FEATURE_SIGNALS_KEY, DEFAULT_STATE);
  return computed(() => state.flags);
}

/** Returns true once the initial flag fetch has completed. */
export function useReady(): ComputedRef<boolean> {
  const state = inject(FEATURE_SIGNALS_KEY, DEFAULT_STATE);
  return computed(() => state.ready);
}

/** Returns the last fetch error, or null if no error. */
export function useError(): ComputedRef<Error | null> {
  const state = inject(FEATURE_SIGNALS_KEY, DEFAULT_STATE);
  return computed(() => state.error);
}
