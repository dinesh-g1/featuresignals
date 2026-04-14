"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import * as api from "@/lib/api";
import { LoadingSpinner } from "@/components/loading-spinner";

/**
 * Login page for the Ops Portal.
 *
 * Key behaviors:
 * - Reuses the same /v1/auth/login API endpoint as the main dashboard
 * - Enforces @featuresignals.com domain restriction (server-side check too)
 * - If already logged in, redirects to /dashboard
 * - Shows session_expired message if redirected from expired token
 * - Shows domain restriction error for non-featuresignals.com emails
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAppStore((s) => s.setAuth);
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (hydrated && token) {
      router.replace("/dashboard");
    }
  }, [hydrated, token, router]);

  const isSessionExpired = searchParams.get("session_expired") === "true";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.login(email, password);

      // Server-side should already reject non-featuresignals.com,
      // but we double-check client-side for defense in depth.
      if (!response.user.email.endsWith("@featuresignals.com")) {
        setError(
          "Access is restricted to @featuresignals.com email addresses.",
        );
        setLoading(false);
        return;
      }

      setAuth(
        response.user,
        response.organization,
        response.tokens.access_token,
        response.tokens.refresh_token,
        response.tokens.expires_at,
      );

      router.push("/dashboard");
    } catch (err) {
      if (err instanceof api.APIError) {
        if (err.status === 403) {
          setError(
            "Access denied. Only @featuresignals.com users can access the Ops Portal.",
          );
        } else if (err.status === 401) {
          setError("Invalid email or password.");
        } else if (err.status === 429) {
          setError("Too many login attempts. Please wait and try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render until hydrated (prevents flash of login for logged-in users)
  if (!hydrated) {
    return <LoadingSpinner fullPage />;
  }

  // If already logged in, the useEffect will redirect — show spinner
  if (token) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">
              FeatureSignals Ops
            </h1>
          </div>
          <p className="text-sm text-gray-400">Internal Operations Portal</p>
        </div>

        {/* Login Form */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
          <h2 className="mb-6 text-lg font-semibold text-white">Sign in</h2>

          {isSessionExpired && (
            <div className="mb-4 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-400 border border-yellow-500/20">
              Your session has expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@featuresignals.com"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Restricted to authorized @featuresignals.com personnel only.
        </p>
      </div>
    </div>
  );
}
