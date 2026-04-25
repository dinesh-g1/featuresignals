"use client";

import { useCallback, useState } from "react";
import {
  RefreshCw,
  Server,
  Database,
  Activity,
  Cpu,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Globe,
  Shield,
  Layers,
  Users,
  Plus,
  Pencil,
  Trash2,
  UserCircle,
  Mail,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useSystemHealth, useServiceStatuses } from "@/hooks/use-system";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  ConfirmDialog,
  useConfirmDialog,
} from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  NodeStatus,
  ServiceStatus,
  OpsUser,
  OpsUserRole,
} from "@/types/api";
import type { ServiceStatusEntry } from "@/lib/api";
import type { SelectOption } from "@/components/ui/select";

// ─── Helpers ───────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  postgresql: <Database className="h-5 w-5" aria-hidden="true" />,
  signoz: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
  temporal: <Activity className="h-5 w-5" aria-hidden="true" />,
  "api-server": <Server className="h-5 w-5" aria-hidden="true" />,
  dashboard: <Globe className="h-5 w-5" aria-hidden="true" />,
  "caddy-ingress": <Shield className="h-5 w-5" aria-hidden="true" />,
};

const DEFAULT_SERVICE_ICON = <Cpu className="h-5 w-5" aria-hidden="true" />;

function getServiceLabel(name: string): string {
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getServiceIcon(name: string): React.ReactNode {
  return SERVICE_ICONS[name] ?? DEFAULT_SERVICE_ICON;
}

function statusDotVariant(
  status: string,
): "healthy" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "healthy":
      return "healthy";
    case "degraded":
      return "warning";
    case "down":
      return "danger";
    default:
      return "neutral";
  }
}

function statusColorClass(status: string): string {
  switch (status) {
    case "healthy":
      return "text-accent-success";
    case "degraded":
      return "text-accent-warning";
    case "down":
      return "text-accent-danger";
    default:
      return "text-text-muted";
  }
}

// ─── Ops Users Constants & Components ──────────────────────────────────────

const ROLE_OPTIONS: SelectOption[] = [
  { value: "admin", label: "Admin" },
  { value: "support", label: "Support" },
  { value: "billing", label: "Billing" },
  { value: "read-only", label: "Read Only" },
];

const ROLE_BADGE_VARIANT: Record<
  OpsUserRole,
  "primary" | "info" | "success" | "default"
> = {
  admin: "primary",
  support: "info",
  billing: "success",
  "read-only": "default",
};

