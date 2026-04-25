"use client";

import { useCallback, useMemo, useState } from "react";
import { Eye, EyeOff, HardDrive, RefreshCw, Save } from "lucide-react";
import { useEnvVars, useUpdateEnvVar } from "@/hooks/use-env-vars";
import { useCells } from "@/hooks/use-cells";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  ConfirmDialog,
  useConfirmDialog,
} from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { EnvVar } from "@/types/env-var";

// ─── Constants ──────────────────────────────────────────────────────────────

const SOURCE_ORDER: EnvVar["source"][] = [
  "global",
  "cloud",
  "region",
  "cell",
  "tenant",
];

const SOURCE_LABELS: Record<EnvVar["source"], string> = {
  global: "Global",
  cloud: "Cloud",
  region: "Region",
  cell: "Cell",
  tenant: "Tenant",
};

const SOURCE_VARIANTS: Record<
  EnvVar["source"],
  "default" | "info" | "primary" | "warning" | "success"
> = {
  global: "default",
  cloud: "info",
  region: "primary",
  cell: "warning",
  tenant: "success",
};

const VALID_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;

// ─── Helpers ────────────────────────────────────────────────────────────────

function validateKey(key: string): string | null {
  if (!key) return "Key is required";
  if (!VALID_KEY_PATTERN.test(key)) {
    return "Key must be uppercase letters, digits, and underscores only (starting with a letter)";
  }
  return null;
}

function maskValue(value: string): string {
  if (value.length <= 8) return "*".repeat(value.length);
  return (
    value.substring(0, 4) +
    "*".repeat(Math.min(value.length - 8, 16)) +
    value.substring(value.length - 4)
  );
}

function truncateValue(value: string, maxLen: number = 60): string {
  if (value.length <= maxLen) return value;
  return value.substring(0, maxLen - 3) + "...";
}

