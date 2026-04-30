"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import {
  MessageSquarePlusIcon,
  XIcon,
  SendIcon,
  LoaderIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  MinusIcon,
} from "@/components/icons/nav-icons";

type FeedbackType = "bug" | "feature" | "general";
type Sentiment = "positive" | "neutral" | "negative";

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "bug", label: "BugIcon Report" },
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
      await api.submitFeedback(token, {
        type,
        sentiment,
        message: message.trim(),
        page: window.location.pathname,
      });
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
        className="fixed bottom-16 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bgColor-accent-emphasis)] text-white shadow-lg transition-all hover:bg-[var(--bgColor-accent-emphasis)]-dark hover:shadow-xl sm:bottom-6"
        aria-label="Send feedback"
      >
        {open ? (
          <XIcon className="h-4 w-4" />
        ) : (
          <MessageSquarePlusIcon className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="fixed bottom-28 right-4 z-40 w-80 rounded-xl border border-[var(--borderColor-default)] bg-white shadow-2xl sm:bottom-18">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--fgColor-default)]">
              Send Feedback
            </h3>
            <p className="mt-0.5 text-xs text-[var(--fgColor-muted)]">
              Help us improve FeatureSignals
            </p>
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
                      ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
                      : "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-[var(--fgColor-muted)]">
                How do you feel?
              </span>
              {(
                [
                  {
                    value: "positive",
                    Icon: ThumbsUpIcon,
                    activeColor: "text-[var(--fgColor-success)] bg-emerald-50",
                  },
                  {
                    value: "neutral",
                    Icon: MinusIcon,
                    activeColor: "text-amber-600 bg-amber-50",
                  },
                  {
                    value: "negative",
                    Icon: ThumbsDownIcon,
                    activeColor:
                      "text-red-600 bg-[var(--bgColor-danger-muted)]",
                  },
                ] as const
              ).map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSentiment(s.value)}
                  aria-label={s.value}
                  aria-pressed={sentiment === s.value}
                  className={`rounded-md p-1.5 transition-colors ${
                    sentiment === s.value
                      ? s.activeColor
                      : "text-[var(--fgColor-subtle)] hover:bg-[var(--bgColor-muted)]"
                  }`}
                >
                  <s.Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>

            <label htmlFor="feedback-message" className="sr-only">
              Feedback message
            </label>
            <textarea
              id="feedback-message"
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
              className="w-full rounded-lg border border-[var(--borderColor-default)] px-3 py-2 text-sm text-[var(--fgColor-default)] placeholder-slate-400 focus:border-[var(--borderColor-accent-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--borderColor-accent-muted)]"
            />

            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--bgColor-accent-emphasis)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--bgColor-accent-emphasis)]-dark disabled:opacity-50"
            >
              {sending ? (
                <LoaderIcon className="h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
              Send Feedback
            </button>
          </form>
        </div>
      )}
    </>
  );
}
