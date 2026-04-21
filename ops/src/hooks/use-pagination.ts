
"use client";

import * as React from "react";
import { useCallback, useMemo } from "react";

export interface UsePaginationOptions {
  /** Initial offset (starting position) */
  initialOffset?: number;
  /** Items per page */
  limit?: number;
  /** Maximum number of items that can be paginated (for calculating total pages) */
  totalItems?: number;
  /** Whether to reset to first page when totalItems changes */
  resetOnTotalChange?: boolean;
  /** Minimum limit value */
  minLimit?: number;
  /** Maximum limit value */
  maxLimit?: number;
}

export interface UsePaginationReturn<T> {
  // State
  offset: number;
  limit: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;

  // Actions
  setOffset: (offset: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  reset: () => void;

  // Utilities
  getPaginationParams: () => { offset: number; limit: number };
  getPageInfo: () => {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startIndex: number;
    endIndex: number;
  };
  getVisibleRange: (totalItems: number) => { start: number; end: number };
  sliceData: (data: T[]) => T[];
}

/**
 * A comprehensive pagination hook for managing pagination state.
 * Supports both client-side data slicing and server-side pagination parameters.
 *
 * @param options - Configuration options for pagination
 * @returns Pagination state and actions
 *
 * @example
 * // Basic usage
 * const pagination = usePagination({ limit: 25, totalItems: 100 });
 *
 * // With client-side data slicing
 * const pagination = usePagination({ limit: 25 });
 * const visibleData = pagination.sliceData(allData);
 *
 * // With server-side pagination
 * const pagination = usePagination({ limit: 25 });
 * const params = pagination.getPaginationParams(); // { offset: 0, limit: 25 }
 *
 * // Navigation
 * pagination.nextPage();
 * pagination.previousPage();
 * pagination.goToPage(3);
 */
export function usePagination<T = any>(
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const {
    initialOffset = 0,
    limit: initialLimit = 25,
    totalItems = 0,
    resetOnTotalChange = true,
    minLimit = 1,
    maxLimit = 100,
  } = options;

  const [offset, setOffset] = React.useState(initialOffset);
  const [limit, setLimit] = React.useState(
    Math.max(minLimit, Math.min(initialLimit, maxLimit))
  );

  // Reset to first page when totalItems changes (if enabled)
  React.useEffect(() => {
    if (resetOnTotalChange) {
      setOffset(0);
    }
  }, [totalItems, resetOnTotalChange]);

  // Ensure limit stays within bounds
  const safeLimit = useMemo(
    () => Math.max(minLimit, Math.min(limit, maxLimit)),
    [limit, minLimit, maxLimit]
  );

  // Calculate derived values
  const currentPage = useMemo(() => {
    return safeLimit > 0 ? Math.floor(offset / safeLimit) + 1 : 1;
  }, [offset, safeLimit]);

  const totalPages = useMemo(() => {
    return safeLimit > 0 ? Math.max(1, Math.ceil(totalItems / safeLimit)) : 1;
  }, [totalItems, safeLimit]);

  const hasPreviousPage = useMemo(() => offset > 0, [offset]);
  const hasNextPage = useMemo(
    () => offset + safeLimit < totalItems,
    [offset, safeLimit, totalItems]
  );
  const isFirstPage = useMemo(() => currentPage === 1, [currentPage]);
  const isLastPage = useMemo(
    () => currentPage === totalPages,
    [currentPage, totalPages]
  );

  // Actions
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setOffset((prev) => prev + safeLimit);
    }
  }, [hasNextPage, safeLimit]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setOffset((prev) => Math.max(0, prev - safeLimit));
    }
  }, [hasPreviousPage, safeLimit]);

  const goToPage = useCallback(
    (page: number) => {
      const targetPage = Math.max(1, Math.min(page, totalPages));
      const newOffset = (targetPage - 1) * safeLimit;
      setOffset(newOffset);
    },
    [totalPages, safeLimit]
  );

  const goToFirstPage = useCallback(() => {
    setOffset(0);
  }, []);

  const goToLastPage = useCallback(() => {
    const lastPageOffset = (totalPages - 1) * safeLimit;
    setOffset(lastPageOffset);
  }, [totalPages, safeLimit]);

  const reset = useCallback(() => {
    setOffset(initialOffset);
    setLimit(initialLimit);
  }, [initialOffset, initialLimit]);

  const updateLimit = useCallback(
    (newLimit: number) => {
      const clampedLimit = Math.max(minLimit, Math.min(newLimit, maxLimit));

      // When changing limit, adjust offset to keep the same approximate position
      const newOffset = Math.floor(offset / safeLimit) * clampedLimit;

      setLimit(clampedLimit);
      setOffset(Math.min(newOffset, Math.max(0, totalItems - clampedLimit)));
    },
    [offset, safeLimit, totalItems, minLimit, maxLimit]
  );

  // Utilities
  const getPaginationParams = useCallback(
    () => ({
      offset,
      limit: safeLimit,
    }),
    [offset, safeLimit]
  );

  const getPageInfo = useCallback(
    () => ({
      currentPage,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      startIndex: offset,
      endIndex: Math.min(offset + safeLimit - 1, totalItems - 1),
    }),
    [currentPage, totalPages, hasNextPage, hasPreviousPage, offset, safeLimit, totalItems]
  );

  const getVisibleRange = useCallback(
    (itemsCount: number) => ({
      start: offset,
      end: Math.min(offset + safeLimit, itemsCount),
    }),
    [offset, safeLimit]
  );

  const sliceData = useCallback(
    (data: T[]): T[] => {
      if (!Array.isArray(data)) return [];
      const { start, end } = getVisibleRange(data.length);
      return data.slice(start, end);
    },
    [getVisibleRange]
  );

  return {
    // State
    offset,
    limit: safeLimit,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isFirstPage,
    isLastPage,

    // Actions
    setOffset,
    setLimit: updateLimit,
    nextPage,
    previousPage,
    goToPage,
    goToFirstPage,
    goToLastPage,
    reset,

    // Utilities
    getPaginationParams,
    getPageInfo,
    getVisibleRange,
    sliceData,
  };
}

