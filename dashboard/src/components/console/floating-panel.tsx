"use client";

/**
 * FloatingPanel — absolutely positioned overlay panel triggered by IconRail.
 *
 * Renders a floating card anchored to the left side of the canvas area.
 * Slides in/out with a transition. Click-outside dismisses.
 *
 * Props:
 *   title    — panel header text
 *   open     — whether the panel is visible
 *   onClose  — callback to dismiss the panel
 *   children — panel content
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface FloatingPanelProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FloatingPanel({
  title,
  open,
  onClose,
  children,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "absolute left-3 top-3 bottom-3 w-80 z-30",
        "bg-[var(--signal-bg-primary)] border border-[var(--signal-border-subtle)]",
        "rounded-lg shadow-lg",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-left-2 fade-in duration-150",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between shrink-0 px-3 py-2",
          "border-b border-[var(--signal-border-subtle)]",
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "p-1 rounded hover:bg-[var(--signal-bg-secondary)]",
            "text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)]",
          )}
          aria-label={`Close ${title} panel`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
