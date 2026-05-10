"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, APIError } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  LoaderIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleFillIcon,
  SendIcon,
} from "@/components/icons/nav-icons";
import { PasswordStrengthInline } from "@/components/ui/password-strength";

type Step = "email" | "checkEmail" | "reset" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
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

  // Auto-redirect after success
  useEffect(() => {
    if (step !== "success") return;
    if (redirectCountdown <= 0) {
      router.push("/login");
      return;
    }
    const timer = setTimeout(() => setRedirectCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, redirectCountdown, router]);

  // Focus OTP input when entering reset step
  useEffect(() => {
    if (step === "reset" && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [step]);

  // ── Email Step: Send reset code ──────────────────────────────────

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    if (!email.trim()) {
      setFieldErrors({ email: "Email is required" });
      setLoading(false);
      return;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldErrors({ email: "Please enter a valid email address" });
      setLoading(false);
      return;
    }

    try {
      await api.forgotPassword({ email: email.trim() });
      setStep("checkEmail");
    } catch (err: unknown) {
      if (err instanceof APIError) {
        // Don't reveal whether the email exists (security)
        if (err.status === 404 || err.status === 422) {
          // Still show check email for security — don't reveal if account exists
          setStep("checkEmail");
        } else if (err.status === 429) {
          setError("Too many attempts. Please try again later.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to send reset email");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Proceed from check-email to reset step ───────────────────────

  function handleProceedToReset() {
    setStep("reset");
    setOtp(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setFieldErrors({});
  }

  // ── OTP Input Handlers ───────────────────────────────────────────

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
    }

    // Allow digits to be handled by onChange
    if (/^\d$/.test(e.key)) {
      // Let the onChange handler deal with it via the input's native behavior
      return;
    }

    // Block all other non-navigation keys
    if (e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      e.preventDefault();
    }
  }

  // ── Reset Password Submit ────────────────────────────────────────

  function validatePassword(pw: string): string | undefined {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter";
    if (!/\d/.test(pw)) return "Password must contain a number";
    if (!/[^A-Za-z0-9]/.test(pw))
      return "Password must contain a special character";
    return undefined;
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const otpStr = otp.join("");
    const errors: typeof fieldErrors = {};

    if (otpStr.length !== 6) {
      errors.otp = "Please enter the full 6-digit code";
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      errors.newPassword = pwError;
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ otp: otpStr, new_password: newPassword });
      setStep("success");
    } catch (err: unknown) {
      if (err instanceof APIError) {
        const msg = err.message.toLowerCase();
        if (msg.includes("expir") || msg.includes("expired")) {
          setFieldErrors({ otp: "This code has expired. Request a new one." });
        } else if (msg.includes("invalid") || msg.includes("wrong") || msg.includes("incorrect")) {
          setFieldErrors({ otp: "Invalid code. Please check and try again." });
        } else if (msg.includes("already used")) {
          setError("This reset link has already been used. Please request a new one.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to reset password");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBackToEmail() {
    setStep("email");
    setOtp(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setFieldErrors({});
  }

  // ── Loading State ─────────────────────────────────────────────────

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--signal-bg-primary)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--signal-border-accent-muted)] border-t-accent" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <AuthLayout>

        {/* Heading */}
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
            {step === "email" && "Reset your password"}
            {step === "checkEmail" && "Check your email"}
            {step === "reset" && "Set a new password"}
            {step === "success" && "Password reset"}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--signal-fg-tertiary)]">
            {step === "email" && "Enter your email to receive a reset code"}
            {step === "checkEmail" &&
              `We sent a 6-digit code to ${email}`}
            {step === "reset" && "Enter the code from your email and a new password"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--signal-bg-danger-muted)] border border-[var(--signal-border-danger-muted)] p-3 text-sm text-[var(--signal-fg-danger)]">
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── Step: Email ────────────────────────────────────────── */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} noValidate className="mt-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--signal-fg-tertiary)]" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({});
                  }}
                  className="pl-9"
                  aria-invalid={!!fieldErrors.email}
                  autoFocus
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-[var(--signal-fg-danger)]" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <LoaderIcon className="mr-1.5 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  <SendIcon className="mr-1.5 h-4 w-4" />
                  Send reset code
                </>
              )}
            </Button>
          </form>
        )}

        {/* ── Step: Check Email (interstitial) ────────────────────── */}
        {step === "checkEmail" && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-col items-center gap-4 rounded-xl bg-[var(--signal-bg-accent-muted)] border border-[var(--signal-border-accent-muted)] p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--signal-bg-primary)] shadow-sm ring-1 ring-accent/10">
                <MailIcon className="h-7 w-7 text-[var(--signal-fg-accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  Check your inbox
                </h3>
                <p className="mt-1 text-xs text-[var(--signal-fg-secondary)]">
                  We&apos;ve sent a 6-digit verification code to{" "}
                  <span className="font-medium text-[var(--signal-fg-primary)]">
                    {email}
                  </span>
                  . The code expires in 15 minutes.
                </p>
                <p className="mt-2 text-xs text-[var(--signal-fg-tertiary)]">
                  Didn&apos;t receive it? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="font-medium text-[var(--signal-fg-accent)] hover:underline"
                  >
                    try a different email
                  </button>
                  .
                </p>
              </div>
            </div>

            <Button onClick={handleProceedToReset} className="w-full">
              I have the code — continue
            </Button>
          </div>
        )}

        {/* ── Step: Reset (OTP + new password) ────────────────────── */}
        {step === "reset" && (
          <form onSubmit={handleResetSubmit} noValidate className="mt-6 space-y-5">
            {/* OTP Input */}
            <div className="space-y-1.5">
              <Label>Verification code</Label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    className={cn(
                      "w-12 h-14 text-center text-xl font-semibold rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--signal-fg-accent)] focus:border-[var(--signal-fg-accent)]",
                      fieldErrors.otp
                        ? "border-[var(--signal-border-danger-emphasis)] bg-[var(--signal-bg-danger-muted)]"
                        : digit
                          ? "border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]"
                          : "border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]",
                    )}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
              {fieldErrors.otp && (
                <p className="text-xs text-[var(--signal-fg-danger)] text-center" role="alert">
                  {fieldErrors.otp}
                </p>
              )}
              <p className="text-xs text-[var(--signal-fg-tertiary)] text-center mt-1.5">
                Code expires in 15 minutes.{" "}
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="font-medium text-[var(--signal-fg-accent)] hover:underline"
                >
                  Resend code
                </button>
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--signal-border-default)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--signal-bg-primary)] px-3 text-[var(--signal-fg-tertiary)]">
                  New password
                </span>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword)
                      setFieldErrors({ ...fieldErrors, newPassword: undefined });
                  }}
                  className="pr-10"
                  placeholder="Enter new password"
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
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword)
                      setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                  }}
                  className="pr-10"
                  placeholder="Confirm new password"
                  aria-invalid={!!fieldErrors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
        )}

        {/* ── Step: Success ────────────────────────────────────────── */}
        {step === "success" && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4 rounded-xl bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)] p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--signal-bg-primary)] shadow-sm ring-1 ring-[var(--signal-border-success-muted)]">
                <CheckCircleFillIcon className="h-7 w-7 text-[var(--signal-fg-success)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  Password reset successfully
                </h3>
                <p className="mt-1 text-xs text-[var(--signal-fg-secondary)]">
                  Your password has been updated. Redirecting to sign in
                  {redirectCountdown > 0 ? ` in ${redirectCountdown}s` : "..."}
                </p>
              </div>
            </div>
            <Link href="/login">
              <Button className="w-full">Sign in now</Button>
            </Link>
          </div>
        )}

        {/* Back to login link */}
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
