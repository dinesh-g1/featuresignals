'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  User,
  FileEdit,
  HardDrive,
  Eye,
  CreditCard,
  Server,
  Activity,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { cn, formatDate } from '@/lib/utils';
import type { AuditEntry, AuditFilters } from '@/types/api';
import type { SelectOption } from '@/components/ui/select';

// ─── Constants ────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const ACTION_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Actions' },
  { value: 'cell.update', label: 'Cell Update' },
  { value: 'backup.complete', label: 'Backup Complete' },
  { value: 'preview.create', label: 'Preview Create' },
  { value: 'preview.expire', label: 'Preview Expire' },
  { value: 'billing.failed', label: 'Billing Failed' },
  { value: 'billing.invoice', label: 'Billing Invoice' },
  { value: 'tenant.provision', label: 'Tenant Provision' },
  { value: 'tenant.deprovision', label: 'Tenant Deprovision' },
  { value: 'tenant.suspend', label: 'Tenant Suspend' },
  { value: 'tenant.activate', label: 'Tenant Activate' },
  { value: 'user.login', label: 'User Login' },
  { value: 'user.invite', label: 'User Invite' },
  { value: 'user.role', label: 'User Role Change' },
  { value: 'settings.update', label: 'Settings Update' },
  { value: 'backup.restore', label: 'Backup Restore' },
  { value: 'cell.scale', label: 'Cell Scale' },
  { value: 'cell.drain', label: 'Cell Drain' },
  { value: 'env.update', label: 'Env Var Update' },
  { value: 'system.config', label: 'System Config Change' },
];

const SEVERITY_VARIANT: Record<
  AuditEntry['severity'],
  'success' | 'warning' | 'danger' | 'info' | 'default'
> = {
  info: 'info',
  warning: 'warning',
  error: 'danger',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'cell.update': <Server className="h-4 w-4" aria-hidden="true" />,
  'cell.scale': <Server className="h-4 w-4" aria-hidden="true" />,
  'cell.drain': <Server className="h-4 w-4" aria-hidden="true" />,
  'backup.complete': <HardDrive className="h-4 w-4" aria-hidden="true" />,
  'backup.restore': <RotateCcw className="h-4 w-4" aria-hidden="true" />,
  'preview.create': <Eye className="h-4 w-4" aria-hidden="true" />,
  'preview.expire': <Eye className="h-4 w-4" aria-hidden="true" />,
  'billing.failed': <CreditCard className="h-4 w-4" aria-hidden="true" />,
  'billing.invoice': <CreditCard className="h-4 w-4" aria-hidden="true" />,
  'tenant.provision': <Server className="h-4 w-4" aria-hidden="true" />,
  'tenant.deprovision': <Server className="h-4 w-4" aria-hidden="true" />,
  'tenant.suspend': <Server className="h-4 w-4" aria-hidden="true" />,
  'tenant.activate': <Server className="h-4 w-4" aria-hidden="true" />,
  'user.login': <User className="h-4 w-4" aria-hidden="true" />,
  'user.invite': <User className="h-4 w-4" aria-hidden="true" />,
  'user.role': <User className="h-4 w-4" aria-hidden="true" />,
  'settings.update': <FileEdit className="h-4 w-4" aria-hidden="true" />,
  'env.update': <FileEdit className="h-4 w-4" aria-hidden="true" />,
  'system.config': <Activity className="h-4 w-4" aria-hidden="true" />,
};

const DEFAULT_ICON = <Activity className="h-4 w-4" aria-hidden="true" />;

function getActionIcon(action: string): React.ReactNode {
  return ACTION_ICONS[action] ?? DEFAULT_ICON;
}

function formatActionLabel(action: string): string {
  return action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// ─── Filter Bar Skeleton ──────────────────────────────────────────────────

function FilterBarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-3 animate-pulse">
      <Skeleton className="h-10 flex-1 rounded-md" />
      <Skeleton className="h-10 w-44 rounded-md" />
      <Skeleton className="h-10 w-36 rounded-md" />
      <Skeleton className="h-10 w-36 rounded-md" />
    </div>
  );
}

// ─── Table Row Skeleton ───────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-1 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-border-default p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-40" />
          <div className="ml-auto">
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Expandable Row ───────────────────────────────────────────────────────

interface AuditRowProps {
  entry: AuditEntry;
}

