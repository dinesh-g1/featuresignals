"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import * as api from "@/lib/api";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const token = useAppStore((s) => s.token);
  const hydrated = useAppStore((s) => s.hydrated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && token) {
      router.replace("/dashboard");
    }
  }, [hydrated, token, router]);

  const [isSessionExpired, setIsSessionExpired] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsSessionExpired(params.get("session_expired") === "true");
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.login(email, password);
      api.persistAuth(response);
      setAuth(
        { id: response.user.user_id, email: response.user.user_email || email, name: response.user.user_name || email },
        { id: response.user.user_id, name: "FeatureSignals" },
        response.token,
        response.refresh_token,
        new Date(response.expires_at).getTime() / 1000,
      );
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof api.APIError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hydrated && token) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">FeatureSignals Ops</h1>
          <p className="mt-2 text-sm text-gray-400">Internal operations portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-gray-900 p-8 shadow-xl">
          {isSessionExpired && (
            <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-200">
              Your session expired. Please log in again.
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-200">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@featuresignals.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 pr-10 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          Internal use only. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
