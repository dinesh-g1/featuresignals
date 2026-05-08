"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/icons/nav-icons";

interface ProgressiveDisclosureProps {
  /** Label for the toggle, e.g. "Advanced options" */
  label: string;
  /** Optional description shown when collapsed */
  description?: string;
  /** Whether the section is expanded on first render */
  defaultExpanded?: boolean;
  /** Optional localStorage key for persisting state across sessions */
  storageKey?: string;
  /** The content to show/hide */
  children: React.ReactNode;
  /** Additional class for the wrapper */
  className?: string;
}

/**
 * ProgressiveDisclosure — A collapsible section for advanced options.
 *
 * Shows a chevron toggle with label and optional description.
 * The section can be expanded/collapsed with a smooth height animation.
 * State is optionally persisted to localStorage per-section.
 */
export function ProgressiveDisclosure({
  label,
  description,
  defaultExpanded = false,
  storageKey,
  children,
  className,
}: ProgressiveDisclosureProps) {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return defaultExpanded;
    if (storageKey) {
      const stored = localStorage.getItem(`fs-disclosure-${storageKey}`);
      if (stored !== null) return stored === "true";
    }
    return defaultExpanded;
  });

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      if (storageKey) {
        localStorage.setItem(`fs-disclosure-${storageKey}`, String(next));
      }
      return next;
    });
  }

  const sectionId = `disclosure-${(storageKey ?? label).replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--signal-border-default)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          "hover:bg-[var(--signal-bg-secondary)]",
          "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--signal-fg-accent)]",
        )}
        aria-expanded={expanded}
        aria-controls={sectionId}
      >
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)] transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
            {label}
          </span>
          {description && !expanded && (
            <span className="ml-2 text-xs text-[var(--signal-fg-tertiary)]">
              {description}
            </span>
          )}
        </div>
      </button>

      <div
        id={sectionId}
        role="region"
        aria-hidden={!expanded}
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="border-t border-[var(--signal-border-default)] px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  );
}
