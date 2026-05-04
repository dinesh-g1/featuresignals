"use client";

import { motion } from "framer-motion";
import {
  RocketIcon,
  ZapIcon,
  ShieldCheckIcon,
  ShieldLockIcon,
  GitPullRequestIcon,
  GraphIcon,
  CodeIcon,
  SyncIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  HeartFillIcon,
  ChevronRightIcon,
  PeopleIcon,
  GitBranchIcon,
  BeakerIcon,
  WorkflowIcon,
  CheckIcon,
  XIcon,
} from "@primer/octicons-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ==========================================================================
   Animation helpers
   ========================================================================== */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

const fadeUpDelayed = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
});

/* ==========================================================================
   Shared constants
   ========================================================================== */

const REGISTER_URL = "https://app.featuresignals.com/register";
const SALES_EMAIL = "/contact?reason=sales";
const DOCS_URL = "/docs";
const GITHUB_URL = "https://github.com/dinesh-g1/featuresignals";

/* ==========================================================================
   Shared CTA components
   ========================================================================== */

function CtaPrimary({
  href = REGISTER_URL,
  children = "Start Free",
  className,
}: {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold",
        "text-white bg-[var(--bgColor-success-emphasis)]",
        "hover:opacity-90 transition-opacity",
        "shadow-[0_1px_0_0_#1f232826]",
        className,
      )}
    >
      {children}
      <ArrowRightIcon size={16} />
    </a>
  );
}

function CtaSecondary({
  href = SALES_EMAIL,
  children = "Contact Sales",
  className,
}: {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const cls = cn(
    "inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold",
    "text-[var(--fgColor-default)] bg-[var(--bgColor-muted)]",
    "border border-[var(--borderColor-default)]",
    "hover:bg-[#eff2f5] transition-colors",
    "shadow-[0_1px_0_0_#1f23280a]",
    className,
  );

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}

/* ==========================================================================
   Section Label (reusable)
   ========================================================================== */

function SectionLabel({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--fgColor-accent)] uppercase tracking-wider mb-3">
      <Icon size={14} />
      {text}
    </span>
  );
}

/* ==========================================================================
   Step number badge
   ========================================================================== */

function StepBadge({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bgColor-accent-emphasis)] text-white text-xs font-bold tabular-nums shrink-0">
      {num}
    </span>
  );
}

/* ==========================================================================
   Pipeline phase (used in hero visual)
   ========================================================================== */

type PhaseStatus = "complete" | "active" | "pending";

interface PipelinePhase {
  step: string;
  status: PhaseStatus;
  statusLabel: string;
  description: string;
}

/* ==========================================================================
   Use Cases Page
   ========================================================================== */

export default function UseCasesPage() {
  return (
    <>
      <HeroSection />
      <ProgressiveDeliverySection />
      <CanaryReleasesSection />
      <KillSwitchSection />
      <AbTestingSection />
      <MigrationSection />
      <GitOpsSection />
      <EnterpriseGovernanceSection />
      <FinalCtaSection />
    </>
  );
}

/* ==========================================================================
   1. Hero Section
   ========================================================================== */

