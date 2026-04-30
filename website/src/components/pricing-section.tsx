"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckIcon,
  DownloadIcon,
  CloudIcon,
  HeartIcon,
  InfoIcon,
} from "@primer/octicons-react";
import {
  type CompetitorProvider,
  calculateSavings,
  formatUSD,
  formatINR,
} from "@/lib/pricing";
import { useCalculatorContext } from "@/lib/calculator-context";

function CheckListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-[var(--fgColor-default)]">
      <CheckIcon
        size={16}
        fill="var(--fgColor-success)"
        className="mt-0.5 shrink-0"
      />
      <span>{text}</span>
    </li>
  );
}

/** Estimated infra cost per customer per month in USD */
const ESTIMATED_INFRA_COST = 5;
const FAIR_MARGIN_PERCENT = 40;

export function PricingSection() {
  const { teamSize, provider } = useCalculatorContext();

  const savingsResult = useMemo(
    () => calculateSavings({ teamSize, provider }),
    [teamSize, provider],
  );

  const estimatedMonthly = Math.round(
    ESTIMATED_INFRA_COST * (1 + FAIR_MARGIN_PERCENT / 100),
  );

  return (
    <section
      id="pricing"
      className="py-20 sm:py-28 bg-[var(--bgColor-inset)]"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            Transparent pricing. No surprises. No lock-in.
          </h2>
          <p className="text-lg text-[var(--fgColor-muted)] mt-3 max-w-2xl mx-auto">
            Two ways to run FeatureSignals. Same complete platform. Same all
            features. Pick what works for your team.
          </p>
        </motion.div>

        {/* Two pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Self-Hosted Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-[var(--borderColor-default)] bg-white p-6 sm:p-8 flex flex-col"
            style={{ boxShadow: "var(--shadow-resting-small)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bgColor-done-muted)]">
                <DownloadIcon size={20} fill="var(--fgColor-done)" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--fgColor-default)]">
                  Self-Hosted
                </h3>
                <p className="text-sm text-[var(--fgColor-done)] font-medium">
                  100% Open Source
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--fgColor-default)]">
                  Free
                </span>
                <span className="text-sm text-[var(--fgColor-muted)]">
                  forever
                </span>
              </div>
              <p className="text-sm text-[var(--fgColor-muted)] mt-2">
                Clone the repo. Run it on your VPS, your Kubernetes cluster, or
                your Raspberry Pi. Apache 2.0 licensed. Every feature included.
                No strings attached.
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {[
                "Complete lifecycle management platform",
                "Unlimited flags, environments, projects",
                "AI Janitor — automated stale flag cleanup",
                "A/B experiments, approval workflows",
                "8 SDKs + OpenFeature providers",
                "SSO, RBAC, audit logs — full governance",
              ].map((f) => (
                <CheckListItem key={f} text={f} />
              ))}
            </ul>

            <a
              href="https://docs.featuresignals.com/getting-started/quickstart"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] hover:bg-[#eff2f5] border border-[var(--borderColor-default)] transition-colors w-full"
              style={{ boxShadow: "0 1px 0 0 #1f23280a" }}
            >
              <DownloadIcon size={16} />
              Deploy in 3 minutes
            </a>
          </motion.div>

          {/* Cloud Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-xl border-2 border-[var(--borderColor-accent-emphasis)] bg-white p-6 sm:p-8 flex flex-col md:-mt-2"
            style={{ boxShadow: "var(--shadow-floating-medium)" }}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bgColor-accent-emphasis)] text-white shadow-sm">
                <CloudIcon size={12} />
                Managed
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bgColor-accent-muted)]">
                <CloudIcon size={20} fill="var(--fgColor-accent)" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--fgColor-default)]">
                  Cloud
                </h3>
                <p className="text-sm text-[var(--fgColor-accent)] font-medium">
                  Pay-as-you-go
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[var(--fgColor-default)]">
                  ~{formatUSD(estimatedMonthly)}
                </span>
                <span className="text-sm text-[var(--fgColor-muted)]">
                  /month estimated
                </span>
              </div>
              <p className="text-sm text-[var(--fgColor-muted)] mt-2">
                Your actual cost: infrastructure (~
                {formatUSD(ESTIMATED_INFRA_COST)}/mo) + our{" "}
                {FAIR_MARGIN_PERCENT}% margin. Total scales with YOUR usage, not
                our arbitrary pricing table. We run the servers. You ship
                features.
              </p>
            </div>

            {/* Cost breakdown */}
            <div className="mb-4 p-3 rounded-lg bg-[var(--bgColor-accent-muted)] border border-[var(--borderColor-accent-muted)]">
              <div className="flex items-center gap-1.5 mb-2">
                <InfoIcon size={12} fill="var(--fgColor-accent)" />
                <span className="text-xs font-semibold text-[var(--fgColor-accent)]">
                  Transparent breakdown
                </span>
              </div>
              <div className="space-y-1 text-xs text-[var(--fgColor-muted)]">
                <div className="flex justify-between">
                  <span>Infrastructure cost per tenant</span>
                  <span className="font-mono tabular-nums">
                    ~{formatUSD(ESTIMATED_INFRA_COST)}/mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Our margin ({FAIR_MARGIN_PERCENT}%)</span>
                  <span className="font-mono tabular-nums">
                    ~
                    {formatUSD(
                      Math.round(
                        (ESTIMATED_INFRA_COST * FAIR_MARGIN_PERCENT) / 100,
                      ),
                    )}
                    /mo
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-[var(--fgColor-default)] pt-1 border-t border-[var(--borderColor-accent-muted)]">
                  <span>Your estimated total</span>
                  <span className="font-mono">
                    ~{formatUSD(estimatedMonthly)}/mo
                  </span>
                </div>
              </div>
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {[
                "Everything in Self-Hosted",
                "We handle uptime, backups, updates",
                "Automatic scaling as you grow",
                "Priority email support",
                "SOC 2 compliant infrastructure",
              ].map((f) => (
                <CheckListItem key={f} text={f} />
              ))}
            </ul>

            <a
              href="https://app.featuresignals.com/signup"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] active:bg-[#197935] transition-colors w-full"
              style={{ boxShadow: "0 1px 0 0 #1f232826" }}
            >
              Start free trial
              <CloudIcon size={16} />
            </a>
          </motion.div>
        </div>

        {/* No lock-in promise */}
        <motion.div
          className="mt-12 text-center max-w-xl mx-auto"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--bgColor-success-muted)] border border-[var(--borderColor-success-muted)]">
            <HeartIcon size={16} fill="var(--fgColor-success)" />
            <p className="text-sm text-[var(--fgColor-default)]">
              <span className="font-semibold text-[var(--fgColor-success)]">
                No lock-in. Ever.
              </span>{" "}
              Both plans are the same codebase. Switch between Self-Hosted and
              Cloud anytime. All 8 SDKs support OpenFeature — swap providers
              without changing a line of code.
            </p>
          </div>

          {/* Savings comparison */}
          <p className="text-sm text-[var(--fgColor-muted)] mt-4">
            Compare: {savingsResult.competitor.name} at{" "}
            <span className="font-semibold text-[var(--fgColor-danger)]">
              {formatUSD(savingsResult.competitor.monthly)}/month
            </span>{" "}
            for {teamSize} engineers. FeatureSignals Cloud: ~
            {formatUSD(estimatedMonthly)}/month. That&apos;s{" "}
            <span className="font-bold text-[var(--fgColor-success)]">
              {Math.round(
                (1 - estimatedMonthly / savingsResult.competitor.monthly) * 100,
              )}
              % less
            </span>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}
