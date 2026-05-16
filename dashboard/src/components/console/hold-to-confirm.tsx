"use client";

/**
 * HoldToConfirm — A button that requires continuous press for N milliseconds
 * before firing its action. Prevents accidental destructive actions
 * (shipping to production, deleting resources, etc.).
 *
 * Uses onPointerDown/onPointerUp (NOT click) to support mouse + touch.
 * Progress is rendered as a left-to-right fill via CSS linear-gradient
 * updated every ~50ms through requestAnimationFrame.
 *
 * Duration defaults are environment-aware:
 *   development: 0ms (instant — fires on pointerDown)
 *   staging:      1500ms
 *   production:   3000ms
 *
 * Visual states:
 *   Idle       — muted danger background, label centered
 *   Pressing   — danger-emphasis fill sweeps left→right
 *   Complete   — brief green flash (300ms), then onConfirm fires
 *   Cancelled  — returns to idle instantly
 *   Disabled   — 50% opacity, pointer-events-none
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { HOLD_DURATIONS } from "@/lib/console-constants";
import type { EnvironmentType } from "@/lib/console-types";

// ─── Types ───────────────────────────────────────────────────────────

export interface HoldToConfirmProps {
  /** Called when the hold duration completes successfully */
  onConfirm: () => void;
  /** Called when the hold is released before completion */
  onCancel?: () => void;
  /** Custom hold duration in ms. Falls back to HOLD_DURATIONS[environment] */
  durationMs?: number;
  /** Label shown on the button, e.g. "Hold to Ship" */
  label: string;
  /** Optional description shown below the label */
  description?: string;
  /** Environment determines color scheme and default duration */
  environment: EnvironmentType;
  /** When true, the button is non-interactive */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

// ─── Environment Color Map ───────────────────────────────────────────

const ENV_STYLES: Record<
  EnvironmentType,
  {
    emphasisBg: string;
    mutedBg: string;
    emphasisBorder: string;
    textEmphasis: string;
    successBg: string;
  }
> = {
  production: {
    emphasisBg: "var(--signal-bg-danger-emphasis)",
    mutedBg: "var(--signal-bg-danger-muted)",
    emphasisBorder: "var(--signal-border-danger-emphasis)",
    textEmphasis: "var(--signal-fg-on-emphasis)",
    successBg: "var(--signal-bg-success-emphasis)",
  },
  staging: {
    emphasisBg: "var(--signal-bg-warning-emphasis)",
    mutedBg: "var(--signal-bg-warning-muted)",
    emphasisBorder: "var(--signal-border-warning-emphasis)",
    textEmphasis: "var(--signal-fg-on-emphasis)",
    successBg: "var(--signal-bg-success-emphasis)",
  },
  development: {
    emphasisBg: "var(--signal-bg-accent-emphasis)",
    mutedBg: "var(--signal-bg-accent-muted)",
    emphasisBorder: "var(--signal-border-accent-emphasis)",
    textEmphasis: "var(--signal-fg-on-emphasis)",
    successBg: "var(--signal-bg-success-emphasis)",
  },
};

// ─── Component ───────────────────────────────────────────────────────

