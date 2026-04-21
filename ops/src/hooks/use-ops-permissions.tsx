"use client";

import * as React from "react";
import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import type { OpsUser } from "@/lib/types";

// ─── Resource Types ───────────────────────────────────────────────────────────
export type Resource =
  | "environment"
  | "customer"
  | "license"
  | "cost"
  | "audit_log"
  | "ops_user"
  | "sandbox"
  | "debug_mode"
  | "ssh_access"
  | "billing";

// ─── Action Types ─────────────────────────────────────────────────────────────
export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "execute"
  | "export";

// ─── Permission Condition Types ──────────────────────────────────────────────
export type PermissionCondition =
  | "own_sandbox_only"
  | "temporary_debug"
  | "perf_env_auto_delete"
  | "sandbox_auto_expire"
  | "cost_view_internal_only";

// ─── Ops Role Types ──────────────────────────────────────────────────────────
export type OpsRole =
  | "founder"
  | "engineer"
  | "customer_success"
  | "demo_team"
  | "finance"
  | "qa"
  | "perf_tester"
  | "sales"
  | "support";

// ─── Permission Context ──────────────────────────────────────────────────────
export interface PermissionContext {
  isOwner?: boolean;
  debugEnabledUntil?: string; // RFC3339 timestamp
  sandboxCount?: number;
  maxSandboxes?: number;
  userId?: string;
  resourceId?: string;
}

// ─── Permission Definitions ──────────────────────────────────────────────────
interface Permission {
  resource: Resource;
  action: Action;
  condition?: PermissionCondition;
}

// Single source of truth for role-based access control
const rolePermissions: Record<OpsRole, Permission[]> = {
  founder: [
    // Full access to everything
    { resource: "environment", action: "create" },
    { resource: "environment", action: "read" },
    { resource: "environment", action: "update" },
    { resource: "environment", action: "delete" },
    { resource: "environment", action: "execute" },
    { resource: "customer", action: "read" },
    { resource: "customer", action: "update" },
    { resource: "customer", action: "create" },
    { resource: "license", action: "create" },
    { resource: "license", action: "read" },
    { resource: "license", action: "update" },
    { resource: "license", action: "delete" },
    { resource: "cost", action: "read" },
    { resource: "cost", action: "export" },
    { resource: "audit_log", action: "read" },
    { resource: "audit_log", action: "export" },
    { resource: "ops_user", action: "create" },
    { resource: "ops_user", action: "read" },
    { resource: "ops_user", action: "update" },
    { resource: "ops_user", action: "delete" },
    { resource: "sandbox", action: "create" },
    { resource: "sandbox", action: "read" },
    { resource: "sandbox", action: "delete" },
    { resource: "debug_mode", action: "execute" },
    { resource: "ssh_access", action: "execute" },
    { resource: "billing", action: "read" },
    { resource: "billing", action: "update" },
  ],

  engineer: [
    // Technical operations, no financial data
    { resource: "environment", action: "create" },
    { resource: "environment", action: "read" },
    { resource: "environment", action: "update" },
    { resource: "environment", action: "delete" },
    { resource: "environment", action: "execute" },
    { resource: "customer", action: "read" },
    { resource: "customer", action: "create" },
    { resource: "license", action: "read" },
    { resource: "license", action: "update" },
    { resource: "cost", action: "read" },
    { resource: "audit_log", action: "read" },
    { resource: "sandbox", action: "create" },
    { resource: "sandbox", action: "read" },
    { resource: "sandbox", action: "delete" },
    { resource: "debug_mode", action: "execute" },
    { resource: "ssh_access", action: "execute" },
  ],

  customer_success: [
    // View customers and environments, temporary debug access
    { resource: "environment", action: "read" },
    { resource: "customer", action: "read" },
    { resource: "audit_log", action: "read" },
    { resource: "debug_mode", action: "execute", condition: "temporary_debug" },
  ],

  demo_team: [
    // Sandbox environments only
    { resource: "sandbox", action: "create" },
    { resource: "sandbox", action: "read" },
    { resource: "sandbox", action: "delete", condition: "own_sandbox_only" },
    { resource: "environment", action: "read" },
  ],

  finance: [
    // Financial data only
    { resource: "cost", action: "read" },
    { resource: "cost", action: "export" },
    { resource: "customer", action: "read" },
    { resource: "billing", action: "read" },
  ],

  qa: [
    // Testing environments
    { resource: "environment", action: "read" },
    { resource: "sandbox", action: "create" },
    { resource: "sandbox", action: "read" },
    { resource: "sandbox", action: "delete", condition: "own_sandbox_only" },
    { resource: "audit_log", action: "read" },
  ],

  perf_tester: [
    // Performance testing environments
    { resource: "environment", action: "create" },
    { resource: "environment", action: "read" },
    {
      resource: "environment",
      action: "delete",
      condition: "own_sandbox_only",
    },
    { resource: "audit_log", action: "read" },
  ],

  sales: [
    // Customer visibility for sales
    { resource: "environment", action: "read" },
    { resource: "customer", action: "read" },
  ],

  support: [
    // Support access - view logs, temporary debug
    { resource: "environment", action: "read" },
    { resource: "audit_log", action: "read" },
    { resource: "debug_mode", action: "execute", condition: "temporary_debug" },
  ],
};

