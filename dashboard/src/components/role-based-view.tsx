"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUserRole, type UserRole } from "@/hooks/use-user-role";
import { ShieldIcon } from "@/components/icons/nav-icons";

// ─── Types ──────────────────────────────────────────────────────────

export interface RoleBasedViewProps {
  /** Roles that are allowed to see the children. Accepts single or array. */
  roles: UserRole | UserRole[];
  /**
   * What to do when the user lacks permission:
   * - "hide" (default): children are not rendered at all
   * - "show-fallback": the `fallback` prop is rendered instead
   * - "show-disabled": children are rendered inside a muted wrapper
   */
  hideMode?: "hide" | "show-fallback" | "show-disabled";
  /** Content shown when user lacks permission and hideMode="show-fallback" */
  fallback?: ReactNode;
  /** Optional label shown in disabled mode, e.g. "Admin only" */
  disabledLabel?: string;
  /** Additional class for the wrapper */
  className?: string;
  /** The content to protect */
  children: ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────

/**
 * RoleBasedView — conditionally renders content based on the user's org role.
 *
 * Uses the `useUserRole` hook which fetches the current user's role from the
 * org members API and caches it in sessionStorage.
 *
 * @example
 * <RoleBasedView roles={["owner", "admin"]}>
 *   <DangerZone />
 * </RoleBasedView>
 *
 * @example
 * <RoleBasedView roles="admin" hideMode="show-disabled" disabledLabel="Admin only">
 *   <SensitiveSetting />
 * </RoleBasedView>
 */
export function RoleBasedView({
  roles,
  hideMode = "hide",
  fallback,
  disabledLabel,
  className,
  children,
}: RoleBasedViewProps) {
  const { hasRole, loading, role } = useUserRole();

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const isAllowed = hasRole(allowedRoles);

  // While loading, don't flash content — render nothing
  if (loading) return null;

  if (isAllowed) {
    return <>{children}</>;
  }

  // ─── Not allowed ────────────────────────────────────────────────

  if (hideMode === "hide") {
    return null;
  }

  if (hideMode === "show-fallback") {
    return fallback ? <>{fallback}</> : null;
  }

  // hideMode === "show-disabled"
  return (
    <div className={cn("relative", className)}>
      {/* Disabled overlay: subtle gray tint + badge */}
      <div
        className="pointer-events-none opacity-50"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Badge indicating restricted access */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium",
            "bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]",
            "text-[var(--signal-fg-tertiary)] shadow-sm",
          )}
          role="status"
          aria-label={disabledLabel ?? "Restricted access"}
        >
          <ShieldIcon className="h-3.5 w-3.5" />
          <span>{disabledLabel ?? "Restricted access"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── RoleBadge — small inline badge showing required role ──────────

export interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

/**
 * A subtle inline badge indicating the minimum role required for an action.
 * Useful next to buttons or menu items that are disabled for lower roles.
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  const labels: Record<UserRole, string> = {
    owner: "Owner",
    admin: "Admin",
    developer: "Dev",
    viewer: "Viewer",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-tertiary)] border border-[var(--signal-border-default)]",
        className,
      )}
      aria-label={`Requires ${role} role`}
    >
      {labels[role]}
    </span>
  );
}
