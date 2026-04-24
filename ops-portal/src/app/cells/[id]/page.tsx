'use client';

import { useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Server,
  ArrowUpDown,
  Trash2,
  Move,
} from 'lucide-react';
import { useCell, useCellMetrics, useScaleCell, useDrainCell } from '@/hooks/use-cells';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-dot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ScaleRequest, DrainRequest } from '@/types/cell';

// ─── Helpers ──────────────────────────────────────────────────────────────

const statusColorMap: Record<string, 'healthy' | 'success' | 'warning' | 'degraded' | 'error' | 'danger' | 'info' | 'neutral'> = {
  healthy: 'healthy',
  degraded: 'warning',
  down: 'danger',
  empty: 'neutral',
  draining: 'warning',
};

const statusLabelMap: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  empty: 'Empty',
  draining: 'Draining',
};

function getResourceColor(percent: number): string {
  if (percent >= 90) return 'bg-accent-danger';
  if (percent >= 70) return 'bg-accent-warning';
  return 'bg-accent-success';
}

function getResourceTextColor(percent: number): string {
  if (percent >= 90) return 'text-accent-danger';
  if (percent >= 70) return 'text-accent-warning';
  return 'text-accent-success';
}

// ─── Resource Gauge ───────────────────────────────────────────────────────

function ResourceGauge({
  label,
  percent,
  icon,
}: {
  label: string;
  percent: number;
  icon: React.ReactNode;
}) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-bg-tertiary"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={getResourceColor(clampedPercent)}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn('text-lg font-bold tabular-nums', getResourceTextColor(clampedPercent))}>
            {clampedPercent.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        {icon}
        {label}
      </div>
    </div>
  );
}

// ─── Network Metric Card ──────────────────────────────────────────────────

