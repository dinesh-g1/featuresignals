"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Lightbulb } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DOCS_LINKS } from "@/components/docs-link";

interface HintDefinition {
  id: string;
  message: string;
  docsUrl?: string;
  docsLabel?: string;
}

const SESSION_KEY = "fs_hint_shown_session";

interface ContextualHintProps {
  hint: HintDefinition;
  className?: string;
}

export function ContextualHint({ hint, className }: ContextualHintProps) {
  const token = useAppStore((s) => s.token);
  const [visible, setVisible] = useState(false);
  const [dismissedHints, setDismissedHints] = useState<string[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (!token || loaded.current) return;
    loaded.current = true;

    api.getDismissedHints(token).then((data) => {
      setDismissedHints(data?.hints ?? []);
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (dismissedHints.includes(hint.id)) return;

    const sessionShown = sessionStorage.getItem(SESSION_KEY);
    if (sessionShown) return;

    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [dismissedHints, hint.id]);

  const dismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "true");
    if (token) {
      api.dismissHint(token, hint.id).catch(() => {});
    }
  }, [token, hint.id]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "animate-fade-in rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-3 shadow-sm",
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <div className="flex-1 text-sm text-indigo-800">
          <p>{hint.message}</p>
          {hint.docsUrl && (
            <a
              href={hint.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
            >
              {hint.docsLabel ?? "Learn more"}
            </a>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
          aria-label="Dismiss hint"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export const HINTS = {
  flagsFirstVisit: {
    id: "flags_first_visit",
    message: "Flags control which features your users see. Toggle a flag and watch the SDK response change in real-time via SSE.",
    docsUrl: DOCS_LINKS.flags,
    docsLabel: "How flags work",
  },
  segmentsIntro: {
    id: "segments_intro",
    message: "Segments let you define reusable audiences — like beta testers or enterprise customers — and target them across multiple flags at once.",
    docsUrl: DOCS_LINKS.segments,
    docsLabel: "Segment guide",
  },
  envComparison: {
    id: "env_comparison_intro",
    message: "Compare flag states across environments to spot differences before promoting changes to production.",
  },
  metricsIntro: {
    id: "metrics_intro",
    message: "Evaluation metrics show how your flags are performing in real-time. Use this to verify rollouts and debug targeting rules.",
  },
  auditIntro: {
    id: "audit_intro",
    message: "The audit log records every change for compliance and debugging. Each entry is integrity-verified with a hash chain.",
    docsUrl: DOCS_LINKS.audit,
    docsLabel: "Audit log details",
  },
} satisfies Record<string, HintDefinition>;
