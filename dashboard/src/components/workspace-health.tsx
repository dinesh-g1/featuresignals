"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Activity, Check, AlertTriangle, Flag, Users, Key, Shield } from "lucide-react";
import type { UsageInfo } from "@/lib/types";

interface HealthCheck {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  icon: React.ElementType;
}

function computeHealthChecks(usage: UsageInfo | null, flagCount: number): HealthCheck[] {
  const checks: HealthCheck[] = [];

  checks.push({
    label: "Feature flags",
    icon: Flag,
    status: flagCount > 0 ? "pass" : "fail",
    detail: flagCount > 0 ? `${flagCount} flags configured` : "No flags created yet",
  });

  if (usage) {
    checks.push({
      label: "Team setup",
      icon: Users,
      status: usage.seats_used > 1 ? "pass" : "warn",
      detail: usage.seats_used > 1 ? `${usage.seats_used} team members` : "Only 1 member — invite your team",
    });

    checks.push({
      label: "Environments",
      icon: Key,
      status: usage.environments_used >= 2 ? "pass" : "warn",
      detail: usage.environments_used >= 2
        ? `${usage.environments_used} environments configured`
        : "Add a staging environment for safe testing",
    });
  }

  checks.push({
    label: "SDK connected",
    icon: Shield,
    status: flagCount > 0 ? "pass" : "warn",
    detail: flagCount > 0 ? "Flags are being evaluated" : "Connect an SDK to start evaluating",
  });

  return checks;
}

function getOverallScore(checks: HealthCheck[]): number {
  if (checks.length === 0) return 0;
  const score = checks.reduce((acc, c) => {
    if (c.status === "pass") return acc + 100;
    if (c.status === "warn") return acc + 50;
    return acc;
  }, 0);
  return Math.round(score / checks.length);
}

const StatusIcon = ({ status }: { status: "pass" | "warn" | "fail" }) => {
  if (status === "pass") return <Check className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
  return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
};

export function WorkspaceHealth() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [flagCount, setFlagCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    api.getUsage(token).then(setUsage).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !projectId) return;
    api.listFlags(token, projectId).then((flags) => setFlagCount(flags?.length ?? 0)).catch(() => {});
  }, [token, projectId]);

  const checks = computeHealthChecks(usage, flagCount);
  const score = getOverallScore(checks);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Workspace Health</h3>
        </div>
        <div className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-bold",
          score >= 80 ? "bg-emerald-50 text-emerald-700" :
          score >= 50 ? "bg-amber-50 text-amber-700" :
          "bg-red-50 text-red-700",
        )}>
          {score}%
        </div>
      </div>

      <div className="h-1.5 w-full rounded-full bg-slate-100 mb-4">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all",
            score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500",
          )}
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2.5">
            <StatusIcon status={check.status} />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-700">{check.label}</span>
              <span className="mx-1 text-slate-300">·</span>
              <span className="text-xs text-slate-500">{check.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
