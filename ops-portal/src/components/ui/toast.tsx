'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore, type Toast } from '@/lib/store';

// ─── Icons ─────────────────────────────────────────────────────────────────

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const toastStyles = {
  success: {
    border: 'border-accent-success/30',
    bg: 'bg-accent-success/5',
    icon: 'text-accent-success',
  },
  error: {
    border: 'border-accent-danger/30',
    bg: 'bg-accent-danger/5',
    icon: 'text-accent-danger',
  },
  warning: {
    border: 'border-accent-warning/30',
    bg: 'bg-accent-warning/5',
    icon: 'text-accent-warning',
  },
  info: {
    border: 'border-accent-info/30',
    bg: 'bg-accent-info/5',
    icon: 'text-accent-info',
  },
} as const;

// ─── Single Toast Item ────────────────────────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useUIStore((s) => s.removeToast);
  const Icon = toastIcons[toast.type];
  const styles = toastStyles[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg',
        'animate-in slide-in-from-right-full fade-in',
        styles.border,
        styles.bg,
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', styles.icon)} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-text-secondary">{toast.description}</p>
        )}
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

// ─── Convenience hook ─────────────────────────────────────────────────────

export function useToast() {
  const addToast = useUIStore((s) => s.addToast);
  const removeToast = useUIStore((s) => s.removeToast);

  return {
    success: (title: string, description?: string, duration?: number) =>
      addToast({ type: 'success', title, description, duration }),
    error: (title: string, description?: string, duration?: number) =>
      addToast({ type: 'error', title, description, duration }),
    warning: (title: string, description?: string, duration?: number) =>
      addToast({ type: 'warning', title, description, duration }),
    info: (title: string, description?: string, duration?: number) =>
      addToast({ type: 'info', title, description, duration }),
    dismiss: removeToast,
  };
}
```Now let me continue creating the remaining files.
