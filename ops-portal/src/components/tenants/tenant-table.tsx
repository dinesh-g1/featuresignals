"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Search, SlidersHorizontal } from "lucide-react";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Tenant, TenantFilters } from "@/types/tenant";

// ─── Helpers ──────────────────────────────────────────────────────────────

const tierBadgeVariant: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info" | "primary"
> = {
  free: "default",
  starter: "info",
  pro: "primary",
  enterprise: "warning",
};

const statusDotMap: Record<
  string,
  | "healthy"
  | "success"
  | "warning"
  | "degraded"
  | "error"
  | "danger"
  | "info"
  | "neutral"
> = {
  active: "healthy",
  suspended: "error",
  past_due: "warning",
  deprovisioning: "neutral",
};

const statusLabelMap: Record<string, string> = {
  active: "Active",
  suspended: "Suspended",
  past_due: "Past Due",
  deprovisioning: "Deprovisioning",
};

// ─── Column Helper ────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Tenant>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => {
      const tenant = info.row.original;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text-primary">
            {tenant.name}
          </span>
          <span className="text-xs text-text-muted font-mono">
            {tenant.slug}
          </span>
        </div>
      );
    },
    enableSorting: true,
  }) as ColumnDef<Tenant>,
  columnHelper.accessor("tier", {
    header: "Tier",
    cell: (info) => {
      const tier = info.getValue();
      return (
        <Badge variant={tierBadgeVariant[tier] ?? "default"} size="sm">
          <span className="capitalize">{tier}</span>
        </Badge>
      );
    },
    enableSorting: true,
  }) as ColumnDef<Tenant>,
  columnHelper.accessor("cellName", {
    header: "Cell",
    cell: (info) => (
      <span className="text-sm text-text-secondary">{info.getValue()}</span>
    ),
    enableSorting: true,
  }) as ColumnDef<Tenant>,
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue();
      return (
        <StatusDot
          status={statusDotMap[status] ?? "neutral"}
          label={statusLabelMap[status] ?? status}
          size="sm"
        />
      );
    },
    enableSorting: true,
  }) as ColumnDef<Tenant>,
  columnHelper.accessor("cost", {
    header: "Cost",
    cell: (info) => {
      const tenant = info.row.original;
      return (
        <span className="text-sm font-medium tabular-nums text-text-primary">
          {formatCurrency(tenant.cost, tenant.currency)}
        </span>
      );
    },
    enableSorting: true,
  }) as ColumnDef<Tenant>,
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => (
      <span className="text-sm text-text-muted whitespace-nowrap">
        {formatRelativeTime(info.getValue())}
      </span>
    ),
    enableSorting: true,
  }) as ColumnDef<Tenant>,
];

// ─── Tier Options ─────────────────────────────────────────────────────────

const tierOptions: SelectOption[] = [
  { value: "__all__", label: "All Tiers" },
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

// ─── Props ────────────────────────────────────────────────────────────────

export interface TenantTableProps {
  tenants: Tenant[];
  total: number;
  loading: boolean;
  error: Error | null;
  filters: TenantFilters;
  onFiltersChange: (filters: TenantFilters) => void;
  onRetry: () => void;
  onProvisionClick: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function TenantTable({
  tenants,
  total,
  loading,
  error,
  filters,
  onFiltersChange,
  onRetry,
  onProvisionClick,
}: TenantTableProps) {
  const router = useRouter();

  const [sorting, setSorting] = React.useState<SortingState>(() => {
    if (filters.sortBy) {
      return [
        { id: filters.sortBy, desc: (filters.sortDir ?? "asc") === "desc" },
      ];
    }
    return [{ id: "createdAt", desc: true }];
  });

  // Sync sorting changes to parent filters
  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting);
      if (newSorting.length > 0) {
        onFiltersChange({
          ...filters,
          sortBy: newSorting[0].id as TenantFilters["sortBy"],
          sortDir: newSorting[0].desc ? "desc" : "asc",
        });
      } else {
        onFiltersChange({
          ...filters,
          sortBy: undefined,
          sortDir: undefined,
        });
      }
    },
    [filters, onFiltersChange],
  );

  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, search: e.target.value, offset: 0 });
    },
    [filters, onFiltersChange],
  );

  const handleTierChange = React.useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        tier: value === "__all__" ? undefined : (value as Tenant["tier"]),
        offset: 0,
      });
    },
    [filters, onFiltersChange],
  );

  const handlePageChange = React.useCallback(
    (page: number) => {
      onFiltersChange({ ...filters, offset: page * (filters.limit ?? 50) });
    },
    [filters, onFiltersChange],
  );

  // Render error state inline
  const errorNode = error ? (
    <div className="py-6">
      <ErrorState
        compact
        title="Failed to load tenants"
        message={error.message}
        onRetry={onRetry}
      />
    </div>
  ) : undefined;

  // Render empty state inline
  const emptyNode =
    !loading && !error ? (
      <EmptyState
        icon={Search}
        title="No tenants found"
        description={
          filters.search || filters.tier
            ? "Try adjusting your search or filter criteria."
            : "Get started by provisioning your first tenant."
        }
        action={
          !filters.search && !filters.tier
            ? { label: "Provision Tenant", onClick: onProvisionClick }
            : undefined
        }
      />
    ) : undefined;

  const currentPage = filters.offset
    ? Math.floor(filters.offset / (filters.limit ?? 50))
    : 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search tenants by name or slug..."
            value={filters.search ?? ""}
            onChange={handleSearchChange}
            className="pl-10"
            aria-label="Search tenants"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={filters.tier ?? "__all__"}
            onValueChange={handleTierChange}
            options={tierOptions}
            placeholder="All Tiers"
            aria-label="Filter by tier"
          />
        </div>
      </div>

      {/* Table */}
      <Table<Tenant>
        columns={columns}
        data={tenants}
        loading={loading}
        errorState={errorNode}
        emptyState={emptyNode}
        skeletonRows={5}
        enableSorting
        enablePagination
        manualPagination
        manualSorting
        totalItems={total}
        pageSize={filters.limit ?? 50}
        pageIndex={currentPage}
        onPageChange={handlePageChange}
        onSortingChange={handleSortingChange}
        initialSort={sorting}
        onRowClick={(tenant) => router.push(`/tenants/${tenant.id}`)}
      />
    </div>
  );
}