function HeroSection() {
  const pipelinePhases: PipelinePhase[] = [
    {
      step: "1% Canary",
      status: "complete",
      statusLabel: "Done",
      description: "Internal team + beta users",
    },
    {
      step: "10% Rollout",
      status: "complete",
      statusLabel: "Done",
      description: "10% of US traffic",
    },
    {
      step: "50% Rollout",
      status: "active",
      statusLabel: "In Progress",
      description: "50% of all users",
    },
    {
      step: "100% Launch",
      status: "pending",
      statusLabel: "Pending",
      description: "Remove flag, archive code",
    },
  ];

  const jumpLinks = [
    { label: "Progressive Delivery", href: "#progressive-delivery" },
    { label: "Canary Releases", href: "#canary-releases" },
    { label: "Kill Switch", href: "#kill-switch" },
    { label: "A/B Testing", href: "#ab-testing" },
    { label: "Migration", href: "#migration" },
    { label: "GitOps", href: "#gitops" },
    { label: "Enterprise", href: "#enterprise-governance" },
  ];

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[var(--bgColor-default)]"
      aria-labelledby="use-cases-hero-heading"
    >
      <div
        className="absolute inset-0 bg-grid-subtle opacity-60"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:py-32">
        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mb-10"
          {...fadeUp}
        >
          <Badge
            icon={ShieldCheckIcon}
            text="SOC 2 Type II"
            variant="success"
          />
          <Badge icon={ZapIcon} text="Sub-ms Latency" variant="accent" />
          <Badge icon={CodeIcon} text="OpenFeature Native" variant="done" />
          <Badge
            icon={GitPullRequestIcon}
            text="Apache 2.0"
            variant="attention"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div>
            <motion.h1
              id="use-cases-hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--fgColor-default)] leading-[1.08]"
              {...fadeUp}
            >
              Feature flags for{" "}
              <span className="text-[var(--fgColor-accent)]">
                every stage of delivery
              </span>
              .
            </motion.h1>

            <motion.p
              className="text-lg text-[var(--fgColor-muted)] mt-5 leading-relaxed max-w-xl"
              {...fadeUpDelayed(0.1)}
            >
              From canary releases to kill switches — see how engineering teams
              use FeatureSignals to ship safer and faster, with zero added
              latency and complete control.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 mt-8"
              {...fadeUpDelayed(0.2)}
            >
              <CtaPrimary>Start Free</CtaPrimary>
              <CtaSecondary href={DOCS_URL}>View Docs</CtaSecondary>
            </motion.div>

            {/* Jump links */}
            <motion.div
              className="mt-8 hidden sm:block"
              {...fadeUpDelayed(0.3)}
            >
              <p className="text-xs font-semibold text-[var(--fgColor-subtle)] uppercase tracking-wider mb-3">
                Explore use cases
              </p>
              <div className="flex flex-wrap gap-2">
                {jumpLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] border border-[var(--borderColor-default)] hover:text-[var(--fgColor-accent)] hover:border-[var(--borderColor-accent-muted)] hover:bg-[var(--bgColor-accent-muted)] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Pipeline visual */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-64px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] overflow-hidden"
              style={{ boxShadow: "var(--shadow-floating-medium)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                  Release Pipeline
                </p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                  checkout-redesign · production
                </p>
              </div>
              <div className="p-5 space-y-3">
                {pipelinePhases.map((phase, i) => (
                  <div key={phase.step} className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "w-3 h-3 rounded-full border-2",
                          phase.status === "complete" &&
                            "bg-[var(--bgColor-success-emphasis)] border-[var(--bgColor-success-emphasis)]",
                          phase.status === "active" &&
                            "bg-[var(--bgColor-accent-emphasis)] border-[var(--bgColor-accent-emphasis)]",
                          phase.status === "pending" &&
                            "bg-transparent border-[var(--borderColor-emphasis)]",
                        )}
                      />
                      {i < pipelinePhases.length - 1 && (
                        <span
                          className={cn(
                            "w-0.5 h-8",
                            phase.status === "complete"
                              ? "bg-[var(--bgColor-success-emphasis)]"
                              : "bg-[var(--borderColor-default)]",
                          )}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between flex-1">
                      <div>
                        <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                          {phase.step}
                        </p>
                        <p className="text-xs text-[var(--fgColor-muted)]">
                          {phase.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium px-2.5 py-0.5 rounded-full",
                          phase.status === "complete" &&
                            "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]",
                          phase.status === "active" &&
                            "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]",
                          phase.status === "pending" &&
                            "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]",
                        )}
                      >
                        {phase.statusLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Small trust badge pill */
function Badge({
  icon: Icon,
  text,
  variant,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  text: string;
  variant: "success" | "accent" | "done" | "attention";
}) {
  const colorMap = {
    success:
      "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)] border-[var(--borderColor-success-muted)]",
    accent:
      "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] border-[var(--borderColor-accent-muted)]",
    done: "bg-[var(--bgColor-done-muted)] text-[var(--fgColor-done)] border-transparent",
    attention:
      "bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)] border-[var(--borderColor-attention-muted)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
        colorMap[variant],
      )}
    >
      <Icon size={14} />
      {text}
    </span>
  );
}

/* ==========================================================================
   2. Progressive Delivery
   ========================================================================== */

function ProgressiveDeliverySection() {
  const steps = [
    {
      step: 1,
      text: "Deploy new code behind a feature flag — off by default.",
    },
    {
      step: 2,
      text: "Roll out to 1% of users. Monitor error rates, latency, and business metrics.",
    },
    {
      step: 3,
      text: "Increase rollout: 10% → 50% → 100%. Adjust at any time without a redeploy.",
    },
    {
      step: 4,
      text: "If something breaks, kill the flag in one click. Issue resolved in seconds.",
    },
    {
      step: 5,
      text: "Once fully launched and stable, the AI Janitor removes the stale flag code.",
    },
  ];

  return (
    <section
      id="progressive-delivery"
      className="py-20 sm:py-28 bg-[var(--bgColor-inset)]"
      aria-labelledby="progressive-delivery-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={GraphIcon} text="Progressive Delivery" />
            <h2
              id="progressive-delivery-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
            >
              Roll out features gradually.{" "}
              <span className="text-[var(--fgColor-accent)]">
                Stop bad releases instantly.
              </span>
            </h2>
            <p className="text-base text-[var(--fgColor-muted)] mt-4 leading-relaxed max-w-lg">
              Deploy code to production behind a feature flag, then
              progressively expose it to users. Start with internal teams,
              expand to beta users, then dial up to 100% — all without a
              redeploy.
            </p>

            <div className="mt-6 pt-6 border-t border-[var(--borderColor-default)]">
              <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-4">
                How it works
              </p>
              <div className="space-y-4">
                {steps.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <StepBadge num={item.step} />
                    <p className="text-sm text-[var(--fgColor-default)] leading-relaxed pt-0.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bgColor-accent-muted)] border border-[var(--borderColor-accent-muted)]">
              <ZapIcon size={14} className="text-[var(--fgColor-accent)]" />
              <span className="text-xs font-medium text-[var(--fgColor-accent)]">
                Sub-millisecond evaluation means zero added latency
              </span>
            </div>
          </motion.div>

          {/* Right: Rollout slider visual */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <div
              className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] overflow-hidden"
              style={{ boxShadow: "var(--shadow-resting-medium)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                  Percentage Rollout
                </p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                  Consistent hashing · MurmurHash3
                </p>
              </div>
              <div className="p-6 space-y-6">
                {/* Slider visualization */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[var(--fgColor-muted)]">
                      Rollout percentage
                    </span>
                    <span className="text-2xl font-bold text-[var(--fgColor-accent)] tabular-nums">
                      42%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[var(--bgColor-inset)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--bgColor-accent-emphasis)]"
                      style={{ width: "42%" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    {[0, 25, 50, 75, 100].map((pct) => (
                      <span
                        key={pct}
                        className="text-[11px] text-[var(--fgColor-muted)]"
                      >
                        {pct}%
                      </span>
                    ))}
                  </div>
                </div>

                {/* User distribution */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-[var(--bgColor-inset)]">
                    <p className="text-xl font-bold text-[var(--fgColor-default)] tabular-nums">
                      10.5K
                    </p>
                    <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                      Users receiving
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[var(--bgColor-inset)]">
                    <p className="text-xl font-bold text-[var(--fgColor-muted)] tabular-nums">
                      14.5K
                    </p>
                    <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                      Users not receiving
                    </p>
                  </div>
                </div>

                {/* Kill switch button visual */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bgColor-danger-muted)] border border-[var(--borderColor-danger-emphasis)]">
                  <div className="flex items-center gap-2">
                    <XIcon size={14} className="text-[var(--fgColor-danger)]" />
                    <span className="text-sm font-semibold text-[var(--fgColor-danger)]">
                      Kill Switch
                    </span>
                  </div>
                  <span className="text-xs text-[var(--fgColor-danger)]">
                    One click to disable
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   3. Canary Releases
   ========================================================================== */

function CanaryReleasesSection() {
  interface TargetingRule {
    label: string;
    operator: string;
    value: string;
    desc: string;
  }

  const rules: TargetingRule[] = [
    {
      label: "user.group",
      operator: "eq",
      value: "beta",
      desc: "Internal testers and early adopters",
    },
    {
      label: "user.region",
      operator: "eq",
      value: "EU",
      desc: "European data center users only",
    },
    {
      label: "user.plan",
      operator: "in",
      value: '["pro", "enterprise"]',
      desc: "Exclude free-tier users",
    },
  ];

  interface Metric {
    label: string;
    value: string;
    ok: boolean;
  }

  const metrics: Metric[] = [
    { label: "Error Rate", value: "0.12%", ok: true },
    { label: "p95 Latency", value: "42ms", ok: true },
    { label: "Crash Free", value: "99.98%", ok: true },
  ];

  const steps = [
    {
      step: 1,
      text: "Target a specific cohort: internal users, beta testers, or a geographic region.",
    },
    {
      step: 2,
      text: "Route a small percentage of production traffic to the new feature path.",
    },
    {
      step: 3,
      text: "Monitor error rates, latency, and business metrics against the control group.",
    },
    {
      step: 4,
      text: "Gradually expand the canary group as confidence increases.",
    },
    {
      step: 5,
      text: "Automated rollback via webhook if health checks fail — no human intervention needed.",
    },
  ];

  return (
    <section
      id="canary-releases"
      className="py-20 sm:py-28 bg-[var(--bgColor-default)]"
      aria-labelledby="canary-releases-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Visual */}
          <motion.div {...fadeUp} className="order-last lg:order-first">
            <div
              className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] overflow-hidden"
              style={{ boxShadow: "var(--shadow-resting-medium)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                  Canary Target
                </p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                  Beta users + EU region · ~5% of traffic
                </p>
              </div>
              <div className="p-5 space-y-3">
                {rules.map((rule, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-semibold text-[var(--fgColor-accent)]">
                        {rule.label}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--fgColor-muted)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 rounded">
                        {rule.operator}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--fgColor-default)] bg-[var(--bgColor-inset)] px-1.5 py-0.5 rounded">
                        {rule.value}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--fgColor-muted)]">
                      {rule.desc}
                    </p>
                  </div>
                ))}

                {/* Monitoring section */}
                <div className="pt-3 border-t border-[var(--borderColor-default)]">
                  <div className="grid grid-cols-3 gap-2">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="text-center p-2 rounded-lg bg-[var(--bgColor-inset)]"
                      >
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          {metric.ok ? (
                            <CheckCircleIcon
                              size={12}
                              className="text-[var(--fgColor-success)]"
                            />
                          ) : (
                            <XIcon
                              size={12}
                              className="text-[var(--fgColor-danger)]"
                            />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[var(--fgColor-default)] tabular-nums">
                          {metric.value}
                        </p>
                        <p className="text-[10px] text-[var(--fgColor-muted)]">
                          {metric.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Text */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <SectionLabel icon={PeopleIcon} text="Canary Releases" />
            <h2
              id="canary-releases-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
            >
              Test in production with{" "}
              <span className="text-[var(--fgColor-accent)]">real users</span>
            </h2>
            <p className="text-base text-[var(--fgColor-muted)] mt-4 leading-relaxed max-w-lg">
              Staging environments can&apos;t replicate production traffic
              patterns. Canary releases let you validate new features with a
              small subset of real users before going wide — with automatic
              rollback if metrics degrade.
            </p>

            <div className="mt-6 pt-6 border-t border-[var(--borderColor-default)]">
              <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-4">
                How it works
              </p>
              <div className="space-y-4">
                {steps.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <StepBadge num={item.step} />
                    <p className="text-sm text-[var(--fgColor-default)] leading-relaxed pt-0.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/docs/canary-releases"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
            >
              Learn more about canary releases
              <ChevronRightIcon size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   4. Kill Switch
   ========================================================================== */

function KillSwitchSection() {
  const steps = [
    {
      step: 1,
      text: "Every flag is a kill switch. Toggling off instantly returns the default value to all SDK consumers.",
    },
    {
      step: 2,
      text: "Kill via dashboard, API, or automated webhook trigger from your monitoring stack.",
    },
    {
      step: 3,
      text: "Graceful degradation: SDKs receive the off state and your application handles it with sensible defaults.",
    },
    {
      step: 4,
      text: "Every kill action is audit-logged with before/after state, user, and timestamp.",
    },
    {
      step: 5,
      text: "Notify your team via Slack, Datadog, or PagerDuty — webhooks fire on every kill event.",
    },
  ];

  interface KillEntry {
    flag: string;
    action: string;
    by: string;
    time: string;
    reason: string;
  }

  const killEntries: KillEntry[] = [
    {
      flag: "checkout-redesign",
      action: "Killed",
      by: "jane@acme.com",
      time: "8 min ago",
      reason: "Error rate spike to 2.3% in canary group",
    },
    {
      flag: "search-ml-v2",
      action: "Killed",
      by: "automation (Datadog)",
      time: "47 min ago",
      reason: "p95 latency exceeded 500ms threshold",
    },
    {
      flag: "new-onboarding",
      action: "Restored",
      by: "mike@acme.com",
      time: "2 hours ago",
      reason: "Root cause identified and patched",
    },
  ];

  return (
    <section
      id="kill-switch"
      className="py-20 sm:py-28 bg-[var(--bgColor-inset)]"
      aria-labelledby="kill-switch-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={ShieldLockIcon} text="Kill Switch" />
            <h2
              id="kill-switch-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
            >
              Emergency off-switch for{" "}
              <span className="text-[var(--fgColor-accent)]">
                any feature in production
              </span>
            </h2>
            <p className="text-base text-[var(--fgColor-muted)] mt-4 leading-relaxed max-w-lg">
              When a feature causes issues in production, you don&apos;t have
              time for a rollback pipeline. Kill switches give you instant
              control — one click, API call, or automated trigger disables the
              feature globally.
            </p>

            <div className="mt-6 pt-6 border-t border-[var(--borderColor-default)]">
              <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-4">
                How it works
              </p>
              <div className="space-y-4">
                {steps.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <StepBadge num={item.step} />
                    <p className="text-sm text-[var(--fgColor-default)] leading-relaxed pt-0.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bgColor-danger-muted)] border border-[var(--borderColor-danger-muted)]">
              <ZapIcon size={14} className="text-[var(--fgColor-danger)]" />
              <span className="text-xs font-medium text-[var(--fgColor-danger)]">
                Kill actions propagate to all SDK instances in under 100ms
              </span>
            </div>
          </motion.div>

          {/* Right: Kill switch visual */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <div
              className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] overflow-hidden"
              style={{ boxShadow: "var(--shadow-resting-medium)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                  Active Kill Actions
                </p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                  Audit trail · Last 24 hours
                </p>
              </div>
              <div className="p-5 space-y-3">
                {killEntries.map((entry, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-[var(--fgColor-default)]">
                        {entry.flag}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          entry.action === "Killed"
                            ? "bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)]"
                            : "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]",
                        )}
                      >
                        {entry.action}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--fgColor-muted)] mb-1.5">
                      {entry.by} · {entry.time}
                    </p>
                    <p className="text-[11px] text-[var(--fgColor-muted)] bg-[var(--bgColor-muted)] p-2 rounded leading-relaxed">
                      {entry.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   5. A/B Testing
   ========================================================================== */

function AbTestingSection() {
  interface Variant {
    name: string;
    pct: number;
    conversions: string;
    color: string;
    lift?: string;
  }

  const variants: Variant[] = [
    {
      name: "Control",
      pct: 50,
      conversions: "2.1%",
      color: "bg-[var(--bgColor-accent-emphasis)]",
    },
    {
      name: "Variant A",
      pct: 30,
      conversions: "3.8%",
      color: "bg-[var(--bgColor-success-emphasis)]",
      lift: "+81%",
    },
    {
      name: "Variant B",
      pct: 20,
      conversions: "2.4%",
      color: "bg-[var(--bgColor-done-emphasis)]",
      lift: "+14%",
    },
  ];

  const steps = [
    {
      step: 1,
      text: "Create an A/B flag with multiple variants and weighted distribution.",
    },
    {
      step: 2,
      text: "Users are deterministically assigned to a variant via MurmurHash3 — consistent across sessions.",
    },
    {
      step: 3,
      text: "Fire impression events from your application to track which variant each user sees.",
    },
    {
      step: 4,
      text: "Measure conversion events against variant assignments to calculate lift.",
    },
    {
      step: 5,
      text: "Combine with targeting rules to run segmented experiments on specific user cohorts.",
    },
  ];

  return (
    <section
      id="ab-testing"
      className="py-20 sm:py-28 bg-[var(--bgColor-default)]"
      aria-labelledby="ab-testing-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Visual */}
          <motion.div {...fadeUp} className="order-last lg:order-first">
            <div
              className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] overflow-hidden"
              style={{ boxShadow: "var(--shadow-resting-medium)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                  A/B Experiment
                </p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                  pricing-page-v2 · 3 variants · 50/30/20 split
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  {variants.map((v) => (
                    <div key={v.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[var(--fgColor-default)]">
                          {v.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--fgColor-muted)] tabular-nums">
                            {v.pct}% · {v.conversions}
                          </span>
                          {v.lift && (
                            <span className="text-xs font-semibold text-[var(--fgColor-success)] tabular-nums">
                              {v.lift}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[var(--bgColor-muted)] overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", v.color)}
                          style={{ width: `${v.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[var(--borderColor-default)] grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-[var(--bgColor-default)]">
                    <p className="text-lg font-bold text-[var(--fgColor-default)] tabular-nums">
                      48.2K
                    </p>
                    <p className="text-[11px] text-[var(--fgColor-muted)] mt-0.5">
                      Impressions
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[var(--bgColor-default)]">
                    <p className="text-lg font-bold text-[var(--fgColor-accent)] tabular-nums">
                      1,204
                    </p>
                    <p className="text-[11px] text-[var(--fgColor-muted)] mt-0.5">
                      Conversions
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[var(--bgColor-success-muted)]">
                    <p className="text-lg font-bold text-[var(--fgColor-success)] tabular-nums">
                      2.5%
                    </p>
                    <p className="text-[11px] text-[var(--fgColor-muted)] mt-0.5">
                      Conv. Rate
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Text */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <SectionLabel icon={BeakerIcon} text="A/B Testing" />
            <h2
              id="ab-testing-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
            >
              Measure what moves{" "}
              <span className="text-[var(--fgColor-accent)]">your metrics</span>
            </h2>
            <p className="text-base text-[var(--fgColor-muted)] mt-4 leading-relaxed max-w-lg">
              Ship hypotheses, not guesses. Run A/B experiments directly on your
              feature flags with weighted variant assignment, impression
              tracking, and per-environment configuration. No separate
              experimentation tool required.
            </p>

            <div className="mt-6 pt-6 border-t border-[var(--borderColor-default)]">
              <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-4">
                How it works
              </p>
              <div className="space-y-4">
                {steps.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <StepBadge num={item.step} />
                    <p className="text-sm text-[var(--fgColor-default)] leading-relaxed pt-0.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/docs/experiments"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
            >
              Learn more about A/B testing
              <ChevronRightIcon size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   6. Migration from Legacy Tools
   ========================================================================== */

function MigrationSection() {
  const steps = [
    {
      step: 1,
      text: "Connect to your existing provider via API key — LaunchDarkly, ConfigCat, Flagsmith, or Unleash.",
    },
    {
      step: 2,
      text: "Run a dry-run preview. See exactly which flags, segments, and rules will be created.",
    },
    {
      step: 3,
      text: "Review the migration plan. Operator mappings, strategy translations, and edge cases are surfaced.",
    },
    {
      step: 4,
      text: "Execute the migration. All configuration is imported while your existing provider stays live.",
    },
    {
      step: 5,
      text: "Swap your SDK initialization to FeatureSignals. OpenFeature means a single config change.",
    },
  ];

  interface ProviderRow {
    from: string;
    flags: number;
    segments: number;
    envs: number;
  }

  const providers: ProviderRow[] = [
    { from: "LaunchDarkly", flags: 142, segments: 12, envs: 3 },
    { from: "ConfigCat", flags: 67, segments: 5, envs: 2 },
    { from: "Flagsmith", flags: 38, segments: 8, envs: 3 },
  ];

  return (
    <section
      id="migration"
      className="py-20 sm:py-28 bg-[var(--bgColor-inset)]"
      aria-labelledby="migration-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={GitBranchIcon} text="Migration" />
            <h2
              id="migration-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
            >
              Switch from LaunchDarkly{" "}
              <span className="text-[var(--fgColor-accent)]">
                without rewriting your codebase
              </span>
            </h2>
            <p className="text-base text-[var(--fgColor-muted)] mt-4 leading-relaxed max-w-lg">
              The Migration Engine imports your flags, environments, segments,
              and targeting rules in minutes. OpenFeature-native SDKs mean this
              is the last migration you&apos;ll ever need — future provider
              changes are a one-line config switch.
            </p>

            <div className="mt-6 pt-6 border-t border-[var(--borderColor-default)]">
              <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-4">
                How it works
              </p>
              <div className="space-y-4">
                {steps.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <StepBadge num={item.step} />
                    <p className="text-sm text-[var(--fgColor-default)] leading-relaxed pt-0.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/docs/migration"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
            >
              Learn more about migration
              <ChevronRightIcon size={14} />
            </Link>
          </motion.div>

          {/* Right: Provider comparison visual */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <div
              className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] overflow-hidden"
              style={{ boxShadow: "var(--shadow-resting-medium)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                  Migration Path
                </p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                  Zero-downtime switchover
                </p>
              </div>
              <div className="p-5 space-y-3">
                {providers.map((provider, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-[var(--fgColor-default)]">
                        {provider.from}
                      </span>
                      <ArrowRightIcon
                        size={14}
                        className="text-[var(--fgColor-muted)]"
                      />
                      <span className="text-sm font-semibold text-[var(--fgColor-accent)]">
                        FeatureSignals
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-[var(--fgColor-muted)]">
                      <span className="bg-[var(--bgColor-muted)] px-2 py-1 rounded">
                        {provider.flags} flags
                      </span>
                      <span className="bg-[var(--bgColor-muted)] px-2 py-1 rounded">
                        {provider.segments} segments
                      </span>
                      <span className="bg-[var(--bgColor-muted)] px-2 py-1 rounded">
                        {provider.envs} envs
                      </span>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-2 justify-center">
                  <CheckIcon
                    size={14}
                    className="text-[var(--fgColor-success)]"
                  />
                  <span className="text-xs text-[var(--fgColor-muted)]">
                    OpenFeature-native SDKs — future migrations are a one-line
                    config change
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   7. GitOps Feature Flags
   ========================================================================== */

function GitOpsSection() {
  const steps = [
    {
      step: 1,
      text: "Define flag configurations as code using Terraform, Pulumi, or Ansible providers.",
    },
    {
      step: 2,
      text: "Open a pull request. Your team reviews flag changes alongside application code.",
    },
    {
      step: 3,
      text: "CI/CD runs a plan: see exactly which flags will be created, modified, or removed.",
    },
    {
      step: 4,
      text: "Merge and apply. Flag state is synchronized with your infrastructure.",
    },
    {
      step: 5,
      text: "Drift detection continuously monitors for discrepancies between IaC and live state.",
    },
  ];

  return (
    <section
      id="gitops"
      className="py-20 sm:py-28 bg-[var(--bgColor-default)]"
      aria-labelledby="gitops-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Visual */}
          <motion.div {...fadeUp} className="order-last lg:order-first">
            <div
              className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] overflow-hidden"
              style={{ boxShadow: "var(--shadow-resting-medium)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                <div className="flex items-center gap-2">
                  <GitPullRequestIcon
                    size={14}
                    className="text-[var(--fgColor-accent)]"
                  />
                  <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                    GitOps Workflow
                  </p>
                </div>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                  PR #312 · feat: add holiday-promo flag · Open
                </p>
              </div>
              <div className="p-5">
                {/* Terraform preview */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-2">
                    Terraform Configuration
                  </p>
                  <div className="font-mono text-xs leading-relaxed text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] p-3 rounded-lg">
                    <div>
                      <span className="text-[var(--fgColor-accent)]">
                        resource
                      </span>{" "}
                      <span className="text-[var(--fgColor-success)]">
                        &quot;featuresignals_flag&quot;
                      </span>{" "}
                      <span className="text-[var(--fgColor-done)]">
                        &quot;holiday_promo&quot;
                      </span>{" "}
                      {"{"}
                    </div>
                    <div className="ml-4">
                      key ={" "}
                      <span className="text-[var(--fgColor-success)]">
                        &quot;holiday-promo&quot;
                      </span>
                    </div>
                    <div className="ml-4">
                      name ={" "}
                      <span className="text-[var(--fgColor-success)]">
                        &quot;Holiday Promotion 2026&quot;
                      </span>
                    </div>
                    <div className="ml-4">
                      type ={" "}
                      <span className="text-[var(--fgColor-success)]">
                        &quot;boolean&quot;
                      </span>
                    </div>
                    <div className="ml-4">
                      environments ={" "}
                      <span className="text-[var(--fgColor-attention)]">
                        [&quot;staging&quot;, &quot;production&quot;]
                      </span>
                    </div>
                    <div>{"}"}</div>
                  </div>
                </div>

                {/* CI/CD pipeline */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-2">
                    CI/CD Pipeline
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircleIcon
                      size={14}
                      className="text-[var(--fgColor-success)]"
                    />
                    <span className="text-xs text-[var(--fgColor-default)]">
                      Terraform Plan — 3 resources, 0 changes
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircleIcon
                      size={14}
                      className="text-[var(--fgColor-success)]"
                    />
                    <span className="text-xs text-[var(--fgColor-default)]">
                      Policy Check — All approval rules passed
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <SyncIcon
                      size={14}
                      className="text-[var(--fgColor-accent)]"
                    />
                    <span className="text-xs text-[var(--fgColor-accent)]">
                      Drift Detection — No drift detected
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Text */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <SectionLabel icon={WorkflowIcon} text="GitOps" />
            <h2
              id="gitops-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
            >
              Manage flags as code.{" "}
              <span className="text-[var(--fgColor-accent)]">
                Review, approve, deploy.
              </span>
            </h2>
            <p className="text-base text-[var(--fgColor-muted)] mt-4 leading-relaxed max-w-lg">
              Treat feature flags like the rest of your infrastructure. Version
              flag configurations in git, review changes through pull requests,
              and apply through your existing CI/CD pipeline — with full drift
              detection.
            </p>

            <div className="mt-6 pt-6 border-t border-[var(--borderColor-default)]">
              <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-4">
                How it works
              </p>
              <div className="space-y-4">
                {steps.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <StepBadge num={item.step} />
                    <p className="text-sm text-[var(--fgColor-default)] leading-relaxed pt-0.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/docs/gitops"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
            >
              Learn more about GitOps
              <ChevronRightIcon size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   8. Enterprise Governance
   ========================================================================== */

function EnterpriseGovernanceSection() {
  const steps = [
    {
      step: 1,
      text: "Assign roles: Owner, Admin, Developer, Viewer — with per-environment permission scopes.",
    },
    {
      step: 2,
      text: "Enable change approval workflows for production environments. Configurable reviewer pools.",
    },
    {
      step: 3,
      text: "Every action is logged: flag creation, toggle, targeting change, approval — with before/after diffs.",
    },
    {
      step: 4,
      text: "Integrate with your identity provider via SAML/OIDC SSO. Enforce MFA across your organization.",
    },
    {
      step: 5,
      text: "Restrict access by IP range, provision users via SCIM, and create custom roles for your needs.",
    },
  ];

  interface PermRow {
    perm: string;
    roles: boolean[];
  }

  const permissions: PermRow[] = [
    { perm: "View flags", roles: [true, true, true, true] },
    { perm: "Toggle flags", roles: [false, true, true, true] },
    { perm: "Edit rules", roles: [false, true, true, true] },
    { perm: "Manage segments", roles: [false, false, true, true] },
    { perm: "Approve changes", roles: [false, false, true, true] },
    { perm: "Manage billing", roles: [false, false, false, true] },
  ];

  const complianceBadges = [
    "SOC 2 Type II",
    "GDPR",
    "HIPAA",
    "SSO (SAML/OIDC)",
    "SCIM",
    "MFA",
    "Audit Logs",
  ];

  return (
    <section
      id="enterprise-governance"
      className="py-20 sm:py-28 bg-[var(--bgColor-inset)]"
      aria-labelledby="enterprise-governance-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={ShieldCheckIcon} text="Enterprise Governance" />
            <h2
              id="enterprise-governance-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
            >
              Ship fast without{" "}
              <span className="text-[var(--fgColor-accent)]">
                compromising compliance
              </span>
            </h2>
            <p className="text-base text-[var(--fgColor-muted)] mt-4 leading-relaxed max-w-lg">
              Enterprise-grade access controls, audit logging, and compliance
              readiness — so your platform team can enable developers without
              losing control. SOC 2, GDPR, and HIPAA ready.
            </p>

            <div className="mt-6 pt-6 border-t border-[var(--borderColor-default)]">
              <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider mb-4">
                How it works
              </p>
              <div className="space-y-4">
                {steps.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <StepBadge num={item.step} />
                    <p className="text-sm text-[var(--fgColor-default)] leading-relaxed pt-0.5">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/docs/governance"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
            >
              Learn more about enterprise governance
              <ChevronRightIcon size={14} />
            </Link>
          </motion.div>

          {/* Right: RBAC visual */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <div
              className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] overflow-hidden"
              style={{ boxShadow: "var(--shadow-resting-medium)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                  Role-Based Access
                </p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                  Per-environment permissions · 4 built-in roles
                </p>
              </div>
              <div className="p-5">
                {/* Role matrix */}
                <div className="overflow-hidden rounded-lg border border-[var(--borderColor-default)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--bgColor-muted)]">
                        <th className="text-left px-3 py-2 font-semibold text-[var(--fgColor-default)]">
                          Permission
                        </th>
                        <th className="text-center px-3 py-2 font-semibold text-[var(--fgColor-muted)]">
                          Viewer
                        </th>
                        <th className="text-center px-3 py-2 font-semibold text-[var(--fgColor-muted)]">
                          Developer
                        </th>
                        <th className="text-center px-3 py-2 font-semibold text-[var(--fgColor-muted)]">
                          Admin
                        </th>
                        <th className="text-center px-3 py-2 font-semibold text-[var(--fgColor-muted)]">
                          Owner
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map((row, i) => (
                        <tr
                          key={row.perm}
                          className={cn(
                            "border-t border-[var(--borderColor-default)]",
                            i % 2 === 0
                              ? "bg-[var(--bgColor-default)]"
                              : "bg-[var(--bgColor-inset)]",
                          )}
                        >
                          <td className="px-3 py-2 text-[var(--fgColor-default)]">
                            {row.perm}
                          </td>
                          {row.roles.map((has, j) => (
                            <td key={j} className="text-center px-3 py-2">
                              {has ? (
                                <CheckIcon
                                  size={14}
                                  className="text-[var(--fgColor-success)] inline"
                                />
                              ) : (
                                <span className="text-[var(--fgColor-subtle)]">
                                  {"\u2014"}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Compliance badges row */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {complianceBadges.map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)] border border-[var(--borderColor-success-muted)]"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   9. Final CTA Section
   ========================================================================== */

function FinalCtaSection() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{ backgroundColor: "#25292e" }}
      aria-labelledby="use-cases-cta-heading"
    >
      <div className="absolute inset-0 bg-dotted-dark" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(9,105,218,0.12) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <RocketIcon
            size={40}
            fill="#54aeff"
            className="mx-auto mb-6"
            aria-hidden="true"
          />

          <h2
            id="use-cases-cta-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight"
          >
            Ready to ship safer and faster?
          </h2>

          <p className="text-base sm:text-lg text-[#8b949e] mt-4 max-w-xl mx-auto leading-relaxed">
            Join engineering teams that use FeatureSignals for progressive
            delivery, canary releases, A/B testing, and more. Start free — no
            credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a
              href={REGISTER_URL}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:opacity-90 transition-opacity shadow-[0_1px_0_0_#1f232826]"
            >
              Start Free — No Credit Card
              <ArrowRightIcon size={16} />
            </a>
            <a
              href={SALES_EMAIL}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-colors"
            >
              Contact Sales
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-[#8b949e] hover:text-white transition-colors"
            >
              <GitPullRequestIcon size={16} />
              Star on GitHub
            </a>
          </div>

          <p className="text-xs text-[#59636e] mt-6">
            Free forever for up to 50 flags. No credit card required.{" "}
            <span className="inline-flex items-center gap-1">
              <HeartFillIcon size={10} className="text-red-400" />
              Open source under Apache 2.0.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
