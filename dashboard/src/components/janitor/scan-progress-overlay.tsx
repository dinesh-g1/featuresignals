"use client";

import { ScanProgressState } from "@/hooks/use-janitor-scan-progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, CheckCircle, Loader2, AlertCircle, Clock, Brain, FileCode } from "lucide-react";

interface ScanProgressOverlayProps {
  state: ScanProgressState;
  onClose: () => void;
}

export function ScanProgressOverlay({ state, onClose }: ScanProgressOverlayProps) {
  const isActive = state.phase !== "idle" && state.phase !== "complete" && state.phase !== "error";
  const isDone = state.phase === "complete" || state.phase === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isActive ? (
              <Loader2 className="h-5 w-5 text-accent animate-spin" />
            ) : state.phase === "complete" ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <h3 className="text-lg font-bold text-stone-800">
              {state.phase === "idle" && "AI Janitor Scan"}
              {state.phase === "pending" && "Starting Scan..."}
              {state.phase === "scanning_repos" && "Scanning Repositories"}
              {state.phase === "analyzing_flags" && "Analyzing Flags"}
              {state.phase === "generating_report" && "Generating Report"}
              {state.phase === "complete" && "Scan Complete"}
              {state.phase === "error" && "Scan Failed"}
            </h3>
          </div>
          {isDone && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
            <span>Progress</span>
            <span>{state.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                state.phase === "complete"
                  ? "bg-emerald-500"
                  : state.phase === "error"
                    ? "bg-red-500"
                    : "bg-accent",
              )}
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>

        {/* Repository progress */}
        {state.repos.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
              Repositories ({state.repos.filter(r => r.status === "complete").length}/{state.repos.length})
            </h4>
            <div className="space-y-1.5">
              {state.repos.map((repo) => (
                <div
                  key={repo.name}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {repo.status === "complete" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    ) : repo.status === "scanning" ? (
                      <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-stone-400" />
                    )}
                    <span className="font-medium text-stone-700">{repo.name}</span>
                  </div>
                  <span className="text-stone-400">
                    {repo.status === "scanning"
                      ? `${repo.filesScanned}/${repo.totalFiles} files`
                      : repo.status === "complete"
                        ? `${repo.flagged} flagged`
                        : "queued"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flag analysis progress */}
        {state.flags.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
              AI Analysis ({state.flags.filter(f => f.status === "completed").length}/{state.flags.length} flags)
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {state.flags.map((flag) => (
                <div
                  key={flag.flagKey}
                  className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {flag.status === "completed" ? (
                      flag.safeToRemove ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <FileCode className="h-3.5 w-3.5 text-amber-500" />
                      )
                    ) : flag.status === "analyzing" ? (
                      <Brain className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-stone-400" />
                    )}
                    <code className="font-medium text-stone-700">{flag.flagKey}</code>
                  </div>
                  <span className="text-stone-400">
                    {flag.status === "completed" && flag.confidence
                      ? `${Math.round(flag.confidence * 100)}% confident`
                      : flag.status === "analyzing"
                        ? "Analyzing..."
                        : flag.status === "skipped"
                          ? "Still active"
                          : "Queued"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {state.phase === "error" && state.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-4">
            <p className="text-xs font-medium text-red-800">{state.error}</p>
          </div>
        )}

        {/* Actions */}
        {isActive && (
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Cancel Scan
          </Button>
        )}
        {state.phase === "complete" && (
          <Button variant="primary" className="w-full" onClick={onClose}>
            View Results
          </Button>
        )}
      </div>
    </div>
  );
}
