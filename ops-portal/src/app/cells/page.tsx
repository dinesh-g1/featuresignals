"use client";

import { useRouter } from "next/navigation";
import { RefreshCw, Server } from "lucide-react";
import { useCellHealth } from "@/hooks/use-cells";
import {
  CellHealthCard,
  CellHealthCardSkeleton,
} from "@/components/cells/cell-health-card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CellHealthResponse } from "@/types/cell";

// ─── Summary Badges ────────────────────────────────────────────────────────

function HealthSummaryBar({
  summary,
}: {
  summary: CellHealthResponse["summary"];
}) {
  const items = [
    { label: "Healthy", count: summary.healthy, variant: "success" as const },
    { label: "Degraded", count: summary.degraded, variant: "warning" as const },
    { label: "Down", count: summary.down, variant: "danger" as const },
    { label: "Draining", count: summary.draining, variant: "warning" as const },
    { label: "Empty", count: summary.empty, variant: "default" as const },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) =>
        item.count > 0 ? (
          <Badge key={item.label} variant={item.variant} size="sm">
            {item.count} {item.label}
          </Badge>
        ) : null,
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function CellsPage() {
  const router = useRouter();

  const { data: healthResponse, isLoading, error, refetch } = useCellHealth();

  // ─── All Failed State ──────────────────────────────────────────────────

  if (error && !healthResponse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cells</h1>
            <p className="text-sm text-text-muted mt-1">
              Monitor cell health and resource usage
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <ErrorState
            title="Unable to load cell health data"
            message={
              error.message ??
              "An unexpected error occurred while fetching cell data."
            }
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  // ─── Loading State ─────────────────────────────────────────────────────

  const isLoadingInitial = isLoading && !healthResponse;
  const cells = healthResponse?.cells ?? [];
  const summary = healthResponse?.summary;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Cells</h1>
          <p className="text-sm text-text-muted mt-1">
            Monitor cell health and resource usage
            {summary && (
              <span className="ml-1.5 text-text-muted">
                · {summary.total} total
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary && <HealthSummaryBar summary={summary} />}
          <Button
            variant="secondary"
            size="md"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label="Refresh cell health"
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingInitial && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CellHealthCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoadingInitial && cells.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-bg-secondary/50 px-6 py-16 text-center">
          <Server
            className="h-10 w-10 text-text-muted mb-3"
            aria-hidden="true"
          />
          <h3 className="text-base font-semibold text-text-primary">
            No cells provisioned
          </h3>
          <p className="mt-1.5 text-sm text-text-secondary max-w-sm">
            Cells are provisioned automatically as tenants are onboarded. No
            manual cell creation is required.
          </p>
        </div>
      )}

      {/* Cell health grid */}
      {!isLoadingInitial && cells.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cells.map((cell) => (
            <CellHealthCard key={cell.cellId} cell={cell} />
          ))}
        </div>
      )}
    </div>
  );
}
