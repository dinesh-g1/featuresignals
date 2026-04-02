"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function DemoPage() {
  const router = useRouter();
  const { token, isDemo, setDemoAuth } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token && isDemo) {
      router.replace("/dashboard");
      return;
    }
    if (token && !isDemo) {
      router.replace("/dashboard");
      return;
    }

    if (creating) return;
    setCreating(true);

    api
      .createDemoSession()
      .then((data) => {
        setDemoAuth(
          data.tokens.access_token,
          data.tokens.refresh_token,
          data.user,
          data.demo_expires_at,
        );
        router.replace("/dashboard");
      })
      .catch((err) => {
        setError(err.message || "Failed to create demo session. Please try again.");
        setCreating(false);
      });
  }, [token, isDemo, creating, setDemoAuth, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => { setError(null); setCreating(false); }}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <h2 className="text-xl font-semibold text-slate-900">Setting up your demo</h2>
        <p className="mt-2 text-sm text-slate-500">
          Creating your sandbox with sample feature flags...
        </p>
      </div>
    </div>
  );
}
