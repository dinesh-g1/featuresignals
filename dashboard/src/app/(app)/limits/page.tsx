"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ResourceLimit {
  resource: string;
  used: number;
  max: number;
}
interface LimitsResponse {
  plan: string;
  limits: ResourceLimit[];
}

const LABELS: Record<string, string> = {
  flags: "Feature Flags",
  segments: "Segments",
  environments: "Environments",
  members: "Team Members",
  webhooks: "Webhooks",
  api_keys: "API Keys",
  projects: "Projects",
};

export default function LimitsPage() {
  const token = useAppStore((s) => s.token);
  const [data, setData] = useState<LimitsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .getLimits(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--borderColor-default)]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-[var(--borderColor-default)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const limits = data?.limits ?? [];
  const plan = data?.plan ?? "free";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--fgColor-default)]">
          Resource Limits
        </h1>
        <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
          Current usage vs plan limits for the{" "}
          {plan.charAt(0).toUpperCase() + plan.slice(1)} plan.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {limits.map((l) => {
          const pct = l.max > 0 ? Math.min((l.used / l.max) * 100, 100) : 0;
          const isNearLimit = l.max > 0 && l.used / l.max >= 0.8;
          const isUnlimited = l.max === -1;

          return (
            <Card
              key={l.resource}
              className={cn(isNearLimit && "border-amber-200")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--fgColor-default)]">
                    {LABELS[l.resource] ?? l.resource}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      isNearLimit
                        ? "text-amber-600"
                        : "text-[var(--fgColor-default)]",
                    )}
                  >
                    {isUnlimited ? "∞" : `${l.used}/${l.max}`}
                  </span>
                </div>
                {!isUnlimited && (
                  <div className="w-full h-2 rounded-full bg-[var(--bgColor-muted)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        pct >= 90
                          ? "bg-red-500"
                          : pct >= 80
                            ? "bg-amber-500"
                            : "bg-[var(--fgColor-accent)]",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {isUnlimited && (
                  <p className="text-xs text-[var(--fgColor-muted)] italic">
                    Unlimited on this plan
                  </p>
                )}
                {isNearLimit && (
                  <p className="mt-1.5 text-xs text-amber-600 font-medium">
                    Approaching limit — consider upgrading
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
