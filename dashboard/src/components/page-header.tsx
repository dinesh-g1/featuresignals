"use client";

import { type ReactNode } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { cn } from "@/lib/utils";
import { InfoIcon, ExternalLinkIcon } from "@/components/icons/nav-icons";

// ─── Types ────────────────────────────────────────────────────────────

export interface BreadcrumbLink {
  label: string;
  href: string;
}

export interface PageHeaderProps {
  /** Primary page title (the answer to "Where am I?") */
  title: string | ReactNode;
  /** Optional description explaining the page's purpose */
  description?: string;
  /**
   * Optional breadcrumb override. When provided, these links are rendered
   * above the title instead of the auto-detected route breadcrumb.
   * Useful for detail pages where the breadcrumb needs custom labels.
   */
  breadcrumb?: BreadcrumbLink[];
  /**
   * Primary call-to-action. This is the main thing the user can do on this page.
   * When omitted, a subtle hint is shown to guide the user.
   */
  primaryAction?: ReactNode;
  /**
   * Secondary actions (e.g., "Import", "Export", "Settings").
   * Rendered after the primary action with reduced emphasis.
   */
  secondaryActions?: ReactNode;
  /**
   * Status badge — shows contextual state (e.g., "Production", "Draft", "12 flags").
   * Rendered inline next to the title.
   */
  statusBadge?: ReactNode;
  /** Documentation link (rendered as a subtle docs badge) */
  docsUrl?: string;
  /** Label for the docs link */
  docsLabel?: string;
  /** Additional content below the header (e.g., tabs, filters) */
  children?: ReactNode;
  /** Additional class names */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────

/**
 * PageHeader — enforces the "Three Questions" pattern.
 *
 * Every page must instantly answer:
 * 1. **Where am I?** — Breadcrumb + title + description + status badge
 * 2. **What can I do here?** — Primary action + secondary actions (or a subtle hint)
 * 3. **What happened?** — (handled by ActionFeedback, triggered after mutations)
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Feature Flags"
 *   description="Manage and activate/pause your features across environments"
 *   primaryAction={<Button onClick={create}>Create Flag</Button>}
 *   secondaryActions={<Button variant="ghost">Import</Button>}
 *   statusBadge={<Badge>12 flags</Badge>}
 *   docsUrl="https://featuresignals.com/docs/flags"
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  primaryAction,
  secondaryActions,
  statusBadge,
  docsUrl,
  docsLabel = "Docs",
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Breadcrumb — answers "Where am I?" */}
      {breadcrumb ? (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
          {breadcrumb.map((link, idx) => {
            const isLast = idx === breadcrumb.length - 1;
            return (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && (
                  <span className="text-[var(--signal-fg-tertiary)] select-none">
                    /
                  </span>
                )}
                {!isLast ? (
                  <a
                    href={link.href}
                    className="text-sm text-[var(--signal-fg-secondary)] transition-colors hover:text-[var(--signal-fg-primary)] hover:underline underline-offset-2"
                  >
                    {link.label}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                    {link.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      ) : (
        <Breadcrumb />
      )}

      {/* Title row — title + status badge + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
              {title}
            </h1>
            {statusBadge && (
              <span className="shrink-0">{statusBadge}</span>
            )}
          </div>
          {description && (
            <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed max-w-2xl">
              {description}
            </p>
          )}

          {/* Subtle hint when no primary action is provided */}
          {!primaryAction && !secondaryActions && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--signal-fg-tertiary)] mt-1 animate-fade-in">
              <InfoIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                This page provides an overview. Use the navigation or select an
                item to take action.
              </span>
            </p>
          )}
        </div>

        {/* Actions */}
        {(primaryAction || secondaryActions || docsUrl) && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {secondaryActions}
            {primaryAction}
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--signal-fg-tertiary)] transition-colors hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-accent)]"
                title={`${docsLabel} — opens in new tab`}
              >
                {docsLabel}
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Additional content (tabs, filters, etc.) */}
      {children}
    </div>
  );
}
