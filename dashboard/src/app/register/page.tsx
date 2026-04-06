"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

function CheckIcon({ met }: { met: boolean }) {
  if (met) {
    return <Check className="h-4 w-4 text-emerald-500" />;
  }
  return <X className="h-4 w-4 text-slate-300" />;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "1 uppercase letter", met: /[A-Z]/.test(password) },
    { label: "1 lowercase letter", met: /[a-z]/.test(password) },
    { label: "1 number", met: /\d/.test(password) },
    { label: "1 special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className="mt-2 space-y-1">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-2 text-xs text-slate-500">
          <CheckIcon met={c.met} />
          <span className={c.met ? "text-emerald-600" : ""}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function isPasswordStrong(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");
  const activeIdx = Math.min(value.replace(/\s/g, "").length, 5);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 6);
      onChange(raw);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && value.length === 0) {
        e.preventDefault();
      }
    },
    [value],
  );

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative flex flex-col items-center" onClick={focusInput}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={6}
        className="absolute opacity-0 w-px h-px top-0 left-0 pointer-events-none"
        aria-label="Enter 6-digit verification code"
      />
      <div className="flex justify-center gap-2 sm:gap-2.5 cursor-text">
        {digits.map((d, i) => {
          const isFilled = d.trim() !== "";
          const isActive = focused && i === activeIdx;
          return (
            <div
              key={i}
              className={cn(
                "w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center rounded-lg border-2 text-lg sm:text-2xl font-bold text-slate-800 transition-all select-none",
                isActive
                  ? "border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                  : "border-slate-300 shadow-sm",
                isFilled ? "bg-indigo-50" : "bg-white",
              )}
            >
              {isFilled ? d : isActive ? (
                <div className="w-0.5 h-6 bg-indigo-500 rounded-sm animate-blink" />
              ) : null}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } } .animate-blink { animation: blink 1s step-end infinite; }`}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [form, setForm] = useState({ name: "", email: "", password: "", org_name: "", data_region: "us" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const regionOptions = [
    { code: "us", name: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
    { code: "eu", name: "Europe", flag: "\u{1F1EA}\u{1F1FA}" },
    { code: "in", name: "India", flag: "\u{1F1EE}\u{1F1F3}" },
  ];

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const canSubmitForm =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.org_name.trim() !== "" &&
    isPasswordStrong(form.password);

  async function handleInitiateSignup() {
    setError("");
    setLoading(true);
    try {
      await api.initiateSignup(form);
      setStep("otp");
      setCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteSignup() {
    setError("");
    setLoading(true);
    try {
      const data = await api.completeSignup({ email: form.email, otp });
      setAuth(data.tokens.access_token, data.tokens.refresh_token, data.user, data.organization, data.tokens.expires_at);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setError("");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-lg space-y-8 p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-600">FeatureSignals</h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === "form" ? "Create your account" : "Verify your email"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0">
          {["Account", "Verify Email"].map((label, i) => {
            const isCompleted = step === "otp" && i === 0;
            const isCurrent = (step === "form" && i === 0) || (step === "otp" && i === 1);
            return (
              <div key={label} className="flex items-center">
                {i > 0 && (
                  <div className={cn("h-0.5 w-12 sm:w-16", isCompleted || isCurrent ? "bg-indigo-400" : "bg-slate-200")} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                          : "bg-slate-200 text-slate-500",
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={cn("text-xs font-medium", isCurrent ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-slate-400")}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {/* Step 1: Account details */}
        {step === "form" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInitiateSignup();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <PasswordStrength password={form.password} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org_name">Organization Name <span className="text-red-500">*</span></Label>
              <Input id="org_name" type="text" value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} required />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">Data Region <span className="text-red-500">*</span></legend>
              <p className="text-xs text-slate-400">Choose where your data is stored for compliance</p>
              <div className="grid grid-cols-3 gap-2">
                {regionOptions.map((region) => (
                  <label
                    key={region.code}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all",
                      form.data_region === region.code
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="data_region"
                      value={region.code}
                      checked={form.data_region === region.code}
                      onChange={(e) => setForm({ ...form, data_region: e.target.value })}
                      className="sr-only"
                    />
                    <span className="text-xl">{region.flag}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      form.data_region === region.code ? "text-indigo-700" : "text-slate-600"
                    )}>{region.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" disabled={!canSubmitForm || loading} className="w-full">
              {loading ? "Sending verification code..." : "Continue"}
            </Button>

            <div className="text-center">
              <p className="text-xs text-slate-400">
                By signing up you agree to our Terms of Service and Privacy Policy.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                You will start with a <span className="font-semibold text-indigo-600">14-day free trial</span> with full Pro features.
              </p>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === "otp" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                <Mail className="h-7 w-7 text-indigo-600" />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                We sent a 6-digit verification code to<br />
                <span className="font-medium text-slate-700">{form.email}</span>
              </p>
            </div>

            <OTPInput value={otp} onChange={setOtp} />

            <Button
              onClick={handleCompleteSignup}
              disabled={otp.length !== 6 || loading}
              className="w-full"
            >
              {loading ? "Creating your account..." : "Verify & Create Account"}
            </Button>

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-slate-400">Resend code in {countdown}s</p>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep("form"); setOtp(""); setError(""); }}
              className="w-full text-center text-sm text-slate-400 transition-colors hover:text-slate-600"
            >
              Back to account details
            </button>
          </div>
        )}

        {step === "form" && (
          <p className="text-center text-sm text-slate-500">
            Already have an account? <Link href="/login" className="font-medium text-indigo-600 transition-colors hover:text-indigo-700">Sign in</Link>
          </p>
        )}

        {/* Trust signals */}
        <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["SOC 2", "GDPR", "HIPAA", "ISO 27001"].map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg className="h-3 w-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Enterprise-grade security &middot; Encrypted &middot; Open source
          </div>
        </div>
      </Card>
    </div>
  );
}
