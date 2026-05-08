"use client";

import { useEffect, useState } from "react";
import {
  ActivityIcon, ExternalLinkIcon, CodeIcon
} from "@/components/icons/nav-icons";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { DOCS_URL, WEBSITE_URL } from "@/lib/external-urls";

export function DashboardFooter() {
  const token = useAppStore((s) => s.token);
  const [evalCount, setEvalCount] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getEvalMetrics(token).then((data) => {
      setEvalCount(data?.total_evaluations ?? 0);
    }).catch(() => {});
  }, [token]);

  return (
    <footer className="border-t border-[var(--signal-border-default)]/40 bg-white/60 backdrop-blur-sm px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--signal-fg-tertiary)]">
        <div className="flex items-center gap-4">
          <a
            href={`${WEBSITE_URL}/status`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--signal-fg-secondary)]"
          >
            <ActivityIcon className="h-3 w-3 animate-pulse text-emerald-500" />
            System Status
          </a>
          {evalCount !== null && evalCount > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {evalCount.toLocaleString()} evaluations
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/dinesh-g1/featuresignals"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--signal-fg-secondary)]"
          >
            <CodeIcon className="h-3 w-3" />
            Source
          </a>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--signal-fg-secondary)]"
          >
            Docs
            <ExternalLinkIcon className="h-2.5 w-2.5" />
          </a>
          <span>FeatureSignals</span>
        </div>
      </div>
    </footer>
  );
}
