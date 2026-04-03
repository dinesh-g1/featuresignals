"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function FlagHealthPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !projectId) return;
    setLoading(true);
    api.listFlags(token, projectId).then((f) => {
      setFlags(f ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
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
    const issues = staleFlags.length + expired.length + noExpiration.length * 0.5;
    return Math.max(0, Math.round(100 - (issues / flags.length) * 100));
  }, [flags, staleFlags, expired, noExpiration]);

  const scoreColor = healthScore >= 80 ? "text-emerald-600" : healthScore >= 50 ? "text-amber-600" : "text-red-600";
  const scoreBg = healthScore >= 80 ? "bg-emerald-50 ring-emerald-100" : healthScore >= 50 ? "bg-amber-50 ring-amber-100" : "bg-red-50 ring-red-100";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Flag Health</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor technical debt and flag hygiene</p>
      </div>

      {/* Score and summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className={`rounded-xl border border-slate-200 bg-white p-6 text-center ring-1 ${scoreBg}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Health Score</p>
          <p className={`mt-2 text-5xl font-bold ${scoreColor}`}>{healthScore}</p>
          <p className="mt-1 text-xs text-slate-500">out of 100</p>
        </div>
        <StatCard label="Total Flags" value={flags.length} color="indigo" />
        <StatCard label="Stale (>90d)" value={staleFlags.length} color={staleFlags.length > 0 ? "amber" : "emerald"} />
        <StatCard label="Expired" value={expired.length} color={expired.length > 0 ? "red" : "emerald"} />
      </div>

      {/* Expired flags */}
      {expired.length > 0 && (
        <Section title="Expired Flags" subtitle="These flags have passed their expiration date and are being auto-disabled by the eval engine." color="red">
          {expired.map((f) => (
            <FlagRow key={f.id} flag={f} badge={`Expired ${new Date(f.expires_at).toLocaleDateString()}`} badgeColor="red" />
          ))}
        </Section>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <Section title="Expiring Soon" subtitle={`These flags expire within the next ${EXPIRING_SOON_DAYS} days.`} color="amber">
          {expiringSoon.map((f) => {
            const daysLeft = Math.ceil((new Date(f.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return <FlagRow key={f.id} flag={f} badge={`${daysLeft}d left`} badgeColor="amber" />;
          })}
        </Section>
      )}

      {/* Stale flags */}
      {staleFlags.length > 0 && (
        <Section title="Stale Flags" subtitle={`Not updated in over ${STALE_DAYS} days. Consider cleaning up.`} color="slate">
          {staleFlags.map((f) => {
            const age = Math.floor((now.getTime() - new Date(f.updated_at).getTime()) / (1000 * 60 * 60 * 24));
            return <FlagRow key={f.id} flag={f} badge={`${age}d old`} badgeColor="slate" />;
          })}
        </Section>
      )}

      {/* No description */}
      {noDescription.length > 0 && (
        <Section title="Missing Description" subtitle="Flags without descriptions are harder for the team to understand." color="slate">
          {noDescription.map((f) => (
            <FlagRow key={f.id} flag={f} badge="No description" badgeColor="slate" />
          ))}
        </Section>
      )}

      {/* No expiration */}
      <Section title="No Expiration Set" subtitle={`${noExpiration.length} of ${flags.length} flags have no expiration date. Consider adding one to prevent flag debt.`} color="slate">
        <div className="text-sm text-slate-500 px-6 py-4">
          {noExpiration.length === 0
            ? "All flags have expiration dates set."
            : `${noExpiration.length} flag${noExpiration.length > 1 ? "s" : ""} without expiration.`}
        </div>
      </Section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:shadow-lg hover:border-slate-300">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${colors[color] || "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function Section({ title, subtitle, color, children }: { title: string; subtitle: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function FlagRow({ flag, badge, badgeColor }: { flag: any; badge: string; badgeColor: string }) {
  const colors: Record<string, string> = {
    red: "bg-red-50 text-red-700 ring-red-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <Link href={`/flags/${flag.key}`} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-indigo-50/30">
      <div className="min-w-0">
        <p className="font-mono text-sm font-medium text-slate-900">{flag.key}</p>
        <p className="text-xs text-slate-500 truncate">{flag.name}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ${colors[badgeColor] || colors.slate}`}>
          {badge}
        </span>
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}