function isSensitiveKey(key: string): boolean {
  const sensitivePrefixes = [
    "SECRET",
    "TOKEN",
    "KEY",
    "PASSWORD",
    "PASSWD",
    "CREDENTIAL",
    "AUTH",
  ];
  const upper = key.toUpperCase();
  return sensitivePrefixes.some((p) => upper.includes(p));
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function EnvVarsPage() {
  const toast = useToast();

  // ─── State ────────────────────────────────────────────────────────────

  const [selectedCellId, setSelectedCellId] = useState<string>("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingVar, setEditingVar] = useState<EnvVar | null>(null);

  const {
    open: confirmOpen,
    setOpen: setConfirmOpen,
    dialogProps: confirmDialogProps,
  } = useConfirmDialog();

  // ─── Queries ──────────────────────────────────────────────────────────

  const {
    data: envVarList,
    isLoading,
    error,
    refetch,
  } = useEnvVars(selectedCellId || undefined);

  const { data: cells } = useCells();
  const updateMutation = useUpdateEnvVar();

  // ─── Derived Data ─────────────────────────────────────────────────────

  const cellOptions = useMemo(() => {
    const options = (cells ?? []).map((cell) => ({
      value: cell.id,
      label: `${cell.name} (${cell.region})`,
      disabled: false,
    }));
    return [{ value: "", label: "All Cells (Global View)" }, ...options];
  }, [cells]);

  const envVars: EnvVar[] = useMemo(
    () => envVarList?.envVars ?? [],
    [envVarList],
  );

  const hasCellFilter = selectedCellId.length > 0;

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleEditClick = useCallback((ev: EnvVar) => {
    setEditingVar(ev);
    setEditKey(ev.key);
    setEditValue(ev.value);
    setShowValue(false);
    setEditError(null);
    setShowEditModal(true);
  }, []);

  const handleEditValueChange = useCallback((value: string) => {
    setEditValue(value);
    setEditError(null);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingVar) return;

    const err = validateKey(editKey);
    if (err) {
      setEditError(err);
      return;
    }

    if (!editValue) {
      setEditError("Value is required");
      return;
    }

    setShowEditModal(false);
    setConfirmOpen(true);
  }, [editingVar, editKey, editValue, setConfirmOpen]);

  const handleConfirmApply = useCallback(async () => {
    if (!editingVar || !selectedCellId) return;

    try {
      await updateMutation.mutateAsync({
        scope: "cell",
        scopeId: selectedCellId,
        req: {
          overrides: [{ key: editKey, value: editValue }],
        },
      });
      toast.success(
        "Environment variable updated",
        `"${editKey}" has been applied to cell ${selectedCellId}.`,
      );
      setEditingVar(null);
      setEditKey("");
      setEditValue("");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to update environment variable";
      toast.error("Update failed", message);
    }
  }, [editingVar, selectedCellId, editKey, editValue, updateMutation, toast]);

  const handleEditModalClose = useCallback((open: boolean) => {
    if (!open) {
      setShowEditModal(false);
      setEditingVar(null);
      setEditKey("");
      setEditValue("");
      setShowValue(false);
      setEditError(null);
    }
  }, []);

  // ─── Render States ────────────────────────────────────────────────────

  const isInitialLoading = isLoading && !envVarList;

  return (
    <div className="space-y-6">
      {/* ─── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Environment Variables
          </h1>
          <p className="mt-1 text-sm text-text-muted max-w-2xl">
            Environment variables follow an inheritance chain:{" "}
            <span className="font-medium text-text-secondary">
              Global → Cloud → Region → Cell → Tenant
            </span>
            . Variables defined at a lower scope override those from higher
            scopes. Select a cell to view its effective configuration.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label="Refresh environment variables"
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Cell Selector ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4">
          <div className="max-w-sm">
            <Select
              label="Cell"
              value={selectedCellId}
              onValueChange={setSelectedCellId}
              options={cellOptions}
              placeholder="Select a cell..."
              searchable
              searchPlaceholder="Search cells..."
              helperText="Filter to see effective env vars for a specific cell."
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Inheritance Legend ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
        <span className="font-medium text-text-secondary">Inheritance:</span>
        {SOURCE_ORDER.map((src, idx) => (
          <span key={src} className="inline-flex items-center gap-1">
            <Badge variant={SOURCE_VARIANTS[src]} size="sm">
              {SOURCE_LABELS[src]}
            </Badge>
            {idx < SOURCE_ORDER.length - 1 && (
              <span className="text-text-muted" aria-hidden="true">
                →
              </span>
            )}
          </span>
        ))}
      </div>

      {/* ─── Error State ──────────────────────────────────────────────── */}
      {error && !envVarList && (
        <div className="flex flex-col items-center justify-center min-h-[30vh]">
          <ErrorState
            title="Unable to load environment variables"
            message={
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while fetching environment variables."
            }
            onRetry={() => refetch()}
          />
        </div>
      )}

      {/* ─── Loading State ────────────────────────────────────────────── */}
      {isInitialLoading && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="h-10 w-full max-w-sm animate-pulse rounded-md bg-bg-tertiary" />
          </div>
          <SkeletonTable rows={6} />
        </div>
      )}

      {/* ─── Data Loaded ──────────────────────────────────────────────── */}
      {!isInitialLoading && envVars.length === 0 && (
        <EmptyState
          icon={HardDrive}
          title="No environment variables configured"
          description={
            hasCellFilter
              ? "This cell has no effective environment variables. Variables may be inherited from a higher scope."
              : "No global environment variables have been configured yet. Environment variables are used to configure cell and tenant behavior."
          }
        />
      )}

      {!isInitialLoading && envVars.length > 0 && (
        /* ─── Table ──────────────────────────────────────────────────── */
        <div className="overflow-x-auto rounded-lg border border-border-default">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-bg-tertiary/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {envVars.map((ev) => (
                <tr
                  key={ev.key + ev.source}
                  className="border-b border-border-default transition-colors last:border-b-0 hover:bg-bg-tertiary/30"
                >
                  {/* Key */}
                  <td className="px-4 py-3">
                    <code className="rounded bg-bg-tertiary px-1.5 py-0.5 text-xs font-mono text-text-primary">
                      {ev.key}
                    </code>
                  </td>

                  {/* Value */}
                  <td className="px-4 py-3">
                    <span
                      className="text-text-secondary font-mono text-xs"
                      title={isSensitiveKey(ev.key) ? undefined : ev.value}
                    >
                      {isSensitiveKey(ev.key)
                        ? maskValue(ev.value)
                        : truncateValue(ev.value)}
                    </span>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    <Badge variant={SOURCE_VARIANTS[ev.source]} size="sm">
                      {ev.sourceLabel || SOURCE_LABELS[ev.source]}
                    </Badge>
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {formatRelativeTime(ev.updatedAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    {ev.overridable && hasCellFilter ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(ev)}
                        aria-label={`Edit ${ev.key}`}
                      >
                        Edit
                      </Button>
                    ) : (
                      <span className="text-xs text-text-muted italic">
                        {!hasCellFilter ? "Select a cell" : "Read-only"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        open={showEditModal}
        onOpenChange={handleEditModalClose}
        title="Edit Environment Variable"
        description={
          hasCellFilter
            ? `Set an override for this variable on the selected cell.`
            : undefined
        }
        confirmLabel="Apply Override"
        onConfirm={handleEditSave}
        loading={updateMutation.isPending}
        confirmDisabled={!editValue || !!editError}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Key"
            value={editKey}
            onChange={() => {}}
            readOnly
            helperText="Environment variable keys cannot be renamed. To change a key, delete and recreate it."
          />

          <div>
            <Input
              label="Value"
              type={showValue ? "text" : "password"}
              value={editValue}
              onChange={(e) => handleEditValueChange(e.target.value)}
              error={editError ?? undefined}
              placeholder="Enter value..."
            />
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowValue((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary rounded px-1"
                aria-label={showValue ? "Hide value" : "Show value"}
              >
                {showValue ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {showValue ? "Hide" : "Show"} value
              </button>
            </div>
          </div>

          {hasCellFilter && (
            <div className="rounded-lg border border-accent-warning/20 bg-accent-warning/5 p-3">
              <p className="text-xs text-accent-warning">
                <strong>Override scope:</strong> This value will be applied as a{" "}
                <Badge variant="warning" size="sm">
                  Cell
                </Badge>{" "}
                override, taking precedence over values from higher scopes
                (Global, Cloud, Region). Changes may take a few seconds to
                propagate to live cells.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ─── Confirm Apply Dialog ────────────────────────────────────── */}
      <ConfirmDialog
        {...confirmDialogProps}
        title="Apply Environment Variable Override"
        message="This will apply the new value as a cell-level override. Existing running workloads in the cell may need a restart to pick up the change."
        details={`Key: ${editKey}\nScope: Cell (${selectedCellId})`}
        resourceName={editKey}
        resourceType="environment variable override"
        requireConfirmation={false}
        confirmLabel="Apply Changes"
        variant="warning"
        onConfirm={handleConfirmApply}
      />
    </div>
  );
}
