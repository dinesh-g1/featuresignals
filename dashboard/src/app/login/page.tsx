"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, APIError } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ShieldIcon,
  ArrowLeftIcon,
  MailIcon,
  LockIcon,
  AlertIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  SparklesIcon,
  BuildingIcon,
  ChevronRightIcon,
} from "@/components/icons/nav-icons";

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
          "Failed to discover SSO configuration. CheckIcon your organization slug.",
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bgColor-default)]">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-[var(--fgColor-accent)]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-[var(--fgColor-subtle)]">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bgColor-default)] px-4 py-12">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--bgColor-accent-emphasis)]/[0.04] blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-[var(--bgColor-accent-emphasis)]/[0.03] blur-3xl" />
        <div className="absolute -left-32 bottom-1/4 h-[350px] w-[350px] rounded-full bg-[var(--bgColor-muted)]/30 blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bgColor-accent-emphasis)] shadow-lg shadow-accent/20">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm4.28 7.78a.75.75 0 00-1.06-1.06l-4.97 4.97-1.97-1.97a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l5.5-5.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fgColor-default)]">
            FeatureSignals
          </h1>
          <p className="mt-1.5 text-sm text-[var(--fgColor-muted)]">
            {ssoMode
              ? "Sign in with your identity provider"
              : "Sign in to the enterprise control plane"}
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-[var(--borderColor-default)]/80 bg-white/90 shadow-xl shadow-stone-900/5 backdrop-blur-xl">
          <div className="p-6 sm:p-8">
            {/* ===== SUCCESS MESSAGES ===== */}
            {sessionExpired && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your session has expired. Please sign in again.
              </div>
            )}
            {emailVerified && (
              <div className="mb-5 rounded-xl border border-[var(--borderColor-success-muted)] bg-emerald-50 px-4 py-3 text-sm text-[var(--fgColor-success)]">
                Email verified successfully! You can now sign in.
              </div>
            )}
            {ssoError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-[var(--bgColor-danger-muted)] px-4 py-3 text-sm text-red-700">
                {decodeURIComponent(ssoError)}
              </div>
            )}

            {/* ===== ERROR MESSAGES ===== */}
            {error && (
              <div
                className={cn(
                  "mb-5 rounded-xl border px-4 py-3 text-sm",
                  errorType === "credentials" &&
                    "border-amber-200 bg-amber-50 text-amber-800",
                  errorType === "account_locked" &&
                    "border-red-200 bg-[var(--bgColor-danger-muted)] text-red-700",
                  errorType === "sso_enforced" &&
                    "border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]",
                  !["credentials", "account_locked", "sso_enforced"].includes(
                    errorType,
                  ) &&
                    "border-red-200 bg-[var(--bgColor-danger-muted)] text-red-700",
                )}
              >
                <div className="flex items-start gap-2.5">
                  {(errorType === "credentials" ||
                    errorType === "account_locked") && (
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
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
                        className="mt-2 font-semibold text-[var(--fgColor-accent)] underline hover:text-[var(--fgColor-accent)]"
                      >
                        Sign in with SSO instead
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===== RATE LIMIT WARNING ===== */}
            {attemptsUsed > 0 && attemptsUsed < attemptsAllowed && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 shrink-0" />
                  <span>
                    {Math.max(0, attemptsAllowed - attemptsUsed)} attempt
                    {attemptsAllowed - attemptsUsed !== 1 ? "s" : ""} remaining.
                    Account locks after {attemptsAllowed} failed attempts.
                  </span>
                </div>
              </div>
            )}

            {/* ===== SSO MODE ===== */}
            {ssoMode ? (
              <>
                <form
                  onSubmit={handleSSOLogin}
                  noValidate
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label
                      htmlFor="orgSlug"
                      className="text-sm font-semibold text-[var(--fgColor-default)]"
                    >
                      Organization Slug
                    </label>
                    <div className="relative">
                      <BuildingIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fgColor-subtle)]" />
                      <Input
                        id="orgSlug"
                        type="text"
                        placeholder="your-company"
                        value={orgSlug}
                        onChange={(e) => {
                          setOrgSlug(e.target.value);
                          if (ssoFieldError) setSsoFieldError("");
                        }}
                        className="pl-9"
                        aria-invalid={!!ssoFieldError}
                      />
                    </div>
                    {ssoFieldError && (
                      <p className="text-xs text-red-500" role="alert">
                        {ssoFieldError}
                      </p>
                    )}
                    <p className="text-xs text-[var(--fgColor-subtle)]">
                      Enter your organization&apos;s slug to discover your
                      identity provider.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={ssoLoading}
                    fullWidth
                    className="h-11"
                  >
                    {ssoLoading ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Discovering...
                      </>
                    ) : (
                      <>
                        <ShieldIcon className="h-4 w-4" />
                        Continue with SSO
                      </>
                    )}
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={switchToEmail}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm text-[var(--fgColor-muted)] transition-colors hover:text-[var(--fgColor-default)]"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                  Back to email login
                </button>
              </>
            ) : (
              <>
                {/* ===== EMAIL FORM ===== */}
                <form
                  onSubmit={handleEmailSubmit}
                  noValidate
                  className="space-y-5"
                >
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="text-sm font-semibold text-[var(--fgColor-default)]"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fgColor-subtle)]" />
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
                            setFieldErrors({
                              ...fieldErrors,
                              email: undefined,
                            });
                        }}
                        className="pl-9"
                        aria-invalid={!!fieldErrors.email}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-xs text-red-500" role="alert">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-sm font-semibold text-[var(--fgColor-default)]"
                      >
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-medium text-[var(--fgColor-accent)] hover:text-[var(--fgColor-accent)] transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <LockIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fgColor-subtle)]" />
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
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-muted)] transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-red-500" role="alert">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || isAccountLocked}
                    fullWidth
                    className="h-11"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Signing in...
                      </>
                    ) : isAccountLocked ? (
                      "Account Locked"
                    ) : (
                      <>
                        Sign in
                        <ChevronRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* ===== DIVIDER ===== */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--borderColor-default)]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-[var(--fgColor-subtle)]">
                      or continue with
                    </span>
                  </div>
                </div>

                {/* ===== SSO BUTTON ===== */}
                <button
                  type="button"
                  onClick={switchToSSO}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--borderColor-default)] bg-white py-3 text-sm font-semibold text-[var(--fgColor-default)] shadow-sm transition-all hover:bg-[var(--bgColor-default)] hover:border-[var(--borderColor-emphasis)] hover:shadow-md"
                >
                  <ShieldIcon className="h-4 w-4 text-[var(--fgColor-accent)]" />
                  Sign in with SSO
                </button>

                {/* ===== SIGN UP LINK ===== */}
                <p className="mt-6 text-center text-sm text-[var(--fgColor-muted)]">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-[var(--fgColor-accent)] transition-colors hover:text-[var(--fgColor-accent)]"
                  >
                    Sign up
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        {/* ===== Trust Signals ===== */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[var(--fgColor-subtle)]">
          <span className="flex items-center gap-1.5">
            <SparklesIcon className="h-3 w-3 text-[var(--fgColor-accent)]" />
            TLS Encrypted
          </span>
          <span className="text-stone-300">·</span>
          <span className="flex items-center gap-1.5">
            <ShieldIcon className="h-3 w-3 text-[var(--fgColor-accent)]" />
            RBAC
          </span>
          <span className="text-stone-300">·</span>
          <span>Open Source</span>
        </div>

        {/* ===== Footer ===== */}
        <p className="mt-4 text-center text-xs text-[var(--fgColor-subtle)]">
          &copy; {new Date().getFullYear()} FeatureSignals. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bgColor-default)]">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="h-8 w-8 animate-spin text-[var(--fgColor-accent)]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm text-[var(--fgColor-subtle)]">
              Loading...
            </span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
