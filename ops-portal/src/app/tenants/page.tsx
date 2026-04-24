'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { useTenants } from '@/hooks/use-tenants';
import { TenantTable } from '@/components/tenants/tenant-table';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonTable } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useProvisionTenant, useTenantStats } from '@/hooks/use-tenants';
import { useCells } from '@/hooks/use-cells';
import { cn } from '@/lib/utils';
import type { Tenant, TenantFilters, ProvisionRequest } from '@/types/tenant';
import type { SelectOption } from '@/components/ui/select';

const tierOptions: SelectOption[] = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

const initialFilters: TenantFilters = {
  search: '',
  tier: undefined,
  status: undefined,
  limit: 50,
  offset: 0,
  sortBy: 'createdAt',
  sortDir: 'desc',
};

export default function TenantsPage() {
  const router = useRouter();
  const toast = useToast();

  // State
  const [filters, setFilters] = useState<TenantFilters>(initialFilters);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Form state for provision modal
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formTier, setFormTier] = useState('starter');
  const [formCellId, setFormCellId] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminName, setFormAdminName] = useState('');

  // Queries
  const {
    data: tenantList,
    isLoading,
    error,
    refetch,
  } = useTenants({ filters });

  const { data: stats } = useTenantStats();
  const { data: cells } = useCells();

  // Mutations
  const provisionMutation = useProvisionTenant();

  // Cell options for provision form
  const cellOptions: SelectOption[] = (cells ?? []).map((cell) => ({
    value: cell.id,
    label: `${cell.name} (${cell.region})`,
    disabled: false,
  }));

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleFiltersChange = useCallback((newFilters: TenantFilters) => {
    setFilters(newFilters);
  }, []);

  const handleProvisionClick = useCallback(() => {
    setShowProvisionModal(true);
  }, []);

  const handleProvisionSubmit = useCallback(async () => {
    if (!formName || !formSlug || !formTier || !formCellId || !formAdminEmail) {
      toast.error('Validation Error', 'Please fill in all required fields.');
      return;
    }

    const req: ProvisionRequest = {
      name: formName,
      slug: formSlug,
      tier: formTier as Tenant['tier'],
      cellId: formCellId,
      adminEmail: formAdminEmail,
      adminName: formAdminName,
    };

    try {
      await provisionMutation.mutateAsync(req);
      toast.success('Tenant provisioned', `"${formName}" has been provisioned successfully.`);
      setShowProvisionModal(false);
      resetProvisionForm();
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to provision tenant';
      toast.error('Provision failed', message);
    }
  }, [
    formName, formSlug, formTier, formCellId, formAdminEmail, formAdminName,
    provisionMutation, toast, refetch,
  ]);

  const resetProvisionForm = () => {
    setFormName('');
    setFormSlug('');
    setFormTier('starter');
    setFormCellId('');
    setFormAdminEmail('');
    setFormAdminName('');
  };

  const handleProvisionModalClose = (open: boolean) => {
    if (!open) {
      setShowProvisionModal(false);
      resetProvisionForm();
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setFormName(value);
    if (!formSlug || formSlug === formName.toLowerCase().replace(/[^a-z0-9-]/g, '-')) {
      setFormSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, ''));
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  const isLoadingInitial = isLoading && !tenantList;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tenants</h1>
          <p className="text-sm text-text-muted mt-1">
            {stats
              ? `${stats.activeTenants} active · ${stats.totalTenants} total · ${stats.newThisWeek} new this week`
              : 'Manage and monitor all tenants'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label="Refresh tenants"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleProvisionClick}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Provision New
          </Button>
        </div>
      </div>

      {/* All-failed state */}
      {error && !tenantList && (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <ErrorState
            title="Unable to load tenants"
            message={error.message ?? 'An unexpected error occurred while fetching tenants.'}
            onRetry={() => refetch()}
          />
        </div>
      )}

      {/* Loading initial state */}
      {isLoadingInitial && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="h-10 flex-1 animate-pulse rounded-md bg-bg-tertiary" />
            <div className="h-10 w-44 animate-pulse rounded-md bg-bg-tertiary" />
          </div>
          <SkeletonTable rows={5} />
        </div>
      )}

      {/* Data loaded — show table */}
      {!isLoadingInitial && (
        <TenantTable
          tenants={tenantList?.tenants ?? []}
          total={tenantList?.total ?? 0}
          loading={isLoading}
          error={error}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRetry={() => refetch()}
          onProvisionClick={handleProvisionClick}
        />
      )}

      {/* ─── Provision Modal ──────────────────────────────────────────── */}
      <Modal
        open={showProvisionModal}
        onOpenChange={handleProvisionModalClose}
        title="Provision New Tenant"
        description="Create a new tenant with initial configuration."
        confirmLabel="Provision"
        onConfirm={handleProvisionSubmit}
        loading={provisionMutation.isPending}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Tenant Name *"
            placeholder="Acme Corp"
            value={formName}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />

          <Input
            label="Slug *"
            placeholder="acme-corp"
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            helperText="Used in URLs and API identifiers. Must be unique."
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tier *"
              value={formTier}
              onValueChange={setFormTier}
              options={tierOptions}
              placeholder="Select tier"
            />

            <Select
              label="Cell *"
              value={formCellId}
              onValueChange={setFormCellId}
              options={cellOptions}
              placeholder="Select cell"
              searchable
              searchPlaceholder="Search cells..."
            />
          </div>

          <div className="border-t border-border-default pt-4">
            <p className="text-sm font-medium text-text-secondary mb-3">
              Admin User
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Admin Name *"
                placeholder="Jane Smith"
                value={formAdminName}
                onChange={(e) => setFormAdminName(e.target.value)}
                required
              />
              <Input
                label="Admin Email *"
                type="email"
                placeholder="jane@acme.com"
                value={formAdminEmail}
                onChange={(e) => setFormAdminEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
