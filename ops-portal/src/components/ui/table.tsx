'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnSort,
  type SortingState,
  type Table as TanStackTable,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────

export interface TableProps<TData> {
  /** Column definitions */
  columns: ColumnDef<TData>[];
  /** Row data */
  data: TData[];
  /** Loading state — shows skeleton rows */
  loading?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
  /** Empty state — shown when no data and not loading */
  emptyState?: React.ReactNode;
  /** Error state — shown when there's an error */
  errorState?: React.ReactNode;
  /** Enable sorting */
  enableSorting?: boolean;
  /** Initial sort state */
  initialSort?: ColumnSort[];
  /** Manual sorting (e.g., server-side) */
  manualSorting?: boolean;
  /** Called when sorting changes */
  onSortingChange?: (sorting: SortingState) => void;
  /** Enable pagination */
  enablePagination?: boolean;
  /** Manual pagination (e.g., server-side) */
  manualPagination?: boolean;
  /** Total items for manual pagination */
  totalItems?: number;
  /** Page size */
  pageSize?: number;
  /** Current page index (0-based) */
  pageIndex?: number;
  /** Called when pagination changes */
  onPageChange?: (page: number) => void;
  /** Called when a row is clicked */
  onRowClick?: (row: TData) => void;
  /** Optional class name */
  className?: string;
  /** Optional wrapper class name (for responsive scroll) */
  wrapperClassName?: string;
}

// ─── Internal Pagination Hook ─────────────────────────────────────────────

function usePaginationState(initialPageSize: number = 20) {
  const [{ pageIndex, pageSize }, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const pagination = React.useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  );

  return { pagination, setPagination };
}

// ─── Pagination Component ─────────────────────────────────────────────────

interface PaginationBarProps {
  table: TanStackTable<unknown>;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  manualPagination?: boolean;
}

function PaginationBar({
  table,
  totalItems,
  onPageChange,
  manualPagination,
}: PaginationBarProps) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = manualPagination && totalItems
    ? Math.ceil(totalItems / table.getState().pagination.pageSize)
    : table.getPageCount();

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (pageCount <= maxVisible + 2) {
      for (let i = 0; i < pageCount; i++) pages.push(i);
      return pages;
    }

    pages.push(0);

    let start = Math.max(1, pageIndex - 1);
    let end = Math.min(pageCount - 2, pageIndex + 1);

    if (pageIndex <= 2) {
      end = Math.min(maxVisible - 1, pageCount - 2);
    }
    if (pageIndex >= pageCount - 3) {
      start = Math.max(1, pageCount - maxVisible);
    }

    if (start > 1) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < pageCount - 2) pages.push('ellipsis');

    if (pageCount > 1) pages.push(pageCount - 1);

    return pages;
  };

  const handlePageChange = (page: number) => {
    if (manualPagination) {
      onPageChange?.(page);
    } else {
      table.setPageIndex(page);
    }
  };

  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border-default px-4 py-3">
      <div className="text-sm text-text-muted">
        {manualPagination && totalItems
          ? `${totalItems} total`
          : `${table.getRowCount()} total`}
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pageIndex === 0}
          onClick={() => handlePageChange(0)}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pageIndex === 0}
          onClick={() => handlePageChange(pageIndex - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-8 items-center justify-center text-sm text-text-muted"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === pageIndex ? 'primary' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => handlePageChange(page)}
                aria-label={`Page ${page + 1}`}
                aria-current={page === pageIndex ? 'page' : undefined}
              >
                {page + 1}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => handlePageChange(pageIndex + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => handlePageChange(pageCount - 1)}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}

// ─── Sort Icon Helper ─────────────────────────────────────────────────────

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc') {
    return <ArrowUp className="ml-1 h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />;
  }
  if (isSorted === 'desc') {
    return <ArrowDown className="ml-1 h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />;
  }
  return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100" aria-hidden="true" />;
}

