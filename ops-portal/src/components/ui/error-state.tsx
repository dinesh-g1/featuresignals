import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 gap-3' : 'py-16 gap-4',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-accent-danger/10',
          compact ? 'h-10 w-10' : 'h-14 w-14',
        )}
      >
        <AlertTriangle
          className={cn(
            'text-accent-danger',
            compact ? 'h-5 w-5' : 'h-7 w-7',
          )}
          aria-hidden="true"
        />
      </div>

      <div className="space-y-1.5">
        <h3
          className={cn(
            'font-semibold text-text-primary',
            compact ? 'text-sm' : 'text-lg',
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'text-text-secondary max-w-md',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {message}
        </p>
      </div>

      {onRetry && (
        <Button
          variant="secondary"
          size={compact ? 'sm' : 'md'}
          onClick={onRetry}
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
