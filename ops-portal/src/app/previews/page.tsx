"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  usePreviews,
  useCreatePreview,
  useDeletePreview,
} from "@/hooks/use-previews";
import { useTenants } from "@/hooks/use-tenants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Table } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Preview, CreatePreviewRequest } from "@/types/preview";

// ─── Constants ────────────────────────────────────────────────────────────

const TTL_REFRESH_INTERVAL_MS = 60_000;

const TTL_OPTIONS: SelectOption[] = [
  { value: "86400", label: "1 day" },
  { value: "172800", label: "2 days" },
  { value: "259200", label: "3 days" },
  { value: "432000", label: "5 days" },
  { value: "604800", label: "7 days" },
  { value: "1209600", label: "14 days" },
  { value: "2592000", label: "30 days" },
];

const SOURCE_LABELS: Record<string, string> = {
  sandbox: "Sandbox",
  demo: "Demo",
  pr: "PR",
  manual: "Manual",
};

const STATUS_DOT_MAP: Record<
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
  expiring: "warning",
  expired: "error",
  deleting: "neutral",
};

const STATUS_BADGE_MAP: Record<
  string,
  "success" | "warning" | "danger" | "info"
> = {
  active: "success",
  expiring: "warning",
  expired: "danger",
  deleting: "info",
};

// ─── TTL Countdown Helpers ────────────────────────────────────────────────

function formatTTL(expiresAt: string): { display: string; urgent: boolean } {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return { display: "Expired", urgent: true };
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return { display: `${days}d ${hours}h remaining`, urgent: false };
  }
  if (hours > 0) {
    return { display: `${hours}h ${minutes}m remaining`, urgent: hours < 2 };
  }
  return { display: `${minutes}m remaining`, urgent: true };
}

// ─── Column Helper ────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Preview>();

