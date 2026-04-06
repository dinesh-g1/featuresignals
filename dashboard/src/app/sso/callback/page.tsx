"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { Loader2 } from "lucide-react";

function parseJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export default function SSOCallbackPage() {
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
      setError("SSO login failed: missing tokens. Please try again.");
      return;
    }

    const claims = parseJWTPayload(accessToken);
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : undefined;

    setAuth(accessToken, refreshToken, null, null, expiresAt);

    window.history.replaceState(null, "", window.location.pathname);

    router.replace("/dashboard");
  }, [router, setAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Completing SSO login...</p>
      </div>
    </div>
  );
}
