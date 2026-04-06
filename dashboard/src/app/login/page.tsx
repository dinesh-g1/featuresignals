"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, APIError } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAppStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [ssoMode, setSsoMode] = useState(false);
  const [orgSlug, setOrgSlug] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);

  const sessionExpired = searchParams.get("session_expired") === "true";
  const ssoError = searchParams.get("sso_error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.loginMultiRegion({ email, password });
      setAuth(
        data.tokens.access_token,
        data.tokens.refresh_token,
        data.user,
        data.organization,
        data.tokens.expires_at,
      );
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof APIError && err.status === 403) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSSOLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!orgSlug.trim()) return;
    setSsoLoading(true);
    setError("");

    try {
      const discovery = await api.discoverSSO(orgSlug.trim());

      if (!discovery.sso_enabled) {
        setError("SSO is not configured for this organization. Please use email/password login.");
        setSsoLoading(false);
        return;
      }

      if (discovery.provider_type === "saml") {
        window.location.href = `${API_URL}/v1/sso/saml/login/${orgSlug.trim()}`;
      } else if (discovery.provider_type === "oidc") {
        window.location.href = `${API_URL}/v1/sso/oidc/authorize/${orgSlug.trim()}`;
      } else {
        setError("Unknown SSO provider type.");
        setSsoLoading(false);
      }
    } catch (err) {
      setError("Failed to discover SSO configuration. Check your organization slug.");
      setSsoLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md space-y-8 p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-600">
            FeatureSignals
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {ssoMode ? "Sign in with your identity provider" : "Sign in to your account"}
          </p>
        </div>

        {sessionExpired && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-amber-200">
            Your session has expired. Please sign in again.
          </div>
        )}

        {ssoError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-100">
            {decodeURIComponent(ssoError)}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {ssoMode ? (
          <>
            <form onSubmit={handleSSOLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="orgSlug">Organization Slug</Label>
                <Input
                  id="orgSlug"
                  type="text"
                  placeholder="your-company"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-400">
                  Enter your organization&apos;s slug to discover your identity provider.
                </p>
              </div>

              <Button type="submit" disabled={ssoLoading} className="w-full">
                {ssoLoading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Shield className="mr-1.5 h-4 w-4" />
                    Continue with SSO
                  </>
                )}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setSsoMode(false);
                setError("");
              }}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to email login
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSsoMode(true);
                setError("");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Shield className="h-4 w-4 text-indigo-500" />
              Sign in with SSO
            </button>

            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-indigo-600 transition-colors hover:text-indigo-700"
              >
                Sign up
              </Link>
            </p>
          </>
        )}

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 pt-5 text-xs text-slate-400">
          <svg
            className="h-3 w-3 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          TLS encrypted &middot; RBAC &middot; SSO &middot; Audit trails &middot; Open source
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