// We build columns lazily because we need the delete handler and router ref
function buildColumns(onDelete: (preview: Preview) => void) {
  return [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => {
        const preview = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {preview.name}
            </span>
            {preview.previewUrl && (
              <Link
                href={preview.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-accent-primary transition-colors"
                aria-label={`Open ${preview.name} preview`}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor("ref", {
      header: "PR / Tag",
      cell: (info) => {
        const preview = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <Badge variant="default" size="sm">
              {preview.source === "pr"
                ? "PR"
                : (SOURCE_LABELS[preview.source] ?? preview.source)}
            </Badge>
            <span className="text-sm text-text-secondary font-mono">
              {info.getValue()}
            </span>
          </div>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor("ownerName", {
      header: "Owner",
      cell: (info) => (
        <span className="text-sm text-text-secondary">{info.getValue()}</span>
      ),
      enableSorting: true,
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (info) => (
        <span className="text-sm text-text-muted whitespace-nowrap">
          {formatRelativeTime(info.getValue())}
        </span>
      ),
      enableSorting: true,
    }),
    columnHelper.display({
      id: "ttl",
      header: "TTL",
      cell: (info) => {
        const preview = info.row.original;
        const { display, urgent } = formatTTL(preview.expiresAt);
        return (
          <div className="flex items-center gap-1.5">
            <Clock
              className={cn(
                "h-3.5 w-3.5",
                urgent ? "text-accent-danger" : "text-text-muted",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-sm tabular-nums whitespace-nowrap",
                urgent
                  ? "text-accent-danger font-medium"
                  : "text-text-secondary",
              )}
            >
              {display}
            </span>
          </div>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        return (
          <Badge variant={STATUS_BADGE_MAP[status] ?? "default"} size="sm">
            <StatusDot status={STATUS_DOT_MAP[status] ?? "neutral"} size="sm" />
            <span className="ml-1 capitalize">{status}</span>
          </Badge>
        );
      },
      enableSorting: true,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const preview = info.row.original;
        const isDeleting = preview.status === "deleting";
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-muted hover:text-accent-danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(preview);
              }}
              disabled={isDeleting}
              aria-label={`Delete ${preview.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    }),
  ];
}

// ─── Page Component ──────────────────────────────────────────────────────

export default function PreviewsPage() {
  const toast = useToast();

  // ─── Queries ──────────────────────────────────────────────────────
  const { data: previewList, isLoading, error, refetch } = usePreviews();

  const { data: tenants } = useTenants();

  // ─── Mutations ────────────────────────────────────────────────────
  const createMutation = useCreatePreview();
  const deleteMutation = useDeletePreview();

  // ─── State ────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewToDelete, setPreviewToDelete] = useState<Preview | null>(null);
  const [ttlTick, setTtlTick] = useState(0);

  // Create form state
  const [formRef, setFormRef] = useState("");
  const [formSource, setFormSource] = useState("pr");
  const [formTenantId, setFormTenantId] = useState("");
  const [formTtl, setFormTtl] = useState("604800");
  const [formIncludeSampleData, setFormIncludeSampleData] = useState(true);
  const [formName, setFormName] = useState("");

  // ─── TTL Refresh Interval ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTtlTick((prev) => prev + 1);
    }, TTL_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // ─── Derived Data ─────────────────────────────────────────────────
  const previews = previewList?.data ?? [];
  const maxPreviews = previewList?.maxPreviews ?? 5;
  const previewCount = previews.length;
  const isNearLimit = previewCount >= Math.floor(maxPreviews * 0.8);
  const isAtLimit = previewCount >= maxPreviews;

  // Tenant options for the create modal
  const tenantOptions: SelectOption[] = useMemo(() => {
    if (!tenants?.tenants) return [];
    return tenants.tenants.map((t) => ({
      value: t.id,
      label: t.name,
    }));
  }, [tenants]);

  const sourceOptions: SelectOption[] = [
    { value: "pr", label: "Pull Request" },
    { value: "demo", label: "Demo" },
    { value: "sandbox", label: "Sandbox" },
    { value: "manual", label: "Manual" },
  ];

  // ─── Handlers ────────────────────────────────────────────────────
  const handleCreateClick = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleDeleteClick = useCallback((preview: Preview) => {
    setPreviewToDelete(preview);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!previewToDelete) return;

    try {
      await deleteMutation.mutateAsync(previewToDelete.id);
      setPreviewToDelete(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete preview";
      toast.error("Delete failed", message);
    }
  }, [previewToDelete, deleteMutation, toast]);

  const handleDeleteCancel = useCallback(() => {
    setPreviewToDelete(null);
  }, []);

  const handleCreateSubmit = useCallback(async () => {
    if (!formRef) {
      toast.error(
        "Validation Error",
        "Please enter a PR number, tag, or branch reference.",
      );
      return;
    }

    const req: CreatePreviewRequest = {
      ref: formRef,
      tenantId: formTenantId || undefined,
      ttlSeconds: parseInt(formTtl, 10),
      includeSampleData: formIncludeSampleData,
      name: formName || undefined,
    };

    try {
      await createMutation.mutateAsync(req);
      toast.success(
        "Preview environment created",
        "The preview is being provisioned.",
      );
      setShowCreateModal(false);
      resetCreateForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create preview";
      toast.error("Creation failed", message);
    }
  }, [
    formRef,
    formTenantId,
    formTtl,
    formIncludeSampleData,
    formName,
    createMutation,
    toast,
  ]);

  const handleCreateModalClose = (open: boolean) => {
    if (!open) {
      setShowCreateModal(false);
      resetCreateForm();
    }
  };

  const resetCreateForm = () => {
    setFormRef("");
    setFormSource("pr");
    setFormTenantId("");
    setFormTtl("604800");
    setFormIncludeSampleData(true);
    setFormName("");
  };

  // ─── Source change updates the auto-generated name ────────────────
  const handleSourceChange = (value: string) => {
    setFormSource(value);
  };

  const getRefPlaceholder = () => {
    switch (formSource) {
      case "pr":
        return "e.g. 142";
      case "demo":
        return "e.g. acme-demo-v2";
      case "sandbox":
        return "e.g. staging-test";
      default:
        return "e.g. main or v1.2.3";
    }
  };

  const getRefHelperText = () => {
    switch (formSource) {
      case "pr":
        return "GitHub pull request number";
      case "demo":
        return "Demo branch or tag name";
      case "sandbox":
        return "Sandbox environment identifier";
      default:
        return "Git reference (branch, tag, or commit)";
    }
  };

  // ─── Render States ────────────────────────────────────────────────
  const isLoadingInitial = isLoading && !previewList;
  const columns = useMemo(
    () => buildColumns(handleDeleteClick),
    [handleDeleteClick],
  );

  return (
    <div className="space-y-6">
      {/* ─── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Preview Environments
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {previewList
              ? `${previewCount} active · ${maxPreviews} max`
              : "Create temporary environments for demos and testing"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label="Refresh previews"
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateClick}
            disabled={isAtLimit}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Demo
          </Button>
        </div>
      </div>

      {/* ─── Near-Limit Warning Banner ────────────────────────────── */}
      {isNearLimit && previewCount > 0 && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4",
            isAtLimit
              ? "border-accent-danger/30 bg-accent-danger/5"
              : "border-accent-warning/30 bg-accent-warning/5",
          )}
        >
          <AlertTriangle
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0",
              isAtLimit ? "text-accent-danger" : "text-accent-warning",
            )}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {isAtLimit
                ? "Maximum preview environments reached"
                : "Approaching preview environment limit"}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {isAtLimit
                ? `You have ${previewCount} active previews out of ${maxPreviews} allowed. Delete an existing preview before creating a new one.`
                : `You have ${previewCount} active previews out of ${maxPreviews} allowed. Consider cleaning up unused environments.`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0"
            onClick={() => refetch()}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ─── Error State ──────────────────────────────────────────── */}
      {error && !previewList && (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <ErrorState
            title="Unable to load previews"
            message={
              error.message ??
              "An unexpected error occurred while fetching preview environments."
            }
            onRetry={() => refetch()}
          />
        </div>
      )}

      {/* ─── Loading State ────────────────────────────────────────── */}
      {isLoadingInitial && (
        <div className="space-y-4">
          <SkeletonTable rows={4} />
        </div>
      )}

      {/* ─── Data Loaded ──────────────────────────────────────────── */}
      {!isLoadingInitial && !error && (
        <>
          {previews.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No active previews"
              description="Create one to test a PR, validate a feature, or demo to a customer."
              action={{
                label: "Create Demo",
                onClick: handleCreateClick,
              }}
            />
          ) : (
            <Table<Preview>
              columns={columns}
              data={previews}
              loading={false}
              skeletonRows={4}
              enableSorting
              enablePagination={previews.length > 20}
              manualPagination={false}
              pageSize={20}
            />
          )}
        </>
      )}

      {/* ─── Create Modal ─────────────────────────────────────────── */}
      <Modal
        open={showCreateModal}
        onOpenChange={handleCreateModalClose}
        title="Create Preview Environment"
        description="Provision a temporary environment for testing, demos, or sandbox access."
        confirmLabel="Create Preview"
        onConfirm={handleCreateSubmit}
        loading={createMutation.isPending}
        confirmDisabled={!formRef || isAtLimit}
        size="lg"
      >
        <div className="space-y-4">
          {/* Source type */}
          <Select
            label="Source Type"
            value={formSource}
            onValueChange={handleSourceChange}
            options={sourceOptions}
            helperText="What is this preview for?"
          />

          {/* Ref / Tag input */}
          <Input
            label="Reference *"
            placeholder={getRefPlaceholder()}
            value={formRef}
            onChange={(e) => setFormRef(e.target.value)}
            helperText={getRefHelperText()}
            required
          />

          {/* Display name (optional) */}
          <Input
            label="Display Name (optional)"
            placeholder={
              formSource === "pr"
                ? `Preview #${formRef || "..."}`
                : "My Preview"
            }
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            helperText="If not provided, a name will be auto-generated."
          />

          {/* Tenant association */}
          <Select
            label="Customer (optional)"
            value={formTenantId}
            onValueChange={setFormTenantId}
            options={tenantOptions}
            placeholder="No customer association"
            helperText="Link this preview to a customer tenant for testing."
            searchable
            searchPlaceholder="Search customers..."
          />

          {/* TTL */}
          <Select
            label="Auto-delete after"
            value={formTtl}
            onValueChange={setFormTtl}
            options={TTL_OPTIONS}
          />

          {/* Sample data checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <input
              id="include-sample-data"
              type="checkbox"
              checked={formIncludeSampleData}
              onChange={(e) => setFormIncludeSampleData(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border-default bg-bg-tertiary text-accent-primary focus:ring-accent-primary focus:ring-offset-bg-primary"
            />
            <div>
              <label
                htmlFor="include-sample-data"
                className="text-sm font-medium text-text-primary cursor-pointer"
              >
                Include sample data
              </label>
              <p className="text-xs text-text-muted mt-0.5">
                Pre-populate with sample flags, segments, and evaluation data.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation Dialog ───────────────────────────── */}
      <ConfirmDialog
        open={!!previewToDelete}
        onOpenChange={(open) => {
          if (!open) setPreviewToDelete(null);
        }}
        title="Delete Preview Environment"
        message={
          previewToDelete
            ? `Are you sure you want to delete "${previewToDelete.name}"? This environment will be decommissioned and all associated data will be removed.`
            : ""
        }
        details={
          previewToDelete
            ? `This preview was created ${formatRelativeTime(previewToDelete.createdAt)} and will take approximately 30 seconds to fully clean up.`
            : undefined
        }
        resourceName={previewToDelete?.name ?? ""}
        resourceType="preview"
        confirmLabel="Delete Preview"
        cancelLabel="Keep Preview"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
