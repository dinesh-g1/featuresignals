"use client";

import {
  Suspense,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MailIcon,
  AlertIcon,
  ArrowLeftIcon,
} from "@/components/icons/nav-icons";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isPasswordStrong,
  PasswordStrengthInline,
} from "@/components/ui/password-strength";

// ---------------------------------------------------------------------------
// OTP Input State Machine
// ---------------------------------------------------------------------------
// The OTP input follows a deterministic state machine:
//
//   IDLE → (focus) → FOCUSED → (digit) → FILLED → (digit) → FILLED …
//                              ↓                          ↓
//                        (backspace)                (backspace on filled)
//                              ↓                          ↓
//                         FOCUSED ←─────────────────── EMPTY
//
// Paste handling:
//   - On paste, split the pasted text across individual digit slots
//   - Validate each character is a digit (0-9)
//   - Auto-advance focus to the last filled slot (or next empty)
//
// This ensures mobile SMS autofill works (one-time-code autocomplete)
// and desktop clipboard paste works (Cmd+V / Ctrl+V).
// ---------------------------------------------------------------------------

function OTPInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);

  // Pad to 6 slots using space as placeholder ("".padEnd(6,"") returns "").
  const digits = useMemo(
    () => value.padEnd(6, " ").split("").slice(0, 6),
    [value],
  );

  // Sync uncontrolled input DOM values when parent state changes
  // (e.g., paste, backspace, or reset). We use defaultValue for
  // reliable keyboard capture, but need to sync when React state
  // changes from non-keyboard sources.
  useEffect(() => {
    digits.forEach((d, i) => {
      const el = inputRefs.current[i];
      if (el) {
        const expected = d !== " " ? d : "";
        if (el.value !== expected) el.value = expected;
      }
    });
  }, [digits]);

  // Focus a specific slot by index
  const focusSlot = useCallback((index: number) => {
    const el = inputRefs.current[index];
    if (el) {
      el.focus();
      setFocusedIdx(index);
    }
  }, []);

  // Handle ALL input in onKeyDown with preventDefault().
  // For controlled inputs with no onChange, we capture the keypress
  // directly, update state via the parent callback, and let React
  // re-render with the new controlled value.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
      // Digit keys — capture, update state, auto-advance
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        const nv = value.split("");
        nv[idx] = e.key;
        onChange(nv.join("").replace(/\s/g, ""));
        if (idx < 5) {
          setTimeout(() => focusSlot(idx + 1), 0);
        }
        return;
      }

      // Tab — allow form navigation
      if (e.key === "Tab") return;

      // Arrow keys — manual navigation
      if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        focusSlot(idx - 1);
        return;
      }
      if (e.key === "ArrowRight" && idx < 5) {
        e.preventDefault();
        focusSlot(idx + 1);
        return;
      }

      // Block all other keys
      e.preventDefault();

      if (e.key === "Backspace") {
        if (value[idx] && value[idx] !== " ") {
          const nv = value.split("");
          nv[idx] = " ";
          onChange(nv.join("").replace(/\s/g, ""));
        } else if (idx > 0) {
          focusSlot(idx - 1);
          const nv = value.split("");
          nv[idx - 1] = " ";
          onChange(nv.join("").replace(/\s/g, ""));
        }
      }
    },
    [value, onChange, focusSlot],
  );

  // Handle paste — split pasted digits across all 6 slots
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").trim();
      const digitOnly = pasted.replace(/\D/g, "").slice(0, 6);
      if (digitOnly.length === 0) return;

      onChange(digitOnly);
      focusSlot(Math.min(digitOnly.length, 5));
    },
    [onChange, focusSlot],
  );

  return (
    <div
      className="flex justify-center gap-2 sm:gap-2.5"
      role="group"
      aria-label="6-digit verification code"
    >
      {digits.map((d, i) => {
        const isFilled = d !== " ";
        const isFocused = focusedIdx === i;
        return (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            autoComplete="one-time-code"
            maxLength={1}
            defaultValue={isFilled ? d : ""}
            onInput={(e) => {
              const digit = (e.target as HTMLInputElement).value.replace(
                /\D/g,
                "",
              );
              if (digit) {
                const nv = value.split("");
                nv[i] = digit;
                onChange(nv.join("").replace(/\s/g, ""));
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIdx(i)}
            className={cn(
              "w-10 h-12 sm:w-12 sm:h-14 rounded-lg border-2 text-center text-lg sm:text-2xl font-bold text-[var(--signal-fg-primary)] transition-all select-none bg-white",
              "focus:outline-none focus:ring-[3px] focus:ring-[var(--signal-fg-accent)]/10",
              isFocused && !isFilled
                ? "border-[var(--signal-fg-accent)] shadow-[0_0_0_3px_rgba(13,148,136,0.15)]"
                : isFilled
                  ? "border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]"
                  : "border-[var(--signal-border-emphasis)] shadow-sm",
            )}
            aria-label={`Digit ${i + 1}`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resend Cooldown Progress Bar
// ---------------------------------------------------------------------------

function ResendCooldown({
  countdown,
  onResend,
  loading,
}: {
  countdown: number;
  onResend: () => void;
  loading: boolean;
}) {
  const TOTAL_SECONDS = 60;
  const progress =
    countdown > 0 ? ((TOTAL_SECONDS - countdown) / TOTAL_SECONDS) * 100 : 100;

  if (countdown <= 0) {
    return (
      <Button
        onClick={onResend}
        disabled={loading}
        variant="link"
        size="sm"
        className="text-sm font-medium"
      >
        Resend Code
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--signal-bg-secondary)]">
        <div
          className={`h-full rounded-full bg-[var(--signal-bg-accent-emphasis)] transition-all duration-1000 w-[${progress}%]`}
        />
      </div>
      <p className="text-xs text-[var(--signal-fg-tertiary)]">
        Resend code in {countdown}s
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_REGEX.test(email.trim()))
    return "Please enter a valid email address";
  return undefined;
}

// ---------------------------------------------------------------------------
// Registration Form
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--signal-bg-secondary)] px-4 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--signal-border-accent-muted)] border-t-accent" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAppStore((s) => s.setAuth);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    org_name: "",
    data_region: "",
  });
  const planIntent = searchParams.get("plan");

  useEffect(() => {
    if (planIntent) {
      localStorage.setItem("fs_plan_intent", planIntent);
    }
  }, [planIntent]);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpError, setOtpError] = useState<{
    message: string;
    type: "invalid" | "expired" | "general";
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    org_name?: string;
    data_region?: string;
  }>({});

  // Track which fields the user has interacted with — only show inline errors
  // after touch (blur) or after a submit attempt. Prevents "Email is required"
  // from flashing on initial render.
  const [touched, setTouched] = useState({
    email: false,
  });

  const regions = [
    {
      code: "in",
      name: "India",
      flag: "\u{1F1EE}\u{1F1F3}",
    },
    {
      code: "us",
      name: "United States",
      flag: "\u{1F1FA}\u{1F1F8}",
    },
    {
      code: "eu",
      name: "Europe",
      flag: "\u{1F1EA}\u{1F1FA}",
    },
  ];
  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // Real-time email validation — only active after field is touched
  // to prevent "Email is required" from showing on initial render.
  const emailError = useMemo(
    () => (touched.email ? validateEmail(form.email) : undefined),
    [form.email, touched.email],
  );

  function validateForm() {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      org_name?: string;
      data_region?: string;
    } = {};
    if (form.name.trim() === "") errors.name = "Name is required";
    const emailErr = validateEmail(form.email);
    if (emailErr) errors.email = emailErr;
    if (form.password === "") errors.password = "Password is required";
    if (form.org_name.trim() === "")
      errors.org_name = "Organization name is required";
    if (!form.data_region) errors.data_region = "Please select a data region";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const canSubmitForm =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    !emailError &&
    form.org_name.trim() !== "" &&
    isPasswordStrong(form.password);

  async function handleInitiateSignup() {
    setError("");
    setOtpError(null);

    // Mark all fields as touched on submit attempt so inline errors appear
    setTouched({ email: true });

    if (!validateForm()) return;

    setLoading(true);

    try {
      await api.initiateSignup(form);
      setStep("otp");
      setCountdown(60);
      setOtp("");
      setOtpError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteSignup() {
    setError("");
    setOtpError(null);

    if (otp.length !== 6) {
      setOtpError({ message: "Please enter all 6 digits", type: "invalid" });
      return;
    }

    setLoading(true);
    try {
      const data = await api.completeSignup({ email: form.email, otp });
      setAuth(
        data.tokens.access_token,
        data.tokens.refresh_token,
        data.user,
        data.organization,
        data.tokens.expires_at,
        data.onboarding_completed,
      );
      router.push("/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      // Distinguish between invalid and expired OTP errors
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes("expir")) {
        setOtpError({
          message: "This code has expired. Request a new one.",
          type: "expired",
        });
      } else if (
        lowerMsg.includes("invalid") ||
        lowerMsg.includes("incorrect") ||
        lowerMsg.includes("wrong")
      ) {
        setOtpError({
          message: "Invalid code. CheckIcon your email and try again.",
          type: "invalid",
        });
      } else {
        setOtpError({ message: msg, type: "general" });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setError("");
    setOtpError(null);
    setLoading(true);
    try {
      await api.resendSignupOTP(form.email);
      setCountdown(60);
      setOtp("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }

  // Go back from OTP step to form step, preserving all form data
  function handleBackToForm() {
    setStep("form");
    setOtp("");
    setOtpError(null);
    setError("");
    setTouched({ email: false });
  }

  return (
    <AuthLayout>
      <div className="space-y-5">
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
            {step === "form" ? "Create your account" : "Verify your email"}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--signal-fg-secondary)]">
            {step === "form"
              ? "14-day Pro trial — no credit card required"
              : "Enter the 6-digit code sent to " + form.email}
          </p>
        </div>

        {error && (
          <div
            className="flex items-start gap-2 rounded-lg bg-[var(--signal-bg-danger-muted)] p-3 text-sm text-red-600 ring-1 ring-red-100"
            role="alert"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Account details */}
        {step === "form" && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleInitiateSignup();
            }}
            className="space-y-5"
          >
            {/* 2-column grid for form fields on desktop, single column on mobile */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Name <span className="text-[var(--signal-fg-danger)]">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (fieldErrors.name)
                      setFieldErrors({ ...fieldErrors, name: undefined });
                  }}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                  required
                />
                {fieldErrors.name && (
                  <p
                    className="text-xs text-[var(--signal-fg-danger)]"
                    role="alert"
                    id="name-error"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email{" "}
                  <span className="text-[var(--signal-fg-danger)]">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (fieldErrors.email)
                      setFieldErrors({ ...fieldErrors, email: undefined });
                    // Reset touched on change so inline error clears while typing
                    if (touched.email) setTouched({ ...touched, email: false });
                  }}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  aria-invalid={!!emailError || !!fieldErrors.email}
                  aria-describedby={
                    emailError || fieldErrors.email ? "email-error" : undefined
                  }
                  required
                />
                {(emailError || fieldErrors.email) && (
                  <p
                    className="text-xs text-[var(--signal-fg-danger)]"
                    role="alert"
                    id="email-error"
                  >
                    {emailError || fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Password{" "}
                  <span className="text-[var(--signal-fg-danger)]">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    if (fieldErrors.password)
                      setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={
                    fieldErrors.password ? "password-error" : undefined
                  }
                  required
                />
                {fieldErrors.password && (
                  <p
                    className="text-xs text-[var(--signal-fg-danger)]"
                    role="alert"
                    id="password-error"
                  >
                    {fieldErrors.password}
                  </p>
                )}
                {/* Inline password strength meter */}
                <PasswordStrengthInline password={form.password} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org_name">
                  Organization Name{" "}
                  <span className="text-[var(--signal-fg-danger)]">*</span>
                </Label>
                <Input
                  id="org_name"
                  name="organization"
                  type="text"
                  autoComplete="organization"
                  value={form.org_name}
                  onChange={(e) => {
                    setForm({ ...form, org_name: e.target.value });
                    if (fieldErrors.org_name)
                      setFieldErrors({ ...fieldErrors, org_name: undefined });
                  }}
                  aria-invalid={!!fieldErrors.org_name}
                  aria-describedby={
                    fieldErrors.org_name ? "org_name-error" : undefined
                  }
                  required
                />
                {fieldErrors.org_name && (
                  <p
                    className="text-xs text-[var(--signal-fg-danger)]"
                    role="alert"
                    id="org_name-error"
                  >
                    {fieldErrors.org_name}
                  </p>
                )}
              </div>
            </div>

            {/* Data region — compact inline selector */}
            <fieldset>
              <legend className="text-sm font-medium text-[var(--signal-fg-primary)] mb-1.5">
                Data Region{" "}
                <span className="text-[var(--signal-fg-danger)]">*</span>
              </legend>
              <div className="flex gap-2">
                {regions.map((region) => (
                  <label
                    key={region.code}
                    className={cn(
                      "flex-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2 px-3 text-sm transition-all",
                      form.data_region === region.code
                        ? "border-[var(--signal-fg-accent)] bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] font-medium"
                        : "border-[var(--signal-border-default)] text-[var(--signal-fg-secondary)] hover:border-[var(--signal-border-emphasis)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="data_region"
                      value={region.code}
                      checked={form.data_region === region.code}
                      onChange={(e) => {
                        setForm({ ...form, data_region: e.target.value });
                        if (fieldErrors.data_region)
                          setFieldErrors({
                            ...fieldErrors,
                            data_region: undefined,
                          });
                      }}
                      className="sr-only"
                    />
                    <span>{region.flag}</span>
                    <span>{region.name}</span>
                  </label>
                ))}
              </div>
              {fieldErrors.data_region && (
                <p
                  className="mt-1 text-xs text-[var(--signal-fg-danger)]"
                  role="alert"
                >
                  {fieldErrors.data_region}
                </p>
              )}
            </fieldset>

            <Button
              type="submit"
              disabled={!canSubmitForm || loading}
              className="w-full"
            >
              {loading ? "Sending verification code..." : "Continue"}
            </Button>

            <p className="text-center text-xs text-[var(--signal-fg-tertiary)]">
              By continuing, you agree to our{" "}
              <a
                href="https://featuresignals.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--signal-fg-accent)] hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://featuresignals.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--signal-fg-accent)] hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
            <p className="text-center text-xs text-[var(--signal-fg-tertiary)]">
              14-day free trial, cancel anytime. No credit card required.
            </p>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === "otp" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)]">
                <MailIcon className="h-7 w-7 text-[var(--signal-fg-accent)]" />
              </div>
              <p className="mt-4 text-sm text-[var(--signal-fg-secondary)]">
                We sent a 6-digit verification code to
                <br />
                <span className="font-medium text-[var(--signal-fg-primary)]">
                  {form.email}
                </span>
              </p>
              {/* Wrong email? Go back — preserves form data */}
              <button
                onClick={handleBackToForm}
                className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--signal-fg-tertiary)] transition-colors hover:text-[var(--signal-fg-accent)]"
                type="button"
              >
                <ArrowLeftIcon className="h-3 w-3" />
                Wrong email? Go back
              </button>
            </div>

            <OTPInput value={otp} onChange={setOtp} />

            {/* OTP error message */}
            {otpError && (
              <div
                className="flex items-start gap-2 rounded-lg bg-[var(--signal-bg-danger-muted)] p-3 text-sm text-red-600 ring-1 ring-red-100"
                role="alert"
              >
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{otpError.message}</span>
              </div>
            )}

            <Button
              onClick={handleCompleteSignup}
              disabled={otp.length !== 6 || loading}
              className="w-full"
            >
              {loading ? "Creating your account..." : "Verify & Create Account"}
            </Button>

            <div className="flex flex-col items-center gap-3">
              <ResendCooldown
                countdown={countdown}
                onResend={handleResendOTP}
                loading={loading}
              />
            </div>
          </div>
        )}

        {step === "form" && (
          <p className="text-center text-sm text-[var(--signal-fg-secondary)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--signal-fg-accent)] transition-colors hover:text-[var(--signal-fg-accent)]"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
