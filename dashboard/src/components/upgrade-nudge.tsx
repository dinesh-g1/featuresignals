"use client";

import Link from "next/link";
import { X, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
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
          ? "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50"
          : "border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/60",
        className,
      )}
    >
      <button
        onClick={() => dismiss(nudgeId)}
        className="absolute right-2 top-2 rounded p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isUrgent ? "bg-amber-100" : "bg-indigo-100",
          )}
        >
          {isUrgent ? (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          ) : (
            <Sparkles className="h-4 w-4 text-indigo-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{nudge.title}</p>
          <p className="mt-0.5 text-sm text-slate-600">{nudge.message}</p>

          {nudge.current !== undefined && nudge.limit !== undefined && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isUrgent ? "bg-amber-500" : "bg-indigo-500",
                    `w-[${Math.min(100, (nudge.current / nudge.limit) * 100)}%]`,
                  )}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-slate-500">
                {nudge.current}/{nudge.limit}
              </span>
            </div>
          )}

          <Link
            href="/settings/billing"
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              isUrgent
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700",
            )}
          >
            Upgrade to Pro
            <ArrowRight className="h-3 w-3" />
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
        "rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 p-6 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
        <Sparkles className="h-5 w-5 text-indigo-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">
        {feature} requires {requiredPlan}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Upgrade your plan to unlock {feature.toLowerCase()} and other advanced
        capabilities.
      </p>
      <Link
        href="/settings/billing"
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        View Plans
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
