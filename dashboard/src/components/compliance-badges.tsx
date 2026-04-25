"use client";

import { Shield, Lock, Eye, Users, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ComplianceBadge {
  label: string;
  icon: LucideIcon;
}

const badges: ComplianceBadge[] = [
  { label: "Tamper-Evident Audit", icon: Eye },
  { label: "End-to-End Encryption", icon: Lock },
  { label: "RBAC & MFA", icon: Users },
  { label: "SSO (SAML / OIDC)", icon: Key },
  { label: "OpenFeature (CNCF)", icon: Shield },
];

interface ComplianceBadgesProps {
  variant?: "compact" | "full";
  className?: string;
}

export function ComplianceBadges({
  variant = "compact",
  className,
}: ComplianceBadgesProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 px-3 py-2",
          className,
        )}
      >
        {badges.map((badge) => (
          <span
            key={badge.label}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
          >
            <badge.icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
            {badge.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/5">
            <badge.icon className="h-4.5 w-4.5 text-accent" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">{badge.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
