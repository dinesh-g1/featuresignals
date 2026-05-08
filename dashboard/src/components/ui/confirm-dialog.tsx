"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, Info } from "lucide-react";

type ConfirmVariant = "danger" | "warning" | "default";

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the dialog is closed without confirming */
  onClose: () => void;
  /** Called when the user confirms the action */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog description / body text */
  description?: string;
  /** Text for the confirm button */
  confirmLabel?: string;
  /** Text for the cancel button */
  cancelLabel?: string;
  /** Visual variant affecting button colors */
  variant?: ConfirmVariant;
  /** If set, the confirm button is disabled for this many seconds with a countdown */
  holdDuration?: number;
  /** Whether the confirm action is in progress */
  loading?: boolean;
  /** Additional body content */
  children?: React.ReactNode;
}

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    confirmVariant: "danger" | "primary" | "default";
    iconClass: string;
  }
> = {
  danger: {
    icon: ShieldAlert,
    confirmVariant: "danger",
    iconClass: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    confirmVariant: "primary",
    iconClass: "text-amber-500",
  },
  default: {
    icon: Info,
    confirmVariant: "primary",
    iconClass: "text-[var(--signal-fg-accent)]",
  },
};

/**
 * ConfirmDialog — reusable confirmation dialog for destructive or important actions.
 *
 * Features:
 * - Danger variant: red confirm button with shield icon
 * - Warning variant: amber confirm button with alert triangle
 * - Default variant: standard primary button
 * - holdDuration: requires holding/waiting N seconds before confirming
 * - Keyboard: Enter to confirm (when enabled), Escape to cancel
 * - Focus trap inside dialog (via Radix)
 * - Loading state support
 * - Animate in/out (via Radix Dialog)
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  holdDuration,
  loading = false,
  children,
}: ConfirmDialogProps) {
  const [countdown, setCountdown] = useState(holdDuration ?? 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset countdown when dialog opens or holdDuration changes
  useEffect(() => {
    if (open && holdDuration) {
      setCountdown(holdDuration);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(holdDuration ?? 0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, holdDuration]);

  const isConfirmDisabled = (holdDuration && countdown > 0) || loading || isProcessing;

  const handleConfirm = useCallback(async () => {
    if (isConfirmDisabled) return;
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  }, [isConfirmDisabled, onConfirm]);

  // Handle keyboard: Enter to confirm when enabled
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isConfirmDisabled) {
        e.preventDefault();
        handleConfirm();
      }
    },
    [handleConfirm, isConfirmDisabled],
  );

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-md"
        onKeyDown={handleKeyDown}
        aria-describedby={description ? "confirm-dialog-description" : undefined}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-secondary)]",
              )}
            >
              <Icon className={cn("h-5 w-5", config.iconClass)} aria-hidden="true" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription id="confirm-dialog-description">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children && <DialogBody>{children}</DialogBody>}

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading || isProcessing}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmVariant}
            size="sm"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            loading={loading || isProcessing}
          >
            {holdDuration && countdown > 0
              ? `${confirmLabel} (${countdown}s)`
              : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
