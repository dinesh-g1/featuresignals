'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-dot';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Server, Globe, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import type { CellHealth } from '@/types/cell';

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

// ─── Resource Bar ─────────────────────────────────────────────────────────

interface ResourceBarProps {
  label: string;
  percent: number;
  icon: React.ReactNode;
}

function ResourceBar({ label, percent, icon }: ResourceBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-text-muted">
          {icon}
          {label}
        </span>
        <span className={cn('font-medium tabular-nums', getResourceTextColor(clampedPercent))}>
          {clampedPercent.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary" role="progressbar" aria-valuenow={clampedPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${clampedPercent.toFixed(0)}%`}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', getResourceColor(clampedPercent))}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────

export interface CellHealthCardProps {
  cell: CellHealth;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function CellHealthCard({ cell, className }: CellHealthCardProps) {
  return (
    <Link href={`/cells/${cell.cellId}`} className="block transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary rounded-lg">
      <Card className={cn('h-full cursor-pointer', className)}>
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-accent-primary shrink-0" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-text-primary truncate">
                  {cell.cellName}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Globe className="h-3 w-3 text-text-muted" aria-hidden="true" />
                <span className="text-xs text-text-muted">{cell.region}</span>
              </div>
            </div>
            <StatusDot
              status={statusColorMap[cell.status] ?? 'neutral'}
              label={statusLabelMap[cell.status] ?? cell.status}
              size="sm"
            />
          </div>

          {/* Tenant count */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="default" size="sm">
              {cell.tenantCount} {cell.tenantCount === 1 ? 'tenant' : 'tenants'}
            </Badge>
          </div>

          {/* Resource usage bars */}
          <div className="space-y-3">
            <ResourceBar
              label="CPU"
              percent={cell.cpuUsagePercent}
              icon={<Cpu className="h-3 w-3" aria-hidden="true" />}
            />
            <ResourceBar
              label="Memory"
              percent={cell.memoryUsagePercent}
              icon={<MemoryStick className="h-3 w-3" aria-hidden="true" />}
            />
            <ResourceBar
              label="Disk"
              percent={cell.diskUsagePercent}
              icon={<HardDrive className="h-3 w-3" aria-hidden="true" />}
            />
          </div>

          {/* Last checked */}
          <div className="mt-3 pt-3 border-t border-border-default">
            <span className="text-[11px] text-text-muted">
              Last checked: {new Date(cell.lastCheckedAt).toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

export function CellHealthCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-5 w-20 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-28 mt-3 pt-3 border-t border-border-default" />
      </CardContent>
    </Card>
  );
}
