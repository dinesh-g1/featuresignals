import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient instance for FeatureSignals dashboard.
 *
 * Imported by Providers (for QueryClientProvider) and by stores/hooks
 * that need to imperatively invalidate queries or set cache data
 * outside of React component context (e.g., Zustand store actions,
 * optimistic updates, WebSocket event handlers).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});
