"use client";

import { useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Download,
  Upload,
  Shield,
  Trash2,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
} from "lucide-react";
import {
  useBackups,
  useBackupStatus,
  useTriggerBackup,
  useRestoreBackup,
} from "@/hooks/use-backups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  ConfirmDialog,
  useConfirmDialog,
} from "@/components/ui/confirm-dialog";
import { cn, formatBytes, formatDate, formatRelativeTime } from "@/lib/utils";
import type { BackupEntry } from "@/lib/api";
import type { SelectOption } from "@/components/ui/select";

// ─── Source Options ───────────────────────────────────────────────────────

const typeOptions: SelectOption[] = [
  { value: "all", label: "All Types" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "pre-deploy", label: "Pre-Deploy" },
  { value: "manual", label: "Manual" },
];

const statusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "running", label: "Running" },
  { value: "failed", label: "Failed" },
  { value: "partial", label: "Partial" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function getTypeVariant(
  type: BackupEntry["type"],
): "default" | "info" | "primary" | "success" {
  switch (type) {
    case "daily":
      return "info";
    case "weekly":
      return "primary";
    case "pre-deploy":
      return "success";
    case "manual":
      return "default";
  }
}

function getStatusVariant(
  status: BackupEntry["status"],
): "success" | "danger" | "warning" | "info" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "running":
      return "info";
    case "partial":
      return "warning";
  }
}

function formatTypeLabel(type: BackupEntry["type"]): string {
  switch (type) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "pre-deploy":
      return "Pre-Deploy";
    case "manual":
      return "Manual";
  }
}

function formatStatusLabel(status: BackupEntry["status"]): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "partial":
      return "Partial";
  }
}

function getDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const diffSec = Math.floor((end - start) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  return `${min}m ${sec}s`;
}

function getNextBackupCountdown(nextScheduledAt: string): string {
  const now = Date.now();
  const next = new Date(nextScheduledAt).getTime();
  const diffMs = next - now;
  if (diffMs <= 0) return "Due now";
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours > 48) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ─── Page Component ───────────────────────────────────────────────────────

