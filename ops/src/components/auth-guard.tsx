"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { LoadingSpinner } from "@/components/loading-spinner";

/**
 * AuthGuard wraps all protected routes in the ops portal.
 *
 * Hydration is handled once by <HydrateAuth /> in the root layout.
 * This component only waits for hydration, then either renders children
 * or redirects to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAppStore((s) => s.hydrated);
  const token = useAppStore((s) => s.token);
  const expiresAt = useAppStore((s) => s.expiresAt);

  // Proactive token refresh
  useEffect(() => {
    if (!hydrated || !token || !expiresAt) return;

    const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 min
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
  }, [hydrated, token, expiresAt, router]);

  // Wait for hydration (happens on first render via root layout)
  if (!hydrated) {
    return <LoadingSpinner fullPage />;
  }

  // Not authenticated — redirect to login
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
