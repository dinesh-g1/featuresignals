"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import { MessageSquarePlus, X, Send, Loader2, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

type FeedbackType = "bug" | "feature" | "general";
type Sentiment = "positive" | "neutral" | "negative";

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
];

export function FeedbackWidget() {
  const token = useAppStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [sentiment, setSentiment] = useState<Sentiment>("neutral");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !message.trim()) return;
    setSending(true);
    try {
      await api.submitFeedback(token, { type, sentiment, message: message.trim(), page: window.location.pathname });
      toast("Thank you for your feedback!", "success");
      setOpen(false);
      setMessage("");
      setType("general");
      setSentiment("neutral");
    } catch {
      toast("Failed to send feedback. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-16 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl sm:bottom-6"
        aria-label="Send feedback"
      >
        {open ? <X className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
      </button>

      {open && (
        <div className="fixed bottom-28 right-4 z-40 w-80 rounded-xl border border-slate-200 bg-white shadow-2xl sm:bottom-18">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Send Feedback</h3>
            <p className="mt-0.5 text-xs text-slate-500">Help us improve FeatureSignals</p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    type === t.value
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-slate-500">How do you feel?</span>
              {(
                [
                  { value: "positive", Icon: ThumbsUp, activeColor: "text-emerald-600 bg-emerald-50" },
                  { value: "neutral", Icon: Minus, activeColor: "text-amber-600 bg-amber-50" },
                  { value: "negative", Icon: ThumbsDown, activeColor: "text-red-600 bg-red-50" },
                ] as const
              ).map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSentiment(s.value)}
                  className={`rounded-md p-1.5 transition-colors ${
                    sentiment === s.value ? s.activeColor : "text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <s.Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === "bug"
                  ? "Describe the issue and steps to reproduce..."
                  : type === "feature"
                    ? "What would you like to see?"
                    : "Tell us what's on your mind..."
              }
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            />

            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Feedback
            </button>
          </form>
        </div>
      )}
    </>
  );
}
