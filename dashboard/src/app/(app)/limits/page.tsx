"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CreditsResponse, CreditBearer } from "@/lib/types";

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
  const [credits, setCredits] = useState<CreditsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getLimits(token).catch(() => null),
      api.getCredits(token).catch(() => null),
    ])
      .then(([l, c]) => {
        setData(l as LimitsResponse | null);
        setCredits(c as CreditsResponse | null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--signal-border-default)]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-[var(--signal-border-default)]"
            />
          ))}
        </div>
      </div>
    );
  }

  const limits = data?.limits ?? [];
  const plan = data?.plan ?? "free";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with plan info */}
      <div>
        <h1 className="text-xl font-bold text-[var(--signal-fg-primary)]">
          Limits
        </h1>
        <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
          {planLabel} Plan
          {plan === "pro" && (
            <span> · INR 1,999/month</span>
          )}
          {plan === "free" && (
            <span> · <Link href="/settings/billing" className="text-[var(--signal-fg-accent)] underline">Upgrade to Pro</Link> for unlimited</span>
          )}
        </p>
      </div>

      {/* Section 1: Resource Limits */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wide mb-3">
          Resources
        </h2>
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
                    <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                      {LABELS[l.resource] ?? l.resource}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        isNearLimit
                          ? "text-amber-600"
                          : "text-[var(--signal-fg-primary)]",
                      )}
                    >
                      {isUnlimited ? "∞" : `${l.used}/${l.max}`}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <div className="w-full h-2 rounded-full bg-[var(--signal-bg-secondary)] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          pct >= 90
                            ? "bg-red-500"
                            : pct >= 80
                              ? "bg-amber-500"
                              : "bg-[var(--signal-fg-accent)]",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {isUnlimited && (
                    <p className="text-xs text-[var(--signal-fg-secondary)] italic">
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
      </section>

      {/* Section 2: Credit Limits */}
      {credits?.bearers?.length ? (
        <section>
          <h2 className="text-sm font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wide mb-3">
            AI Janitor Credits
          </h2>
          <div className="space-y-3">
            {credits.bearers.map((bearer) => (
              <CreditLimitCard key={bearer.id} bearer={bearer} plan={plan} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CreditLimitCard({ bearer, plan }: { bearer: CreditBearer; plan: string }) {
  const included = bearer.included_per_month;
  const pct = included > 0
    ? Math.min(Math.round((bearer.lifetime_used % Math.max(included, 1)) / included * 100), 100)
    : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--signal-fg-primary)]">
                {bearer.display_name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] font-medium">
                {bearer.unit_name}
              </span>
            </div>
            <p className="text-xs text-[var(--signal-fg-secondary)] mt-1">{bearer.description}</p>

            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[var(--signal-fg-secondary)]">Included/month</p>
                <p className="text-lg font-bold tabular-nums text-[var(--signal-fg-primary)]">
                  {included.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--signal-fg-secondary)]">Balance</p>
                <p className="text-lg font-bold tabular-nums text-[var(--signal-fg-primary)]">
                  {bearer.balance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--signal-fg-secondary)]">Lifetime used</p>
                <p className="text-lg font-bold tabular-nums text-[var(--signal-fg-primary)]">
                  {bearer.lifetime_used.toLocaleString()}
                </p>
              </div>
            </div>

            {included > 0 && (
              <div className="mt-3 w-full h-2 rounded-full bg-[var(--signal-bg-secondary)] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    pct >= 90 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-[var(--signal-fg-accent)]",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            <p className="mt-2 text-xs text-[var(--signal-fg-secondary)]">
              {plan === "free"
                ? `Free plan: ${included} credits/month. Upgrade to Pro for 200/month.`
                : plan === "pro"
                  ? `Pro plan: ${included} credits/month included. Need more? Purchase additional credit packs.`
                  : `Enterprise: ${included >= 10000 ? "Effectively unlimited" : included.toLocaleString() + " credits/month"}.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
