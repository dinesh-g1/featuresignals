"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Standardized page data state.
 *
 * Every data-fetching page should use this shape so users always see:
 * 1. Loading skeleton → 2. Error (with retry) → 3. Empty (with CTA) → 4. Data
 */
export interface PageData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface UsePageDataOptions<T> {
  /** Initial data to show while loading (optional) */
  initialData?: T;
  /** Whether fetching is enabled (like useQuery's enabled) */
  enabled?: boolean;
}

/**
 * usePageData — encapsulates the loading/error/data lifecycle for a page.
 *
 * Use this hook for top-level page data fetching. It handles:
 * - Fetch lifecycle (loading → success/error)
 * - Cancellation on unmount or dependency change
 * - Error mapping to user-friendly strings
 * - Manual reload via returned `reload()`
 *
 * @example
 * ```tsx
 * const { data: flags, loading, error, reload } = usePageData(
 *   () => api.listFlags(token, projectId),
 *   [token, projectId],
 * );
 * ```
 */
export function usePageData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options: UsePageDataOptions<T> = {},
): PageData<T> {
  const { initialData, enabled = true } = options;
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const versionRef = useRef(0);

  const fetchData = useCallback(() => {
    if (!enabled) return;
    const version = ++versionRef.current;

    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!mountedRef.current || version !== versionRef.current) return;
        setData(result);
      })
      .catch((err) => {
        if (!mountedRef.current || version !== versionRef.current) return;
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
      })
      .finally(() => {
        if (!mountedRef.current || version !== versionRef.current) return;
        setLoading(false);
      });
    // Only depend on enabled — fetcher and deps are intentionally excluded
    // because we use versionRef for cancellation and the caller passes deps
    // separately to control re-fetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Also re-fetch when enabled toggles from false to true
  useEffect(() => {
    if (enabled) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    data,
    loading: loading && data === null,
    error,
    reload: fetchData,
  };
}
