"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { CreditPurchaseModal } from "@/components/credit-purchase-modal";
import type {
  UsageInfo,
  CreditBearer,
  CreditsResponse,
  CreditPurchaseResponse,
} from "@/lib/types";

function formatPaise(paise: number): string {
  return `INR ${(paise / 100).toLocaleString("en-IN")}`;
}

export default function UsagePage() {
  const token = useAppStore((s) => s.token);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [credits, setCredits] = useState<CreditsResponse | null>(null);
  const [metrics, setMetrics] = useState<{ total_evaluations: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseBearer, setPurchaseBearer] = useState<CreditBearer | null>(null);

  const refreshCredits = useCallback(() => {
    if (token) {
      api.getCredits(token).then(setCredits).catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.getUsage(token).catch(() => null),
      api.getCredits(token).catch(() => null),
      api.getEvalMetrics(token).catch(() => null),
    ])
      .then(([u, c, m]) => {
        setUsage(u as UsageInfo | null);
        setCredits(c as CreditsResponse | null);
        setMetrics(m as { total_evaluations: number } | null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function handlePurchased(_response: CreditPurchaseResponse) {
    refreshCredits();
  }

  const now = new Date();
  const monthYear = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const plan = usage?.plan ?? "free";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--borderColor-default)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--borderColor-default)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-[var(--fgColor-default)]">Usage</h1>
          <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
            {monthYear} · {planLabel} Plan
            {plan === "pro" && usage?.platform_fee_monthly
              ? ` · ${formatPaise(usage.platform_fee_monthly)}/month`
              : ""}
          </p>
        </div>

        {/* Section 1: Resource Usage */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--fgColor-muted)] uppercase tracking-wide mb-3">
            Resources
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-[var(--fgColor-muted)]">Seats</p>
                <p className="text-2xl font-bold text-[var(--fgColor-default)] tabular-nums">
                  {usage ? `${usage.seats_used}/${usage.seats_limit === -1 ? "∞" : usage.seats_limit}` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-[var(--fgColor-muted)]">Projects</p>
                <p className="text-2xl font-bold text-[var(--fgColor-default)] tabular-nums">
                  {usage ? `${usage.projects_used}/${usage.projects_limit === -1 ? "∞" : usage.projects_limit}` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-[var(--fgColor-muted)]">Environments</p>
                <p className="text-2xl font-bold text-[var(--fgColor-default)] tabular-nums">
                  {usage ? `${usage.environments_used}/${usage.environments_limit === -1 ? "∞" : usage.environments_limit}` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-[var(--fgColor-muted)]">Total Evaluations</p>
                <p className="text-2xl font-bold text-[var(--fgColor-default)] tabular-nums">
                  {metrics?.total_evaluations?.toLocaleString() ?? "—"}
                </p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-1">
                  Included in plan · no extra charge
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: Cost-Bearing Feature Credits */}
        {credits?.bearers?.length ? (
          <section>
            <h2 className="text-sm font-semibold text-[var(--fgColor-muted)] uppercase tracking-wide mb-3">
              AI Janitor Credits
            </h2>
            <div className="space-y-3">
              {credits.bearers.map((bearer) => (
                <CreditCard
                  key={bearer.id}
                  bearer={bearer}
                  onPurchase={() => setPurchaseBearer(bearer)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Purchase Modal */}
      {purchaseBearer && (
        <CreditPurchaseModal
          open={true}
          onClose={() => setPurchaseBearer(null)}
          bearerId={purchaseBearer.id}
          bearerName={purchaseBearer.display_name}
          currentBalance={purchaseBearer.balance}
          includedPerMonth={purchaseBearer.included_per_month}
          packs={purchaseBearer.available_packs}
          onPurchased={handlePurchased}
        />
      )}
    </>
  );
}

/** Single credit bearer card with balance, progress, and purchase button. */
function CreditCard({
  bearer,
  onPurchase,
}: {
  bearer: CreditBearer;
  onPurchase: () => void;
}) {
  const pct =
    bearer.included_per_month > 0
      ? Math.min(
          Math.round(
            ((bearer.included_per_month -
              Math.max(
                0,
                bearer.included_per_month -
                  (bearer.balance > bearer.included_per_month
                    ? bearer.included_per_month
                    : bearer.balance),
              )) /
              bearer.included_per_month) *
              100,
          ),
          100,
        )
      : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--fgColor-default)]">
                {bearer.display_name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] font-medium">
                {bearer.unit_name}
              </span>
            </div>
            <p className="text-xs text-[var(--fgColor-muted)] mt-1">
              {bearer.description}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div>
                <p className="text-xs text-[var(--fgColor-muted)]">Balance</p>
                <p className="text-lg font-bold tabular-nums text-[var(--fgColor-default)]">
                  {bearer.balance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--fgColor-muted)]">Included/mo</p>
                <p className="text-lg font-bold tabular-nums text-[var(--fgColor-default)]">
                  {bearer.included_per_month.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--fgColor-muted)]">Lifetime</p>
                <p className="text-lg font-bold tabular-nums text-[var(--fgColor-default)]">
                  {bearer.lifetime_used.toLocaleString()}
                </p>
              </div>
            </div>
            {bearer.included_per_month > 0 && (
              <div className="mt-3 w-full h-2 rounded-full bg-[var(--bgColor-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--fgColor-accent)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                  aria-label={`${pct}% of monthly credits used`}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onPurchase}>
            Purchase Credits
          </Button>
          {bearer.balance === 0 && (
            <span className="text-xs text-amber-600 font-medium">
              Out of credits
            </span>
          )}
          {bearer.balance > 0 && bearer.balance < 50 && (
            <span className="text-xs text-amber-600 font-medium">
              Running low ({bearer.balance} remaining)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
