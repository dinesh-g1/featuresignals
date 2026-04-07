"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { UsageInfo } from "@/lib/types";

export type NudgeType =
  | "limit_approaching"
  | "limit_reached"
  | "feature_locked"
  | "milestone";

export interface UpgradeNudgeData {
  type: NudgeType;
  title: string;
  message: string;
  metric?: string;
  current?: number;
  limit?: number;
}

const SESSION_KEY = "fs-nudge-dismissed";

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissed(set: Set<string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
}

export function useUpgradeNudge(context?: string) {
  const token = useAppStore((s) => s.token);
  const plan = useAppStore((s) => s.organization?.plan);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  useEffect(() => {
    if (!token || plan === "pro" || plan === "enterprise") return;
    api.getUsage(token).then(setUsage).catch(() => {});
  }, [token, plan]);

  const dismiss = useCallback((nudgeId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(nudgeId);
      persistDismissed(next);
      return next;
    });
  }, []);

  const nudges: UpgradeNudgeData[] = [];

  if (!usage || plan === "pro" || plan === "enterprise") {
    return { nudges: [], dismiss, usage };
  }

  if (usage.projects_limit > 0) {
    const ratio = usage.projects_used / usage.projects_limit;
    if (ratio >= 1) {
      nudges.push({
        type: "limit_reached",
        title: "Project limit reached",
        message: `You've used all ${usage.projects_limit} project${usage.projects_limit === 1 ? "" : "s"} on the Free plan. Upgrade to Pro for unlimited projects.`,
        metric: "projects",
        current: usage.projects_used,
        limit: usage.projects_limit,
      });
    } else if (ratio >= 0.8) {
      nudges.push({
        type: "limit_approaching",
        title: "Running low on projects",
        message: `You've used ${usage.projects_used} of ${usage.projects_limit} projects. Upgrade to Pro for unlimited projects.`,
        metric: "projects",
        current: usage.projects_used,
        limit: usage.projects_limit,
      });
    }
  }

  if (usage.seats_limit > 0) {
    const ratio = usage.seats_used / usage.seats_limit;
    if (ratio >= 1) {
      nudges.push({
        type: "limit_reached",
        title: "Team member limit reached",
        message: `All ${usage.seats_limit} seats are used. Upgrade to Pro for unlimited team members.`,
        metric: "seats",
        current: usage.seats_used,
        limit: usage.seats_limit,
      });
    } else if (ratio >= 0.8) {
      nudges.push({
        type: "limit_approaching",
        title: "Running low on seats",
        message: `You've used ${usage.seats_used} of ${usage.seats_limit} team seats. Upgrade to Pro to add more.`,
        metric: "seats",
        current: usage.seats_used,
        limit: usage.seats_limit,
      });
    }
  }

  if (usage.environments_limit > 0) {
    const ratio = usage.environments_used / usage.environments_limit;
    if (ratio >= 1) {
      nudges.push({
        type: "limit_reached",
        title: "Environment limit reached",
        message: `You've used all ${usage.environments_limit} environments. Upgrade to Pro for unlimited environments.`,
        metric: "environments",
        current: usage.environments_used,
        limit: usage.environments_limit,
      });
    } else if (ratio >= 0.8) {
      nudges.push({
        type: "limit_approaching",
        title: "Running low on environments",
        message: `You've used ${usage.environments_used} of ${usage.environments_limit} environments. Upgrade to Pro for more.`,
        metric: "environments",
        current: usage.environments_used,
        limit: usage.environments_limit,
      });
    }
  }

  const contextual = context
    ? nudges.filter((n) => n.metric === context || n.type === "milestone")
    : nudges;

  const visible = contextual.filter(
    (n) => !dismissed.has(`${n.type}-${n.metric ?? "general"}`),
  );

  return { nudges: visible, dismiss, usage };
}
