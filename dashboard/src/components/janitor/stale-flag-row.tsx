"use client";

import type { StaleFlag } from "@/lib/api";
import { useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitPullRequestIcon, CheckCircleFillIcon, FileCode, ClockIcon, ExternalLinkIcon, TrashIcon, BrainIcon, AlertIcon
} from "@/components/icons/nav-icons";

interface StaleFlagRowProps {
  flag: StaleFlag;
  onGeneratePR: (key: string) => void;
  onDismiss: (key: string) => void;
}

export function StaleFlagRow({
  flag,
  onGeneratePR,
  onDismiss,
}: StaleFlagRowProps) {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePR = async () => {
    setGenerating(true);
    try {
      await onGeneratePR(flag.key);
    } finally {
      setGenerating(false);
    }
  };

  const confidencePercent = flag.analysis_confidence
    ? Math.round(flag.analysis_confidence * 100)
    : null;

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-xl border p-4 transition-all",
        flag.safe_to_remove
          ? "border-[var(--borderColor-default)] bg-white hover:border-amber-200 hover:bg-amber-50/30"
          : "border-[var(--borderColor-default)] bg-white/60 opacity-70",
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Status icon */}
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            flag.pr_status === "merged"
              ? "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]"
              : flag.pr_status === "open"
                ? "bg-blue-100 text-blue-600"
                : flag.safe_to_remove
                  ? "bg-amber-100 text-amber-600"
                  : "bg-[var(--bgColor-muted)] text-[var(--fgColor-subtle)]",
          )}
        >
          {flag.pr_status === "merged" ? (
            <CheckCircleFillIcon className="h-4 w-4" />
          ) : flag.pr_status === "open" ? (
            <GitPullRequestIcon className="h-4 w-4" />
          ) : flag.safe_to_remove ? (
            <FileCode className="h-4 w-4" />
          ) : (
            <ClockIcon className="h-4 w-4" />
          )}
        </div>

        {/* FlagIcon info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-semibold text-[var(--fgColor-default)]">
              {flag.key}
            </code>
            <span className="text-xs text-[var(--fgColor-subtle)]">·</span>
            <span className="text-xs text-[var(--fgColor-muted)]">{flag.name}</span>
            <Badge
              variant={
                flag.percentage_true >= 100
                  ? "danger"
                  : flag.percentage_true >= 80
                    ? "warning"
                    : "default"
              }
            >
              {flag.percentage_true}% True
            </Badge>
            {flag.pr_status === "merged" && (
              <Badge variant="success">Cleaned</Badge>
            )}
            {flag.pr_status === "open" && (
              <Badge variant="primary">PR Open</Badge>
            )}
            {confidencePercent !== null &&
              confidencePercent < 85 &&
              flag.safe_to_remove && (
                <Badge variant="warning">
                  <AlertIcon className="h-3 w-3 mr-0.5" />
                  Needs Review
                </Badge>
              )}
            {flag.llm_provider && confidencePercent !== null && (
              <Badge
                variant="default"
                className="bg-purple-100 text-purple-700 border-purple-200"
              >
                <BrainIcon className="h-3 w-3 mr-0.5" />
                {confidencePercent}%
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--fgColor-subtle)]">
            <span>
              {flag.days_served} day{flag.days_served > 1 ? "s" : ""} at 100%
            </span>
            <span>·</span>
            <span>{flag.environment}</span>
            <span>·</span>
            <span>Last eval: {timeAgo(flag.last_evaluated)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {flag.pr_status === "open" && flag.pr_url && (
          <a
            href={flag.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <ExternalLinkIcon className="h-3 w-3" />
            View PR
          </a>
        )}
        {flag.safe_to_remove && !flag.pr_status && (
          <Button
            size="sm"
            variant="default"
            onClick={handleGeneratePR}
            loading={generating}
            disabled={generating}
          >
            <GitPullRequestIcon className="h-3.5 w-3.5" />
            Generate PR
          </Button>
        )}
        {flag.safe_to_remove && flag.pr_status !== "merged" && (
          <button
            onClick={() => onDismiss(flag.key)}
            className="rounded-lg p-1.5 text-[var(--fgColor-subtle)] transition-colors hover:bg-[var(--bgColor-danger-muted)] hover:text-red-500"
            title="Dismiss"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
