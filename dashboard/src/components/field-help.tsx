"use client";

import { cn } from "@/lib/utils";
import { HelpCircleIcon } from "@/components/icons/nav-icons";
import { DOCS_LINKS } from "@/components/docs-link";
import { openDocsPanel } from "@/components/docs-panel";

interface FieldHelpProps {
  /**
   * Key into the DOCS_LINKS map. Determines which documentation URL
   * the DocsPanel will highlight when this help icon is clicked.
   */
  docsKey: keyof typeof DOCS_LINKS;
  /**
   * Optional human-readable label for the tooltip.
   * Defaults to the docsKey if not provided.
   * The tooltip text becomes: "Learn more about {label}"
   */
  label?: string;
  /** Additional class for the wrapper span */
  className?: string;
}

/**
 * FieldHelp — A subtle "?" icon button placed next to form fields.
 *
 * When clicked, it opens the documentation slide-in panel (DocsPanel)
 * with the relevant documentation URL highlighted at the top.
 *
 * Accessible: keyboard-focusable, includes aria-label, and uses
 * the Signal UI design tokens for colors.
 */
export function FieldHelp({ docsKey, label, className }: FieldHelpProps) {
  const docsUrl = DOCS_LINKS[docsKey];
  const tooltipLabel = label ?? docsKey;

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        onClick={() => openDocsPanel(docsUrl)}
        aria-label={`Learn more about ${tooltipLabel}`}
        className={cn(
          "group/field-help inline-flex h-5 w-5 shrink-0 items-center justify-center",
          "rounded-full transition-colors",
          "text-[var(--signal-fg-tertiary)]",
          "hover:text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)]",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
        )}
      >
        <HelpCircleIcon className="h-3.5 w-3.5" />
      </button>

      {/* Tooltip on hover — pure CSS, no dependency */}
      <span
        role="tooltip"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2",
          "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs leading-none",
          "bg-[var(--signal-bg-inverse)] text-[var(--signal-fg-on-emphasis)]",
          "opacity-0 transition-opacity duration-150",
          "group-hover/field-help:opacity-100 group-focus-visible/field-help:opacity-100",
          "shadow-lg",
        )}
      >
        Learn more about {tooltipLabel}
        {/* Arrow */}
        <span
          className={cn(
            "absolute left-1/2 top-full -translate-x-1/2",
            "border-4 border-transparent border-t-[var(--signal-bg-inverse)]",
          )}
        />
      </span>
    </span>
  );
}
