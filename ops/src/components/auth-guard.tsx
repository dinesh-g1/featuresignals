"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore, hydrateStore } from "@/stores/app-store";
import { LoadingSpinner } from "@/components/loading-spinner";

/**
 * AuthGuard wraps all protected routes in the ops portal.
 *
 * Behavior:
 * - Not hydrated → show loading spinner
 * - Hydrated, no token → redirect to /login
 * - Hydrated, has token, on /login → redirect to /dashboard
 * - Hydrated, has token → render children with proactive token refresh
 *
 * Token storage uses "ops_" prefix to avoid collisions with the main dashboard.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, token, expiresAt } = useAppStore();
  const [isReady, setIsReady] = useState(false);

  // Hydrate from localStorage on mount, then mark ready
  const handleHydration = useCallback(() => {
    hydrateStore();
    // Use requestAnimationFrame to ensure store is populated before proceeding
    requestAnimationFrame(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    handleHydration();
  }, [handleHydration]);

  // Proactive token refresh
  useEffect(() => {
    if (!isReady || !token || !expiresAt) return;

    const REFRESH_BUFFER_MS = 5 * 60 * 1000;
    const timeUntilExpiry = expiresAt - Date.now();

    if (timeUntilExpiry <= 0) {
      useAppStore.getState().logout();
      router.replace("/login?session_expired=true");
      return;
    }

    if (timeUntilExpiry <= REFRESH_BUFFER_MS) {
      const refreshTimeout = setTimeout(async () => {
        const state = useAppStore.getState();
        const success = await state.refreshTokens();
        if (!success) {
          router.replace("/login?session_expired=true");
        }
      }, timeUntilExpiry - REFRESH_BUFFER_MS);

      return () => clearTimeout(refreshTimeout);
    }
  }, [token, expiresAt, router, isReady]);

  if (!isReady) {
    return <LoadingSpinner fullPage />;
  }

  if (!token) {
    if (pathname !== "/login") {
      router.replace("/login");
    }
    return <LoadingSpinner fullPage />;
  }

  // Already authenticated — don't stay on login page
  if (pathname === "/login") {
    router.replace("/dashboard");
    return <LoadingSpinner fullPage />;
  }

  return <>{children}</>;
}
