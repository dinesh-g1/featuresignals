"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import { ChevronRight, FolderOpen } from "lucide-react";
import type { Flag } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function FlagHealthPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !projectId) return;
    setLoading(true);
    api
      .listFlags(token, projectId)
      .then((f) => {
        setFlags(f ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, projectId]);

  const now = new Date();
  const EXPIRING_SOON_DAYS = 7;

  const staleDaysForCategory: Record<string, number> = {
    release: 14,
    experiment: 42,
    ops: Infinity,
    permission: Infinity,
  };
  const DEFAULT_STALE_DAYS = 90;

  const staleFlags = useMemo(() => {
    return flags.filter((f) => {
      const updated = new Date(f.updated_at);
      const age = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      const threshold = staleDaysForCategory[f.category] ?? DEFAULT_STALE_DAYS;
      return age > threshold;
    });
  }, [flags]);

  const expiringSoon = useMemo(() => {
    return flags.filter((f) => {
      if (!f.expires_at) return false;
      const exp = new Date(f.expires_at);
      const daysLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= EXPIRING_SOON_DAYS;
    });
  }, [flags]);

  const expired = useMemo(() => {
    return flags.filter((f) => {
      if (!f.expires_at) return false;
      return new Date(f.expires_at) < now;
    });
  }, [flags]);

  const noExpiration = useMemo(() => {
    return flags.filter((f) => !f.expires_at);
  }, [flags]);

  const noDescription = useMemo(() => {
    return flags.filter((f) => !f.description || f.description.trim() === "");
  }, [flags]);

  const healthScore = useMemo(() => {
    if (flags.length === 0) return 100;
    const issues =
      staleFlags.length + expired.length + noExpiration.length * 0.5;
    return Math.max(0, Math.round(100 - (issues / flags.length) * 100));
  }, [flags, staleFlags, expired, noExpiration]);

  const scoreColor =
    healthScore >= 80
      ? "text-emerald-600"
      : healthScore >= 50
        ? "text-amber-600"
        : "text-red-600";
  const scoreBg =
    healthScore >= 80
      ? "bg-emerald-50 ring-emerald-100"
      : healthScore >= 50
        ? "bg-amber-50 ring-amber-100"
        : "bg-red-50 ring-red-100";

  if (!projectId) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Flag Health"
          description="Monitor technical debt and flag hygiene"
        />
        <EmptyState
          icon={FolderOpen}
          title="No project selected"
          description="Select a project using the context bar above to view your flag health metrics."
          className="py-16"
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Flag Health"
        description="Monitor technical debt and flag hygiene"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
        <div
          className={cn(
            "rounded-xl border border-slate-200 bg-white p-4 text-center ring-1 sm:p-6",
            scoreBg,
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Health Score
          </p>
          <p className={cn("mt-2 text-3xl font-bold sm:text-5xl", scoreColor)}>
            {healthScore}
          </p>
          <p className="mt-1 text-xs text-slate-500">out of 100</p>
        </div>
        <HealthStatCard
          label="Total Flags"
          value={flags.length}
          color="accent"
        />
        <HealthStatCard
          label="Stale"
          value={staleFlags.length}
          color={staleFlags.length > 0 ? "amber" : "emerald"}
        />
        <HealthStatCard
          label="Expired"
          value={expired.length}
          color={expired.length > 0 ? "red" : "emerald"}
        />
      </div>

      {expired.length > 0 && (
        <HealthSection
          title="Expired Flags"
          subtitle="These flags have passed their expiration date and are being auto-disabled by the eval engine."
        >
          {expired.map((f) => (
            <FlagRow
              key={f.id}
              flag={f}
              badge={`Expired ${new Date(f.expires_at!).toLocaleDateString()}`}
              variant="danger"
            />
          ))}
        </HealthSection>
      )}

      {expiringSoon.length > 0 && (
        <HealthSection
          title="Expiring Soon"
          subtitle={`These flags expire within the next ${EXPIRING_SOON_DAYS} days.`}
        >
          {expiringSoon.map((f) => {
            const daysLeft = Math.ceil(
              (new Date(f.expires_at!).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return (
              <FlagRow
                key={f.id}
                flag={f}
                badge={`${daysLeft}d left`}
                variant="warning"
              />
            );
          })}
        </HealthSection>
      )}

      {staleFlags.length > 0 && (
        <HealthSection
          title="Stale Flags"
          subtitle="Not updated within their category threshold. Consider cleaning up."
        >
          {staleFlags.map((f) => {
            const age = Math.floor(
              (now.getTime() - new Date(f.updated_at).getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return (
              <FlagRow
                key={f.id}
                flag={f}
                badge={`${age}d old`}
                variant="default"
              />
            );
          })}
        </HealthSection>
      )}

      {noDescription.length > 0 && (
        <HealthSection
          title="Missing Description"
          subtitle="Flags without descriptions are harder for the team to understand."
        >
          {noDescription.map((f) => (
            <FlagRow
              key={f.id}
              flag={f}
              badge="No description"
              variant="default"
            />
          ))}
        </HealthSection>
      )}

      <HealthSection
        title="No Expiration Set"
        subtitle={`${noExpiration.length} of ${flags.length} flags have no expiration date. Consider adding one to prevent flag debt.`}
      >
        <div className="text-sm text-slate-500 px-4 py-4 sm:px-6">
          {noExpiration.length === 0
            ? "All flags have expiration dates set."
            : `${noExpiration.length} flag${noExpiration.length > 1 ? "s" : ""} without expiration.`}
        </div>
      </HealthSection>
    </div>
  );
}

function HealthStatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    accent: "text-accent",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:shadow-lg hover:border-slate-300 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold sm:text-3xl",
          colors[color] || "text-slate-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function HealthSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="hover:shadow-lg hover:border-slate-300">
      <CardHeader>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </CardHeader>
      <div className="divide-y divide-slate-100">{children}</div>
    </Card>
  );
}

function FlagRow({
  flag,
  badge,
  variant,
}: {
  flag: Flag;
  badge: string;
  variant: "danger" | "warning" | "default";
}) {
  return (
    <Link
      href={`/flags/${flag.key}`}
      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent-glass sm:px-6"
    >
      <div className="min-w-0">
        <p className="font-mono text-sm font-medium text-slate-900">
          {flag.key}
        </p>
        <p className="text-xs text-slate-500 truncate">{flag.name}</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Badge variant={variant}>{badge}</Badge>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
    </Link>
  );
}
