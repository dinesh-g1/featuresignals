"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, APIError } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeftIcon,
  LoaderIcon,
  CheckCircleFillIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
} from "@/components/icons/nav-icons";
import { PasswordStrengthInline } from "@/components/ui/password-strength";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [fieldErrors, setFieldErrors] = useState<{
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      router.push("/projects");
      return;
    }
    setLoadingAuth(false);
  }, [token, router]);

  // Auto-redirect to login after success
  useEffect(() => {
    if (!success) return;
    if (redirectCountdown <= 0) {
      router.push("/login");
      return;
    }
    const timer = setTimeout(() => setRedirectCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, redirectCountdown, router]);

  // Focus first OTP input on mount
  useEffect(() => {
    if (!loadingAuth && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [loadingAuth]);

  const handleOTPChange = useCallback((index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    setOtp((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, otp: undefined }));
    if (value && index < 5) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  }, []);

  function handleOTPKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace") {
      e.preventDefault();
      setOtp((prev) => {
        if (prev[index]) {
          const next = [...prev];
          next[index] = "";
          return next;
        }
        if (index > 0) {
          const next = [...prev];
          next[index - 1] = "";
          setTimeout(() => inputRefs.current[index - 1]?.focus(), 0);
          return next;
        }
        return prev;
      });
      return;
    }
    if (e.key === "v" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      navigator.clipboard
        .readText()
        .then((text) => {
          const digits = text.replace(/\D/g, "").slice(0, 6).split("");
          setOtp((prev) => {
            const next = [...prev];
            digits.forEach((d, i) => {
              if (i < 6) next[i] = d;
            });
            return next;
          });
          const focusIndex = Math.min(digits.length, 5);
          inputRefs.current[focusIndex]?.focus();
        })
        .catch(() => {});
      return;
    }
    // Ignore non-numeric, non-navigation keys
    if (e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      e.preventDefault();
    }
  }

  function validatePassword(pw: string): string | undefined {
    if (pw.length < 8) return "At least 8 characters";
    if (!/[A-Z]/.test(pw)) return "Needs an uppercase letter";
    if (!/[a-z]/.test(pw)) return "Needs a lowercase letter";
    if (!/[0-9]/.test(pw)) return "Needs a number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw))
      return "Needs a special character";
    return undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const otpStr = otp.join("");
    if (otpStr.length !== 6) {
      setFieldErrors({ otp: "Please enter the full 6-digit code" });
      return;
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      setFieldErrors({ newPassword: pwError });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords don't match" });
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ otp: otpStr, new_password: newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof APIError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to reset password",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--signal-bg-secondary)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--signal-border-accent-muted)] border-t-[var(--signal-fg-accent)]" />
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout>
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
            Password reset
          </h2>
          <p className="mt-1.5 text-sm text-[var(--signal-fg-tertiary)]">
            Your password has been updated
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 rounded-xl bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)] p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[var(--signal-border-success-muted)]">
            <CheckCircleFillIcon className="h-7 w-7 text-[var(--signal-fg-success)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
              Password reset successful
            </h3>
            <p className="mt-1 text-xs text-[var(--signal-fg-secondary)]">
              Redirecting to sign in
              {redirectCountdown > 0 ? ` in ${redirectCountdown}s` : "..."}
            </p>
          </div>
        </div>

        <Link href="/login" className="mt-4 block">
          <Button className="w-full">Sign in now</Button>
        </Link>
      </AuthLayout>
    );
  }

  // ── Form state ────────────────────────────────────────────────
  return (
    <AuthLayout>
      {/* Heading */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)]">
          <KeyIcon className="h-5 w-5 text-[var(--signal-fg-accent)]" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
          Set a new password
        </h2>
        <p className="mt-1.5 text-sm text-[var(--signal-fg-tertiary)]">
          Enter the 6-digit code from your email and choose a new password
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mt-6 rounded-lg bg-[var(--signal-bg-danger-muted)] border border-[var(--signal-border-danger-muted)] p-3 text-sm text-[var(--signal-fg-danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
        {/* OTP Inputs */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--signal-fg-primary)]">
            Verification code
          </label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOTPChange(index, e.target.value)}
                onKeyDown={(e) => handleOTPKeyDown(index, e)}
                className={`w-12 h-14 text-center text-lg font-semibold rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--signal-fg-accent)] focus:border-[var(--signal-fg-accent)] ${
                  fieldErrors.otp
                    ? "border-[var(--signal-border-danger-emphasis)] bg-[var(--signal-bg-danger-muted)]"
                    : digit
                      ? "border-[var(--signal-border-accent-emphasis)] bg-[var(--signal-bg-accent-muted)]"
                      : "border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
                }`}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>
          {fieldErrors.otp && (
            <p className="text-xs text-[var(--signal-fg-danger)] text-center" role="alert">
              {fieldErrors.otp}
            </p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-[var(--signal-fg-primary)]"
          >
            New password
          </label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword)
                  setFieldErrors({ ...fieldErrors, newPassword: undefined });
              }}
              className="pr-10"
              error={!!fieldErrors.newPassword}
              aria-invalid={!!fieldErrors.newPassword}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {fieldErrors.newPassword && (
            <p className="text-xs text-[var(--signal-fg-danger)]" role="alert">
              {fieldErrors.newPassword}
            </p>
          )}
          <PasswordStrengthInline password={newPassword} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-[var(--signal-fg-primary)]"
          >
            Confirm password
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword)
                  setFieldErrors({
                    ...fieldErrors,
                    confirmPassword: undefined,
                  });
              }}
              className="pr-10"
              error={!!fieldErrors.confirmPassword}
              aria-invalid={!!fieldErrors.confirmPassword}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] transition-colors"
              tabIndex={-1}
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-[var(--signal-fg-danger)]" role="alert">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <LoaderIcon className="mr-1.5 h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--signal-fg-secondary)] transition-colors hover:text-[var(--signal-fg-primary)]"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