function AuditRow({ entry }: AuditRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border-default last:border-b-0 transition-colors hover:bg-bg-tertiary/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
        aria-label={`Toggle details for ${formatActionLabel(entry.action)}`}
      >
        {/* Timestamp */}
        <div className="w-36 shrink-0">
          <p className="text-xs text-text-muted">
            {formatDate(entry.timestamp, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Actor */}
        <div className="w-48 shrink-0 flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
            <User className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          </div>
          <span className="truncate text-sm text-text-primary" title={entry.actor}>
            {entry.actor}
          </span>
        </div>

        {/* Action */}
        <div className="w-28 shrink-0 flex items-center gap-1.5">
          <span className="text-text-muted shrink-0">{getActionIcon(entry.action)}</span>
          <span className="text-sm text-text-primary truncate">
            {formatActionLabel(entry.action)}
          </span>
        </div>

        {/* Target */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-text-secondary truncate block" title={entry.target}>
            {entry.target}
          </span>
        </div>

        {/* Severity badge */}
        <div className="w-20 shrink-0 flex justify-center">
          <Badge variant={SEVERITY_VARIANT[entry.severity]} size="sm">
            {entry.severity}
          </Badge>
        </div>

        {/* Expand toggle */}
        <div className="w-6 shrink-0 flex justify-center">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && entry.details && (
        <div className="border-t border-border-default bg-bg-tertiary/20 px-4 py-3">
          <div className="max-w-none">
            <p className="text-xs font-medium text-text-muted mb-1">Details</p>
            <pre className="whitespace-pre-wrap rounded-md bg-bg-tertiary p-3 text-xs text-text-secondary font-mono leading-relaxed">
              {entry.details}
            </pre>
          </div>
          {entry.targetId && (
            <p className="mt-2 text-xs text-text-muted">
              Target ID:{' '}
              <span className="font-mono text-text-secondary">{entry.targetId}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page Numbers Helper ──────────────────────────────────────────────────

function getPageNumbers(currentPage: number, totalPages: number): (number | null)[] {
  const pages: (number | null)[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    end = Math.min(maxVisible, totalPages - 1);
  }
  if (currentPage >= totalPages - 2) {
    start = Math.max(2, totalPages - maxVisible + 1);
  }

  if (start > 2) pages.push(null);
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push(null);

  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

// ─── Audit Page ───────────────────────────────────────────────────────────

export default function AuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ─── Derive filters from URL query params ────────────────────────────

  const currentFilters: AuditFilters = useMemo(() => {
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    return {
      search: searchParams.get('search') ?? undefined,
      action_type: searchParams.get('action_type') ?? undefined,
      actor: searchParams.get('actor') ?? undefined,
      date_from: searchParams.get('date_from') ?? undefined,
      date_to: searchParams.get('date_to') ?? undefined,
      page: isNaN(page) || page < 1 ? 1 : page,
      limit: PAGE_SIZE,
    };
  }, [searchParams]);

  const currentPage = currentFilters.page ?? 1;

  // ─── Query ───────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['audit', currentFilters],
    queryFn: () => api.getAuditLog(currentFilters),
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 2,
  });

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1;

  // ─── Filter update helpers ───────────────────────────────────────────

  const updateFilters = useCallback(
    (updates: Partial<AuditFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      // Reset to page 1 when filters change (unless updating page itself)
      if (!('page' in updates)) {
        params.delete('page');
      }
      router.push(`/audit?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilters({ search: value || undefined });
    },
    [updateFilters],
  );

  const handleActionTypeChange = useCallback(
    (value: string) => {
      updateFilters({ action_type: value || undefined });
    },
    [updateFilters],
  );

  const handleActorChange = useCallback(
    (value: string) => {
      updateFilters({ actor: value || undefined });
    },
    [updateFilters],
  );

  const handleDateFromChange = useCallback(
    (value: string) => {
      updateFilters({ date_from: value || undefined });
    },
    [updateFilters],
  );

  const handleDateToChange = useCallback(
    (value: string) => {
      updateFilters({ date_to: value || undefined });
    },
    [updateFilters],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateFilters({ page });
    },
    [updateFilters],
  );

  const handleClearFilters = useCallback(() => {
    router.push('/audit', { scroll: false });
  }, [router]);

  const hasActiveFilters = useMemo(() => {
    return !!(
      currentFilters.search ||
      currentFilters.action_type ||
      currentFilters.actor ||
      currentFilters.date_from ||
      currentFilters.date_to
    );
  }, [currentFilters]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audit Log</h1>
          <p className="text-sm text-text-muted mt-1">
            Track all system changes and user activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh audit log"
          >
            <RotateCcw
              className={cn('h-4 w-4', isFetching && 'animate-spin')}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Filter Bar ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          {isLoading && !data ? (
            <FilterBarSkeleton />
          ) : (
            <div className="flex flex-col gap-3">
              {/* Row 1: Search + Action Type + Actor */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search by actor name or email..."
                    value={currentFilters.search ?? ''}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    icon={<Search className="h-4 w-4" aria-hidden="true" />}
                    aria-label="Search audit log"
                  />
                </div>
                <div className="w-full sm:w-52">
                  <Select
                    value={currentFilters.action_type ?? ''}
                    onValueChange={handleActionTypeChange}
                    options={ACTION_TYPE_OPTIONS}
                    placeholder="All Actions"
                    aria-label="Filter by action type"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Input
                    placeholder="Actor name..."
                    value={currentFilters.actor ?? ''}
                    onChange={(e) => handleActorChange(e.target.value)}
                    aria-label="Filter by actor"
                  />
                </div>
              </div>

              {/* Row 2: Date range */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-48">
                  <label
                    htmlFor="date-from"
                    className="block text-xs font-medium text-text-muted mb-1"
                  >
                    From
                  </label>
                  <Input
                    id="date-from"
                    type="date"
                    value={currentFilters.date_from ?? ''}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    aria-label="Start date"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <label
                    htmlFor="date-to"
                    className="block text-xs font-medium text-text-muted mb-1"
                  >
                    To
                  </label>
                  <Input
                    id="date-to"
                    type="date"
                    value={currentFilters.date_to ?? ''}
                    onChange={(e) => handleDateToChange(e.target.value)}
                    aria-label="End date"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Results ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Activity Entries</CardTitle>
          {data && !isLoading && (
            <span className="text-xs text-text-muted">
              {data.total} total {data.total === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Loading state */}
          {isLoading && !data && <TableSkeleton />}

          {/* Error state */}
          {error && !isLoading && !data && (
            <div className="px-4 py-8">
              <ErrorState
                title="Failed to load audit log"
                message="Unable to fetch audit entries. The service may be temporarily unavailable."
                onRetry={() => refetch()}
              />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && data && data.data.length === 0 && (
            <div className="px-4 py-8">
              <EmptyState
                icon={Search}
                title={
                  hasActiveFilters
                    ? 'No audit entries match your filters'
                    : 'No audit entries yet'
                }
                description={
                  hasActiveFilters
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Audit entries will appear here as actions are performed in the system.'
                }
                action={
                  hasActiveFilters
                    ? { label: 'Clear Filters', onClick: handleClearFilters }
                    : undefined
                }
              />
            </div>
          )}

          {/* Data state */}
          {!isLoading && !error && data && data.data.length > 0 && (
            <div className="divide-y divide-border-default">
              {/* Table header */}
              <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 border-b border-border-default bg-bg-tertiary/40 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <div className="w-36 shrink-0">Time</div>
                <div className="w-48 shrink-0">Actor</div>
                <div className="w-28 shrink-0">Action</div>
                <div className="flex-1">Target</div>
                <div className="w-20 shrink-0 text-center">Severity</div>
                <div className="w-6 shrink-0" />
              </div>

              {/* Rows */}
              {data.data.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}

          {/* Refetching overlay indicator */}
          {isFetching && data && (
            <div className="flex items-center justify-center border-t border-border-default py-2">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <RotateCcw className="h-3 w-3 animate-spin" aria-hidden="true" />
                Updating...
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Pagination ──────────────────────────────────────────────── */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Showing page {currentPage} of {totalPages}
          </p>
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(1)}
              aria-label="First page"
            >
              First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous page"
            >
              Previous
            </Button>

            <div className="flex items-center gap-1 px-2">
              {getPageNumbers(currentPage, totalPages).map((page, idx) =>
                page === null ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-8 w-8 items-center justify-center text-sm text-text-muted"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'primary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => handlePageChange(page)}
                    aria-label={`Page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </Button>
                ),
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next page"
            >
              Next
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(totalPages)}
              aria-label="Last page"
            >
              Last
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