function NetworkMetric({ label, value }: { label: string; value: number }) {
  const formatted = value >= 1_000_000_000
    ? `${(value / 1_000_000_000).toFixed(1)} Gbps`
    : value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)} Mbps`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(1)} Kbps`
        : `${value.toFixed(0)} bps`;

  return (
    <div className="rounded-lg border border-border-default bg-bg-tertiary/50 p-3">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-medium tabular-nums text-text-primary">{formatted}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function CellDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const cellId = params.id;

  // Queries
  const { data: cell, isLoading, error, refetch } = useCell(cellId);
  const { data: metrics, isLoading: metricsLoading } = useCellMetrics(cellId);

  // Mutations
  const scaleMutation = useScaleCell();
  const drainMutation = useDrainCell();

  // Dialog states
  const scaleDialog = useConfirmDialog();
  const drainDialog = useConfirmDialog();

  // Scale modal form
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleReplicas, setScaleReplicas] = useState(3);
  const [scaleReason, setScaleReason] = useState('');

  // Drain modal form
  const [showDrainModal, setShowDrainModal] = useState(false);
  const [drainReason, setDrainReason] = useState('');
  const [drainTimeout, setDrainTimeout] = useState(300);
  const [drainMigrate, setDrainMigrate] = useState(true);
  const [drainTargetCell, setDrainTargetCell] = useState('');

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleScale = useCallback(async () => {
    if (!cell || !scaleReason) return;
    const req: ScaleRequest = { replicas: scaleReplicas, reason: scaleReason };
    try {
      await scaleMutation.mutateAsync({ id: cell.id, req });
      toast.success('Cell scaled', `Replicas set to ${scaleReplicas}.`);
      setShowScaleModal(false);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to scale cell';
      toast.error('Scale failed', msg);
    }
  }, [cell, scaleReplicas, scaleReason, scaleMutation, toast, refetch]);

  const handleDrain = useCallback(async () => {
    if (!cell || !drainReason) return;
    const req: DrainRequest = {
      reason: drainReason,
      drainTimeout,
      migrateTenants: drainMigrate,
      targetCellId: drainMigrate ? drainTargetCell : undefined,
    };
    try {
      await drainMutation.mutateAsync({ id: cell.id, req });
      toast.success('Cell draining', `"${cell.name}" is being drained.`);
      setShowDrainModal(false);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to drain cell';
      toast.error('Drain failed', msg);
    }
  }, [cell, drainReason, drainTimeout, drainMigrate, drainTargetCell, drainMutation, toast, refetch]);

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading && !cell) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-bg-tertiary" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-bg-tertiary" />
            <div className="h-4 w-32 rounded bg-bg-tertiary" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border-default bg-bg-secondary p-6">
              <div className="flex flex-col items-center gap-2">
                <div className="h-24 w-24 rounded-full bg-bg-tertiary" />
                <div className="h-4 w-16 rounded bg-bg-tertiary" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
          <div className="h-5 w-24 rounded bg-bg-tertiary mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-bg-tertiary" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────

  if (error && !cell) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <ErrorState
          title="Failed to load cell"
          message={error.message ?? 'Unable to fetch cell details.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // ─── Not Found ────────────────────────────────────────────────────────

  if (!cell) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <ErrorState
          title="Cell not found"
          message="The requested cell could not be found. It may have been decommissioned."
          onRetry={() => router.push('/cells')}
          retryLabel="Back to Cells"
        />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  const isDraining = cell.status === 'draining';
  const isDown = cell.status === 'down';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5"
            onClick={() => router.push('/cells')}
            aria-label="Back to cells"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{cell.name}</h1>
              <StatusDot
                status={statusColorMap[cell.status] ?? 'neutral'}
                label={statusLabelMap[cell.status] ?? cell.status}
                size="sm"
              />
            </div>
            <p className="text-sm text-text-muted mt-1">
              <span className="capitalize">{cell.cloud}</span> · {cell.region}
              {' · '}
              {cell.tenantCount} {cell.tenantCount === 1 ? 'tenant' : 'tenants'}
              {' · '}
              Created {formatRelativeTime(cell.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setScaleReplicas(3);
              setScaleReason('');
              setShowScaleModal(true);
            }}
          >
            <ArrowUpDown className="h-4 w-4" />
            Scale
          </Button>

          {!isDraining && !isDown && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDrainReason('');
                setDrainTimeout(300);
                setDrainMigrate(true);
                setDrainTargetCell('');
                setShowDrainModal(true);
              }}
            >
              <Move className="h-4 w-4" />
              Drain
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            onClick={drainDialog.openDialog}
          >
            <Trash2 className="h-4 w-4" />
            Decommission
          </Button>
        </div>
      </div>

      {/* Resource Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <ResourceGauge
              label="CPU Usage"
              percent={cell.cpuUsage}
              icon={<Cpu className="h-3.5 w-3.5" />}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <ResourceGauge
              label="Memory Usage"
              percent={cell.memoryUsage}
              icon={<MemoryStick className="h-3.5 w-3.5" />}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <ResourceGauge
              label="Disk Usage"
              percent={cell.diskUsage}
              icon={<HardDrive className="h-3.5 w-3.5" />}
            />
          </CardContent>
        </Card>
      </div>

      {/* Network + Details Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cell Overview Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Cell ID</span>
              <span className="text-sm font-mono text-text-primary">{cell.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Status</span>
              <StatusDot
                status={statusColorMap[cell.status] ?? 'neutral'}
                label={statusLabelMap[cell.status] ?? cell.status}
                size="sm"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Tenants</span>
              <span className="text-sm font-medium text-text-primary">{cell.tenantCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Cloud</span>
              <span className="text-sm capitalize text-text-primary">{cell.cloud}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Region</span>
              <span className="text-sm text-text-primary">{cell.region}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Created</span>
              <span className="text-sm text-text-primary">{formatRelativeTime(cell.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Network Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4 text-text-muted" aria-hidden="true" />
              Network
            </CardTitle>
            <CardDescription>
              {metricsLoading ? 'Loading...' : 'Real-time throughput'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <NetworkMetric
                label="Inbound"
                value={metrics?.network?.inBps?.at(-1)?.value ?? 0}
              />
              <NetworkMetric
                label="Outbound"
                value={metrics?.network?.outBps?.at(-1)?.value ?? 0}
              />
            </div>
            {metrics?.network && !metricsLoading && (
              <div className="mt-3 pt-3 border-t border-border-default">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Last updated</span>
                  <span>
                    {formatRelativeTime(
                      metrics.network.inBps.at(-1)?.timestamp ?? Date.now(),
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pod Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-text-muted" aria-hidden="true" />
              Pod Status
            </CardTitle>
            <CardDescription>
              Active pods in this cell
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Server className="h-8 w-8 text-text-muted mb-2" aria-hidden="true" />
              <p className="text-sm text-text-muted">
                Pod status details coming soon
              </p>
              <Badge variant="info" size="sm" className="mt-2">
                Cell is active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage Detail Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading && !metrics ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">CPU</span>
                  <span className={cn('text-sm font-medium tabular-nums', getResourceTextColor(cell.cpuUsage))}>
                    {cell.cpuUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-bg-tertiary">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getResourceColor(cell.cpuUsage))}
                    style={{ width: `${Math.min(cell.cpuUsage, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Memory</span>
                  <span className={cn('text-sm font-medium tabular-nums', getResourceTextColor(cell.memoryUsage))}>
                    {cell.memoryUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-bg-tertiary">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getResourceColor(cell.memoryUsage))}
                    style={{ width: `${Math.min(cell.memoryUsage, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Disk</span>
                  <span className={cn('text-sm font-medium tabular-nums', getResourceTextColor(cell.diskUsage))}>
                    {cell.diskUsage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-bg-tertiary">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getResourceColor(cell.diskUsage))}
                    style={{ width: `${Math.min(cell.diskUsage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Scale Modal ──────────────────────────────────────────────── */}
      <Modal
        open={showScaleModal}
        onOpenChange={setShowScaleModal}
        title="Scale Cell"
        description={`Adjust the replica count for "${cell.name}".`}
        confirmLabel="Scale"
        onConfirm={handleScale}
        loading={scaleMutation.isPending}
        confirmDisabled={!scaleReason || scaleReplicas < 1}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-accent-info/5 border border-accent-info/20 p-3">
            <p className="text-xs text-accent-info">
              <strong>Note:</strong> Scaling changes may take a few moments to
              propagate. Monitor the cell health after scaling.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Number of Replicas
            </label>
            <Input
              type="number"
              min={1}
              max={100}
              value={scaleReplicas}
              onChange={(e) => setScaleReplicas(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <Input
            label="Reason *"
            placeholder="Why are you scaling this cell?"
            value={scaleReason}
            onChange={(e) => setScaleReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* ─── Drain Modal ──────────────────────────────────────────────── */}
      <Modal
        open={showDrainModal}
        onOpenChange={setShowDrainModal}
        title="Drain Cell"
        description={`Drain "${cell.name}" to prepare for maintenance or decommissioning.`}
        confirmLabel="Start Drain"
        onConfirm={handleDrain}
        loading={drainMutation.isPending}
        confirmDisabled={!drainReason || (drainMigrate && !drainTargetCell)}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-accent-warning/5 border border-accent-warning/20 p-3">
            <p className="text-xs text-accent-warning">
              <strong>Warning:</strong> Draining a cell will stop new workloads
              from being scheduled. Existing tenants may experience disruption
              during migration.
            </p>
          </div>

          <Input
            label="Reason *"
            placeholder="Why are you draining this cell?"
            value={drainReason}
            onChange={(e) => setDrainReason(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Drain Timeout (seconds)
            </label>
            <Input
              type="number"
              min={30}
              max={3600}
              value={drainTimeout}
              onChange={(e) => setDrainTimeout(parseInt(e.target.value, 10) || 300)}
              helperText="Maximum time to wait for graceful drain (30–3600s)"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="drain-migrate"
              checked={drainMigrate}
              onChange={(e) => setDrainMigrate(e.target.checked)}
              className="h-4 w-4 rounded border-border-default bg-bg-tertiary text-accent-primary focus:ring-accent-primary"
            />
            <label htmlFor="drain-migrate" className="text-sm text-text-primary">
              Migrate tenants to another cell
            </label>
          </div>

          {drainMigrate && (
            <div>
              <p className="text-xs text-text-muted mb-1">
                Target cell for tenant migration:
              </p>
              <Input
                placeholder="Enter target cell ID..."
                value={drainTargetCell}
                onChange={(e) => setDrainTargetCell(e.target.value)}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* ─── Decommission Confirmation ────────────────────────────────── */}
      <ConfirmDialog
        {...drainDialog.dialogProps}
        title="Decommission Cell"
        message={`Are you sure you want to decommission "${cell.name}"?`}
        details="This action will permanently remove the cell and migrate all tenants. This CANNOT be undone. Ensure the cell is drained first."
        resourceName={cell.name}
        resourceType="cell"
        requireConfirmation
        confirmLabel="Decommission"
        variant="danger"
        loading={false}
        onConfirm={() => {
          toast.error('Decommission not implemented', 'This action requires additional confirmation from a senior operator.');
          drainDialog.closeDialog();
        }}
      />
    </div>
  );
}