export function HoldToConfirm({
  onConfirm,
  onCancel,
  durationMs,
  label,
  description,
  environment,
  disabled = false,
  className,
}: HoldToConfirmProps) {
  const resolvedDuration = durationMs ?? HOLD_DURATIONS[environment] ?? 1500;
  const isInstant = resolvedDuration === 0;

  const [phase, setPhase] = useState<
    "idle" | "pressing" | "complete" | "success"
  >("idle");
  const [progress, setProgress] = useState(0); // 0–100

  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const confirmFiredRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const updateProgressRef = useRef<() => void>(() => {});

  const styles = ENV_STYLES[environment];

  // ── Cancel (cleanup) ───────────────────────────────────────────────

  const cancel = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setProgress(0);
    setPhase("idle");
    onCancel?.();
  }, [onCancel]);

  // ── Fire confirm ───────────────────────────────────────────────────

  const fireConfirm = useCallback(() => {
    if (confirmFiredRef.current) return;
    confirmFiredRef.current = true;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    setPhase("success");
    setProgress(100);

    // Brief success flash then call onConfirm
    setTimeout(() => {
      onConfirm();
      // Reset after a short delay so parent can unmount if needed
      setTimeout(() => {
        confirmFiredRef.current = false;
        setPhase("idle");
        setProgress(0);
      }, 100);
    }, 300);
  }, [onConfirm]);

  // ── Animation loop ─────────────────────────────────────────────────

  const updateProgress = useCallback(() => {
    if (!startTimeRef.current) return;
    const elapsed = performance.now() - startTimeRef.current;
    const pct = Math.min((elapsed / resolvedDuration) * 100, 100);
    setProgress(pct);

    if (pct >= 100) {
      setPhase("complete");
      fireConfirm();
    } else {
      rafRef.current = requestAnimationFrame(() => updateProgressRef.current());
    }
  }, [resolvedDuration, fireConfirm]);

  // Keep ref in sync so the RAF loop always calls the latest callback
  updateProgressRef.current = updateProgress;

  // ── Pointer handlers ───────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled || phase !== "idle") return;

      // Capture pointer so we receive pointerUp even if pointer leaves button
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      if (isInstant) {
        // Instant: fire immediately
        fireConfirm();
        return;
      }

      startTimeRef.current = performance.now();
      setProgress(0);
      setPhase("pressing");
      rafRef.current = requestAnimationFrame(updateProgress);
    },
    [disabled, phase, isInstant, fireConfirm, updateProgress],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (isInstant) return; // Already fired on pointerDown

      if (phase === "pressing") {
        cancel();
      }
    },
    [isInstant, phase, cancel],
  );

  // ── Keyboard support: Enter / Space must also hold ─────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled || phase !== "idle") return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();

      if (isInstant) {
        fireConfirm();
        return;
      }

      startTimeRef.current = performance.now();
      setProgress(0);
      setPhase("pressing");
      rafRef.current = requestAnimationFrame(updateProgress);
    },
    [disabled, phase, isInstant, fireConfirm, updateProgress],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();

      if (isInstant) return;

      if (phase === "pressing") {
        cancel();
      }
    },
    [isInstant, phase, cancel],
  );

  // ── Cleanup on unmount ─────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // ── Derived values ─────────────────────────────────────────────────

  const isPressing = phase === "pressing";
  const isSuccess = phase === "success";
  const isComplete = phase === "complete";
  // Compute the fill gradient
  const fillGradient =
    isPressing || isComplete || isSuccess
      ? `linear-gradient(to right, ${styles.emphasisBg} ${progress}%, ${styles.mutedBg} ${progress}%)`
      : undefined;

  // Label shown during hold
  const displayLabel = isSuccess
    ? "Shipped \u2714"
    : isInstant
      ? label
      : isPressing
        ? `Hold to ${label.replace("Hold to ", "")}...`
        : label;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onContextMenu={(e) => {
          // Prevent context menu during long press
          if (isPressing) e.preventDefault();
        }}
        style={{
          background:
            fillGradient ?? (isSuccess ? styles.successBg : styles.mutedBg),
          borderColor: isSuccess
            ? "var(--signal-border-success-emphasis)"
            : isPressing
              ? styles.emphasisBorder
              : "var(--signal-border-default)",
          color: isSuccess
            ? "var(--signal-fg-on-emphasis)"
            : isPressing
              ? styles.textEmphasis
              : "var(--signal-fg-primary)",
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--signal-radius-md)]",
          "h-11 px-4 py-2.5",
          "text-sm font-semibold leading-none",
          "border",
          "transition-colors duration-[var(--signal-duration-fast)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-fg-accent)]",
          "select-none touch-none",
          disabled && "cursor-not-allowed",
          !disabled && "cursor-pointer",
        )}
        aria-label={label}
        aria-busy={isPressing}
      >
        {/* Progress bar overlay — thin line at the top of the button */}
        {isPressing && (
          <motion.div
            className="absolute top-0 left-0 h-[3px] rounded-t-[var(--signal-radius-md)]"
            style={{ backgroundColor: styles.emphasisBg }}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: "linear" }}
          />
        )}

        <span className="relative z-10 flex items-center justify-center gap-2">
          {isPressing && (
            <span
              className="text-xs font-mono tabular-nums opacity-80"
              aria-hidden="true"
            >
              {Math.ceil(
                (resolvedDuration - (progress / 100) * resolvedDuration) / 1000,
              )}
              s
            </span>
          )}
          {displayLabel}
        </span>
      </button>

      {/* Description */}
      <AnimatePresence mode="wait">
        {description && !isSuccess && (
          <motion.p
            key="desc"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-center text-[var(--signal-fg-secondary)]"
          >
            {description}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
