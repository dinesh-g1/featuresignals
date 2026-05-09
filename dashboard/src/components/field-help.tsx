"use client";

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { HelpCircleIcon } from "@/components/icons/nav-icons";
import { DOCS_LINKS } from "@/components/docs-link";
import { openDocsPanel } from "@/components/docs-panel";
import { useDocs } from "@/contexts/docs-context";
import { DOCS_URL } from "@/lib/external-urls";

interface FieldHelpProps {
  /**
   * Key into the DOCS_LINKS map. Determines which documentation URL
   * the DocsPanel will highlight when this help icon is clicked.
   *
   * When `docSlug` is also provided, `docsKey` is ignored — the
   * direct slug approach takes precedence.
   */
  docsKey?: keyof typeof DOCS_LINKS;
  /**
   * Optional human-readable label for the tooltip.
   * Defaults to the docsKey if not provided.
   * The tooltip text becomes: "Learn more about {label}"
   */
  label?: string;
  /** Additional class for the wrapper span */
  className?: string;
  /**
   * Direct documentation slug (e.g. "core-concepts/toggle-categories").
   * When provided, clicking opens the DocsPanel via DocsContext (or
   * falls back to opening a new tab if no context is available).
   */
  docSlug?: string;
  /**
   * Optional heading ID to scroll to within the documentation page
   * (e.g. "flag-types"). Only used when `docSlug` is provided.
   */
  docSection?: string;
}

/**
 * FieldHelp — A subtle "?" or book icon button placed next to form fields.
 *
 * Two modes of operation:
 * 1. **Direct slug mode** (preferred): When `docSlug` is provided, shows a
 *    book icon. Clicking opens the DocsPanel via DocsContext, or falls back
 *    to opening `DOCS_URL/slug#section` in a new tab.
 * 2. **Legacy docsKey mode**: When only `docsKey` is provided (no `docSlug`),
 *    shows a "?" icon and uses the existing DocsPanel global trigger.
 *
 * Accessible: keyboard-focusable, includes aria-label, and uses
 * the Signal UI design tokens for colors.
 */
export function FieldHelp({
  docsKey,
  label,
  className,
  docSlug,
  docSection,
}: FieldHelpProps) {
  const docs = useDocs();

  // ── Direct slug mode ──────────────────────────────────────────────
  if (docSlug) {
    const tooltipLabel = label ?? docSlug.split("/").pop() ?? docSlug;

    const handleOpenDoc = () => {
      if (docs) {
        docs.openDoc(docSlug, docSection);
      } else {
        // Graceful fallback: open in new tab when DocsProvider is absent
        const url = `${DOCS_URL}/${docSlug}${docSection ? `#${docSection}` : ""}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    };

    return (
      <span className={cn("relative inline-flex items-center", className)}>
        <button
          type="button"
          onClick={handleOpenDoc}
          aria-label={`Learn more about ${tooltipLabel}`}
          className={cn(
            "group/field-help inline-flex h-5 w-5 shrink-0 items-center justify-center",
            "rounded-full transition-colors",
            "text-[var(--signal-fg-tertiary)]",
            "hover:text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)]",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
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

  // ── Legacy docsKey mode ───────────────────────────────────────────
  if (!docsKey) {
    // Neither docSlug nor docsKey provided — render nothing
    return null;
  }

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