/**
 * A simplified version of usePagination for common use cases.
 * Returns only the essential pagination state and actions.
 */
export function useSimplePagination(
  options: Omit<UsePaginationOptions, "resetOnTotalChange"> = {}
) {
  const {
    totalItems = 0,
    initialOffset = 0,
    limit = 25,
    minLimit = 1,
    maxLimit = 100,
  } = options;

  const pagination = usePagination({
    initialOffset,
    limit,
    totalItems,
    resetOnTotalChange: false,
    minLimit,
    maxLimit,
  });

  // Simplified return with only essential properties
  return {
    offset: pagination.offset,
    limit: pagination.limit,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNextPage,
    hasPreviousPage: pagination.hasPreviousPage,

    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,
    goToPage: pagination.goToPage,
    setOffset: pagination.setOffset,
    setLimit: pagination.setLimit,
    reset: pagination.reset,

    getPaginationParams: pagination.getPaginationParams,
    getPageInfo: pagination.getPageInfo,
  };
}

/**
 * Hook for table pagination that integrates with data fetching.
 * Automatically resets to first page when filters or search change.
 */
export function useTablePagination<T = any>(
  options: UsePaginationOptions & {
    /** Dependencies that should trigger a reset to first page */
    resetDependencies?: any[];
  } = {}
) {
  const { resetDependencies = [], ...paginationOptions } = options;

  const pagination = usePagination<T>({
    ...paginationOptions,
    resetOnTotalChange: false, // We'll handle resets manually
  });

  // Reset to first page when dependencies change
  React.useEffect(() => {
    pagination.goToFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDependencies);

  return pagination;
}
