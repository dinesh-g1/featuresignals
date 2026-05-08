"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface UnderlineNavTab {
  value: string;
  label: string;
  href: string;
  count?: number;
}

interface UnderlineNavProps {
  tabs: UnderlineNavTab[];
  activeTab: string;
  className?: string;
}

/**
 * UnderlineNav — sub-tab navigation with active indicator.
 *
 * Active tab has a 2px solid bottom border in accent color.
 * Each tab IS a Link — URL changes.
 * Gap: 16px, padding: 12px 8px.
 */
export function UnderlineNav({
  tabs,
  activeTab,
  className,
}: UnderlineNavProps) {
  return (
    <nav
      className={cn(
        "flex border-b border-[var(--signal-border-default)] overflow-x-auto scrollbar-hide",
        className,
      )}
      aria-label="Sub-navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={tab.href}
            className={cn(
              "relative flex items-center gap-1.5 px-2 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-100",
              isActive
                ? "text-[var(--signal-fg-primary)]"
                : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  isActive
                    ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]"
                    : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                )}
              >
                {tab.count > 99 ? "99+" : tab.count}
              </span>
            )}
            {/* Active indicator — 2px solid bottom border */}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--signal-bg-accent-emphasis)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
