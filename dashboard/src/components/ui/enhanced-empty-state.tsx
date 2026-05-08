"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { Rocket, Search, Archive, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateVariant =
  | "no-flags"
  | "no-search-results"
  | "all-archived"
  | "no-data";
type EmptyStateIconType = "rocket" | "search" | "archive" | "folder";

interface EnhancedEmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: React.ComponentType<{ className?: string }>;
  emoji?: string;
  title: string | React.ReactNode;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreateFlag?: () => void;
  onViewArchived?: () => void;
  className?: string;
}

const iconMap: Record<
  EmptyStateIconType,
  React.ComponentType<{ className?: string }>
> = {
  rocket: Rocket,
  search: Search,
  archive: Archive,
  folder: FolderOpen,
};

const emojiMap: Record<EmptyStateVariant, string> = {
  "no-flags": "🚀",
  "no-search-results": "🔍",
  "all-archived": "📦",
  "no-data": "📂",
};

const titleMap: Record<EmptyStateVariant, string> = {
  "no-flags": "No flags yet",
  "no-search-results": "No matching flags",
  "all-archived": "All flags are archived",
  "no-data": "No data yet",
};

const descriptionMap: Record<EmptyStateVariant, string> = {
  "no-flags":
    "Create your first flag to start managing features.",
  "no-search-results": "",
  "all-archived":
    "All your feature flags are archived. Create a new flag or restore one from the archive.",
  "no-data":
    "There's nothing here yet. Check back later or create something new.",
};

/**
 * EnhancedEmptyState — empty state with pre-configured variants.
 */
export function EnhancedEmptyState({
  variant,
  icon: IconProp,
  emoji,
  title,
  description,
  primaryAction,
  secondaryAction,
  searchQuery,
  onClearSearch,
  onCreateFlag,
  onViewArchived,
  className,
}: EnhancedEmptyStateProps) {
  const resolvedEmoji = variant ? emojiMap[variant] : emoji;
  const ResolvedIconComponent = variant
    ? iconMap[
        variant === "no-data"
          ? "folder"
          : variant === "no-flags"
            ? "rocket"
            : variant === "no-search-results"
              ? "search"
              : "archive"
      ]
    : IconProp;
  const resolvedTitle =
    variant && typeof title === "string"
      ? title
      : variant
        ? titleMap[variant]
        : title;
  const resolvedDescription = variant
    ? variant === "no-search-results" && searchQuery
      ? `No flags match "${searchQuery}"`
      : descriptionMap[variant]
    : description;

  // Build default primary action from variant
  let defaultPrimaryAction: ReactNode | undefined = primaryAction;
  if (!defaultPrimaryAction && variant === "no-flags" && onCreateFlag) {
    defaultPrimaryAction = (
      <Button variant="primary" onClick={onCreateFlag}>
        <Rocket className="h-4 w-4" />
        Create Flag
      </Button>
    );
  }
  if (
    !defaultPrimaryAction &&
    variant === "no-search-results" &&
    onClearSearch
  ) {
    defaultPrimaryAction = (
      <Button variant="secondary" onClick={onClearSearch}>
        Clear search
      </Button>
    );
  }
  if (!defaultPrimaryAction && variant === "all-archived" && onViewArchived) {
    defaultPrimaryAction = (
      <Button variant="secondary" onClick={onViewArchived}>
        View archived
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in",
        className,
      )}
    >
      {/* Icon / Emoji */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-sm">
        {resolvedEmoji ? (
          <span className="text-2xl leading-none" aria-hidden="true">
            {resolvedEmoji}
          </span>
        ) : ResolvedIconComponent ? (
          <ResolvedIconComponent
            className="h-8 w-8 text-[var(--signal-fg-accent)]"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {/* Title */}
      <h3 className="mt-5 text-base font-semibold text-[var(--signal-fg-primary)]">
        {resolvedTitle}
      </h3>

      {/* Description */}
      {resolvedDescription && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--signal-fg-secondary)]">
          {resolvedDescription}
        </p>
      )}

      {/* Primary action */}
      {defaultPrimaryAction && (
        <div className="mt-6">{defaultPrimaryAction}</div>
      )}

      {/* Secondary action */}
      {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
    </div>
  );
}