// ─── Row Skeleton ─────────────────────────────────────────────────────────

function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-border-default">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" style={{ maxWidth: `${Math.max(60, 100 - i * 10)}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Table Component ─────────────────────────────────────────────────

export function Table<TData>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  emptyState,
  errorState,
  enableSorting = true,
  initialSort,
  manualSorting = false,
  onSortingChange,
  enablePagination = true,
  manualPagination = false,
  totalItems,
  pageSize: controlledPageSize,
  pageIndex: controlledPageIndex,
  onPageChange,
  onRowClick,
  className,
  wrapperClassName,
}: TableProps<TData>) {
  const { pagination: internalPagination, setPagination: setInternalPagination } =
    usePaginationState(controlledPageSize ?? 20);

  const [sorting, setSorting] = React.useState<SortingState>(initialSort ?? []);

  const pagination = React.useMemo(() => {
    if (manualPagination) {
      return {
        pageIndex: controlledPageIndex ?? 0,
        pageSize: controlledPageSize ?? 20,
      };
    }
    return internalPagination;
  }, [manualPagination, controlledPageIndex, controlledPageSize, internalPagination]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: enablePagination ? pagination : undefined,
    },
    onSortingChange: (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(sorting)
          : updaterOrValue;
      setSorting(newSorting);
      if (manualSorting && onSortingChange) {
        onSortingChange(newSorting);
      }
    },
    onPaginationChange: (updaterOrValue) => {
      if (!manualPagination) {
        setInternalPagination(
          typeof updaterOrValue === 'function'
            ? updaterOrValue(internalPagination)
            : updaterOrValue,
        );
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    manualSorting,
    manualPagination,
    pageCount: manualPagination && totalItems
      ? Math.ceil(totalItems / pagination.pageSize)
      : undefined,
    rowCount: manualPagination ? totalItems : undefined,
    enableSortingRemoval: true,
    enableMultiSort: false,
  });

  // Render states
  const showEmpty = !loading && !errorState && data.length === 0;
  const showError = !loading && !!errorState;
  const columnCount = columns.length;

  return (
    <div className={cn('w-full', wrapperClassName)}>
      <div className="overflow-x-auto rounded-lg border border-border-default">
        <table className={cn('w-full text-sm', className)}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border-default bg-bg-tertiary/50">
                {headerGroup.headers.map((header) => {
                  const canSort = enableSorting && header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted',
                        canSort && 'group cursor-pointer select-none hover:text-text-secondary',
                      )}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                        minWidth: header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                      aria-sort={
                        header.column.getIsSorted()
                          ? header.column.getIsSorted() === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <div className="flex items-center">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {canSort && (
                          <SortIcon isSorted={header.column.getIsSorted()} />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading && (
              <>
                {Array.from({ length: skeletonRows }).map((_, i) => (
                  <TableRowSkeleton key={`skeleton-${i}`} columns={columnCount} />
                ))}
              </>
            )}

            {showError && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8">
                  {errorState}
                </td>
              </tr>
            )}

            {showEmpty && emptyState && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8">
                  {emptyState}
                </td>
              </tr>
            )}

            {!loading && !showEmpty && !showError && (
              <>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-4 py-12 text-center text-sm text-text-muted"
                    >
                      No results
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border-default transition-colors last:border-b-0',
                        onRowClick && 'cursor-pointer hover:bg-bg-tertiary/50',
                      )}
                      onClick={
                        onRowClick ? () => onRowClick(row.original) : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-text-primary">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {enablePagination && !loading && !showError && !showEmpty && (
        <PaginationBar
          table={table as unknown as TanStackTable<unknown>}
          totalItems={totalItems}
          onPageChange={onPageChange}
          manualPagination={manualPagination}
        />
      )}
    </div>
  );
}

// ─── Re-export for convenience ────────────────────────────────────────────

export type { ColumnDef, SortingState, ColumnSort };
export { createColumnHelper } from '@tanstack/react-table';
