'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog's open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title (default: "Are you sure?") */
  title?: string;
  /** Main confirmation message */
  message: string;
  /** Additional details shown below the message */
  details?: string;
  /** The name of the resource being acted upon */
  resourceName: string;
  /** The label for the resource type (e.g., "tenant", "preview", "backup") */
  resourceType?: string;
  /** Whether confirmation (typing the name) is required */
  requireConfirmation?: boolean;
  /** Label to type for confirmation */
  confirmationLabel?: string;
  /** Confirm button label (default: "Delete" / "Deprovision") */
  confirmLabel?: string;
  /** Cancel button label (default: "Cancel") */
  cancelLabel?: string;
  /** Called when confirmed */
  onConfirm: () => void;
  /** Called when cancelled */
  onCancel?: () => void;
  /** Whether the confirm action is loading */
  loading?: boolean;
  /** Custom danger variant override */
  variant?: 'danger' | 'warning';
}

// ─── Component ────────────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  details,
  resourceName,
  resourceType = 'resource',
  requireConfirmation = true,
  confirmationLabel,
  confirmLabel = 'Deprovision',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  const [typedName, setTypedName] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset typed name when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setTypedName('');
      // Focus the input after a brief delay for animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const isConfirmed = !requireConfirmation || typedName === resourceName;

  const handleConfirm = () => {
    if (!isConfirmed) return;
    onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const displayTitle =
    title ??
    (variant === 'danger' ? `Deprovision ${resourceType}` : `Warning`);

  const displayConfirmLabel =
    confirmLabel ??
    (variant === 'danger' ? `Deprovision` : `Confirm`);

  const displayConfirmationLabel =
    confirmationLabel ??
    `Type "${resourceName}" to confirm`;

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleCancel();
      }}
      title={displayTitle}
      description={message}
      confirmLabel={displayConfirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      loading={loading}
      destructive={variant === 'danger'}
      confirmDisabled={!isConfirmed}
      size="sm"
    >
      <div className="space-y-4">
        {details && (
          <p className="text-sm text-text-secondary">{details}</p>
        )}

        {requireConfirmation && (
          <div>
            <label
              htmlFor="confirm-input"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              {displayConfirmationLabel}
            </label>
            <Input
              ref={inputRef}
              id="confirm-input"
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={resourceName}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'font-mono text-sm',
                typedName && typedName !== resourceName && 'border-accent-danger focus-visible:ring-accent-danger',
                typedName === resourceName && 'border-accent-success/50 focus-visible:ring-accent-success',
              )}
            />
            {typedName && typedName !== resourceName && (
              <p className="mt-1.5 text-xs text-accent-danger" role="alert">
                Name does not match. Please type the exact resource name.
              </p>
            )}
          </div>
        )}

        {variant === 'danger' && (
          <div className="rounded-lg bg-accent-danger/5 border border-accent-danger/20 p-3">
            <p className="text-xs text-accent-danger">
              <strong>Warning:</strong> This action cannot be undone. All data
              associated with this {resourceType} will be permanently removed.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Convenience hook for managing dialog state ───────────────────────────

export function useConfirmDialog() {
  const [open, setOpen] = React.useState(false);

  const openDialog = React.useCallback(() => setOpen(true), []);
  const closeDialog = React.useCallback(() => setOpen(false), []);

  return {
    open,
    setOpen,
    openDialog,
    closeDialog,
    dialogProps: {
      open,
      onOpenChange: setOpen,
    } as const,
  };
}