// ─── Condition Evaluation ────────────────────────────────────────────────────
function evaluateCondition(
  condition: PermissionCondition,
  context?: PermissionContext,
): boolean {
  if (!context) {
    return false;
  }

  switch (condition) {
    case "own_sandbox_only":
      return context.isOwner === true;
    case "temporary_debug":
      if (!context.debugEnabledUntil) {
        return false;
      }
      // Check if debug is still enabled
      try {
        const enabledUntil = new Date(context.debugEnabledUntil);
        return !isNaN(enabledUntil.getTime()) && enabledUntil > new Date();
      } catch {
        return false;
      }
    case "sandbox_auto_expire":
      // Auto-expiry is handled by the scheduler, not a runtime check
      return true;
    default:
      // Unknown condition - fail safe
      return false;
  }
}

// ─── Permission Checking ─────────────────────────────────────────────────────
function hasPermission(
  role: OpsRole,
  resource: Resource,
  action: Action,
  context?: PermissionContext,
): boolean {
  const permissions = rolePermissions[role] || [];

  for (const perm of permissions) {
    if (perm.resource === resource && perm.action === action) {
      if (perm.condition) {
        return evaluateCondition(perm.condition, context);
      }
      return true;
    }
  }
  return false;
}

// ─── Hook Interface ──────────────────────────────────────────────────────────
export interface UseOpsPermissionsReturn {
  // Permission checking functions
  canCreate: (resource: Resource, context?: PermissionContext) => boolean;
  canRead: (resource: Resource, context?: PermissionContext) => boolean;
  canUpdate: (resource: Resource, context?: PermissionContext) => boolean;
  canDelete: (resource: Resource, context?: PermissionContext) => boolean;
  canExecute: (resource: Resource, context?: PermissionContext) => boolean;
  canExport: (resource: Resource, context?: PermissionContext) => boolean;

  // Convenience functions for common checks
  hasPermission: (
    resource: Resource,
    action: Action,
    context?: PermissionContext,
  ) => boolean;

  // Role information
  role: OpsRole | null;
  isFounder: boolean;
  isEngineer: boolean;
  isCustomerSuccess: boolean;
  isDemoTeam: boolean;
  isFinance: boolean;
  isQA: boolean;
  isPerfTester: boolean;
  isSales: boolean;
  isSupport: boolean;

  // Loading and error states
  isLoading: boolean;
  hasPermissionError: boolean;
  permissionError?: string;

  // Utility functions
  requirePermission: (
    resource: Resource,
    action: Action,
    context?: PermissionContext,
  ) => void | never;
  getPermissionsForResource: (resource: Resource) => Action[];
}

