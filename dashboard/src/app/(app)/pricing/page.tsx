"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PricingCalculator } from "@/components/pricing-calculator";
import { PlanComparison } from "@/components/plan-comparison";
import { TrustSignals } from "@/components/trust-signals";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const organization = useAppStore((s) => s.organization);
  const currentPlan = organization?.plan;

  const isOnPaidPlan = currentPlan === "pro" || currentPlan === "enterprise";

  return (
    <div className="mx-auto max-w-4xl space-y-12 py-6 animate-fade-in">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
          Pricing
        </h1>
        <p className="mt-3 text-sm text-[var(--signal-fg-secondary)] max-w-lg mx-auto text-balance">
          Unlimited flags, unlimited seats, honest flat-rate pricing.
          Start free and upgrade when you need advanced features.
        </p>

        {!isOnPaidPlan && (
          <Link
            href="/settings/billing"
            className={cn(
              "mt-5 inline-flex items-center gap-1.5 rounded-[var(--radius-medium)] bg-[var(--signal-bg-accent-emphasis)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-dark)]",
            )}
          >
            Upgrade to Pro
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        {isOnPaidPlan && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--signal-bg-success-muted)] px-4 py-1.5 text-sm font-medium text-[var(--signal-fg-success)]">
            You&apos;re on the {currentPlan === "pro" ? "Pro" : "Enterprise"} plan
          </p>
        )}
      </div>

      {/* Pricing Calculator */}
      <PricingCalculator />

      {/* Plan Comparison */}
      <PlanComparison />

      {/* Trust Signals */}
      <TrustSignals />

      {/* Bottom CTA */}
      <div className="text-center pb-8">
        <h2 className="text-xl font-bold text-[var(--signal-fg-primary)]">
          Ready to upgrade?
        </h2>
        <p className="mt-2 text-sm text-[var(--signal-fg-secondary)]">
          Flat pricing, no surprises. Cancel anytime.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            href="/settings/billing"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[var(--radius-medium)] bg-[var(--signal-bg-accent-emphasis)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-dark)]",
            )}
          >
            {isOnPaidPlan ? "Manage Billing" : "Upgrade to Pro"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="mailto:sales@featuresignals.com"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-medium)] border border-[var(--signal-border-default)] px-5 py-2.5 text-sm font-semibold text-[var(--signal-fg-primary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
          >
            Talk to sales
          </a>
        </div>
      </div>
    </div>
  );
}
