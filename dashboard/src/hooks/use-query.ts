"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { queryCache } from "@/lib/query-cache";

interface UseQueryOptions<T> {
  enabled?: boolean;
  initialData?: T;
}

interface UseQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseQueryOptions<T> = {},
): UseQueryResult<T> {
  const { enabled = true, initialData } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!key) return () => {};
      return queryCache.subscribe(key, onStoreChange);
    },
    [key],
  );

  const getSnapshot = useCallback(() => {
    if (!key) return initialData;
    return queryCache.get<T>(key) ?? initialData;
  }, [key, initialData]);

  const data = useSyncExternalStore(subscribe, getSnapshot, () => initialData);

  const doFetch = useCallback(() => {
    if (!key || !enabled) return;
    setLoading(true);
    setError(null);
    queryCache
      .fetch(key, fetcherRef.current)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Request failed");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, enabled]);

  useEffect(() => {
    if (!key || !enabled) return;
    if (queryCache.isStale(key)) {
      doFetch();
    } else if (queryCache.get(key) === undefined) {
      doFetch();
    }
  }, [key, enabled, doFetch]);

  return {
    data,
    loading: loading && data === undefined,
    error,
    refetch: doFetch,
  };
}

interface UseMutationOptions<TData> {
  invalidateKeys?: string[];
  onSuccess?: (data: TData) => void;
  onError?: (error: string) => void;
}

interface UseMutationResult<TArgs, TData> {
  mutate: (args: TArgs) => Promise<TData | undefined>;
  loading: boolean;
  error: string | null;
}

export function useMutation<TArgs, TData = unknown>(
  mutationFn: (args: TArgs) => Promise<TData>,
  options: UseMutationOptions<TData> = {},
): UseMutationResult<TArgs, TData> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutate = useCallback(
    async (args: TArgs): Promise<TData | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFn(args);
        optionsRef.current.invalidateKeys?.forEach((key) => {
          queryCache.invalidate(key);
        });
        optionsRef.current.onSuccess?.(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Operation failed";
        setError(msg);
        optionsRef.current.onError?.(msg);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn],
  );

  return { mutate, loading, error };
}