function RoleBadge({ role }: { role: OpsUserRole }) {
  return (
    <Badge variant={ROLE_BADGE_VARIANT[role]} size="sm" className="capitalize">
      {role === "read-only" ? "Read Only" : role}
    </Badge>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-4 border-b border-border-default pb-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24 ml-auto" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border-default py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-4 w-12" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Resource Bar ──────────────────────────────────────────────────────────

function ResourceBar({ label, percent }: { label: string; percent: number }) {
  const barColor = (pct: number) => {
    if (pct > 80) return "bg-accent-danger";
    if (pct > 60) return "bg-accent-warning";
    return "bg-accent-success";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-10 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor(percent),
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${Math.round(percent)}%`}
        />
      </div>
      <span className="text-xs text-text-muted w-9 text-right">
        {Math.round(percent)}%
      </span>
    </div>
  );
}

// ─── Node Card ─────────────────────────────────────────────────────────────

function NodeCard({ node }: { node: NodeStatus }) {
  const ready = node.status === "ready";

  return (
    <Card
      variant="bordered"
      className={cn(!ready && "border-accent-danger/30")}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary">
              <Server className="h-4 w-4 text-text-muted" aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-text-primary truncate">
              {node.name}
            </span>
          </div>
          <StatusDot
            status={ready ? "healthy" : "danger"}
            pulse={!ready}
            label={ready ? "Ready" : "Not Ready"}
            size="sm"
          />
        </div>
        <div className="space-y-2">
          <ResourceBar label="CPU" percent={node.cpu_percent} />
          <ResourceBar label="Mem" percent={node.memory_percent} />
          <ResourceBar label="Disk" percent={node.disk_percent} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Service Card ──────────────────────────────────────────────────────────

interface ServiceCardData extends ServiceStatusEntry {
  uptime?: string;
  version?: string;
}

function ServiceCard({ service }: { service: ServiceCardData }) {
  const displayName = service.displayName || getServiceLabel(service.name);
  const icon = getServiceIcon(service.name);
  const dotVariant = statusDotVariant(service.status);
  const colorCls = statusColorClass(service.status);

  return (
    <Card
      variant="default"
      className={cn(
        "transition-all",
        service.status === "down" &&
          "border-accent-danger/40 bg-accent-danger/5",
        service.status === "degraded" && "border-accent-warning/30",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                service.status === "healthy"
                  ? "bg-accent-success/10"
                  : service.status === "degraded"
                    ? "bg-accent-warning/10"
                    : "bg-accent-danger/10",
              )}
            >
              <span className={colorCls}>{icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {displayName}
              </p>
              <p className={cn("text-xs font-medium capitalize", colorCls)}>
                {service.status}
              </p>
            </div>
          </div>
          <StatusDot
            status={dotVariant}
            pulse={service.status !== "healthy"}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          {service.uptime && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" aria-hidden="true" />
              {service.uptime}
            </span>
          )}
          {service.version && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" aria-hidden="true" />v
              {service.version}
            </span>
          )}
        </div>

        {service.message && service.status !== "healthy" && (
          <div className="mt-2 rounded-md bg-accent-danger/10 px-2.5 py-1.5">
            <p className="text-xs text-accent-danger">{service.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Skeleton Grids ────────────────────────────────────────────────────────

function ClusterSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ServicesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-3 w-3 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── SigNoz Section ────────────────────────────────────────────────────────

function SigNozSection() {
  const sigNozUrl = process.env.NEXT_PUBLIC_SIGNOZ_URL;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3
              className="h-4 w-4 text-accent-primary"
              aria-hidden="true"
            />
            SigNoz Observability
          </CardTitle>
          <CardDescription>
            Application performance monitoring and tracing
          </CardDescription>
        </div>
        {sigNozUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(sigNozUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open SigNoz
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {sigNozUrl ? (
          <div
            className="relative w-full overflow-hidden rounded-lg border border-border-default"
            style={{ height: "400px" }}
          >
            <iframe
              src={sigNozUrl}
              title="SigNoz Dashboard"
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-bg-tertiary/30 py-12 text-center">
            <BarChart3
              className="h-10 w-10 text-text-muted mb-3"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-text-primary">
              SigNoz Not Configured
            </h3>
            <p className="mt-1 max-w-md text-xs text-text-secondary">
              To embed the SigNoz dashboard, set the{" "}
              <code className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono text-accent-primary text-[10px]">
                NEXT_PUBLIC_SIGNOZ_URL
              </code>{" "}
              environment variable to your SigNoz instance URL.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Auto-Refresh Toggle ───────────────────────────────────────────────────

function AutoRefreshToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        enabled
          ? "bg-accent-success/10 text-accent-success"
          : "bg-bg-tertiary text-text-muted hover:text-text-secondary",
      )}
      aria-label={enabled ? "Disable auto-refresh" : "Enable auto-refresh"}
      aria-pressed={enabled}
    >
      {enabled ? (
        <ToggleRight className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ToggleLeft className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {enabled ? "Auto-refresh ON" : "Auto-refresh OFF"}
    </button>
  );
}

// ─── System Health Page ────────────────────────────────────────────────────

export default function SystemHealthPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useSystemHealth({
    enabled: true,
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const {
    data: serviceStatuses,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useServiceStatuses({
    enabled: true,
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const loadingInitial =
    healthLoading && servicesLoading && !health && !serviceStatuses;
  const refreshing = (healthLoading || servicesLoading) && !!health;
  const hasError = !!healthError || !!servicesError;
  const hasData = !!health || !!serviceStatuses;

  const lastUpdated = health?.last_updated
    ? formatRelativeTime(health.last_updated)
    : undefined;

  const downServices =
    serviceStatuses?.filter(
      (s) => s.status === "down" || s.status === "degraded",
    ) ?? [];

  const healthyCount =
    serviceStatuses?.filter((s) => s.status === "healthy").length ?? 0;
  const totalServices = serviceStatuses?.length ?? 0;

  const handleRetryAll = useCallback(() => {
    refetchHealth();
    refetchServices();
  }, [refetchHealth, refetchServices]);

  // ─── Ops Users Management ──────────────────────────────────────────────

  const queryClient = useQueryClient();
  const toast = useToast();

  // ─── Add user modal state ─────────────────────────────────────────────

  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<OpsUserRole>("support");

  // ─── Edit user modal state ────────────────────────────────────────────

  const [editingUser, setEditingUser] = useState<OpsUser | null>(null);
  const [editRole, setEditRole] = useState<OpsUserRole>("support");

  // ─── Remove user confirm dialog ───────────────────────────────────────

  const [removingUser, setRemovingUser] = useState<OpsUser | null>(null);
  const {
    open: removeDialogOpen,
    setOpen: setRemoveDialogOpen,
    dialogProps: removeDialogProps,
  } = useConfirmDialog();

  // ─── Queries ──────────────────────────────────────────────────────────

  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<OpsUser[]>({
    queryKey: ["ops-users"],
    queryFn: () => api.listOpsUsers(),
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 2,
  });

  // ─── Mutations ────────────────────────────────────────────────────────

  const addUserMutation = useMutation({
    mutationFn: (data: { email: string; name: string; role: string }) =>
      api.addOpsUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-users"] });
      setShowAddModal(false);
      resetAddForm();
      toast.success("User added", "The user has been invited successfully.");
    },
    onError: (err: Error) => {
      toast.error("Failed to add user", err.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.updateOpsUser(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-users"] });
      setEditingUser(null);
      toast.success("User updated", "The user role has been updated.");
    },
    onError: (err: Error) => {
      toast.error("Failed to update user", err.message);
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (id: string) => api.removeOpsUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-users"] });
      setRemovingUser(null);
      setRemoveDialogOpen(false);
      toast.success(
        "User removed",
        "The user has been removed from the ops team.",
      );
    },
    onError: (err: Error) => {
      toast.error("Failed to remove user", err.message);
    },
  });

  // ─── Form helpers ─────────────────────────────────────────────────────

  const resetAddForm = useCallback(() => {
    setAddName("");
    setAddEmail("");
    setAddRole("support");
  }, []);

  const handleAddUser = useCallback(() => {
    if (!addName.trim()) {
      toast.error("Validation Error", "Name is required.");
      return;
    }
    if (!addEmail.trim()) {
      toast.error("Validation Error", "Email is required.");
      return;
    }
    addUserMutation.mutate({
      name: addName.trim(),
      email: addEmail.trim(),
      role: addRole,
    });
  }, [addName, addEmail, addRole, addUserMutation, toast]);

  const handleEditClick = useCallback((user: OpsUser) => {
    setEditingUser(user);
    setEditRole(user.role);
  }, []);

  const handleSaveRole = useCallback(() => {
    if (!editingUser) return;
    updateUserMutation.mutate({ id: editingUser.id, role: editRole });
  }, [editingUser, editRole, updateUserMutation]);

  const handleRemoveClick = useCallback(
    (user: OpsUser) => {
      setRemovingUser(user);
      setRemoveDialogOpen(true);
    },
    [setRemoveDialogOpen],
  );

  const handleConfirmRemove = useCallback(() => {
    if (!removingUser) return;
    removeUserMutation.mutate(removingUser.id);
  }, [removingUser, removeUserMutation]);

  const handleCloseAddModal = useCallback(
    (open: boolean) => {
      setShowAddModal(open);
      if (!open) resetAddForm();
    },
    [resetAddForm],
  );

  const handleCloseEditModal = useCallback((open: boolean) => {
    if (!open) setEditingUser(null);
  }, []);

  // ─── Full failure state ───────────────────────────────────────────────

  if (
    healthError &&
    servicesError &&
    !health &&
    !serviceStatuses &&
    !healthLoading &&
    !servicesLoading
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ErrorState
          title="Unable to fetch system health"
          message="We couldn't retrieve system health data. This could be a connectivity issue with the monitoring service."
          onRetry={handleRetryAll}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              System Health
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Infrastructure cluster and service status overview
              {lastUpdated && (
                <span className="ml-2 text-xs">· Updated {lastUpdated}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AutoRefreshToggle
              enabled={autoRefresh}
              onToggle={toggleAutoRefresh}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetryAll}
              disabled={refreshing}
              aria-label="Refresh system health"
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
                aria-hidden="true"
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Degraded banner */}
        {hasData && downServices.length > 0 && (
          <div
            className="flex items-center gap-2 rounded-lg border border-accent-danger/30 bg-accent-danger/5 px-4 py-3"
            role="alert"
          >
            <StatusDot status="danger" pulse size="md" />
            <div>
              <p className="text-sm font-medium text-accent-danger">
                {downServices.length}{" "}
                {downServices.length === 1 ? "service is" : "services are"}{" "}
                degraded or down
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {downServices
                  .map((s) => s.displayName || getServiceLabel(s.name))
                  .join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Cluster Status */}
        <section aria-label="Cluster status">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Cluster Status
            </h2>
            {health && (
              <Badge
                variant={
                  health.cluster.status === "healthy"
                    ? "success"
                    : health.cluster.status === "degraded"
                      ? "warning"
                      : "danger"
                }
                size="sm"
              >
                {health.cluster.status}
              </Badge>
            )}
          </div>

          {healthLoading && !health ? (
            <ClusterSkeleton />
          ) : healthError && !health ? (
            <ErrorState
              title="Failed to load cluster data"
              message="Unable to fetch node status information."
              onRetry={() => refetchHealth()}
              compact
            />
          ) : health?.cluster.nodes && health.cluster.nodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {health.cluster.nodes.map((node) => (
                <NodeCard key={node.name} node={node} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-default bg-bg-tertiary/30 py-8 text-center">
              <Server
                className="mx-auto h-8 w-8 text-text-muted mb-2"
                aria-hidden="true"
              />
              <p className="text-sm text-text-muted">
                No cluster nodes available
              </p>
            </div>
          )}
        </section>

        {/* Service Status */}
        <section aria-label="Service statuses">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Services
            </h2>
            {serviceStatuses && (
              <span className="text-xs text-text-muted">
                {healthyCount}/{totalServices} healthy
                {downServices.length > 0 && (
                  <span className="text-accent-danger ml-1">
                    · {downServices.length}{" "}
                    {downServices.length === 1 ? "issue" : "issues"}
                  </span>
                )}
              </span>
            )}
          </div>

          {servicesLoading && !serviceStatuses ? (
            <ServicesSkeleton />
          ) : servicesError && !serviceStatuses ? (
            <ErrorState
              title="Failed to load service statuses"
              message="Unable to fetch service health information."
              onRetry={() => refetchServices()}
              compact
            />
          ) : serviceStatuses && serviceStatuses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceStatuses.map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-default bg-bg-tertiary/30 py-8 text-center">
              <Activity
                className="mx-auto h-8 w-8 text-text-muted mb-2"
                aria-hidden="true"
              />
              <p className="text-sm text-text-muted">
                No service data available
              </p>
            </div>
          )}
        </section>

        {/* SigNoz embedded dashboard */}
        <SigNozSection />

        {/* ─── Ops Users Management ───────────────────────────────────────── */}
        <section aria-label="Ops team members">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">
                Ops Users
              </h2>
              {users && users.length > 0 && (
                <span className="text-xs text-text-muted">
                  {users.length} {users.length === 1 ? "user" : "users"}
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add User
            </Button>
          </div>

          <div className="rounded-lg border border-border-default bg-bg-secondary overflow-hidden">
            {/* Loading state */}
            {usersLoading && !users && (
              <div className="p-4">
                <UsersTableSkeleton />
              </div>
            )}

            {/* Error state */}
            {usersError && !usersLoading && !users && (
              <div className="px-4 py-8">
                <ErrorState
                  title="Failed to load users"
                  message="Unable to fetch ops team members."
                  onRetry={() => refetchUsers()}
                  compact
                />
              </div>
            )}

            {/* Empty state */}
            {!usersLoading && !usersError && users && users.length === 0 && (
              <div className="px-4 py-8">
                <EmptyState
                  icon={Users}
                  title="No ops users"
                  description="Add team members to manage access to the operations portal."
                  action={{
                    label: "Add User",
                    onClick: () => setShowAddModal(true),
                  }}
                />
              </div>
            )}

            {/* Data table */}
            {!usersLoading && !usersError && users && users.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default bg-bg-tertiary/40">
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Email
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Role
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-bg-tertiary/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={`${user.name}'s avatar`}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <UserCircle
                                  className="h-5 w-5 text-text-muted"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <span className="font-medium text-text-primary">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-text-secondary">
                            {user.email}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-accent-success">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-accent-success"
                              aria-hidden="true"
                            />
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditClick(user)}
                              aria-label={`Edit role for ${user.name}`}
                            >
                              <Pencil
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-accent-danger hover:text-accent-danger hover:bg-accent-danger/10"
                              onClick={() => handleRemoveClick(user)}
                              aria-label={`Remove ${user.name}`}
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ─── Add User Modal ───────────────────────────────────────────── */}
      <Modal
        open={showAddModal}
        onOpenChange={handleCloseAddModal}
        title="Add Ops User"
        description="Invite a new team member to the operations portal."
        confirmLabel={addUserMutation.isPending ? "Adding..." : "Add User"}
        onConfirm={handleAddUser}
        loading={addUserMutation.isPending}
        confirmDisabled={!addName.trim() || !addEmail.trim()}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Jane Smith"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            icon={<UserCircle className="h-4 w-4" aria-hidden="true" />}
            autoComplete="off"
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            placeholder="e.g. jane@example.com"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            icon={<Mail className="h-4 w-4" aria-hidden="true" />}
            autoComplete="off"
          />
          <Select
            label="Role"
            value={addRole}
            onValueChange={(v) => setAddRole(v as OpsUserRole)}
            options={ROLE_OPTIONS}
          />
        </div>
      </Modal>

      {/* ─── Edit User Modal ──────────────────────────────────────────── */}
      <Modal
        open={editingUser !== null}
        onOpenChange={handleCloseEditModal}
        title={editingUser ? `Edit Role — ${editingUser.name}` : "Edit Role"}
        description="Change the role permissions for this user."
        confirmLabel={updateUserMutation.isPending ? "Saving..." : "Save"}
        onConfirm={handleSaveRole}
        loading={updateUserMutation.isPending}
        size="sm"
      >
        <div className="space-y-4">
          {editingUser && (
            <div className="flex items-center gap-3 rounded-lg bg-bg-tertiary/50 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
                {editingUser.avatar_url ? (
                  <img
                    src={editingUser.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle
                    className="h-5 w-5 text-text-muted"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {editingUser.name}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {editingUser.email}
                </p>
              </div>
            </div>
          )}
          <Select
            label="Role"
            value={editRole}
            onValueChange={(v) => setEditRole(v as OpsUserRole)}
            options={ROLE_OPTIONS}
          />
        </div>
      </Modal>

      {/* ─── Remove User Confirm Dialog ───────────────────────────────── */}
      {removingUser && (
        <ConfirmDialog
          {...removeDialogProps}
          title="Remove Ops User"
          message={`Are you sure you want to remove ${removingUser.name} from the ops team?`}
          details="They will lose all access to the operations portal immediately. This action can be undone by re-adding the user."
          resourceName={removingUser.name}
          resourceType="ops user"
          confirmLabel="Remove"
          variant="danger"
          loading={removeUserMutation.isPending}
          onConfirm={handleConfirmRemove}
          onCancel={() => {
            setRemovingUser(null);
            setRemoveDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
