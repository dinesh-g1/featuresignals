"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

function ExchangeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [exchanged, setExchanged] = useState(false);

  useEffect(() => {
    if (exchanged) return;
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing token parameter");
      return;
    }

    setExchanged(true);
    api
      .exchangeToken(token)
      .then((data) => {
        setAuth(data.tokens.access_token, data.tokens.refresh_token, data.user, undefined, data.tokens.expires_at);
        router.replace("/dashboard");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Token exchange failed. The link may have expired.");
      });
  }, [searchParams, router, setAuth, exchanged]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Authentication Failed</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <div className="mt-6 flex flex-col gap-2">
            <a
              href="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go to Login
            </a>
            <a
              href="/register"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-sm text-slate-500">Setting up your account...</p>
      </div>
    </div>
  );
}

export default function TokenExchangePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      }
    >
      <ExchangeContent />
    </Suspense>
  );
}
