"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Server, Plus, Trash2, Loader2 } from "lucide-react";
import {
  useCellHealth,
  useProvisionCell,
  useDeprovisionCell,
} from "@/hooks/use-cells";
import {
  CellHealthCard,
  CellHealthCardSkeleton,
} from "@/components/cells/cell-health-card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ConfirmDialog,
  useConfirmDialog,
} from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { CellHealthResponse, CellHealth } from "@/types/cell";

// ─── Constants ──────────────────────────────────────────────────────────────

const SERVER_TYPES = [
  { value: "cx22", label: "CX22 — 2 vCPU, 4 GB RAM, 40 GB SSD" },
  { value: "cx32", label: "CX32 — 4 vCPU, 8 GB RAM, 80 GB SSD" },
  { value: "cx52", label: "CX52 — 8 vCPU, 16 GB RAM, 160 GB SSD" },
];

const LOCATIONS = [
  { value: "fsn1", label: "Falkenstein (DE)" },
  { value: "nbg1", label: "Nuremberg (DE)" },
  { value: "hel1", label: "Helsinki (FI)" },
];

// ─── Summary Badges ─────────────────────────────────────────────────────────

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
    {
      label: "Provisioning",
      count: summary.provisioning ?? 0,
      variant: "info" as const,
    },
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

// ─── Provision Modal ────────────────────────────────────────────────────────

function ProvisionCellModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState("");
  const [serverType, setServerType] = React.useState("cx22");
  const [location, setLocation] = React.useState("fsn1");
  const [userData, setUserData] = React.useState("");

  const provisionMutation = useProvisionCell();

  const handleProvision = React.useCallback(() => {
    if (!name.trim()) return;

    provisionMutation.mutate(
      {
        name: name.trim(),
        server_type: serverType,
        location,
        user_data: userData || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setServerType("cx22");
          setLocation("fsn1");
          setUserData("");
          onOpenChange(false);
        },
      },
    );
  }, [name, serverType, location, userData, provisionMutation, onOpenChange]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Provision New Cell"
      description="Create a new Hetzner cloud server for a tenant cell."
      confirmLabel={provisionMutation.isPending ? "Provisioning…" : "Provision"}
      onConfirm={handleProvision}
      loading={provisionMutation.isPending}
      confirmDisabled={!name.trim() || provisionMutation.isPending}
      size="lg"
    >
      <div className="space-y-5">
        {/* Server name */}
        <Input
          label="Server Name"
          placeholder="e.g., prod-eu-fsn-001"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={
            provisionMutation.isError
              ? "Failed to provision cell. Check server details and try again."
              : undefined
          }
        />

        {/* Server type */}
        <Select
          label="Server Type"
          options={SERVER_TYPES}
          value={serverType}
          onValueChange={setServerType}
        />

        {/* Location */}
        <Select
          label="Location"
          options={LOCATIONS}
          value={location}
          onValueChange={setLocation}
        />

        {/* Cloud-init script */}
        <div className="w-full">
          <label
            htmlFor="user-data"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Cloud-init Script{" "}
            <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="user-data"
            rows={5}
            className={cn(
              "flex w-full rounded-md border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted",
              "border-border-default transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "font-mono text-xs",
            )}
            placeholder="#cloud-config"
            value={userData}
            onChange={(e) => setUserData(e.target.value)}
          />
        </div>

        {provisionMutation.isError && (
          <div className="rounded-lg bg-accent-danger/5 border border-accent-danger/20 p-3">
            <p className="text-xs text-accent-danger">
              <strong>Error:</strong>{" "}
              {provisionMutation.error?.message ??
                "An unexpected error occurred while provisioning the cell."}
            </p>
          </div>
        )}

        <p className="text-xs text-text-muted">
          A Hetzner cloud server will be provisioned with the FeatureSignals
          stack. This process typically takes 2–5 minutes.
        </p>
      </div>
    </Modal>
  );
}

// ─── Cell Card with Deprovision ─────────────────────────────────────────────

