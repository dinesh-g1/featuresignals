"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

function CheckIcon({ met }: { met: boolean }) {
  if (met) {
    return (
      <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
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
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").slice(0, 6).split("");

  const handleChange = useCallback(
    (idx: number, char: string) => {
      if (char && !/^\d$/.test(char)) return;
      const next = [...digits];
      next[idx] = char;
      const joined = next.join("");
      onChange(joined.replace(/ /g, ""));
      if (char && idx < 5) refs.current[idx + 1]?.focus();
    },
    [digits, onChange],
  );

  const handleKeyDown = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[idx] && idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, 5);
      refs.current[focusIdx]?.focus();
    },
    [onChange],
  );

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-12 rounded-lg border border-slate-300 text-center text-lg font-semibold text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ))}
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
  const [form, setForm] = useState({ name: "", email: "", password: "", org_name: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteSignup() {
    setError("");
    setLoading(true);
    try {
      const data = await api.completeSignup({ email: form.email, otp });
      setAuth(data.tokens.access_token, data.tokens.refresh_token, data.user, data.organization);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Verification failed");
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
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
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
                  <div className={`h-0.5 w-16 ${isCompleted || isCurrent ? "bg-indigo-400" : "bg-slate-200"}`} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-xs font-medium ${isCurrent ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
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
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
              <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
              <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputCls} />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password <span className="text-red-500">*</span></label>
              <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className={inputCls} />
              <PasswordStrength password={form.password} />
            </div>
            <div>
              <label htmlFor="org_name" className="block text-sm font-medium text-slate-700">Organization Name <span className="text-red-500">*</span></label>
              <input id="org_name" type="text" value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} required className={inputCls} />
            </div>
            <button
              type="submit"
              disabled={!canSubmitForm || loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending verification code..." : "Continue"}
            </button>

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
                <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                We sent a 6-digit verification code to<br />
                <span className="font-medium text-slate-700">{form.email}</span>
              </p>
            </div>

            <OTPInput value={otp} onChange={setOtp} />

            <button
              onClick={handleCompleteSignup}
              disabled={otp.length !== 6 || loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating your account..." : "Verify & Create Account"}
            </button>

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
      </div>
    </div>
  );
}