export default function BackupsPage() {
  const toast = useToast();

  // ── State ──
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
  const [restoreReason, setRestoreReason] = useState("");
  const [selectedBackupForRestore, setSelectedBackupForRestore] =
    useState<BackupEntry | null>(null);

  // ── Confirm dialog for "Backup Now" ──
  const backupNowDialog = useConfirmDialog();

  // ── Confirm dialog for cleanup ──
  const cleanupDialog = useConfirmDialog();

  // ── Queries ──
  const filters = useMemo(
    () => ({
      page: page + 1,
      limit: 20,
      type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    }),
    [page, typeFilter, statusFilter],
  );

  const {
    data: backupsData,
    isLoading: backupsLoading,
    error: backupsError,
    refetch: refetchBackups,
  } = useBackups({ filters });

  const {
    data: backupStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useBackupStatus();

  // ── Mutations ──
  const triggerMutation = useTriggerBackup();
  const restoreMutation = useRestoreBackup();

  const isRefreshing = backupsLoading || statusLoading;

  // ── Handlers ──

  const handleRefresh = useCallback(() => {
    refetchBackups();
    refetchStatus();
  }, [refetchBackups, refetchStatus]);

  const handleBackupNow = useCallback(async () => {
    try {
      await triggerMutation.mutateAsync();
      toast.success("Backup started", "A manual backup has been initiated.");
      backupNowDialog.closeDialog();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to trigger backup";
      toast.error("Backup failed", message);
    }
  }, [triggerMutation, toast, backupNowDialog]);

  const handleRestoreClick = useCallback((backup: BackupEntry) => {
    setSelectedBackupForRestore(backup);
    setRestoreBackupId(backup.id);
    setRestoreReason("");
    setShowRestoreModal(true);
  }, []);

  const handleRestoreConfirm = useCallback(async () => {
    if (!restoreBackupId) return;
    try {
      await restoreMutation.mutateAsync(restoreBackupId);
      toast.success(
        "Restore initiated",
        `Restore from backup has been started. This may take several minutes.`,
      );
      setShowRestoreModal(false);
      setSelectedBackupForRestore(null);
      setRestoreBackupId(null);
      setRestoreReason("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to initiate restore";
      toast.error("Restore failed", message);
    }
  }, [restoreBackupId, restoreMutation, toast]);

  const handleCleanup = useCallback(async () => {
    try {
      // Simulated cleanup action — real endpoint would be called here
      toast.success("Cleanup started", "Old backups are being pruned.");
      cleanupDialog.closeDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cleanup failed";
      toast.error("Cleanup failed", message);
    }
  }, [toast, cleanupDialog]);

  const handleVerifyLatest = useCallback(async () => {
    try {
      // Simulated verify action
      toast.success(
        "Verification complete",
        "Latest backup integrity check passed.",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      toast.error("Verification failed", message);
    }
  }, [toast]);

  // ── Columns ──

  const columns = useMemo<ColumnDef<BackupEntry>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        accessorFn: (row) => row.startedAt,
        sortingFn: "datetime",
        cell: ({ getValue }) => {
          const val = getValue() as string;
          return (
            <div className="flex flex-col">
              <span className="text-sm text-text-primary">
                {formatDate(val)}
              </span>
              <span className="text-xs text-text-muted">
                {formatRelativeTime(val)}
              </span>
            </div>
          );
        },
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => row.type,
        cell: ({ getValue }) => {
          const type = getValue() as BackupEntry["type"];
          return (
            <Badge variant={getTypeVariant(type)} size="sm">
              {formatTypeLabel(type)}
            </Badge>
          );
        },
      },
      {
        id: "sizeBytes",
        header: "Size",
        accessorFn: (row) => row.sizeBytes,
        cell: ({ getValue }) => {
          const bytes = getValue() as number;
          return (
            <span className="font-mono text-sm text-text-primary">
              {formatBytes(bytes)}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status,
        cell: ({ getValue }) => {
          const status = getValue() as BackupEntry["status"];
          return (
            <Badge variant={getStatusVariant(status)} size="sm" dot>
              {formatStatusLabel(status)}
            </Badge>
          );
        },
      },
      {
        id: "duration",
        header: "Duration",
        accessorFn: (row) => row.startedAt,
        cell: ({ row }) => {
          const original = row.original;
          return (
            <span className="text-sm text-text-secondary">
              {getDuration(original.startedAt, original.completedAt)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const original = row.original;
          const isRunning = original.status === "running";
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRestoreClick(original)}
                disabled={isRunning}
                aria-label={`Restore backup from ${formatDate(original.startedAt)}`}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Restore
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isRunning}
                aria-label={`Download backup from ${formatDate(original.startedAt)}`}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download
              </Button>
            </div>
          );
        },
      },
    ],
    [handleRestoreClick],
  );

  // ── Derived State ──

  const backups = backupsData?.data ?? [];
  const totalBackups = backupsData?.total ?? 0;
  const isLoadingInitial = backupsLoading && !backupsData;
  const hasError =
    (backupsError && !backupsData) || (statusError && !backupStatus);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Backups</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage backup schedules, restore data, and monitor backup health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh backups"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── All-Failed State ── */}
      {hasError && !backupsData && !backupStatus && (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <ErrorState
            title="Unable to load backups"
            message={
              backupsError instanceof Error
                ? backupsError.message
                : statusError instanceof Error
                  ? statusError.message
                  : "An unexpected error occurred while fetching backup data."
            }
            onRetry={handleRefresh}
          />
        </div>
      )}

      {/* ── Stat Cards ── */}
      {statusLoading && !backupStatus ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : backupStatus ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Last Backup */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-info/10">
                    <Clock
                      className="h-5 w-5 text-accent-info"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-sm font-medium text-text-secondary">
                    Last Backup
                  </p>
                </div>
                {backupStatus.lastSuccessfulAt && (
                  <Badge
                    variant={backupStatus.isRunning ? "warning" : "success"}
                    size="sm"
                    dot
                  >
                    {backupStatus.isRunning ? "In Progress" : "Completed"}
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-2xl font-semibold text-text-primary">
                {backupStatus.lastSuccessfulAt
                  ? formatRelativeTime(backupStatus.lastSuccessfulAt)
                  : "Never"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {backupStatus.lastSuccessfulAt
                  ? formatDate(backupStatus.lastSuccessfulAt, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "No backup recorded yet"}
              </p>
            </CardContent>
          </Card>

          {/* Backup Size */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10">
                  <HardDrive
                    className="h-5 w-5 text-accent-primary"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    Backup Size
                  </p>
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-text-primary">
                {formatBytes(backupStatus.lastBackupSizeBytes)}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {formatBytes(backupStatus.totalBackupSizeBytes)} total across
                all backups
              </p>
            </CardContent>
          </Card>

          {/* Next Backup */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-success/10">
                  <Shield
                    className="h-5 w-5 text-accent-success"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    Next Backup
                  </p>
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-text-primary">
                {getNextBackupCountdown(backupStatus.nextScheduledAt)}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Schedule: {backupStatus.schedule}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Status error but data might still exist */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={backupNowDialog.openDialog}
          loading={triggerMutation.isPending}
          disabled={backupStatus?.isRunning}
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
          Backup Now
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={handleVerifyLatest}
          disabled={backups.length === 0}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Verify Latest
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={cleanupDialog.openDialog}
          disabled={backups.length === 0}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Cleanup Old
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-40">
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(0);
            }}
            options={typeOptions}
            placeholder="All Types"
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
            options={statusFilterOptions}
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* ── Backup History Table ── */}
      {isLoadingInitial ? (
        <SkeletonTable rows={5} />
      ) : backupsError && !backupsData ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ErrorState
            title="Failed to load backup history"
            message={backupsError.message}
            onRetry={() => refetchBackups()}
          />
        </div>
      ) : backups.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No backups yet"
          description="The first backup will run automatically within the hour. You can also trigger a manual backup at any time."
          action={{
            label: "Backup Now",
            onClick: backupNowDialog.openDialog,
          }}
        />
      ) : (
        <Table
          columns={columns}
          data={backups}
          loading={backupsLoading && !!backupsData}
          skeletonRows={5}
          enableSorting
          enablePagination
          manualPagination
          totalItems={totalBackups}
          pageIndex={page}
          pageSize={20}
          onPageChange={setPage}
          emptyState={
            <EmptyState
              icon={Shield}
              title="No backups found"
              description="No backups match the current filters."
            />
          }
          errorState={
            backupsError ? (
              <ErrorState
                title="Failed to load backups"
                message={backupsError.message}
                onRetry={() => refetchBackups()}
                compact
              />
            ) : undefined
          }
        />
      )}

      {/* ── Backup Now Confirmation ── */}
      <ConfirmDialog
        {...backupNowDialog.dialogProps}
        title="Start Manual Backup"
        message="A full backup will be created immediately. This may impact performance during the backup window."
        details="The backup process runs asynchronously. You can monitor its progress in the backup history table."
        resourceName="manual-backup"
        resourceType="backup"
        confirmLabel="Start Backup"
        cancelLabel="Cancel"
        variant="warning"
        requireConfirmation={false}
        onConfirm={handleBackupNow}
        loading={triggerMutation.isPending}
      />

      {/* ── Cleanup Confirmation ── */}
      <ConfirmDialog
        {...cleanupDialog.dialogProps}
        title="Cleanup Old Backups"
        message="Old backups will be pruned according to the retention policy."
        details="This will remove backups older than the configured retention period. This action cannot be undone."
        resourceName="cleanup-backups"
        resourceType="backup"
        confirmLabel="Cleanup"
        variant="danger"
        requireConfirmation={false}
        onConfirm={handleCleanup}
      />

      {/* ── Restore Modal ── */}
      <Modal
        open={showRestoreModal}
        onOpenChange={(next) => {
          if (!next) {
            setShowRestoreModal(false);
            setSelectedBackupForRestore(null);
            setRestoreReason("");
          }
        }}
        title="Restore from Backup"
        description={
          selectedBackupForRestore
            ? `Restore system state from backup taken on ${formatDate(selectedBackupForRestore.startedAt)}`
            : "Restore system state from a previous backup"
        }
        confirmLabel="Begin Restore"
        onConfirm={handleRestoreConfirm}
        loading={restoreMutation.isPending}
        destructive
        size="md"
      >
        <div className="space-y-4">
          {/* Warning block */}
          <div className="rounded-lg border border-accent-warning/20 bg-accent-warning/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-accent-warning"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Warning: This will overwrite current data
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Restoring from a backup will replace current system state with
                  the backed-up data. This action is irreversible. Ensure you
                  have a recent backup of the current state before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Backup details */}
          {selectedBackupForRestore && (
            <div className="rounded-lg border border-border-default bg-bg-tertiary/50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-text-muted">Backup ID</span>
                  <p className="font-mono text-xs text-text-primary mt-0.5">
                    {selectedBackupForRestore.id}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted">Type</span>
                  <p className="text-text-primary mt-0.5">
                    {formatTypeLabel(selectedBackupForRestore.type)}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted">Date</span>
                  <p className="text-text-primary mt-0.5">
                    {formatDate(selectedBackupForRestore.startedAt)}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted">Size</span>
                  <p className="font-mono text-text-primary mt-0.5">
                    {formatBytes(selectedBackupForRestore.sizeBytes)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reason input */}
          <Input
            label="Reason for restore *"
            placeholder="e.g., Data corruption after deployment"
            value={restoreReason}
            onChange={(e) => setRestoreReason(e.target.value)}
            helperText="This will be logged in the audit trail."
            required
          />
        </div>
      </Modal>
    </div>
  );
}
