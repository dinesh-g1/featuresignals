"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ExternalLinkIcon } from "@/components/icons/nav-icons";

interface PageHeaderProps {
  title: string | ReactNode;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  docsUrl?: string;
  docsLabel?: string;
}

/**
 * PageHeader — consistent page heading block used across all pages.
 *
 * Provides a title, optional description, and an action slot (for buttons, toggles, etc.).
 * Compact variant for secondary/sub pages.
 */
export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
  compact,
  docsUrl,
  docsLabel = "Docs",
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3",
        compact ? "mb-5" : "mb-8",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1
          className={cn(
            "font-bold tracking-tight text-[var(--signal-fg-primary)]",
            compact ? "text-lg" : "text-2xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {(actions || children) && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
          {children}
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--signal-fg-tertiary)] transition-colors hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-accent)]"
              title={`${docsLabel} — opens in new tab`}
            >
              {docsLabel}
              <ExternalLinkIcon className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface PageHeaderTabsProps {
  tabs: { value: string; label: string; badge?: string | number }[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

/**
 * PageHeaderTabs — tab bar that sits directly below a PageHeader.
 * Uses teal underline for the active tab, matching the slide-over pattern.
 */
export function PageHeaderTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: PageHeaderTabsProps) {
  return (
    <div
      className={cn(
        "flex border-b border-[var(--signal-border-default)] -mx-6 px-6 mb-6 overflow-x-auto scrollbar-hide",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "relative flex items-center gap-1.5 py-3 px-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px",
            activeTab === tab.value
              ? "border-[var(--signal-fg-accent)] text-[var(--signal-fg-accent)]"
              : "border-transparent text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
          )}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                activeTab === tab.value
                  ? "bg-[var(--signal-bg-accent-emphasis)] text-white"
                  : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
              )}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?:
    | string
    | React.ComponentType<{ className?: string; strokeWidth?: number }>;
  color?: string;
  className?: string;
  tooltip?: string;
}

/**
 * StatCard — compact metric display card for overview pages.
 */
export function StatCard({
  label,
  value,
  change,
  trend,
  icon,
  className,
  tooltip,
}: StatCardProps) {
  const IconComponent = typeof icon === "function" ? icon : null;
  const emojiIcon = typeof icon === "string" ? icon : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--signal-border-default)] bg-white p-4 shadow-soft transition-all duration-200 hover:shadow-float",
        className,
      )}
      title={tooltip}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
          {label}
        </span>
        {emojiIcon && <span className="text-lg leading-none">{emojiIcon}</span>}
        {IconComponent && (
          <IconComponent className="h-5 w-5 text-[var(--signal-fg-tertiary)]" />
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-[var(--signal-fg-primary)] tracking-tight">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              "text-xs font-semibold mb-1",
              trend === "up" && "text-[var(--signal-fg-success)]",
              trend === "down" && "text-red-500",
              trend === "neutral" && "text-[var(--signal-fg-tertiary)]",
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
