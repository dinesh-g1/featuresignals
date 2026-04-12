"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, APIError } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

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
      router.push("/dashboard");
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

  // Focus first input on mount
  useEffect(() => {
    if (!loadingAuth && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [loadingAuth]);

  function handleOTPChange(index: number, value: string) {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setFieldErrors((prev) => ({ ...prev, otp: undefined }));

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    // Backspace: clear current and move to previous
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Paste handling
    if (e.key === "v" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      navigator.clipboard
        .readText()
        .then((text) => {
          const digits = text.replace(/\D/g, "").slice(0, 6).split("");
          const newOtp = [...otp];
          digits.forEach((digit, i) => {
            if (i < 6) newOtp[i] = digit;
          });
          setOtp(newOtp);
          const focusIndex = Math.min(digits.length, 5);
          inputRefs.current[focusIndex]?.focus();
        })
        .catch(() => {});
    }
  }

  function validatePassword(pw: string): string | undefined {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(pw)) return "Password must contain a number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw))
      return "Password must contain a special character";
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
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ otp: otpStr, new_password: newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to reset password",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/[0.07] blur-3xl" />
        </div>
        <Card className="relative w-full max-w-md space-y-6 p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100/80 sm:p-8">
          <div className="text-center">
            <h1 className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              FeatureSignals
            </h1>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              Password reset successful
            </h2>
            <p className="text-sm text-slate-600">
              Redirecting to sign in
              {redirectCountdown > 0 ? ` in ${redirectCountdown}s` : "..."}
            </p>
          </div>
          <Link href="/login">
            <Button className="w-full">Sign in now</Button>
          </Link>
        </Card>
      </div>
    );
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
            Enter the code from your email
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* OTP Inputs */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
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
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-xl font-semibold rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    fieldErrors.otp
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-white"
                  }`}
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>
            {fieldErrors.otp && (
              <p className="text-xs text-red-500 text-center" role="alert">
                {fieldErrors.otp}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-slate-700"
            >
              New password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword)
                    setFieldErrors({ ...fieldErrors, newPassword: undefined });
                }}
                className={`w-full rounded-lg border-2 px-3 py-2.5 pr-10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  fieldErrors.newPassword
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 bg-white"
                }`}
                aria-invalid={!!fieldErrors.newPassword}
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
            {fieldErrors.newPassword && (
              <p className="text-xs text-red-500" role="alert">
                {fieldErrors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
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
                className={`w-full rounded-lg border-2 px-3 py-2.5 pr-10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  fieldErrors.confirmPassword
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 bg-white"
                }`}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-500" role="alert">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>

        <Link href="/login">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </button>
        </Link>
      </Card>
    </div>
  );
}
