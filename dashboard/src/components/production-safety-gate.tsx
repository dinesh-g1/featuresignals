"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { ShieldIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────

interface ProductionSafetyGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  flagName: string;
  flagKey: string;
  /** Whether we're enabling or disabling */
  action: "enable" | "disable";
}

// ─── Countdown constants ────────────────────────────────────────────

const COUNTDOWN_SECONDS = 3;

// ─── Component ──────────────────────────────────────────────────────

export function ProductionSafetyGate({
  open,
  onOpenChange,
  onConfirm,
  flagName,
  flagKey,
  action,
}: ProductionSafetyGateProps) {
  const [checked, setChecked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [countdownComplete, setCountdownComplete] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setChecked(false);
      setProgress(0);
      setCountdownComplete(false);
      startTimeRef.current = null;
    }
  }, [open]);

  // Progress bar animation: starts when dialog opens
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / (COUNTDOWN_SECONDS * 1000), 1);
      setProgress(pct);

      if (pct >= 1) {
        setCountdownComplete(true);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [open]);

  // Keyboard shortcut: Escape to cancel
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
      // Enter to confirm when conditions met
      if (e.key === "Enter" && checked && countdownComplete) {
        e.preventDefault();
        onConfirm();
        onOpenChange(false);
      }
    },
    [checked, countdownComplete, onConfirm, onOpenChange],
  );

  const canConfirm = checked && countdownComplete;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onKeyDown={handleKeyDown}
        aria-describedby="safety-gate-description"
      >
        {/* Header with warning */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ShieldIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                {action === "enable" ? "Enable" : "Disable"} flag in Production
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                This action will affect real users immediately
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          <div id="safety-gate-description" className="space-y-4">
            {/* Flag identity */}
            <div className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] px-3 py-2.5">
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)] truncate">
                {flagName}
              </p>
              <code className="mt-0.5 block text-xs font-mono text-[var(--signal-fg-secondary)] select-all">
                {flagKey}
              </code>
            </div>

            {/* Countdown progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[var(--signal-fg-secondary)]">
                <span>
                  {countdownComplete
                    ? "Ready to confirm"
                    : `Please wait ${COUNTDOWN_SECONDS - Math.floor(progress * COUNTDOWN_SECONDS)}s...`}
                </span>
                <span className="font-mono tabular-nums">
                  {Math.floor(progress * 100)}%
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--signal-border-default)]"
                role="progressbar"
                aria-valuenow={Math.floor(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Countdown: ${Math.floor(progress * 100)}%`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-[50ms] linear",
                    countdownComplete ? "bg-emerald-500" : "bg-amber-500",
                  )}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex cursor-pointer items-start gap-3 select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                disabled={!countdownComplete}
                className={cn(
                  "mt-0.5 h-4 w-4 rounded border-[var(--signal-border-default)] text-[var(--signal-fg-accent)]",
                  "focus:ring-2 focus:ring-[var(--signal-fg-accent)]/30",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <span
                className={cn(
                  "text-sm leading-relaxed",
                  countdownComplete
                    ? "text-[var(--signal-fg-primary)]"
                    : "text-[var(--signal-fg-tertiary)]",
                )}
              >
                I understand the impact —{" "}
                <strong>
                  {action === "enable" ? "enabling" : "disabling"}
                </strong>{" "}
                this flag will immediately{" "}
                {action === "enable"
                  ? "expose this feature to real users"
                  : "remove this feature from real users"}{" "}
                in production
              </span>
            </label>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={!canConfirm}
            className="flex-1"
          >
            {action === "enable" ? "Enable" : "Disable"} Flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
