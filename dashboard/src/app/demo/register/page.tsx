"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function DemoRegisterPage() {
  const router = useRouter();
  const { token, isDemo, setAuth, clearDemo } = useAppStore();
  const [form, setForm] = useState({ email: "", password: "", name: "", org_name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.convertDemo(token, {
        email: form.email,
        password: form.password,
        name: form.name,
        org_name: form.org_name,
        phone: form.phone || undefined,
      });
      clearDemo();
      setAuth(data.tokens.access_token, data.tokens.refresh_token, { email: form.email, name: form.name });
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to convert account");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Keep Your Demo Data</h1>
            <p className="mt-1 text-sm text-slate-500">
              Register to convert your demo into a permanent account. All your flags, segments, and settings will be preserved.
            </p>
          </div>

          <div className="mb-5 rounded-lg bg-green-50 p-3">
            <div className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <p className="text-xs text-green-800">
                Your existing feature flags, environments, segments, and API keys will be preserved.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={updateField("password")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Organization Name</label>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone <span className="text-slate-400">(optional)</span></label>
              <input
                type="tel"
                value={form.phone}
                onChange={updateField("phone")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="+919876543210"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Converting..." : "Register & Keep My Data"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            <Link href="/dashboard" className="text-indigo-600 hover:underline">Back to dashboard</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
