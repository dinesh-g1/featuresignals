"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, APIError } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, ArrowLeft, Loader2, Globe } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAppStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showRegionHint, setShowRegionHint] = useState(false);
  const [regions, setRegions] = useState<
    Array<{ code: string; name: string; flag: string; app_endpoint: string }>
  >([]);

  const [ssoMode, setSsoMode] = useState(false);
  const [orgSlug, setOrgSlug] = useState("");
  const [ssoFieldError, setSsoFieldError] = useState<string>("");
  const [ssoLoading, setSsoLoading] = useState(false);

  const sessionExpired = searchParams.get("session_expired") === "true";
  const ssoError = searchParams.get("sso_error");

  useEffect(() => {
    api
      .listRegions()
      .then((res) => {
        if (res.regions?.length) {
          setRegions(
            res.regions.filter((r) => {
              const endpoint = r.app_endpoint?.replace(/\/$/, "");
              return endpoint && endpoint !== window.location.origin;
            }),
          );
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    // Custom validation
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email is required";
    }
    if (!password) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const data = await api.login({ email, password });
      setAuth(
        data.tokens.access_token,
        data.tokens.refresh_token,
        data.user,
        data.organization,
        data.tokens.expires_at,
        data.onboarding_completed,
      );
      if (!data.onboarding_completed) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof APIError && err.status === 403) {
        setError(err.message);
      } else if (err instanceof APIError && err.status === 401) {
        setError(err.message);
        setShowRegionHint(true);
      } else {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSSOLogin(e: React.FormEvent) {
    e.preventDefault();
    setSsoFieldError("");

    if (!orgSlug.trim()) {
      setSsoFieldError("Organization slug is required");
      return;
    }

    setSsoLoading(true);
    setError("");

    try {
      const discovery = await api.discoverSSO(orgSlug.trim());

      if (!discovery.sso_enabled) {
        setError(
          "SSO is not configured for this organization. Please use email/password login.",
        );
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
      setError(
        "Failed to discover SSO configuration. Check your organization slug.",
      );
      setSsoLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/[0.07] blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-purple-400/[0.05] blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md space-y-8 p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100/80 sm:p-8">
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            FeatureSignals
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {ssoMode
              ? "Sign in with your identity provider"
              : "Sign in to your account"}
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

        {showRegionHint && regions.length > 0 && (
          <div className="rounded-lg bg-blue-50 p-3 ring-1 ring-blue-200">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
              <Globe className="h-4 w-4" />
              Wrong region? Try signing in at:
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {regions.map((r) => (
                <a
                  key={r.code}
                  href={`${r.app_endpoint}/login`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
                >
                  <span>{r.flag}</span>
                  {r.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {ssoMode ? (
          <>
            <form onSubmit={handleSSOLogin} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="orgSlug">Organization Slug</Label>
                <Input
                  id="orgSlug"
                  type="text"
                  placeholder="your-company"
                  value={orgSlug}
                  onChange={(e) => {
                    setOrgSlug(e.target.value);
                    if (ssoFieldError) setSsoFieldError("");
                  }}
                  aria-invalid={!!ssoFieldError}
                  aria-describedby={ssoFieldError ? "orgSlug-error" : undefined}
                />
                {ssoFieldError && (
                  <p
                    id="orgSlug-error"
                    className="text-xs text-red-500"
                    role="alert"
                  >
                    {ssoFieldError}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Enter your organization&apos;s slug to discover your identity
                  provider.
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
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email)
                      setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={
                    fieldErrors.email ? "email-error" : undefined
                  }
                />
                {fieldErrors.email && (
                  <p
                    id="email-error"
                    className="text-xs text-red-500"
                    role="alert"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={
                    fieldErrors.password ? "password-error" : undefined
                  }
                />
                {fieldErrors.password && (
                  <p
                    id="password-error"
                    className="text-xs text-red-500"
                    role="alert"
                  >
                    {fieldErrors.password}
                  </p>
                )}
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
        <div className="flex items-center justify-center gap-1.5 border-t border-slate-100/80 pt-5 text-xs text-slate-400">
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
          TLS encrypted &middot; RBAC &middot; SSO &middot; Audit trails
          &middot; Open source
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
