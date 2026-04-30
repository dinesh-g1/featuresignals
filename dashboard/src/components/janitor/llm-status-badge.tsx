"use client";

import {
  BrainIcon, AlertIcon, CheckCircleFillIcon, XCircleFillIcon
} from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

interface LLMStatusBadgeProps {
  provider?: string;
  confidence?: number;
  status?: "available" | "unavailable" | "fallback" | "analyzing";
  className?: string;
}

export function LLMStatusBadge({ provider, confidence, status = "available", className }: LLMStatusBadgeProps) {
  const confidencePercent = confidence ? Math.round(confidence * 100) : null;

  if (status === "unavailable") {
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700", className)}>
        <AlertIcon className="h-3 w-3" />
        <span>LLM Unavailable — Using Basic Mode</span>
      </div>
    );
  }

  if (status === "fallback") {
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700", className)}>
        <AlertIcon className="h-3 w-3" />
        <span>AI Fallback — Regex Analysis</span>
      </div>
    );
  }

  if (status === "analyzing") {
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700", className)}>
        <BrainIcon className="h-3 w-3 animate-pulse" />
        <span>AI Analyzing...</span>
      </div>
    );
  }

  if (!provider) return null;

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full border border-[var(--borderColor-success-muted)] bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700", className)}>
      <CheckCircleFillIcon className="h-3 w-3" />
      <span>{provider}{confidencePercent !== null ? ` — ${confidencePercent}% confidence` : ""}</span>
    </div>
  );
}
