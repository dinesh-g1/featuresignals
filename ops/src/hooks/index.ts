// Hooks Index
// Re-export all custom hooks for convenient importing

// ─── Media Queries ──────────────────────────────────────────────────────
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  useBreakpoint,
  usePrefersDarkMode,
  usePrefersReducedMotion,
  usePrefersHighContrast,
  useHasTouch,
  useHasHover,
  useResponsiveBreakpoint,
} from "./use-media-query";

// ─── Pagination ─────────────────────────────────────────────────────────
export {
  usePagination,
  useSimplePagination,
  useTablePagination,
} from "./use-pagination";
export type {
  UsePaginationOptions,
  UsePaginationReturn,
} from "./use-pagination";

// ─── API Fetching ───────────────────────────────────────────────────────
export {
  useApiFetch,
  useApiQuery,
  useApiMutation,
  useApiPolling,
  createApiHook,
  createApiQueryHook,
} from "./use-api-fetch";
export type {
  AsyncStatus,
  UseApiFetchResult,
  UseApiFetchOptions,
} from "./use-api-fetch";

// ─── Permissions ────────────────────────────────────────────────────────
export {
  useOpsPermissions,
  useProtectedComponent,
  useConditionalRender,
  useCanViewEnvironments,
  useCanManageEnvironments,
  useCanViewCustomers,
  useCanViewFinancialData,
  useCanCreateSandbox,
  useCanViewAuditLogs,
  withPermission,
} from "./use-ops-permissions";
export type {
  Resource,
  Action,
  PermissionCondition,
  PermissionContext,
  UseOpsPermissionsReturn,
  OpsResource,
  OpsAction,
  OpsPermissionCondition,
  OpsPermissionContext,
} from "./use-ops-permissions";

// ─── All Hooks ──────────────────────────────────────────────────────────
// Convenience export for all hooks (useful for testing or quick prototyping)
export * from "./use-media-query";
export * from "./use-pagination";
export * from "./use-api-fetch";
export * from "./use-ops-permissions";
