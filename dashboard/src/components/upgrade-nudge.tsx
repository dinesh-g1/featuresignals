"use client";

import Link from "next/link";
import {
  XIcon,
  ArrowRightIcon,
  SparklesIcon,
  AlertIcon,
} from "@/components/icons/nav-icons";
import { useUpgradeNudge } from "@/hooks/use-upgrade-nudge";
import { cn } from "@/lib/utils";

interface UpgradeNudgeProps {
  context?: string;
  className?: string;
}

export function UpgradeNudge({ context, className }: UpgradeNudgeProps) {
  const { nudges, dismiss } = useUpgradeNudge(context);

  if (nudges.length === 0) return null;

  const nudge = nudges[0];
  const nudgeId = `${nudge.type}-${nudge.metric ?? "general"}`;
  const isUrgent = nudge.type === "limit_reached";

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4",
        isUrgent
          ? "border-[var(--borderColor-attention-muted)] bg-[var(--bgColor-attention-muted)]/60"
          : "border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)]/60",
        className,
      )}
    >
      <button
        onClick={() => dismiss(nudgeId)}
        className="absolute right-2 top-2 rounded p-1 text-[var(--fgColor-subtle)] transition-colors hover:bg-white/60 hover:text-[var(--fgColor-muted)]"
        aria-label="Dismiss"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isUrgent
              ? "bg-[var(--bgColor-attention-muted)]"
              : "bg-[var(--bgColor-accent-muted)]",
          )}
        >
          {isUrgent ? (
            <AlertIcon className="h-4 w-4 text-[var(--fgColor-attention)]" />
          ) : (
            <SparklesIcon className="h-4 w-4 text-[var(--fgColor-accent)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--fgColor-default)]">
            {nudge.title}
          </p>
          <p className="mt-0.5 text-sm text-[var(--fgColor-muted)]">
            {nudge.message}
          </p>

          {nudge.current !== undefined && nudge.limit !== undefined && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bgColor-muted)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isUrgent
                      ? "bg-[var(--bgColor-attention-emphasis)]"
                      : "bg-[var(--bgColor-accent-emphasis)]",
                    `w-[${Math.min(100, (nudge.current / nudge.limit) * 100)}%]`,
                  )}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-[var(--fgColor-muted)]">
                {nudge.current}/{nudge.limit}
              </span>
            </div>
          )}

          <Link
            href="/settings/billing"
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              isUrgent
                ? "bg-[var(--bgColor-attention-emphasis)] text-white hover:bg-[#7a4e00]"
                : "bg-[var(--bgColor-accent-emphasis)] text-white hover:bg-[#0757ba]",
            )}
          >
            Upgrade to Pro
            <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

interface FeatureLockedNudgeProps {
  feature: string;
  requiredPlan: string;
  className?: string;
}

export function FeatureLockedNudge({
  feature,
  requiredPlan,
  className,
}: FeatureLockedNudgeProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-6 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bgColor-accent-muted)]">
        <SparklesIcon className="h-5 w-5 text-[var(--fgColor-accent)]" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--fgColor-default)]">
        {feature} requires {requiredPlan}
      </h3>
      <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
        Upgrade your plan to unlock {feature.toLowerCase()} and other advanced
        capabilities.
      </p>
      <Link
        href="/settings/billing"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[var(--bgColor-accent-emphasis)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0757ba]"
      >
        View Plans
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
