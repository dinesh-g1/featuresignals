"use client";

import * as React from "react";
import * as api from "@/lib/api";
import type { APIError } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface UseApiFetchResult<T, P extends any[] = []> {
  /** Current status of the operation */
  status: AsyncStatus;
  /** Data returned from successful operation */
  data: T | null;
  /** Error object if operation failed */
  error: api.APIError | null;
  /** Whether operation is currently loading */
  loading: boolean;
  /** Whether operation has completed successfully */
  success: boolean;
  /** Whether operation has failed */
  failed: boolean;
  /** Whether operation has not yet been executed */
  idle: boolean;
  /** Execute the operation with parameters */
  execute: (...params: P) => Promise<T | null>;
  /** Clear error state */
  clearError: () => void;
  /** Reset all state to initial values */
  reset: () => void;
  /** Manually set data (useful for optimistic updates) */
  setData: (data: T | null | ((prev: T | null) => T | null)) => void;
}

export interface UseApiFetchOptions<T, P extends any[] = []> {
  /** Execute immediately on mount */
  immediate?: boolean;
  /** Initial data value */
  initialData?: T | null;
  /** Function to call on successful execution */
  onSuccess?: (data: T, params: P) => void;
  /** Function to call on error */
  onError?: (error: api.APIError, params: P) => void;
  /** Function to call on execution (both success and error) */
  onComplete?: (result: { data: T | null; error: api.APIError | null }, params: P) => void;
  /** Enable/disable automatic error clearing before next execution */
  clearErrorOnExecute?: boolean;
  /** Enable/disable cache for this request */
  enableCache?: boolean;
  /** Maximum number of retries on failure */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

// ─── Main Hook ─────────────────────────────────────────────────────────

/**
 * A comprehensive hook for handling API calls with loading states, error handling,
 * and automatic cleanup.
 *
 * @template T - Type of the data returned by the API call
 * @template P - Type of parameters passed to the executor function
 *
 * @param executor - Function that performs the API call and returns a promise
 * @param options - Configuration options for the hook
 *
 * @example
 * // Basic usage
 * const { data, loading, error, execute } = useApiFetch(
 *   (id: string) => api.customers.get(id)
 * );
 *
 * // With immediate execution
 * const { data, loading } = useApiFetch(
 *   () => api.customers.list(),
 *   { immediate: true }
 * );
 *
 * // With parameters
 * const { execute } = useApiFetch(
 *   (search: string, plan: string) => api.customers.list({ search, plan })
 * );
 *
 * // In component
 * useEffect(() => {
 *   execute("acme", "enterprise");
 * }, [execute]);
 */
export function useApiFetch<T, P extends any[] = []>(
  executor: (...params: P) => Promise<T>,
  options: UseApiFetchOptions<T, P> = {}
): UseApiFetchResult<T, P> {
  const {
    immediate = false,
    initialData = null,
    onSuccess,
    onError,
    onComplete,
    clearErrorOnExecute = true,
    enableCache = false,
    maxRetries = 0,
    retryDelay = 1000,
  } = options;

  const [status, setStatus] = React.useState<AsyncStatus>("idle");
  const [data, setData] = React.useState<T | null>(initialData);
  const [error, setError] = React.useState<api.APIError | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const retryCountRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  // Cleanup function
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Immediate execution
  React.useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as P));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const execute = React.useCallback(
    async (...params: P): Promise<T | null> => {
      if (!mountedRef.current) return null;

      // Clear previous error if configured
      if (clearErrorOnExecute && error) {
        setError(null);
      }

      // Abort previous request if still in flight
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      retryCountRef.current = 0;

      setStatus("loading");
      setError(null);

      try {
        const result = await executeWithRetry(executor, params, {
          signal: abortControllerRef.current.signal,
          maxRetries,
          retryDelay,
        });

        if (!mountedRef.current) return null;

        setStatus("success");
        setData(result);
        setError(null);

        // Call success callback
        onSuccess?.(result, params);

        return result;
      } catch (err) {
        if (!mountedRef.current) return null;

        const apiError =
          err instanceof api.APIError
            ? err
            : new api.APIError(
                500,
                err instanceof Error ? err.message : "Unknown error occurred"
              );

        setStatus("error");
        setError(apiError);

        // Call error callback
        onError?.(apiError, params);

        return null;
      } finally {
        if (mountedRef.current) {
          // Call complete callback
          onComplete?.({ data, error }, params);
          abortControllerRef.current = null;
        }
      }
    },
    [
      clearErrorOnExecute,
      error,
      executor,
      maxRetries,
      retryDelay,
      onSuccess,
      onError,
      onComplete,
      data,
    ]
  );

  const clearError = React.useCallback(() => {
    if (mountedRef.current) {
      setError(null);
      if (status === "error") {
        setStatus("idle");
      }
    }
  }, [status]);

  const reset = React.useCallback(() => {
    if (mountedRef.current) {
      setStatus("idle");
      setData(initialData);
      setError(null);
      retryCountRef.current = 0;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [initialData]);

  const internalSetData = React.useCallback(
    (newData: T | null | ((prev: T | null) => T | null)) => {
      if (!mountedRef.current) return;
      setData((prev) =>
        typeof newData === "function"
          ? (newData as (prev: T | null) => T | null)(prev)
          : newData
      );
    },
    []
  );

  // Derived states
  const loading = status === "loading";
  const success = status === "success";
  const failed = status === "error";
  const idle = status === "idle";

  return {
    status,
    data,
    error,
    loading,
    success,
    failed,
    idle,
    execute,
    clearError,
    reset,
    setData: internalSetData,
  };
}

// ─── Retry Logic ───────────────────────────────────────────────────────

interface RetryOptions {
  signal?: AbortSignal;
  maxRetries: number;
  retryDelay: number;
}

async function executeWithRetry<T, P extends any[]>(
  executor: (...params: P) => Promise<T>,
  params: P,
  options: RetryOptions
): Promise<T> {
  const { signal, maxRetries, retryDelay } = options;
  let lastError: Error | api.APIError = new Error("Initial error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if request was aborted
      if (signal?.aborted) {
        throw new Error("Request aborted");
      }

      const result = await executor(...params);

      // Check if request was aborted while in flight
      if (signal?.aborted) {
        throw new Error("Request aborted");
      }

      return result;
    } catch (err) {
      lastError =
        err instanceof api.APIError
          ? err
          : err instanceof Error
          ? err
          : new Error(String(err));

      // Don't retry on abort or client errors (4xx except 429)
      if (
        signal?.aborted ||
        (err instanceof api.APIError &&
          err.status >= 400 &&
          err.status < 500 &&
          err.status !== 429)
      ) {
        throw lastError;
      }

      // Don't retry if we've reached max retries
      if (attempt >= maxRetries) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Pre-configured Hooks ──────────────────────────────────────────────

/**
 * Hook for fetching data immediately on mount.
 * Simplifies the common pattern of loading data when a component mounts.
 */
export function useApiQuery<T, P extends any[] = []>(
  executor: (...params: P) => Promise<T>,
  params: P,
  options?: Omit<UseApiFetchOptions<T, P>, "immediate">
): UseApiFetchResult<T, P> {
  const result = useApiFetch(executor, {
    ...options,
    immediate: true,
  });

  // Re-execute when params change
  React.useEffect(() => {
    if (result.status !== "loading") {
      result.execute(...params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...params]);

  return result;
}

/**
 * Hook for mutations (POST, PUT, DELETE operations).
 * Optimistically returns data and provides easy error handling.
 */
export function useApiMutation<T, P extends any[] = []>(
  executor: (...params: P) => Promise<T>,
  options?: Omit<UseApiFetchOptions<T, P>, "immediate">
): Pick<
  UseApiFetchResult<T, P>,
  "execute" | "loading" | "error" | "success" | "reset" | "clearError"
> {
  const { execute, loading, error, success, reset, clearError } = useApiFetch(
    executor,
    {
      ...options,
      immediate: false,
    }
  );

  return {
    execute,
    loading,
    error,
    success,
    reset,
    clearError,
  };
}

/**
 * Hook for polling data at regular intervals.
 * Useful for real-time updates or long-running operations.
 */
export function useApiPolling<T, P extends any[] = []>(
  executor: (...params: P) => Promise<T>,
  interval: number,
  params: P,
  options?: Omit<UseApiFetchOptions<T, P>, "immediate">
): UseApiFetchResult<T, P> & { stop: () => void; start: () => void } {
  const result = useApiFetch(executor, {
    ...options,
    immediate: true,
  });
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isPolling, setIsPolling] = React.useState(true);

  const stop = React.useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    if (isPolling) return;
    setIsPolling(true);
  }, [isPolling]);

  React.useEffect(() => {
    if (isPolling) {
      // Execute immediately
      if (result.status !== "loading") {
        result.execute(...params);
      }

      // Set up interval
      intervalRef.current = setInterval(() => {
        if (result.status !== "loading") {
          result.execute(...params);
        }
      }, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isPolling, interval, result, params]);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...result,
    stop,
    start,
  };
}

// ─── Utility Functions ─────────────────────────────────────────────────

/**
 * Creates a hook factory for specific API endpoints.
 * Useful for creating type-safe hooks for your API modules.
 */
export function createApiHook<Module extends Record<string, (...args: any[]) => any>>(
  module: Module
) {
  return function <Key extends keyof Module>(
    key: Key,
    options?: UseApiFetchOptions<Awaited<ReturnType<Module[Key]>>, Parameters<Module[Key]>>
  ) {
    const executor = module[key] as (
      ...args: Parameters<Module[Key]>
    ) => ReturnType<Module[Key]>;
    return useApiFetch(executor, options);
  };
}

/**
 * Creates a query hook factory for specific API endpoints.
 */
export function createApiQueryHook<Module extends Record<string, (...args: any[]) => any>>(
  module: Module
) {
  return function <Key extends keyof Module>(
    key: Key,
    params: Parameters<Module[Key]>,
    options?: Omit<
      UseApiFetchOptions<Awaited<ReturnType<Module[Key]>>, Parameters<Module[Key]>>,
      "immediate"
    >
  ) {
    const executor = module[key] as (
      ...args: Parameters<Module[Key]>
    ) => ReturnType<Module[Key]>;
    return useApiQuery(executor, params, options);
  };
}
