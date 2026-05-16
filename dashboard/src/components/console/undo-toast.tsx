"use client";

/**
 * UndoToast — Toast notification system for undoable actions in the Console.
 *
 * Architecture:
 *   Module-level event emitter pattern (no store modification needed).
 *   Any component can call `showUndoToast(message, onUndo, durationMs)`.
 *
 * Rendering:
 *   <UndoToastContainer /> is wired into ConsoleShell at a fixed position
 *   (bottom-center, 16px above the bottom bar). Toasts stack vertically,
 *   newest at the bottom, max 3 visible.
 *
 * Each toast:
 *   ✅ Check icon (green) + message | [Undo] button (accent) + [✕] dismiss
 *   Animate in: slide up + fade (300ms ease-out)
 *   Animate out: slide down + fade (200ms ease-in)
 *   Auto-dismiss after durationMs (default 5000ms)
 *
 * Design tokens only. Zero hardcoded colors.
 */

import { useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

export interface UndoToast {
  id: string;
  message: string;
  onUndo: () => void;
  durationMs: number;
}

// ─── Module-level state (singleton) ──────────────────────────────────

let currentToasts: UndoToast[] = [];
const MAX_VISIBLE = 3;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Show an undo toast. Returns the toast ID for programmatic dismissal.
 *
 * @param message   - The toast message, e.g. "Dark mode is now LIVE."
 * @param onUndo    - Callback that reverts the action
 * @param durationMs - Auto-dismiss timeout in ms (default 5000)
 * @returns The toast ID
 */
export function showUndoToast(
  message: string,
  onUndo: () => void,
  durationMs = 5000,
): string {
  const id = generateId();
  const toast: UndoToast = { id, message, onUndo, durationMs };

  currentToasts = [...currentToasts, toast];
  notifyListeners();

  // Auto-dismiss after duration
  if (durationMs > 0) {
    setTimeout(() => {
      dismissUndoToast(id);
    }, durationMs);
  }

  return id;
}

/**
 * Dismiss a specific toast by ID.
 */
export function dismissUndoToast(id: string): void {
  const existed = currentToasts.some((t) => t.id === id);
  if (!existed) return;

  currentToasts = currentToasts.filter((t) => t.id !== id);
  notifyListeners();
}

/**
 * Dismiss all visible toasts.
 */
export function dismissAllUndoToasts(): void {
  if (currentToasts.length === 0) return;
  currentToasts = [];
  notifyListeners();
}

// ─── Subscriber hook ─────────────────────────────────────────────────

function subscribeToToasts(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): UndoToast[] {
  return currentToasts;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Toast Item Component ────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
  onUndo,
  index: _index,
  total: _total,
}: {
  toast: UndoToast;
  onDismiss: (id: string) => void;
  onUndo: (toast: UndoToast) => void;
  index: number;
  total: number;
}) {
  const handleUndo = useCallback(() => {
    onUndo(toast);
  }, [toast, onUndo]);

  const handleDismiss = useCallback(() => {
    onDismiss(toast.id);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        "rounded-[var(--signal-radius-lg)]",
        "bg-[var(--signal-bg-primary)]",
        "border border-[var(--signal-border-default)]",
        "shadow-[var(--signal-shadow-lg)]",
        "min-w-[360px] max-w-[480px]",
      )}
      role="status"
      aria-live="polite"
    >
      {/* Left: Check icon */}
      <CheckCircle2
        className="h-4 w-4 shrink-0 text-[var(--signal-fg-success)]"
        aria-hidden="true"
      />

      {/* Center: Message */}
      <span className="flex-1 text-sm text-[var(--signal-fg-primary)] leading-snug">
        {toast.message}
      </span>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Undo button */}
        <button
          type="button"
          onClick={handleUndo}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1",
            "text-xs font-semibold",
            "text-[var(--signal-fg-accent)]",
            "hover:bg-[var(--signal-bg-accent-muted)]",
            "rounded-[var(--signal-radius-sm)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
          )}
        >
          <Undo2 className="h-3 w-3" aria-hidden="true" />
          Undo
        </button>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            "inline-flex items-center justify-center h-6 w-6",
            "text-[var(--signal-fg-secondary)]",
            "hover:text-[var(--signal-fg-primary)]",
            "hover:bg-[var(--signal-bg-secondary)]",
            "rounded-[var(--signal-radius-sm)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
          )}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Toast Container Component ───────────────────────────────────────

/**
 * Renders all active undo toasts at a fixed position above the bottom bar.
 *
 * Wire this into ConsoleShell:
 *   <UndoToastContainer />
 *
 * It self-manages subscriptions — no props needed.
 */
export function UndoToastContainer() {
  const toasts = useSyncExternalStore(
    subscribeToToasts,
    getSnapshot,
    getSnapshot,
  );

  // Limit visible toasts (newest at bottom = end of array)
  const visibleToasts = toasts.slice(-MAX_VISIBLE);

  const handleDismiss = useCallback((id: string) => {
    dismissUndoToast(id);
  }, []);

  const handleUndo = useCallback((toast: UndoToast) => {
    // Dismiss first, then fire undo
    dismissUndoToast(toast.id);
    // Small delay to let dismiss animate, then revert
    setTimeout(() => {
      toast.onUndo();
    }, 150);
  }, []);

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50",
        "flex flex-col-reverse items-center gap-2",
        "pointer-events-none",
      )}
      style={{ bottom: "48px" }}
      aria-label="Undoable actions"
    >
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast, i) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem
              toast={toast}
              onDismiss={handleDismiss}
              onUndo={handleUndo}
              index={i}
              total={visibleToasts.length}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
