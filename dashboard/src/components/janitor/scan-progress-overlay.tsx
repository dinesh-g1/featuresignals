"use client";

import { useState } from "react";
import { ScanProgressState } from "@/hooks/use-janitor-scan-progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import {
  XIcon, CheckCircleFillIcon, LoaderIcon, AlertIcon, ClockIcon, BrainIcon, FileCode
} from "@/components/icons/nav-icons";

interface ScanProgressOverlayProps {
  state: ScanProgressState;
  onClose: () => void;
  onCancel?: () => void;
}

export function ScanProgressOverlay({
  state,
  onClose,
  onCancel,
}: ScanProgressOverlayProps) {
  const token = useAppStore((s) => s.token);
  const [cancelling, setCancelling] = useState(false);
  const isActive =
    state.phase !== "idle" &&
    state.phase !== "complete" &&
    state.phase !== "error";
  const isDone = state.phase === "complete" || state.phase === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bgColor-emphasis)]/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isActive ? (
              <LoaderIcon className="h-5 w-5 text-[var(--fgColor-accent)] animate-spin" />
            ) : state.phase === "complete" ? (
              <CheckCircleFillIcon className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertIcon className="h-5 w-5 text-red-500" />
            )}
            <h3 className="text-lg font-bold text-[var(--fgColor-default)]">
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
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--fgColor-subtle)] hover:bg-[var(--bgColor-muted)]"
            >
              <XIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-[var(--fgColor-muted)] mb-1.5">
            <span>Progress</span>
            <span>{state.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bgColor-muted)] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                state.phase === "complete"
                  ? "bg-emerald-500"
                  : state.phase === "error"
                    ? "bg-[var(--bgColor-danger-muted)]0"
                    : "bg-[var(--bgColor-accent-emphasis)]",
              )}
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>

        {/* Repository progress */}
        {state.repos.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-2">
              Repositories (
              {state.repos.filter((r) => r.status === "complete").length}/
              {state.repos.length})
            </h4>
            <div className="space-y-1.5">
              {state.repos.map((repo) => (
                <div
                  key={repo.name}
                  className="flex items-center justify-between rounded-lg bg-[var(--bgColor-default)] px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {repo.status === "complete" ? (
                      <CheckCircleFillIcon className="h-3.5 w-3.5 text-emerald-500" />
                    ) : repo.status === "scanning" ? (
                      <LoaderIcon className="h-3.5 w-3.5 text-[var(--fgColor-accent)] animate-spin" />
                    ) : (
                      <ClockIcon className="h-3.5 w-3.5 text-[var(--fgColor-subtle)]" />
                    )}
                    <span className="font-medium text-[var(--fgColor-default)]">
                      {repo.name}
                    </span>
                  </div>
                  <span className="text-[var(--fgColor-subtle)]">
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

        {/* FlagIcon analysis progress */}
        {state.flags.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-2">
              AI Analysis (
              {state.flags.filter((f) => f.status === "completed").length}/
              {state.flags.length} flags)
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {state.flags.map((flag) => (
                <div
                  key={flag.flagKey}
                  className="flex items-center justify-between rounded-lg bg-[var(--bgColor-default)] px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {flag.status === "completed" ? (
                      flag.safeToRemove ? (
                        <CheckCircleFillIcon className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <FileCode className="h-3.5 w-3.5 text-amber-500" />
                      )
                    ) : flag.status === "analyzing" ? (
                      <BrainIcon className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
                    ) : (
                      <ClockIcon className="h-3.5 w-3.5 text-[var(--fgColor-subtle)]" />
                    )}
                    <code className="font-medium text-[var(--fgColor-default)]">
                      {flag.flagKey}
                    </code>
                  </div>
                  <span className="text-[var(--fgColor-subtle)]">
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
          <div className="rounded-xl border border-red-200 bg-[var(--bgColor-danger-muted)] p-3 mb-4">
            <p className="text-xs font-medium text-red-800">{state.error}</p>
          </div>
        )}

        {/* Actions */}
        {isActive && (
          <Button
            variant="secondary"
            className="w-full"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true);
              try {
                if (state.scanId && token) {
                  await api.cancelScan(token, state.scanId);
                }
              } catch {}
              if (onCancel) onCancel();
              onClose();
            }}
          >
            {cancelling ? "Cancelling..." : "Cancel Scan"}
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