function CellCard({
  cell,
  onDeprovision,
}: {
  cell: CellHealth;
  onDeprovision: (cell: CellHealth) => void;
}) {
  const router = useRouter();

  const isTransitioning =
    cell.status === "provisioning" || cell.status === "deprovisioning";

  if (isTransitioning) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-secondary p-5 opacity-70">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Server
                className="h-4 w-4 text-accent-primary shrink-0"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-text-primary truncate">
                {cell.cellName}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-text-muted">{cell.region}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-accent-warning">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            {cell.status === "provisioning"
              ? "Provisioning…"
              : "Deprovisioning…"}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Status: {cell.status}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <CellHealthCard cell={cell} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeprovision(cell);
        }}
        className={cn(
          "absolute top-3 right-3 p-1.5 rounded-md",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "text-text-muted hover:text-accent-danger hover:bg-accent-danger/10",
          "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-danger",
        )}
        aria-label={`Deprovision ${cell.cellName}`}
        title={`Deprovision ${cell.cellName}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CellsPage() {
  const [provisionModalOpen, setProvisionModalOpen] = React.useState(false);
  const [cellToDeprovision, setCellToDeprovision] =
    React.useState<CellHealth | null>(null);

  const deprovisionDialog = useConfirmDialog();

  const { data: healthResponse, isLoading, error, refetch } = useCellHealth();
  const deprovisionMutation = useDeprovisionCell();

  // Sync cellToDeprovision state with dialog open state.
  React.useEffect(() => {
    if (cellToDeprovision) {
      deprovisionDialog.openDialog();
    }
  }, [cellToDeprovision, deprovisionDialog]);

  const handleDeprovisionConfirm = React.useCallback(() => {
    if (!cellToDeprovision) return;

    deprovisionMutation.mutate(cellToDeprovision.cellId, {
      onSuccess: () => {
        setCellToDeprovision(null);
        deprovisionDialog.closeDialog();
      },
    });
  }, [cellToDeprovision, deprovisionMutation, deprovisionDialog]);

  // ─── All Failed State ──────────────────────────────────────────────────

  if (error && !healthResponse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cells</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage and monitor infrastructure cells
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
            Manage and monitor infrastructure cells
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
            variant="primary"
            size="md"
            onClick={() => setProvisionModalOpen(true)}
            aria-label="Provision new cell"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Provision Cell
          </Button>
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

      {/* Provision modal */}
      <ProvisionCellModal
        open={provisionModalOpen}
        onOpenChange={setProvisionModalOpen}
      />

      {/* Deprovision confirmation dialog */}
      {cellToDeprovision && (
        <ConfirmDialog
          open={deprovisionDialog.open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setCellToDeprovision(null);
              deprovisionDialog.closeDialog();
            }
          }}
          title={`Deprovision ${cellToDeprovision.cellName}`}
          message={`Are you sure you want to deprovision this cell? This will permanently delete the Hetzner server and all associated data.`}
          details={`Cell: ${cellToDeprovision.cellName} (${cellToDeprovision.region})`}
          resourceName={cellToDeprovision.cellName}
          resourceType="cell"
          confirmLabel="Deprovision"
          onConfirm={handleDeprovisionConfirm}
          onCancel={() => {
            setCellToDeprovision(null);
            deprovisionDialog.closeDialog();
          }}
          loading={deprovisionMutation.isPending}
        />
      )}

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
          <p className="mt-1.5 text-sm text-text-secondary max-w-sm mb-6">
            Cells are Hetzner cloud servers that run the FeatureSignals stack.
            Provision your first cell to get started.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setProvisionModalOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Provision Cell
          </Button>
        </div>
      )}

      {/* Cell health grid */}
      {!isLoadingInitial && cells.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cells.map((cell) => (
            <CellCard
              key={cell.cellId}
              cell={cell}
              onDeprovision={setCellToDeprovision}
            />
          ))}
        </div>
      )}
    </div>
  );
}
