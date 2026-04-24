'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Users, DollarSign, Server, RefreshCw } from 'lucide-react';
import * as api from '@/lib/api';
import { Card, CardTitle, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { StatusDot } from '@/components/ui/status-dot';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatRelativeTime, formatDate } from '@/lib/utils';
import type { DashboardStats, RecentActivity, SystemHealth } from '@/types/api';

// ─── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  delta?: { value: string; positive: boolean };
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({ title, value, delta, icon, loading }: StatCardProps) {
  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <Card className="relative overflow-hidden transition-colors hover:border-border-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-muted">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-text-primary">{value}</p>
            {delta && (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-medium',
                    delta.positive ? 'text-accent-success' : 'text-accent-danger',
                  )}
                >
                  {delta.positive ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  {delta.value}
                </span>
                <span className="text-xs text-text-muted">vs last month</span>
              </div>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stat Card Skeleton ─────────────────────────────────────────────────────

function StatCardsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}

// ─── Recent Activity ────────────────────────────────────────────────────────

interface ActivityFeedProps {
  activities: RecentActivity[] | undefined;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const activityIcons: Record<string, string> = {
  'cell.provisioned': '🟢',
  'preview.created': '🟢',
  'billing.failed': '🔴',
  'backup.complete': '🟢',
  'preview.expired': '🟡',
};

const activityStyles: Record<string, string> = {
  'cell.provisioned': 'border-l-accent-success',
  'preview.created': 'border-l-accent-success',
  'billing.failed': 'border-l-accent-danger',
  'backup.complete': 'border-l-accent-success',
  'preview.expired': 'border-l-accent-warning',
};

function ActivityFeed({ activities, loading, error, onRetry }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <Skeleton className="h-5 w-5 rounded-full mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load activity"
        message="Unable to fetch recent activity. The activity feed may be temporarily unavailable."
        onRetry={onRetry}
        compact
      />
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">No activity in the last 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1" role="list" aria-label="Recent activity">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border-l-2 px-4 py-3 transition-colors hover:bg-bg-tertiary/50',
            activityStyles[activity.type] ?? 'border-l-accent-info',
          )}
          role="listitem"
        >
          <span className="text-base leading-none mt-0.5" aria-hidden="true">
            {activityIcons[activity.type] ?? '🔵'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary leading-snug">{activity.summary}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {formatRelativeTime(activity.timestamp)}
            </p>
          </div>
          <Badge
            variant={
              activity.severity === 'error'
                ? 'danger'
                : activity.severity === 'warning'
                  ? 'warning'
                  : 'success'
            }
            size="sm"
          >
            {activity.type.split('.').pop() ?? 'event'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ─── System Health ──────────────────────────────────────────────────────────

interface SystemHealthWidgetProps {
  health: SystemHealth | undefined;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

function SystemHealthWidget({ health, loading, error, onRetry }: SystemHealthWidgetProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Health check failed"
        message="Unable to fetch system health data."
        onRetry={onRetry}
        compact
      />
    );
  }

  if (!health) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">No health data available.</p>
      </div>
    );
  }

  const clusterStatus = health.cluster.status;
  const servicesUp = health.services.filter((s) => s.status === 'healthy').length;
  const servicesTotal = health.services.length;

  return (
    <div className="space-y-4">
      {/* Cluster summary */}
      <div className="flex items-center gap-2">
        <StatusDot
          status={
            clusterStatus === 'healthy'
              ? 'healthy'
              : clusterStatus === 'degraded'
                ? 'warning'
                : 'danger'
          }
          pulse={clusterStatus !== 'healthy'}
        />
        <span className="text-sm font-medium text-text-primary">
          Cluster:{' '}
          <span
            className={
              clusterStatus === 'healthy'
                ? 'text-accent-success'
                : clusterStatus === 'degraded'
                  ? 'text-accent-warning'
                  : 'text-accent-danger'
            }
          >
            {clusterStatus.charAt(0).toUpperCase() + clusterStatus.slice(1)}
          </span>
        </span>
        <span className="text-xs text-text-muted">
          {health.cluster.healthy_nodes}/{health.cluster.total_nodes} nodes healthy
        </span>
      </div>

      {/* Node grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {health.cluster.nodes.map((node) => (
          <div
            key={node.name}
            className="rounded-lg border border-border-default bg-bg-tertiary/50 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">{node.name}</span>
              <StatusDot
                status={
                  node.status === 'ready'
                    ? 'healthy'
                    : node.status === 'not_ready'
                      ? 'danger'
                      : 'neutral'
                }
                size="sm"
              />
            </div>
            <div className="space-y-1.5">
              <ResourceBar label="CPU" percent={node.cpu_percent} />
              <ResourceBar label="Memory" percent={node.memory_percent} />
              <ResourceBar label="Disk" percent={node.disk_percent} />
            </div>
          </div>
        ))}
      </div>

      {/* Services summary */}
      <div className="rounded-lg border border-border-default bg-bg-tertiary/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Services</span>
          <span className="text-xs text-text-muted">
            {servicesUp}/{servicesTotal} healthy
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {health.services.map((service) => (
            <div key={service.name} className="flex items-center gap-2">
              <StatusDot
                status={
                  service.status === 'healthy'
                    ? 'healthy'
                    : service.status === 'degraded'
                      ? 'warning'
                      : 'danger'
                }
                size="sm"
              />
              <span className="text-xs text-text-secondary truncate">{service.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourceBar({ label, percent }: { label: string; percent: number }) {
  const getColor = (pct: number) => {
    if (pct > 80) return 'bg-accent-danger';
    if (pct > 60) return 'bg-accent-warning';
    return 'bg-accent-success';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getColor(percent))}
          style={{ width: `${Math.min(percent, 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${Math.round(percent)}%`}
        />
      </div>
      <span className="text-xs text-text-muted w-9 text-right">{Math.round(percent)}%</span>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, loading }: { title: string; loading?: boolean }) {
  return (
    <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
      {title}
      {loading && (
        <RefreshCw className="h-4 w-4 text-text-muted animate-spin" aria-hidden="true" />
      )}
    </h2>
  );
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  // Fetch dashboard stats with React Query
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 30_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  // Fetch recent activity
  const {
    data: activities,
    isLoading: activitiesLoading,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery<RecentActivity[]>({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => api.getRecentActivity(5),
    refetchInterval: 15_000,
    retry: 2,
  });

  // Fetch system health
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useQuery<SystemHealth>({
    queryKey: ['system', 'health'],
    queryFn: () => api.getSystemHealth(),
    refetchInterval: 30_000,
    retry: 2,
  });

  const isPartiallyLoaded = !statsLoading && !healthLoading && !activitiesLoading &&
    (!!statsError || !!healthError || !!activitiesError);

  // ─── All failed state ──────────────────────────────────────────────────

  if (statsError && activitiesError && healthError && !statsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ErrorState
          title="Unable to load dashboard"
          message="We couldn't fetch any dashboard data. This might be a connectivity issue."
          onRetry={() => {
            refetchStats();
            refetchActivities();
            refetchHealth();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            System overview at a glance
            {stats && (
              <span className="ml-2 text-xs">
                · Updated {formatRelativeTime(stats.last_updated)}
              </span>
            )}
          </p>
        </div>
        {isPartiallyLoaded && (
          <Badge variant="warning" size="sm">
            Partial data
          </Badge>
        )}
      </div>

      {/* Stat Cards */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statsLoading && !stats ? (
            <StatCardsSkeleton />
          ) : (
            <>
              <StatCard
                title="Active Tenants"
                value={stats?.active_tenants?.toLocaleString() ?? '—'}
                delta={
                  stats
                    ? {
                        value: `${stats.active_tenants_delta > 0 ? '+' : ''}${stats.active_tenants_delta}`,
                        positive: (stats.active_tenants_delta ?? 0) >= 0,
                      }
                    : undefined
                }
                icon={<Users className="h-5 w-5 text-accent-primary" />}
                loading={false}
              />
              <StatCard
                title="Monthly Revenue (MRR)"
                value={stats ? formatCurrency(stats.mrr, stats.mrr_currency) : '—'}
                delta={
                  stats
                    ? {
                        value: `${stats.mrr_delta_percent > 0 ? '+' : ''}${stats.mrr_delta_percent}%`,
                        positive: (stats.mrr_delta_percent ?? 0) >= 0,
                      }
                    : undefined
                }
                icon={<DollarSign className="h-5 w-5 text-accent-primary" />}
                loading={false}
              />
              <StatCard
                title="Cells Healthy"
                value={
                  stats
                    ? `${stats.healthy_cells}/${stats.total_cells}`
                    : '—'
                }
                icon={<Server className="h-5 w-5 text-accent-primary" />}
                loading={false}
                delta={
                  stats && stats.healthy_cells === stats.total_cells
                    ? { value: 'All green', positive: true }
                    : stats
                      ? {
                          value: `${stats.total_cells - stats.healthy_cells} degraded`,
                          positive: false,
                        }
                      : undefined
                }
              />
            </>
          )}
        </div>
      </section>

      {/* Two-column layout for larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <section aria-label="Recent activity">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <span className="text-xs text-text-muted">Last 24 hours</span>
            </CardHeader>
            <CardContent className="pt-0">
              <ActivityFeed
                activities={activities}
                loading={activitiesLoading && !activities}
                error={activitiesError as Error | null}
                onRetry={() => refetchActivities()}
              />
            </CardContent>
          </Card>
        </section>

        {/* System Health */}
        <section aria-label="System health">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">System Health</CardTitle>
              <button
                onClick={() => refetchHealth()}
                className="text-xs text-accent-primary hover:text-accent-hover transition-colors"
                aria-label="Refresh system health"
              >
                Refresh
              </button>
            </CardHeader>
            <CardContent className="pt-0">
              <SystemHealthWidget
                health={health}
                loading={healthLoading && !health}
                error={healthError as Error | null}
                onRetry={() => refetchHealth()}
              />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
