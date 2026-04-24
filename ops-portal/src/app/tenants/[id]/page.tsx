'use client';

import { useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Key,
  Server,
  CreditCard,
  Activity,
  MoreVertical,
  Ban,
  CheckCircle,
  Trash2,
  UserCog,
  Move,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useTenant, useSuspendTenant, useActivateTenant, useDeprovisionTenant } from '@/hooks/use-tenants';
import { useCells } from '@/hooks/use-cells';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-dot';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal, ModalTrigger } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { cn, formatCurrency, formatRelativeTime, formatDate } from '@/lib/utils';
import type { SelectOption } from '@/components/ui/select';

// ─── Helpers ──────────────────────────────────────────────────────────────

const tierBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  free: 'default',
  starter: 'info',
  pro: 'primary',
  enterprise: 'warning',
};

const statusDotMap: Record<string, 'healthy' | 'success' | 'warning' | 'degraded' | 'error' | 'danger' | 'info' | 'neutral'> = {
  active: 'healthy',
  suspended: 'error',
  past_due: 'warning',
  deprovisioning: 'neutral',
};

const statusLabelMap: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  past_due: 'Past Due',
  deprovisioning: 'Deprovisioning',
};

// ─── Detail Section Skeleton ──────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-5" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Overview Card */}
      <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border-default bg-bg-secondary p-6">
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const tenantId = params.id;

  // Queries
  const { data: tenant, isLoading, error, refetch } = useTenant(tenantId);
  const { data: cells } = useCells();

  // Mutations
  const suspendMutation = useSuspendTenant();
  const activateMutation = useActivateTenant();
  const deprovisionMutation = useDeprovisionTenant();

  // Dialog states
  const suspendDialog = useConfirmDialog();
  const activateDialog = useConfirmDialog();
  const deprovisionDialog = useConfirmDialog();
  const migrateDialog = useConfirmDialog();

  // Migrate modal state
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [migrateTargetCell, setMigrateTargetCell] = useState('');

  // ─── Action Handlers ──────────────────────────────────────────────────

  const handleSuspend = useCallback(async () => {
    if (!tenant) return;
    try {
      await suspendMutation.mutateAsync(tenant.id);
      toast.success('Tenant suspended', `"${tenant.name}" has been suspended.`);
      suspendDialog.closeDialog();
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suspend tenant';
      toast.error('Suspension failed', message);
    }
  }, [tenant, suspendMutation, toast, suspendDialog, refetch]);

  const handleActivate = useCallback(async () => {
    if (!tenant) return;
    try {
      await activateMutation.mutateAsync(tenant.id);
      toast.success('Tenant activated', `"${tenant.name}" has been activated.`);
      activateDialog.closeDialog();
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate tenant';
      toast.error('Activation failed', message);
    }
  }, [tenant, activateMutation, toast, activateDialog, refetch]);

  const handleDeprovision = useCallback(async () => {
    if (!tenant) return;
    try {
      await deprovisionMutation.mutateAsync(tenant.id);
      toast.success('Tenant deprovisioned', `"${tenant.name}" has been deprovisioned.`);
      deprovisionDialog.closeDialog();
      router.push('/tenants');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deprovision tenant';
      toast.error('Deprovisioning failed', message);
    }
  }, [tenant, deprovisionMutation, toast, deprovisionDialog, router]);

  const handleMigrate = useCallback(async () => {
    if (!tenant || !migrateTargetCell) return;
    try {
      // Use updateTenant to migrate cell
      const { useUpdateTenant } = await import('@/hooks/use-tenants');
      // We inline the migration logic here
      const response = await fetch(`/api/v1/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellId: migrateTargetCell }),
      });
      if (!response.ok) throw new Error('Migration failed');
      toast.success('Tenant migrated', `"${tenant.name}" moved to new cell.`);
      setShowMigrateModal(false);
      setMigrateTargetCell('');
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to migrate tenant';
      toast.error('Migration failed', message);
    }
  }, [tenant, migrateTargetCell, toast, refetch]);

  // ─── Loading State ────────────────────────────────────────────────────

  if (isLoading && !tenant) {
    return <DetailSkeleton />;
  }

  // ─── Error State ──────────────────────────────────────────────────────

  if (error && !tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <ErrorState
          title="Failed to load tenant"
          message={error.message ?? 'Unable to fetch tenant details. Please try again.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // ─── 404 / Not Found State ────────────────────────────────────────────

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <ErrorState
          title="Tenant not found"
          message="The requested tenant could not be found. It may have been removed."
          onRetry={() => router.push('/tenants')}
          retryLabel="Back to Tenants"
        />
      </div>
    );
  }

  // ─── Cell options for migration ───────────────────────────────────────

  const cellOptions: SelectOption[] = (cells ?? [])
    .filter((c) => c.id !== tenant.cellId)
    .map((c) => ({ value: c.id, label: `${c.name} (${c.region})` }));

  const isSuspended = tenant.status === 'suspended';
  const isDeprovisioning = tenant.status === 'deprovisioning';
  const canActivate = isSuspended;
  const canSuspend = tenant.status === 'active' || tenant.status === 'past_due';

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5"
            onClick={() => router.push('/tenants')}
            aria-label="Back to tenants"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{tenant.name}</h1>
              <Badge variant={tierBadgeVariant[tenant.tier] ?? 'default'} size="sm">
                <span className="capitalize">{tenant.tier}</span>
              </Badge>
              <StatusDot
                status={statusDotMap[tenant.status] ?? 'neutral'}
                label={statusLabelMap[tenant.status] ?? tenant.status}
                size="sm"
              />
            </div>
            <p className="text-sm text-text-muted mt-1">
              <span className="font-mono">{tenant.slug}</span>
              {' · '}
              Created {formatRelativeTime(tenant.createdAt)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
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

          {canSuspend && (
            <Button
              variant="secondary"
              size="sm"
              onClick={suspendDialog.openDialog}
              disabled={suspendMutation.isPending}
            >
              <Ban className="h-4 w-4" />
              Suspend
            </Button>
          )}

          {canActivate && (
            <Button
              variant="primary"
              size="sm"
              onClick={activateDialog.openDialog}
              disabled={activateMutation.isPending}
            >
              <CheckCircle className="h-4 w-4" />
              Activate
            </Button>
          )}

          {!isDeprovisioning && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowMigrateModal(true)}
              >
                <Move className="h-4 w-4" />
                Migrate Cell
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={deprovisionDialog.openDialog}
                disabled={deprovisionMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Deprovision
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Tenant ID</p>
              <p className="text-sm font-mono text-text-primary truncate" title={tenant.id}>
                {tenant.id}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Slug</p>
              <p className="text-sm font-mono text-text-primary">{tenant.slug}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Cloud</p>
              <p className="text-sm text-text-primary capitalize">{tenant.cloud}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Region</p>
              <p className="text-sm text-text-primary">{tenant.region}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Cell</p>
              <p className="text-sm text-text-primary">{tenant.cellName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Current Cost</p>
              <p className="text-sm font-semibold tabular-nums text-text-primary">
                {formatCurrency(tenant.cost, tenant.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-text-primary">{formatDate(tenant.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-text-primary">{formatRelativeTime(tenant.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column detail sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-text-muted" aria-hidden="true" />
                API Keys
              </CardTitle>
              <CardDescription>
                {tenant.apiKeys.length} key{tenant.apiKeys.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {tenant.apiKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Key className="h-8 w-8 text-text-muted mb-2" aria-hidden="true" />
                <p className="text-sm text-text-muted">No API keys configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tenant.apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border border-border-default bg-bg-tertiary/50 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {key.label}
                        </span>
                        <code className="rounded bg-bg-tertiary px-1.5 py-0.5 text-xs font-mono text-text-muted">
                          {key.keyPrefix}...
                        </code>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Last used: {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'Never'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(key.keyPrefix);
                        toast.info('Copied', 'Key prefix copied to clipboard.');
                      }}
                      aria-label={`Copy key prefix ${key.keyPrefix}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Bill */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-text-muted" aria-hidden="true" />
                Current Bill
              </CardTitle>
              <CardDescription>
                {tenant.currentBill
                  ? `${formatDate(tenant.currentBill.periodStart)} – ${formatDate(tenant.currentBill.periodEnd)}`
                  : 'No billing data available'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!tenant.currentBill ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CreditCard className="h-8 w-8 text-text-muted mb-2" aria-hidden="true" />
                <p className="text-sm text-text-muted">No billing data available</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <p className="text-sm text-text-muted mb-1">Amount so far this period</p>
                <p className="text-3xl font-bold tabular-nums text-text-primary">
                  {formatCurrency(tenant.currentBill.amount, tenant.currentBill.currency)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-text-muted" aria-hidden="true" />
              Activity Log
            </CardTitle>
            <CardDescription>
              Last {tenant.activityLog.length} events
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {tenant.activityLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-8 w-8 text-text-muted mb-2" aria-hidden="true" />
              <p className="text-sm text-text-muted">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tenant.activityLog.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-bg-tertiary/50 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-tertiary shrink-0 mt-0.5">
                    <Activity className="h-3 w-3 text-text-muted" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {event.action}
                      </p>
                      <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      by <span className="font-medium text-text-secondary">{event.actor}</span>
                      {event.target ? ` · ${event.target}` : ''}
                    </p>
                    {event.details && (
                      <p className="text-xs text-text-muted mt-1">{event.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Suspend Confirmation ──────────────────────────────────────── */}
      <ConfirmDialog
        {...suspendDialog.dialogProps}
        title="Suspend Tenant"
        message={`Are you sure you want to suspend "${tenant.name}"?`}
        details="Suspended tenants cannot evaluate flags or access the dashboard. You can activate them again at any time."
        resourceName={tenant.name}
        resourceType="tenant"
        requireConfirmation
        confirmLabel="Suspend"
        variant="warning"
        loading={suspendMutation.isPending}
        onConfirm={handleSuspend}
      />

      {/* ─── Activate Confirmation ─────────────────────────────────────── */}
      <ConfirmDialog
        {...activateDialog.dialogProps}
        title="Activate Tenant"
        message={`Reactivate "${tenant.name}"?`}
        details="This will restore full functionality for the tenant, including flag evaluation and dashboard access."
        resourceName={tenant.name}
        resourceType="tenant"
        requireConfirmation
        confirmLabel="Activate"
        variant="warning"
        loading={activateMutation.isPending}
        onConfirm={handleActivate}
      />

      {/* ─── Deprovision Confirmation ──────────────────────────────────── */}
      <ConfirmDialog
        {...deprovisionDialog.dialogProps}
        title="Deprovision Tenant"
        message={`Are you sure you want to permanently deprovision "${tenant.name}"?`}
        details="This will permanently delete all tenant data, including flags, segments, environments, and API keys. This action CANNOT be undone."
        resourceName={tenant.name}
        resourceType="tenant"
        requireConfirmation
        confirmLabel="Deprovision"
        variant="danger"
        loading={deprovisionMutation.isPending}
        onConfirm={handleDeprovision}
      />

      {/* ─── Migrate Cell Modal ────────────────────────────────────────── */}
      <Modal
        open={showMigrateModal}
        onOpenChange={setShowMigrateModal}
        title="Migrate Tenant to Another Cell"
        description={`Move "${tenant.name}" to a different cell.`}
        confirmLabel="Migrate"
        onConfirm={handleMigrate}
        loading={false}
        confirmDisabled={!migrateTargetCell}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-accent-warning/5 border border-accent-warning/20 p-3">
            <p className="text-xs text-accent-warning">
              <strong>Note:</strong> Migrating a tenant to a different cell may cause
              a brief interruption in service while the transition completes.
            </p>
          </div>

          <Select
            label="Target Cell"
            value={migrateTargetCell}
            onValueChange={setMigrateTargetCell}
            options={cellOptions}
            placeholder="Select a cell..."
            searchable
            searchPlaceholder="Search cells..."
          />

          <div className="text-xs text-text-muted">
            Current cell: <span className="font-medium text-text-secondary">{tenant.cellName}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
