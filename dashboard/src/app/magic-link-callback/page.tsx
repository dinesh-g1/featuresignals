"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { LoaderIcon } from "@/components/icons/nav-icons";

export default function MagicLinkCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-accent/5">
          <div className="flex flex-col items-center gap-3">
            <LoaderIcon className="h-8 w-8 animate-spin text-[var(--fgColor-accent)]" />
            <p className="text-sm text-[var(--fgColor-muted)]">Loading...</p>
          </div>
        </div>
      }
    >
      <MagicLinkCallbackContent />
    </Suspense>
  );
}

function MagicLinkCallbackContent() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresAtStr = params.get("expires_at");

    if (!accessToken || !refreshToken) {
      setError("Login link is invalid or expired. Please sign in again.");
      return;
    }

    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : undefined;

    setAuth(accessToken, refreshToken, null, null, expiresAt);

    // Clear tokens from URL
    window.history.replaceState(null, "", window.location.pathname);

    router.replace("/dashboard");
  }, [router, setAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-accent/5 px-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-[var(--fgColor-accent)] hover:text-[var(--fgColor-accent)]"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-accent/5">
      <div className="flex flex-col items-center gap-3">
        <LoaderIcon className="h-8 w-8 animate-spin text-[var(--fgColor-accent)]" />
        <p className="text-sm text-[var(--fgColor-muted)]">Logging you in...</p>
      </div>
    </div>
  );
}
