"use client";

import {
  ShieldIcon, LockIcon, EyeIcon, UsersIcon, KeyIcon
} from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

interface ComplianceBadge {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const badges: ComplianceBadge[] = [
  { label: "Tamper-Evident Audit", icon: EyeIcon },
  { label: "End-to-End Encryption", icon: LockIcon },
  { label: "RBAC & MFA", icon: UsersIcon },
  { label: "SSO (SAML / OIDC)", icon: KeyIcon },
  { label: "OpenFeature (CNCF)", icon: ShieldIcon },
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
            className="inline-flex items-center gap-1 rounded-full bg-[var(--signal-bg-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--signal-fg-secondary)]"
          >
            <badge.icon className="h-2.5 w-2.5 shrink-0" />
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
          className="flex items-start gap-3 rounded-lg border border-[var(--signal-border-default)] bg-white p-4 shadow-sm"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)]">
            <badge.icon className="h-4.5 w-4.5 text-[var(--signal-fg-accent)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--signal-fg-primary)]">{badge.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
