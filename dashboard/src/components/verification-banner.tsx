"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

export function VerificationBanner() {
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || dismissed) return null;

  const needsEmail = user.email_verified === false;

  if (!needsEmail) return null;

  async function handleResendEmail() {
    if (!token) return;
    setSending(true);
    try {
      await api.sendVerificationEmail(token);
      toast("Verification email sent", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to send email", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-800">
            <span className="flex items-center gap-1.5">
              Verify your email
              <button
                onClick={handleResendEmail}
                disabled={sending}
                className="font-medium text-amber-900 underline underline-offset-2 transition-colors hover:text-amber-700 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Resend"}
              </button>
            </span>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 rounded p-1 text-amber-400 transition-colors hover:bg-amber-100 hover:text-amber-600"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
