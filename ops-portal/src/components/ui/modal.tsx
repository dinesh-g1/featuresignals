'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal's open state changes */
  onOpenChange: (open: boolean) => void;
  /** Modal title (required for accessibility) */
  title: string;
  /** Optional description */
  description?: string;
  /** Modal content (children) */
  children: React.ReactNode;
  /** Cancel button label */
  cancelLabel?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Called when the confirm action is triggered */
  onConfirm?: () => void;
  /** Called when the cancel action is triggered */
  onCancel?: () => void;
  /** Whether the confirm action is loading */
  loading?: boolean;
  /** Whether to show a destructive (danger) variant for the confirm button */
  destructive?: boolean;
  /** Disable the confirm button */
  confirmDisabled?: boolean;
  /** Hide the footer with action buttons */
  hideFooter?: boolean;
  /** Modal width variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Optional class name for the content */
  className?: string;
}

// ─── Size Classes ─────────────────────────────────────────────────────────

const sizeClasses: Record<string, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  full: 'sm:max-w-[90vw]',
};

// ─── Modal Component ─────────────────────────────────────────────────────

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  loading = false,
  destructive = false,
  confirmDisabled = false,
  hideFooter = false,
  size = 'md',
  className,
}: ModalProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content */}
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border-default bg-bg-secondary p-0 shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'focus:outline-none',
            sizeClasses[size],
            className,
          )}
          onEscapeKeyDown={() => {
            if (!loading) onOpenChange(false);
          }}
          aria-describedby={description ? undefined : undefined}
        >
          {/* Close button */}
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-sm p-1 text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:pointer-events-none"
              disabled={loading}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>

          {/* Header */}
          <div className="border-b border-border-default px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="mt-1 text-sm text-text-secondary">
                {description}
              </Dialog.Description>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-6 py-4 max-h-[60vh]">
            {children}
          </div>

          {/* Footer */}
          {!hideFooter && (
            <div className="flex items-center justify-end gap-3 border-t border-border-default px-6 py-4">
              <Button
                variant="secondary"
                size="md"
                onClick={handleCancel}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              {onConfirm && (
                <Button
                  variant={destructive ? 'danger' : 'primary'}
                  size="md"
                  onClick={onConfirm}
                  loading={loading}
                  disabled={confirmDisabled}
                >
                  {confirmLabel}
                </Button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Convenience trigger component ───────────────────────────────────────

interface ModalTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function ModalTrigger({ children, asChild = true }: ModalTriggerProps) {
  return (
    <Dialog.Trigger asChild={asChild}>
      {children}
    </Dialog.Trigger>
  );
}

// ─── Convenience close component ─────────────────────────────────────────

interface ModalCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function ModalClose({ children, asChild = true }: ModalCloseProps) {
  return (
    <Dialog.Close asChild={asChild}>
      {children}
    </Dialog.Close>
  );
}
