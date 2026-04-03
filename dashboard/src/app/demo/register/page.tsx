"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

const PASSWORD_RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "1 uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 lowercase", test: (p: string) => /[a-z]/.test(p) },
  { label: "1 digit", test: (p: string) => /\d/.test(p) },
  { label: "1 special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

type Step = 1 | 2 | 3;

export default function DemoRegisterPage() {
  const { token, isDemo, setAuth, clearDemo } = useAppStore();
  const [step, setStep] = useState<Step>(1);
  const [convertedToken, setConvertedToken] = useState<string | null>(null);

  // Step 1 fields
  const [form, setForm] = useState({ email: "", password: "", name: "", org_name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 2 fields
  const [otp, setOtp] = useState("");
  const [otpResending, setOtpResending] = useState(false);

  // Step 3 fields
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");
  const [retainData, setRetainData] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  const passwordValid = useMemo(() => PASSWORD_RULES.every((r) => r.test(form.password)), [form.password]);

  const updateField = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value })),
    [],
  );

  const activeToken = convertedToken || token;

  if (!token || !isDemo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">No active demo session</h2>
          <p className="mt-1 text-sm text-slate-500">Start a demo first or log in to your account.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/demo" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Start Demo
            </Link>
            <Link href="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Registration form
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      setError("Password does not meet requirements");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api.convertDemo(token, {
        email: form.email,
        password: form.password,
        name: form.name,
        org_name: form.org_name,
        phone: form.phone,
      });
      setConvertedToken(data.tokens.access_token);
      clearDemo();
      setAuth(data.tokens.access_token, data.tokens.refresh_token, { email: form.email, name: form.name });
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to convert account");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: OTP verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeToken) return;
    setError(null);
    setLoading(true);
    try {
      await api.verifyOTP(activeToken, otp);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!activeToken) return;
    setOtpResending(true);
    try {
      await api.sendOTP(activeToken, form.phone);
    } catch {
      // best-effort
    } finally {
      setOtpResending(false);
    }
  };

  // Step 3: Plan selection
  const handleSelectPlan = async () => {
    if (!activeToken) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.selectDemoPlan(activeToken, { plan: selectedPlan, retain_data: retainData });
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      if (data.payu_url && formRef.current) {
        const form = formRef.current;
        form.action = data.payu_url;
        (form.querySelector('[name="key"]') as HTMLInputElement).value = data.key || "";
        (form.querySelector('[name="txnid"]') as HTMLInputElement).value = data.txnid || "";
        (form.querySelector('[name="hash"]') as HTMLInputElement).value = data.hash || "";
        (form.querySelector('[name="amount"]') as HTMLInputElement).value = data.amount || "";
        (form.querySelector('[name="productinfo"]') as HTMLInputElement).value = data.productinfo || "";
        (form.querySelector('[name="firstname"]') as HTMLInputElement).value = data.firstname || "";
        (form.querySelector('[name="email"]') as HTMLInputElement).value = data.email || "";
        (form.querySelector('[name="phone"]') as HTMLInputElement).value = data.phone || "";
        (form.querySelector('[name="surl"]') as HTMLInputElement).value = data.surl || "";
        (form.querySelector('[name="furl"]') as HTMLInputElement).value = data.furl || "";
        form.submit();
        return;
      }
    } catch (err: any) {
      setError(err.message || "Failed to select plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  s < step ? "bg-green-500 text-white" : s === step ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {s < step ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 ${s < step ? "bg-green-500" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg">
          {/* Step 1: Registration */}
          {step === 1 && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-xl font-bold text-slate-900">Create Your Account</h1>
                <p className="mt-1 text-sm text-slate-500">Convert your demo into a permanent account.</p>
              </div>

              {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={updateField("name")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={updateField("email")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="jane@company.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password *</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={updateField("password")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {PASSWORD_RULES.map((rule) => (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${rule.test(form.password) ? "bg-green-500" : "bg-slate-300"}`} />
                        <span className={`text-xs ${rule.test(form.password) ? "text-green-700" : "text-slate-400"}`}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={form.org_name}
                    onChange={updateField("org_name")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Acme Inc"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={updateField("phone")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="+919876543210"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !passwordValid}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Continue"}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Phone OTP Verification */}
          {step === 2 && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-xl font-bold text-slate-900">Verify Your Phone</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the 6-digit code sent to <span className="font-medium text-slate-700">{form.phone}</span>
                </p>
              </div>

              <div className="mb-5 rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  A verification link was also sent to <span className="font-medium">{form.email}</span>. You can verify your email anytime.
                </p>
              </div>

              {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-lg font-mono tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="000000"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={handleResendOTP}
                  disabled={otpResending}
                  className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
                >
                  {otpResending ? "Resending..." : "Resend OTP"}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-slate-400 hover:text-slate-600"
                >
                  Skip for now
                </button>
              </div>
            </>
          )}

          {/* Step 3: Plan Selection + Data Retention */}
          {step === 3 && (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-xl font-bold text-slate-900">Choose Your Plan</h1>
                <p className="mt-1 text-sm text-slate-500">Select a plan to get started with FeatureSignals.</p>
              </div>

              {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <div className="space-y-3">
                {/* Free plan */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("free")}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    selectedPlan === "free" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Free</h3>
                      <p className="text-sm text-slate-500">For individuals and small projects</p>
                    </div>
                    <span className="text-lg font-bold text-slate-900">$0<span className="text-sm font-normal text-slate-400">/mo</span></span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    <li>1 project, 2 environments, 3 team seats</li>
                    <li>Unlimited feature flags</li>
                  </ul>
                </button>

                {/* Pro plan */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan("pro")}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    selectedPlan === "pro" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">Pro</h3>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Recommended</span>
                      </div>
                      <p className="text-sm text-slate-500">For growing teams</p>
                    </div>
                    <span className="text-lg font-bold text-slate-900">&#8377;999<span className="text-sm font-normal text-slate-400">/mo</span></span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    <li>Unlimited projects, environments, team seats</li>
                    <li>Advanced targeting, A/B testing, audit logs</li>
                  </ul>
                </button>
              </div>

              {/* Data retention toggle */}
              <div className="mt-5 rounded-lg border border-slate-200 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={retainData}
                    onChange={(e) => setRetainData(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">Keep my demo data</span>
                    <p className="text-xs text-slate-400">
                      Preserve your feature flags, segments, environments, and API keys from the demo.
                    </p>
                  </div>
                </label>
              </div>

              <button
                onClick={handleSelectPlan}
                disabled={loading}
                className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : selectedPlan === "free" ? "Start with Free" : "Continue to Payment"}
              </button>

              {/* Hidden PayU form */}
              <form ref={formRef} method="POST" className="hidden">
                <input name="key" />
                <input name="txnid" />
                <input name="hash" />
                <input name="amount" />
                <input name="productinfo" />
                <input name="firstname" />
                <input name="email" />
                <input name="phone" />
                <input name="surl" />
                <input name="furl" />
              </form>
            </>
          )}

          <p className="mt-4 text-center text-xs text-slate-400">
            <Link href="/dashboard" className="text-indigo-600 hover:underline">Back to dashboard</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
