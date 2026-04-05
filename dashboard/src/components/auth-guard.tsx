"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";


const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token);
  const refreshToken = useAppStore((s) => s.refreshToken);
  const expiresAt = useAppStore((s) => s.expiresAt);
  const setAuth = useAppStore((s) => s.setAuth);
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const proactiveRefresh = useCallback(async () => {
    const currentRefreshToken = useAppStore.getState().refreshToken;
    if (!currentRefreshToken) return;

    try {
      const tokens = await api.refresh(currentRefreshToken);
      if (!tokens?.access_token) return;
      const user = useAppStore.getState().user;
      const org = useAppStore.getState().organization;
      setAuth(tokens.access_token, tokens.refresh_token, user, org, tokens.expires_at);
    } catch {
      logout();
      router.replace("/login?session_expired=true");
    }
  }, [setAuth, logout, router]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!expiresAt || !token) return;

    const msUntilExpiry = expiresAt * 1000 - Date.now();
    const msUntilRefresh = msUntilExpiry - REFRESH_BUFFER_MS;

    if (msUntilRefresh <= 0) {
      proactiveRefresh();
    } else {
      timerRef.current = setTimeout(proactiveRefresh, msUntilRefresh);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [expiresAt, token, proactiveRefresh]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
