"use client";

import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { EyeIcon } from "@/components/icons/nav-icons";

// ─── Types ──────────────────────────────────────────────────────────

export interface ViewerBannerProps {
  /** Override the default message shown to viewers */
  message?: string;
  /** Additional class for the banner wrapper */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────

/**
 * ViewerBanner — a subtle, non-alarming banner shown to users with the "viewer" role.
 *
 * Informs them they're viewing in read-only mode and directs them to contact
 * an admin or owner to make changes. The banner uses muted colors rather than
 * red/yellow to avoid alarm — it's informational, not a warning.
 *
 * Renders nothing if the user is not a viewer.
 */
export function ViewerBanner({ message, className }: ViewerBannerProps) {
  const { isViewer, loading } = useUserRole();

  // Don't show anything while loading or if user is not a viewer
  if (loading || !isViewer) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm",
        "bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]",
        "text-[var(--signal-fg-tertiary)]",
        className,
      )}
      role="status"
      aria-label="View-only mode"
    >
      <EyeIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {message ??
          "You're viewing as a team member. Contact an admin to make changes."}
      </span>
    </div>
  );
}
