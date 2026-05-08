"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircleFillIcon, InfoFillIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────

export type FeedbackType = "success" | "info";

interface FeedbackItem {
  id: number;
  message: string;
  type: FeedbackType;
  exiting: boolean;
}

// ─── Global emitter (internal, not exported) ──────────────────────────

let emitFeedback: ((message: string, type: FeedbackType) => void) | null = null;

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Show a calm, auto-dismissing feedback message.
 *
 * Use this after successful mutations to confirm what happened
 * without being intrusive (no aggressive toast colors or sounds).
 *
 * @param message - The feedback message (e.g., "Flag saved", "Segment created")
 * @param type - 'success' for green, 'info' for blue
 *
 * @example
 * ```ts
 * import { showFeedback } from "@/components/action-feedback";
 *
 * async function handleSave() {
 *   await saveFlag();
 *   showFeedback("Flag updated", "success");
 * }
 * ```
 */
export function showFeedback(message: string, type: FeedbackType = "success") {
  emitFeedback?.(message, type);
}

// ─── Style maps ────────────────────────────────────────────────────────

const styleMap: Record<FeedbackType, string> = {
  success:
    "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)] border-[var(--signal-border-success-muted)]",
  info: "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border-[var(--signal-border-accent-muted)]",
};

const iconMap: Record<FeedbackType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircleFillIcon,
  info: InfoFillIcon,
};

// ─── Component ─────────────────────────────────────────────────────────

/**
 * ActionFeedbackContainer — renders the floating feedback bar.
 *
 * Place this ONCE in the app layout, typically near the top of the main content area.
 * It renders a subtle, auto-dismissing bar at the top-center of the viewport.
 *
 * The feedback is intentionally calm — green for success, blue for info.
 * No red/error feedback is shown here (errors go through the existing toast system).
 *
 * Duration: 4000ms default, fades out over 300ms.
 */
export function ActionFeedbackContainer() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [counter, setCounter] = useState(0);

  const add = useCallback(
    (message: string, type: FeedbackType) => {
      const id = counter;
      setCounter((c) => c + 1);

      setItems((prev) => [...prev, { id, message, type, exiting: false }]);

      // Start exit animation after duration
      setTimeout(() => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, exiting: true } : item,
          ),
        );
        // Remove from DOM after exit animation completes
        setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== id));
        }, 300);
      }, 4000);
    },
    [counter],
  );

  useEffect(() => {
    emitFeedback = add;
    return () => {
      emitFeedback = null;
    };
  }, [add]);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1 pointer-events-none"
      aria-live="polite"
      aria-label="Action feedback"
    >
      {items.map((item) => {
        const Icon = iconMap[item.type];
        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300",
              styleMap[item.type],
              item.exiting
                ? "opacity-0 translate-y-2 scale-95"
                : "animate-fade-in",
            )}
            role="status"
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{item.message}</span>
          </div>
        );
      })}
    </div>
  );
}
