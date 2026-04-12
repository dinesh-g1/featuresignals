"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, APIError } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Shield,
  ArrowLeft,
  Loader2,
  Mail,
  Lock,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAppStore((s) => s.setAuth);
  const token = useAppStore((s) => s.token);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<
    | "generic"
    | "credentials"
    | "rate_limit"
    | "account_locked"
    | "unverified"
    | "sso_enforced"
  >("generic");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Rate limit state
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [attemptsAllowed, setAttemptsAllowed] = useState(10);
  const [retryAfter, setRetryAfter] = useState<Date | null>(null);
  const [retryCountdown, setRetryCountdown] = useState("");

  // SSO state
  const [ssoMode, setSsoMode] = useState(false);
  const [orgSlug, setOrgSlug] = useState("");
  const [ssoFieldError, setSsoFieldError] = useState<string>("");
  const [ssoLoading, setSsoLoading] = useState(false);

  // Loading state for auth check
  const [loadingAuth, setLoadingAuth] = useState(true);

  const sessionExpired = searchParams.get("session_expired") === "true";
  const ssoError = searchParams.get("sso_error");
  const emailVerified = searchParams.get("email_verified") === "true";

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      router.push("/dashboard");
      return;
    }
    setLoadingAuth(false);
  }, [token, router]);

  // Retry countdown timer
  useEffect(() => {
    if (!retryAfter) {
      setRetryCountdown("");
      return;
    }
    const interval = setInterval(() => {
      const diff = retryAfter.getTime() - Date.now();
      if (diff <= 0) {
        setRetryCountdown("");
        setRetryAfter(null);
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setRetryCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setFieldErrors({});
      setLoading(true);

      const errors: { email?: string; password?: string } = {};
      if (!email.trim()) errors.email = "Email is required";
      if (!password) errors.password = "Password is required";

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
        if (err instanceof APIError) {
          try {
            const body = err as unknown as Record<string, unknown>;
            if (err.status === 429) {
              setErrorType("account_locked");
              const retryAfterStr = (body.retry_after as string) || "";
              if (retryAfterStr) {
                setRetryAfter(new Date(retryAfterStr));
              }
              setError((body.error as string) || err.message);
            } else if (err.status === 401 && "remaining" in body) {
              setErrorType("credentials");
              setAttemptsUsed((body.attempts_used as number) || 0);
              setAttemptsAllowed((body.attempts_allowed as number) || 10);
              setError("Invalid email or password");
            } else if (err.status === 403 && err.message === "mfa_required") {
              setError("MFA code required");
            } else if (err.status === 403) {
              if (err.message?.includes("SSO")) {
                setErrorType("sso_enforced");
                setError(err.message);
              } else {
                setError(err.message);
              }
            } else {
              setErrorType("generic");
              setError(err.message);
            }
          } catch {
            setErrorType("generic");
            setError(err.message);
          }
        } else {
          setErrorType("generic");
          setError(err instanceof Error ? err.message : "Login failed");
        }
      } finally {
        setLoading(false);
      }
    },
    [email, password, router, setAuth],
  );

  const handleSSOLogin = useCallback(
    async (e: React.FormEvent) => {
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
      } catch {
        setError(
          "Failed to discover SSO configuration. Check your organization slug.",
        );
        setSsoLoading(false);
      }
    },
    [orgSlug],
  );

  const switchToSSO = () => {
    setSsoMode(true);
    setError("");
    setFieldErrors({});
  };

  const switchToEmail = () => {
    setSsoMode(false);
    setError("");
    setSsoFieldError("");
  };

  const isAccountLocked = errorType === "account_locked";

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/[0.07] blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-purple-400/[0.05] blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md space-y-6 p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100/80 sm:p-8">
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

        {/* Success messages */}
        {sessionExpired && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-amber-200">
            Your session has expired. Please sign in again.
          </div>
        )}
        {emailVerified && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
            Email verified successfully! You can now sign in.
          </div>
        )}
        {ssoError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-100">
            {decodeURIComponent(ssoError)}
          </div>
        )}

        {/* Error messages */}
        {error && (
          <div
            className={`rounded-lg p-3 text-sm ring-1 ${
              errorType === "credentials"
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : errorType === "account_locked"
                  ? "bg-red-50 text-red-700 ring-red-200"
                  : errorType === "sso_enforced"
                    ? "bg-indigo-50 text-indigo-800 ring-indigo-200"
                    : "bg-red-50 text-red-600 ring-red-100"
            }`}
          >
            <div className="flex items-start gap-2">
              {errorType === "credentials" && (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              {errorType === "account_locked" && (
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div className="flex-1">
                <p>{error}</p>
                {isAccountLocked && retryAfter && (
                  <p className="mt-1 text-xs font-medium">
                    Try again at {retryAfter.toLocaleTimeString()}
                  </p>
                )}
                {errorType === "sso_enforced" && (
                  <button
                    type="button"
                    onClick={switchToSSO}
                    className="mt-2 font-medium text-indigo-600 underline hover:text-indigo-700"
                  >
                    Sign in with SSO instead
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rate limit warning */}
        {attemptsUsed > 0 && attemptsUsed < attemptsAllowed && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {Math.max(0, attemptsAllowed - attemptsUsed)} attempt
                {attemptsAllowed - attemptsUsed !== 1 ? "s" : ""} remaining.
                Account locks after {attemptsAllowed} failed attempts.
              </span>
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
              onClick={switchToEmail}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to email login
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email)
                        setFieldErrors({ ...fieldErrors, email: undefined });
                    }}
                    className="pl-9"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={
                      fieldErrors.email ? "email-error" : undefined
                    }
                  />
                </div>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password)
                        setFieldErrors({
                          ...fieldErrors,
                          password: undefined,
                        });
                    }}
                    className="pl-9 pr-10"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password ? "password-error" : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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

              <Button
                type="submit"
                disabled={loading || isAccountLocked}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : isAccountLocked ? (
                  "Account Locked"
                ) : (
                  "Sign in"
                )}
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
              onClick={switchToSSO}
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