// ─── Main Hook ──────────────────────────────────────────────────────────────
export function useOpsPermissions(): UseOpsPermissionsReturn {
  const opsRole = useAppStore((state) => state.opsRole);
  const hydrated = useAppStore((state) => state.hydrated);

  const role = opsRole?.ops_role as OpsRole | null;
  const isLoading = !hydrated;
  const hasPermissionError = hydrated && opsRole === null;

  // Memoize permission functions to prevent unnecessary re-renders
  const permissionFunctions = useMemo(() => {
    const canCreate = (resource: Resource, context?: PermissionContext) =>
      hasPermission(role!, resource, "create", context);

    const canRead = (resource: Resource, context?: PermissionContext) =>
      hasPermission(role!, resource, "read", context);

    const canUpdate = (resource: Resource, context?: PermissionContext) =>
      hasPermission(role!, resource, "update", context);

    const canDelete = (resource: Resource, context?: PermissionContext) =>
      hasPermission(role!, resource, "delete", context);

    const canExecute = (resource: Resource, context?: PermissionContext) =>
      hasPermission(role!, resource, "execute", context);

    const canExport = (resource: Resource, context?: PermissionContext) =>
      hasPermission(role!, resource, "export", context);

    const hasPermissionFn = (
      resource: Resource,
      action: Action,
      context?: PermissionContext,
    ) => hasPermission(role!, resource, action, context);

    const requirePermission = (
      resource: Resource,
      action: Action,
      context?: PermissionContext,
    ) => {
      if (!role || !hasPermission(role, resource, action, context)) {
        throw new Error(`Permission denied: ${action} on ${resource}`);
      }
    };

    const getPermissionsForResource = (resource: Resource): Action[] => {
      if (!role) return [];
      const permissions = rolePermissions[role] || [];
      return permissions
        .filter((perm) => perm.resource === resource)
        .map((perm) => perm.action);
    };

    return {
      canCreate,
      canRead,
      canUpdate,
      canDelete,
      canExecute,
      canExport,
      hasPermission: hasPermissionFn,
      requirePermission,
      getPermissionsForResource,
    };
  }, [role]);

  const roleChecks = useMemo(
    () => ({
      isFounder: role === "founder",
      isEngineer: role === "engineer",
      isCustomerSuccess: role === "customer_success",
      isDemoTeam: role === "demo_team",
      isFinance: role === "finance",
      isQA: role === "qa",
      isPerfTester: role === "perf_tester",
      isSales: role === "sales",
      isSupport: role === "support",
    }),
    [role],
  );

  return {
    ...permissionFunctions,
    ...roleChecks,
    role,
    isLoading,
    hasPermissionError,
    permissionError: hasPermissionError
      ? "No permissions available for current user"
      : undefined,
  };
}

// ─── Helper Hook for Protected Components ────────────────────────────────────
export function useProtectedComponent(
  resource: Resource,
  action: Action,
  context?: PermissionContext,
): { hasAccess: boolean; isLoading: boolean } {
  const { hasPermission, isLoading } = useOpsPermissions();
  const hasAccess = hasPermission(resource, action, context);

  return { hasAccess, isLoading };
}

// ─── Hook for Conditionally Rendered Elements ────────────────────────────────
export function useConditionalRender(
  resource: Resource,
  action: Action,
  context?: PermissionContext,
): boolean {
  const { hasPermission, isLoading } = useOpsPermissions();

  // Return false if still loading or no permission
  return !isLoading && hasPermission(resource, action, context);
}

// ─── Convenience Hooks for Common Scenarios ──────────────────────────────────
export function useCanViewEnvironments(): boolean {
  return useConditionalRender("environment", "read");
}

export function useCanManageEnvironments(): boolean {
  const { canCreate, canUpdate, canDelete, canExecute, isLoading } =
    useOpsPermissions();
  return (
    !isLoading &&
    (canCreate("environment") ||
      canUpdate("environment") ||
      canDelete("environment") ||
      canExecute("environment"))
  );
}

export function useCanViewCustomers(): boolean {
  return useConditionalRender("customer", "read");
}

export function useCanViewFinancialData(): boolean {
  const { canRead } = useOpsPermissions();
  return canRead("cost") || canRead("billing");
}

export function useCanCreateSandbox(): boolean {
  return useConditionalRender("sandbox", "create");
}

export function useCanViewAuditLogs(): boolean {
  return useConditionalRender("audit_log", "read");
}

// ─── Higher-Order Component Helper ───────────────────────────────────────────
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  resource: Resource,
  action: Action,
  fallback?: React.ReactNode,
): React.ComponentType<P> {
  return function WithPermissionWrapper(props: P) {
    const { hasAccess, isLoading } = useProtectedComponent(resource, action);

    if (isLoading) {
      return null; // Or a loading spinner
    }

    if (!hasAccess) {
      return fallback ? <>{fallback}</> : null;
    }

    return <Component {...props} />;
  };
}

// ─── Export Types ────────────────────────────────────────────────────────────
export type {
  Resource as OpsResource,
  Action as OpsAction,
  PermissionCondition as OpsPermissionCondition,
  PermissionContext as OpsPermissionContext,
};
