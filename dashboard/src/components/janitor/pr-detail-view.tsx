"use client";

import {
  ExternalLinkIcon,
  GitPullRequestIcon,
  BrainIcon,
  CheckCircleFillIcon,
  XCircleFillIcon,
} from "@/components/icons/nav-icons";
import { Badge } from "@/components/ui/badge";

interface PRDetailViewProps {
  prUrl?: string;
  prStatus?: string;
  analysisConfidence?: number;
  llmProvider?: string;
  llmModel?: string;
}

export function PRDetailView({
  prUrl,
  prStatus,
  analysisConfidence,
  llmProvider,
  llmModel,
}: PRDetailViewProps) {
  if (!prUrl && !prStatus) return null;

  const confidencePercent = analysisConfidence
    ? Math.round(analysisConfidence * 100)
    : null;

  return (
    <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-4 space-y-3">
      <h4 className="text-sm font-bold text-[var(--signal-fg-primary)] flex items-center gap-2">
        <GitPullRequestIcon className="h-4 w-4" />
        Pull Request Details
      </h4>

      {prStatus && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--signal-fg-secondary)]">Status:</span>
          <Badge
            variant={
              prStatus === "merged"
                ? "success"
                : prStatus === "open"
                  ? "primary"
                  : "default"
            }
          >
            {prStatus === "merged" ? (
              <CheckCircleFillIcon className="h-3 w-3 mr-1" />
            ) : prStatus === "failed" ? (
              <XCircleFillIcon className="h-3 w-3 mr-1" />
            ) : null}
            {prStatus.charAt(0).toUpperCase() + prStatus.slice(1)}
          </Badge>
        </div>
      )}

      {prUrl && (
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ExternalLinkIcon className="h-3 w-3" />
          View on{" "}
          {prUrl.includes("github")
            ? "GitHub"
            : prUrl.includes("gitlab")
              ? "GitLab"
              : "Bitbucket"}
        </a>
      )}

      {llmProvider && (
        <div className="flex items-center gap-2 text-xs text-[var(--signal-fg-secondary)]">
          <BrainIcon className="h-3.5 w-3.5 text-purple-500" />
          <span>
            Analyzed by:{" "}
            <span className="font-medium text-[var(--signal-fg-primary)]">
              {llmProvider}
            </span>
            {llmModel && (
              <span className="text-[var(--signal-fg-tertiary)]">
                {" "}
                ({llmModel})
              </span>
            )}
          </span>
          {confidencePercent !== null && (
            <span className="ml-auto font-semibold text-[var(--signal-fg-primary)]">
              {confidencePercent}% confidence
            </span>
          )}
        </div>
      )}
    </div>
  );
}
