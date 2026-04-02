"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

export function DemoBanner() {
  const { isDemo, demoExpiresAt, token, logout } = useAppStore();
  const [daysRemaining, setDaysRemaining] = useState<number>(7);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    if (!demoExpiresAt) return;
    const update = () => {
      const now = Date.now() / 1000;
      const remaining = Math.max(0, Math.ceil((demoExpiresAt - now) / 86400));
      setDaysRemaining(remaining);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [demoExpiresAt]);

  if (!isDemo) return null;

  const handleFeedbackSubmit = async () => {
    if (!token || !feedbackMsg.trim()) return;
    try {
      await api.submitDemoFeedback(token, {
        message: feedbackMsg,
        email: feedbackEmail || undefined,
        rating: feedbackRating || undefined,
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackOpen(false), 2000);
    } catch {
      // silently fail
    }
  };

  if (daysRemaining <= 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-4 max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-center text-xl font-bold text-slate-900">Your demo has expired</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Register now to keep all your flags and settings, or share your feedback with us.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/demo/register"
              className="block w-full rounded-lg bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Register to Keep Your Data
            </Link>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Share Feedback Instead
            </button>
            <button
              onClick={logout}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Start a new demo
            </button>
          </div>
          {feedbackOpen && !feedbackSent && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <textarea
                value={feedbackMsg}
                onChange={(e) => setFeedbackMsg(e.target.value)}
                placeholder="Tell us what you think..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={3}
              />
              <input
                type="email"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                placeholder="Email (optional, for follow-up)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-1">
                <span className="mr-2 text-xs text-slate-500">Rating:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFeedbackRating(n)}
                    className={`h-8 w-8 rounded text-sm font-medium ${
                      feedbackRating >= n
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={handleFeedbackSubmit}
                disabled={!feedbackMsg.trim()}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Submit Feedback
              </button>
            </div>
          )}
          {feedbackSent && (
            <p className="mt-4 text-center text-sm font-medium text-green-600">
              Thank you for your feedback!
            </p>
          )}
        </div>
      </div>
    );
  }

  if (daysRemaining <= 2) {
    return (
      <div className="flex items-center justify-between bg-amber-500 px-4 py-2.5 text-sm text-white">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="font-medium">
            Your demo expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}!
          </span>
          <span className="hidden sm:inline">Register now to keep all your flags and settings.</span>
        </div>
        <Link
          href="/demo/register"
          className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
        >
          Register Now
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-indigo-600 px-4 py-2 text-sm text-white">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
        <span>
          You&apos;re exploring a demo &mdash; {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining.
        </span>
      </div>
      <Link
        href="/demo/register"
        className="rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30"
      >
        Register to Keep Data
      </Link>
    </div>
  );
}
