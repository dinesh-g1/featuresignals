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
 *
 * **Generic `T`:** TypeScript only — there is no runtime check that the flag’s
 * value matches `T`. Wrong types from the API are still returned cast as `T`.
 *
 * **Lifecycle:** This composable does not register its own listeners; it reads
 * reactive state provided by {@link FEATURE_SIGNALS_KEY}. Updates and teardown
 * of polling/SSE are handled by `FeatureSignalsPlugin`; `computed` refs stop
 * with the component scope automatically — no `onUnmounted` cleanup is required
 * here.
 */
export function useFlag<T = boolean>(key: string, fallback: T): ComputedRef<T> {
  const state = inject(FEATURE_SIGNALS_KEY, DEFAULT_STATE);
  return computed(() => {
    const value = state.flags[key];
    if (value === undefined || value === null) return fallback;
    return value as T;
  });
}

/**
 * Returns the full flag map (all flags).
 *
 * Reads injected reactive state only; no per-component subscriptions to clean up.
 */
export function useFlags(): ComputedRef<Record<string, unknown>> {
  const state = inject(FEATURE_SIGNALS_KEY, DEFAULT_STATE);
  return computed(() => state.flags);
}

/**
 * Returns true once the initial flag fetch has completed.
 *
 * Reads injected reactive state only; no per-component subscriptions to clean up.
 */
export function useReady(): ComputedRef<boolean> {
  const state = inject(FEATURE_SIGNALS_KEY, DEFAULT_STATE);
  return computed(() => state.ready);
}

/**
 * Returns the last fetch error, or null if no error.
 *
 * Reads injected reactive state only; no per-component subscriptions to clean up.
 */
export function useError(): ComputedRef<Error | null> {
  const state = inject(FEATURE_SIGNALS_KEY, DEFAULT_STATE);
  return computed(() => state.error);
}
