"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Card } from "./card";

// ─── Types ─────────────────────────────────────────────────────────────

export interface ColumnDefinition<T> {
  id: string;
  header:
    | React.ReactNode
    | ((props: {
        sortable?: boolean;
        isSorted: boolean;
        sortDirection: "asc" | "desc" | null;
      }) => React.ReactNode);
  accessor: keyof T | ((row: T) => React.ReactNode);
  cell?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: "text" | "select" | "date";
  filterOptions?: Array<{ value: string; label: string }>;
  className?: string;
  mobileHidden?: boolean;
  mobileTitle?: string;
}

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  columnId: string | null;
  direction: SortDirection;
}

export interface FilterState {
  [columnId: string]: string;
}

export interface TableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  keyAccessor: keyof T | ((row: T) => string);
  loading?: boolean;
  error?: string;
  emptyState?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
  };
  onRowClick?: (row: T) => void;
  onSortChange?: (sortState: SortState) => void;
  onFilterChange?: (filterState: FilterState) => void;
  sortable?: boolean;
  filterable?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
  containerClassName?: string;
  mobileCardView?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  dense?: boolean;
}

// ─── Table Components ──────────────────────────────────────────────────

export function Table<T extends Record<string, any>>({
  data,
  columns,
  keyAccessor,
  loading = false,
  error,
  emptyState,
  onRowClick,
  onSortChange,
  onFilterChange,
  sortable = true,
  filterable = true,
  showSearch = true,
  searchPlaceholder = "Search...",
  className,
  containerClassName,
  mobileCardView = true,
  striped = true,
  hoverable = true,
  dense = false,
}: TableProps<T>) {
  const [sortState, setSortState] = React.useState<SortState>({
    columnId: null,
    direction: null,
  });
  const [filterState, setFilterState] = React.useState<FilterState>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const isMobile = useMediaQuery("(max-width: 767px)");

  const handleSort = (columnId: string) => {
    if (!sortable) return;

    const newSortState: SortState = {
      columnId,
      direction:
        sortState.columnId === columnId
          ? sortState.direction === "asc"
            ? "desc"
            : sortState.direction === "desc"
              ? null
              : "asc"
          : "asc",
    };

    setSortState(newSortState);
    onSortChange?.(newSortState);
  };

  const handleFilterChange = (columnId: string, value: string) => {
    const newFilterState = { ...filterState, [columnId]: value };
    setFilterState(newFilterState);
    onFilterChange?.(newFilterState);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Filter data based on search and filter state
  const filteredData = React.useMemo(() => {
    let result = [...data];

    // Apply column filters
    if (filterable && Object.keys(filterState).length > 0) {
      result = result.filter((row) =>
        columns.every((column) => {
          const filterValue = filterState[column.id];
          if (!filterValue) return true;

          const cellValue =
            typeof column.accessor === "function"
              ? column.accessor(row)
              : row[column.accessor];

          return String(cellValue)
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        }),
      );
    }

    // Apply global search
    if (searchQuery) {
      result = result.filter((row) =>
        columns.some((column) => {
          const cellValue =
            typeof column.accessor === "function"
              ? column.accessor(row)
              : row[column.accessor];
          return String(cellValue)
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        }),
      );
    }

    // Apply sorting
    if (sortState.columnId && sortState.direction) {
      const column = columns.find((c) => c.id === sortState.columnId);
      if (column?.sortable) {
        result.sort((a, b) => {
          const aValue =
            typeof column.accessor === "function"
              ? column.accessor(a)
              : a[column.accessor];
          const bValue =
            typeof column.accessor === "function"
              ? column.accessor(b)
              : b[column.accessor];

          const aVal = aValue ?? "";
          const bVal = bValue ?? "";
          if (aVal === bVal) return 0;
          const comparison = aVal < bVal ? -1 : 1;
          return sortState.direction === "asc" ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [data, columns, filterState, searchQuery, sortState, filterable]);

  const getRowKey = (row: T): string => {
    return typeof keyAccessor === "function"
      ? keyAccessor(row)
      : String(row[keyAccessor]);
  };

  // ─── Render States ──────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-12",
          containerClassName,
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-12",
          containerClassName,
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div>
            <p className="font-medium text-white">Error loading data</p>
            <p className="mt-1 text-sm text-gray-400">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    const defaultEmptyState = {
      icon: <Search className="h-12 w-12 text-gray-600" />,
      title: "No data found",
      description:
        searchQuery || Object.values(filterState).some(Boolean)
          ? "Try adjusting your search or filters"
          : "No data available",
      action: (searchQuery || Object.values(filterState).some(Boolean)) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchQuery("");
            setFilterState({});
          }}
        >
          Clear filters
        </Button>
      ),
    };

    const emptyConfig = { ...defaultEmptyState, ...emptyState };

    return (
      <div
        className={cn(
          "flex items-center justify-center py-12",
          containerClassName,
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {emptyConfig.icon}
          <div>
            <p className="font-medium text-white">{emptyConfig.title}</p>
            <p className="mt-1 text-sm text-gray-400">
              {emptyConfig.description}
            </p>
          </div>
          {emptyConfig.action && (
            <div className="mt-2">{emptyConfig.action}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", containerClassName)}>
      {/* Controls */}
      {(showSearch || filterable) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {showSearch && (
            <div className="flex-1 min-w-0">
              <Input
                leftIcon={<Search className="h-4 w-4" />}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full sm:max-w-xs"
                size="sm"
              />
            </div>
          )}

          {filterable && (
            <div className="flex flex-wrap gap-2">
              {columns
                .filter((col) => col.filterable)
                .map((column) => (
                  <div key={column.id} className="flex items-center gap-2">
                    {column.filterType === "select" && column.filterOptions ? (
                      <select
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                        value={filterState[column.id] || ""}
                        onChange={(e) =>
                          handleFilterChange(column.id, e.target.value)
                        }
                      >
                        <option value="">All {String(column.header)}</option>
                        {column.filterOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        placeholder={`Filter ${String(column.header)}`}
                        value={filterState[column.id] || ""}
                        onChange={(e) =>
                          handleFilterChange(column.id, e.target.value)
                        }
                        size="sm"
                        className="w-full sm:w-40"
                      />
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop Table (hidden on mobile when card view enabled) */}
      {(!mobileCardView || !isMobile) && (
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-gray-800",
            className,
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  {columns.map((column) => {
                    const isSorted = sortState.columnId === column.id;
                    const sortDirection = isSorted ? sortState.direction : null;

                    return (
                      <th
                        key={column.id}
                        className={cn(
                          "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300",
                          column.sortable &&
                            "cursor-pointer select-none hover:bg-gray-800/50",
                          column.className,
                          dense ? "py-2" : "py-3",
                        )}
                        onClick={
                          column.sortable
                            ? () => handleSort(column.id)
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2">
                          {typeof column.header === "function"
                            ? column.header({
                                sortable: column.sortable,
                                isSorted,
                                sortDirection,
                              })
                            : column.header}
                          {column.sortable && (
                            <div className="flex flex-col">
                              <ChevronUp
                                className={cn(
                                  "h-3 w-3 -mb-1",
                                  isSorted && sortDirection === "asc"
                                    ? "text-blue-400"
                                    : "text-gray-300",
                                )}
                              />
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3",
                                  isSorted && sortDirection === "desc"
                                    ? "text-blue-400"
                                    : "text-gray-300",
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredData.map((row) => {
                  const rowKey = getRowKey(row);
                  return (
                    <tr
                      key={rowKey}
                      className={cn(
                        "bg-gray-900 transition",
                        striped && "even:bg-gray-900/50",
                        hoverable && "hover:bg-gray-800/50",
                        onRowClick && "cursor-pointer",
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((column) => {
                        const cellValue =
                          typeof column.accessor === "function"
                            ? column.accessor(row)
                            : row[column.accessor];

                        return (
                          <td
                            key={`${rowKey}-${column.id}`}
                            className={cn(
                              "px-4 py-3 text-gray-300",
                              column.className,
                              dense ? "py-2" : "py-3",
                            )}
                          >
                            {column.cell
                              ? column.cell(cellValue, row)
                              : String(cellValue || "—")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Card View (only shown on mobile when enabled) */}
      {mobileCardView && isMobile && (
        <div className="space-y-3">
          {filteredData.map((row) => {
            const rowKey = getRowKey(row);
            const visibleColumns = columns.filter((col) => !col.mobileHidden);

            return (
              <Card
                key={rowKey}
                hoverable={!!onRowClick}
                className="cursor-pointer transition hover:border-blue-500/50"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                <div className="space-y-3 p-4">
                  {visibleColumns.map((column, index) => {
                    const cellValue =
                      typeof column.accessor === "function"
                        ? column.accessor(row)
                        : row[column.accessor];

                    const isFirst = index === 0;
                    const showDivider =
                      index > 0 && index < visibleColumns.length - 1;

                    return (
                      <div
                        key={`${rowKey}-${column.id}`}
                        className={cn(
                          "flex items-start justify-between",
                          showDivider && "border-t border-gray-800 pt-3",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-300">
                            {column.mobileTitle || String(column.header)}
                          </div>
                          <div className="mt-1 text-sm text-white">
                            {column.cell
                              ? column.cell(cellValue, row)
                              : String(cellValue || "—")}
                          </div>
                        </div>
                        {isFirst && onRowClick && (
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          Showing {filteredData.length} of {data.length} items
          {(searchQuery || Object.values(filterState).some(Boolean)) && (
            <span className="ml-2">(filtered)</span>
          )}
        </div>
        {sortState.columnId && sortState.direction && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Sorted by:</span>
            <span className="text-white">
              {(() => {
                const column = columns.find((c) => c.id === sortState.columnId);
                if (!column) return null;
                const header = column.header;
                if (typeof header === "function") {
                  return header({
                    sortable: column.sortable,
                    isSorted: true,
                    sortDirection: sortState.direction,
                  });
                }
                return header;
              })()}
            </span>
            <span className="text-gray-400">
              {sortState.direction === "asc" ? "↑" : "↓"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Utility Components ────────────────────────────────────────────────

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-800" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-24 animate-pulse rounded-lg bg-gray-800"
            />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-800" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="bg-gray-900">
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-3">
                      <div
                        className={cn(
                          "h-4 animate-pulse rounded bg-gray-800",
                          colIndex === 0 ? "w-32" : "w-24",
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function MobileCardSkeleton({
  cards = 3,
  fields = 3,
}: {
  cards?: number;
  fields?: number;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {Array.from({ length: cards }).map((_, cardIndex) => (
        <Card key={cardIndex}>
          <div className="space-y-4 p-4">
            {Array.from({ length: fields }).map((_, fieldIndex) => (
              <div key={fieldIndex} className="space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-gray-800" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
