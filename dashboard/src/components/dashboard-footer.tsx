"use client";

import { useEffect, useState } from "react";
import { Activity, ExternalLink, Code2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";

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
    <footer className="border-t border-slate-200/60 bg-white/80 px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <a
            href="https://status.featuresignals.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-slate-600"
          >
            <Activity className="h-3 w-3 text-emerald-500" />
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
            href="https://github.com/featuresignals/featuresignals"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-slate-600"
          >
            <Code2 className="h-3 w-3" />
            Source
          </a>
          <a
            href="https://docs.featuresignals.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-slate-600"
          >
            Docs
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <span>FeatureSignals</span>
        </div>
      </div>
    </footer>
  );
}
