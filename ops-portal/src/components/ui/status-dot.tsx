'use client';

import { cn } from '@/lib/utils';

type StatusLevel = 'healthy' | 'success' | 'warning' | 'degraded' | 'error' | 'danger' | 'info' | 'neutral';

interface StatusDotProps {
  /** The status level determines the color */
  status: StatusLevel;
  /** Whether to show the pulsing animation (e.g., for live indicators) */
  pulse?: boolean;
  /** Optional label shown next to the dot */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusColors: Record<StatusLevel, string> = {
  healthy: 'bg-accent-success',
  success: 'bg-accent-success',
  warning: 'bg-accent-warning',
  degraded: 'bg-accent-warning',
  error: 'bg-accent-danger',
  danger: 'bg-accent-danger',
  info: 'bg-accent-info',
  neutral: 'bg-text-muted',
};

const sizeClasses = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2.5 w-2.5',
  lg: 'h-3.5 w-3.5',
};

export function StatusDot({
  status,
  pulse = false,
  label,
  size = 'md',
  className,
}: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-block rounded-full',
          statusColors[status],
          sizeClasses[size],
          pulse && 'animate-pulse',
        )}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm text-text-secondary">{label}</span>
      )}
    </span>
  );
}
