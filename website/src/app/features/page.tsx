"use client";

import { motion } from "framer-motion";
import {
  Rocket,
  Zap,
  ShieldCheck,
  GitPullRequest,
  Code,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  Terminal,
  Heart,
  ChevronRight,
  Package,
  Users,
  GitBranch,
  FlaskConical,
  Workflow,
  Check,
  Database,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ==========================================================================
   Animation helpers
   ========================================================================== */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

const fadeUpDelayed = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
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
    <a href={href} className={cn("btn-primary-success", className)}>
      {children}
      <ArrowRight size={16} />
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
  const cls = cn("btn-secondary", className);

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
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-3">
      <Icon size={14} />
      {text}
    </span>
  );
}

/* ==========================================================================
   Feature card (right column visual)
   ========================================================================== */

/** Small card that mimics a feature flag row */
function FlagCard({
  name,
  type,
  status,
}: {
  name: string;
  type: string;
  status: "active" | "inactive";
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            status === "active"
              ? "bg-[var(--signal-bg-success-emphasis)]"
              : "bg-[var(--signal-border-emphasis)]",
          )}
        />
        <div>
          <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
            {name}
          </p>
          <p className="text-xs text-[var(--signal-fg-secondary)]">{type}</p>
        </div>
      </div>
      <span
        className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          status === "active"
            ? "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
            : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
        )}
      >
        {status === "active" ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

/** Small card showing an operator pill */
function OperatorPill({ op }: { op: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border border-[var(--signal-border-accent-muted)]">
      {op}
    </span>
  );
}

/** Code block visual */
function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--fs-bg-surface-inset)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-xs text-[var(--signal-fg-secondary)] font-mono">
          terminal
        </span>
      </div>
      <div className="p-4 font-mono text-xs leading-relaxed text-[var(--signal-fg-primary)]">
        {lines.map((line, i) => (
          <div key={i}>
            <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
              {String(i + 1).padStart(2, " ")}
            </span>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Features Page
   ========================================================================== */

export default function FeaturesPage() {
  return (
    <>
      <HeroSection />
      <FeatureFlagsSection />
      <TargetingSection />
      <ExperimentsSection />
      <AiJanitorSection />
      <MigrationSection />
      <GovernanceSection />
      <AutomationSection />
      <IntegrationsSection />
      <FinalCtaSection />
    </>
  );
}

/* ==========================================================================
   1. Hero Section
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[var(--signal-bg-primary)] bg-glow-orbs"
      aria-labelledby="features-hero-heading"
    >
      {/* Subtle grid background */}
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)] border-[var(--signal-border-success-muted)]">
            <ShieldCheck size={14} />
            SOC 2 Type II
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border-[var(--signal-border-accent-muted)]">
            <Zap size={14} />
            Sub-ms Latency
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)] border-transparent">
            <Code size={14} />
            OpenFeature Native
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)] border-[var(--signal-border-warning-muted)]">
            <GitPullRequest size={14} />
            Apache 2.0
          </span>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div>
            <motion.h1
              id="features-hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em] text-[var(--signal-fg-primary)] leading-[1.08]"
              {...fadeUp}
            >
              Release infrastructure for{" "}
              <span className="text-[var(--signal-fg-accent)]">
                teams that ship
              </span>
              .
            </motion.h1>

            <motion.p
              className="text-lg text-[var(--signal-fg-secondary)] mt-5 leading-relaxed max-w-xl"
              {...fadeUpDelayed(0.1)}
            >
              Everything you need to manage feature flags at scale — from
              creation to cleanup. Sub-millisecond evaluation, AI-powered stale
              flag detection, and enterprise governance in one platform.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 mt-8"
              {...fadeUpDelayed(0.2)}
            >
              <CtaPrimary>Start Free</CtaPrimary>
              <CtaSecondary href={DOCS_URL}>View Docs</CtaSecondary>
            </motion.div>

            {/* Quickstart command bar */}
            <motion.div
              className="mt-8 hidden sm:block"
              {...fadeUpDelayed(0.3)}
            >
              <p className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider mb-2">
                Quickstart
              </p>
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--fs-bg-surface-inset)] border border-[var(--signal-border-default)] font-mono text-sm text-[var(--signal-fg-primary)]">
                <Terminal
                  size={14}
                  className="text-[var(--signal-fg-secondary)] shrink-0"
                />
                <span className="select-all">
                  docker run -p 8080:8080 featuresignals/server
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right: Interactive visual card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-64px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] overflow-hidden premium-card">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  Feature Flags
                </p>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                  production &middot; 24 flags
                </p>
              </div>
              {/* Flag list */}
              <div className="p-4 space-y-2.5">
                <FlagCard name="dark-mode-v2" type="Boolean" status="active" />
                <FlagCard
                  name="ai-search-beta"
                  type="Boolean"
                  status="active"
                />
                <FlagCard
                  name="checkout-redesign"
                  type="Percentage"
                  status="active"
                />
                <FlagCard name="export-pdf" type="Boolean" status="inactive" />
                <FlagCard name="onboarding-wizard" type="A/B" status="active" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   2. Feature Flags Section
   ========================================================================== */

function FeatureFlagsSection() {
  return (
    <section
      id="feature-flags"
      className="py-20 sm:py-28 bg-[var(--fs-bg-surface-inset)]"
      aria-labelledby="feature-flags-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={Rocket} text="Feature Flags" />
            <h2
              id="feature-flags-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
            >
              The control plane for{" "}
              <span className="text-[var(--signal-fg-accent)]">
                every feature
              </span>
            </h2>
            <p className="text-base text-[var(--signal-fg-secondary)] mt-4 leading-relaxed max-w-lg">
              Ship features with confidence using boolean, string, number, JSON,
              and multi-variant flags. Every flag type supports the full
              targeting, scheduling, and lifecycle management capabilities.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Boolean, string, number, JSON, and multi-variant A/B flags",
                "Sub-millisecond evaluation — no database calls on the hot path",
                "Percentage rollouts with consistent hashing (MurmurHash3)",
                "Instant kill switches and scheduled toggles",
                "Per-environment flag states with promotion between environments",
                "Prerequisites and mutual exclusion groups for complex release logic",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/docs/core-concepts/feature-flags"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            >
              Learn more about feature flags
              <ChevronRight size={14} />
            </Link>
          </motion.div>

          {/* Right: Flag types visualization */}
          <motion.div {...fadeUpDelayed(0.1)} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: Check,
                  label: "Boolean",
                  desc: "Simple on/off toggles",
                  color:
                    "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]",
                },
                {
                  icon: Terminal,
                  label: "String",
                  desc: "Text-based configuration",
                  color:
                    "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]",
                },
                {
                  icon: Gauge,
                  label: "Number",
                  desc: "Numeric thresholds",
                  color:
                    "bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]",
                },
                {
                  icon: Database,
                  label: "JSON",
                  desc: "Structured payloads",
                  color:
                    "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-5 hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-md)] transition-all duration-200"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center mb-3",
                      item.color,
                    )}
                  >
                    <item.icon size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                    {item.label}
                  </h3>
                  <p className="text-xs text-[var(--signal-fg-secondary)] mt-1">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   3. Targeting & Segments Section
   ========================================================================== */

function TargetingSection() {
  return (
    <section
      id="targeting"
      className="py-20 sm:py-28 bg-[var(--signal-bg-primary)]"
      aria-labelledby="targeting-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Visual */}
          <motion.div {...fadeUp} className="order-last lg:order-first">
            <div
              className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--fs-bg-surface-inset)] overflow-hidden"
              style={{ boxShadow: "var(--signal-shadow-md)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  Targeting Rule
                </p>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                  Priority 1 &middot; Enabled
                </p>
              </div>
              <div className="p-5 space-y-4">
                {/* Condition rows */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs font-semibold text-[var(--signal-fg-secondary)] bg-[var(--signal-bg-secondary)] px-2 py-1 rounded">
                    IF
                  </span>
                  <span className="font-mono text-xs text-[var(--signal-fg-primary)]">
                    user.country
                  </span>
                  <OperatorPill op="eq" />
                  <span className="font-mono text-xs text-[var(--signal-fg-accent)]">
                    &quot;US&quot;
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs font-semibold text-[var(--signal-fg-secondary)] bg-[var(--signal-bg-secondary)] px-2 py-1 rounded">
                    AND
                  </span>
                  <span className="font-mono text-xs text-[var(--signal-fg-primary)]">
                    user.plan
                  </span>
                  <OperatorPill op="in" />
                  <span className="font-mono text-xs text-[var(--signal-fg-accent)]">
                    [&quot;pro&quot;, &quot;enterprise&quot;]
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs font-semibold text-[var(--signal-fg-secondary)] bg-[var(--signal-bg-secondary)] px-2 py-1 rounded">
                    AND
                  </span>
                  <span className="font-mono text-xs text-[var(--signal-fg-primary)]">
                    user.beta
                  </span>
                  <OperatorPill op="exists" />
                </div>
                {/* Then action */}
                <div className="pt-3 border-t border-[var(--signal-border-default)] flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs font-semibold text-[var(--signal-fg-success)] bg-[var(--signal-bg-success-muted)] px-2 py-1 rounded">
                    THEN
                  </span>
                  <span className="text-xs text-[var(--signal-fg-primary)]">
                    Serve <strong>true</strong>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Text */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <SectionLabel icon={Users} text="Targeting & Segments" />
            <h2
              id="targeting-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
            >
              Target the right users,{" "}
              <span className="text-[var(--signal-fg-accent)]">every time</span>
            </h2>
            <p className="text-base text-[var(--signal-fg-secondary)] mt-4 leading-relaxed max-w-lg">
              Precise user targeting with 13 operators and reusable segments.
              Build once, apply everywhere. Priority-based evaluation ensures
              consistent, predictable behavior.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "13 targeting operators: eq, neq, contains, startsWith, endsWith, in, notIn, gt, gte, lt, lte, regex, exists",
                "Reusable segments for condition groups shared across flags",
                "Priority-based rule evaluation with fallback chains",
                "Custom attribute targeting for any user property",
                "Target inspector for real-time debugging of why a flag evaluated the way it did",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/docs/core-concepts/targeting-and-segments"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            >
              Learn more about targeting
              <ChevronRight size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   4. A/B Experiments Section
   ========================================================================== */

function ExperimentsSection() {
  return (
    <section
      id="experiments"
      className="py-20 sm:py-28 bg-[var(--fs-bg-surface-inset)]"
      aria-labelledby="experiments-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={FlaskConical} text="A/B Experiments" />
            <h2
              id="experiments-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
            >
              Measure what moves{" "}
              <span className="text-[var(--signal-fg-accent)]">
                your metrics
              </span>
            </h2>
            <p className="text-base text-[var(--signal-fg-secondary)] mt-4 leading-relaxed max-w-lg">
              Run experiments directly on your feature flags — no separate tool
              required. Weighted variants with deterministic assignment ensure
              consistent user experiences across sessions.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Weighted variants with deterministic assignment (MurmurHash3)",
                "Impression tracking for conversion measurement",
                "Per-environment experiment configuration — test in staging, run in production",
                "Built into every plan — not a paid add-on",
                "Combine with targeting rules for segmented experiments",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/docs/core-concepts/ab-experimentation"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            >
              Learn more about experiments
              <ChevronRight size={14} />
            </Link>
          </motion.div>

          {/* Right: Variant distribution visual */}
          <motion.div
            {...fadeUpDelayed(0.1)}
            className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] overflow-hidden premium-card"
          >
            <div className="px-5 py-4 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                checkout-redesign
              </p>
              <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                3 variants &middot; 50/30/20 split
              </p>
            </div>
            <div className="p-5 space-y-4">
              {[
                {
                  label: "Control (original)",
                  pct: 50,
                  color: "bg-[var(--signal-bg-accent-emphasis)]",
                  users: "12,450",
                },
                {
                  label: "Variant A (new flow)",
                  pct: 30,
                  color: "bg-[var(--signal-bg-success-emphasis)]",
                  users: "7,470",
                },
                {
                  label: "Variant B (simplified)",
                  pct: 20,
                  color: "bg-[var(--signal-bg-info-emphasis)]",
                  users: "4,980",
                },
              ].map((v) => (
                <div key={v.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                      {v.label}
                    </span>
                    <span className="text-xs text-[var(--signal-fg-secondary)] tabular-nums">
                      {v.pct}% &middot; {v.users} users
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--fs-bg-surface-inset)] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        v.color,
                      )}
                      style={{ width: `${v.pct}%` }}
                    />
                  </div>
                </div>
              ))}
              {/* Impressions counter */}
              <div className="pt-4 border-t border-[var(--signal-border-default)] grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-[var(--fs-bg-surface-inset)]">
                  <p className="text-2xl font-bold text-[var(--signal-fg-primary)] tabular-nums">
                    24.9K
                  </p>
                  <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                    Impressions
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[var(--fs-bg-surface-inset)]">
                  <p className="text-2xl font-bold text-[var(--signal-fg-success)] tabular-nums">
                    +3.2%
                  </p>
                  <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                    Conversion lift
                  </p>
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
   5. AI Janitor Section
   ========================================================================== */

function AiJanitorSection() {
  return (
    <section
      id="ai-janitor"
      className="py-20 sm:py-28 bg-[var(--signal-bg-primary)]"
      aria-labelledby="ai-janitor-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Visual */}
          <motion.div
            {...fadeUp}
            className="order-last lg:order-first flex flex-col gap-5"
          >
            <div
              className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--fs-bg-surface-inset)] overflow-hidden"
              style={{ boxShadow: "var(--signal-shadow-md)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                <div className="flex items-center gap-2">
                  <Lightbulb
                    size={14}
                    className="text-[var(--signal-fg-accent)]"
                  />
                  <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                    AI Janitor Scan
                  </p>
                </div>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                  Last scan: 2 hours ago &middot; 3 flags flagged
                </p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  {
                    flag: "dark-mode-v2",
                    age: "32 days",
                    type: "Release",
                    status: "Stale",
                    statusColor:
                      "text-[var(--signal-fg-warning)] bg-[var(--signal-bg-warning-muted)]",
                  },
                  {
                    flag: "ai-search-beta",
                    age: "67 days",
                    type: "Experiment",
                    status: "Critical",
                    statusColor:
                      "text-[var(--signal-fg-danger)] bg-[var(--signal-bg-danger-muted)]",
                  },
                  {
                    flag: "legacy-pdf-export",
                    age: "145 days",
                    type: "Ops",
                    status: "Stale",
                    statusColor:
                      "text-[var(--signal-fg-warning)] bg-[var(--signal-bg-warning-muted)]",
                  },
                ].map((item) => (
                  <div
                    key={item.flag}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                        {item.flag}
                      </p>
                      <p className="text-xs text-[var(--signal-fg-secondary)]">
                        {item.type} &middot; {item.age}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full",
                        item.statusColor,
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
                {/* PR preview */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]">
                  <GitPullRequest
                    size={16}
                    className="text-[var(--signal-fg-success)]"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[var(--signal-fg-success)]">
                      PR #284 opened
                    </p>
                    <p className="text-xs text-[var(--signal-fg-secondary)]">
                      chore: remove stale flags (3 files)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Text */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <SectionLabel icon={Lightbulb} text="AI Janitor" />
            <h2
              id="ai-janitor-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
            >
              Stop flag rot{" "}
              <span className="text-[var(--signal-fg-accent)]">
                before it starts
              </span>
            </h2>
            <p className="text-base text-[var(--signal-fg-secondary)] mt-4 leading-relaxed max-w-lg">
              The AI Janitor autonomously scans your codebase for stale feature
              flags, categorizes them by risk, and opens cleanup pull requests —
              so your team can focus on shipping, not housekeeping.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Autonomous stale flag detection across your entire codebase",
                "Category-aware staleness thresholds: Release (14d), Experiment (30d), Ops (90d)",
                "Auto-generates cleanup pull requests with context-aware diffs",
                "Supports GitHub, GitLab, Bitbucket, and Azure DevOps",
                "Configurable confidence scoring and compliance modes for regulated industries",
                "LLM-powered code analysis with provider flexibility",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/docs/advanced/ai-janitor"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            >
              Learn more about AI Janitor
              <ChevronRight size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   6. Migration Engine Section
   ========================================================================== */

function MigrationSection() {
  return (
    <section
      id="migration"
      className="py-20 sm:py-28 bg-[var(--fs-bg-surface-inset)]"
      aria-labelledby="migration-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={GitBranch} text="Migration Engine" />
            <h2
              id="migration-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
            >
              Switch without{" "}
              <span className="text-[var(--signal-fg-accent)]">
                rewriting your codebase
              </span>
            </h2>
            <p className="text-base text-[var(--signal-fg-secondary)] mt-4 leading-relaxed max-w-lg">
              Import your flags, environments, segments, and targeting rules
              from any major provider in minutes. Dry-run first to verify
              everything maps correctly. OpenFeature-native SDKs mean this is
              the last migration you&apos;ll ever need.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "One-click import from LaunchDarkly, ConfigCat, Flagsmith, and Unleash",
                "Dry-run preview before execution — see exactly what will be created",
                "Preserves targeting rules, segments, and per-environment configuration",
                "Operator and strategy mapping for each provider's unique semantics",
                "OpenFeature-native: switch providers without code changes",
                "Infrastructure as Code export: Terraform, YAML/JSON",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/docs/advanced/migration"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            >
              Learn more about migration
              <ChevronRight size={14} />
            </Link>
          </motion.div>

          {/* Right: Provider migration visual */}
          <motion.div {...fadeUpDelayed(0.1)} className="flex flex-col gap-5">
            <div className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] overflow-hidden premium-card">
              <div className="px-5 py-4 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  Migration Preview
                </p>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                  Dry run &middot; 0 errors &middot; 142 flags ready
                </p>
              </div>
              <div className="p-5 space-y-2">
                {[
                  {
                    from: "LaunchDarkly",
                    to: "FeatureSignals",
                    flags: 86,
                    status: "Ready",
                  },
                  {
                    from: "ConfigCat",
                    to: "FeatureSignals",
                    flags: 34,
                    status: "Ready",
                  },
                  {
                    from: "Flagsmith",
                    to: "FeatureSignals",
                    flags: 22,
                    status: "Ready",
                  },
                ].map((row) => (
                  <div
                    key={row.from}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--fs-bg-surface-inset)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                        {row.from}
                      </span>
                      <ArrowRight
                        size={14}
                        className="text-[var(--signal-fg-secondary)]"
                      />
                      <span className="text-sm font-semibold text-[var(--signal-fg-accent)]">
                        {row.to}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--signal-fg-secondary)]">
                        {row.flags} flags
                      </span>
                      <span className="text-xs font-semibold text-[var(--signal-fg-success)] bg-[var(--signal-bg-success-muted)] px-2 py-0.5 rounded-full">
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
                {/* Export section */}
                <div className="mt-4 pt-4 border-t border-[var(--signal-border-default)]">
                  <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-3">
                    IaC Export Formats
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Terraform", "Pulumi", "Ansible", "YAML", "JSON"].map(
                      (fmt) => (
                        <span
                          key={fmt}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border border-[var(--signal-border-accent-muted)]"
                        >
                          {fmt}
                        </span>
                      ),
                    )}
                  </div>
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
   7. Governance & RBAC Section
   ========================================================================== */

function GovernanceSection() {
  return (
    <section
      id="governance"
      className="py-20 sm:py-28 bg-[var(--signal-bg-primary)]"
      aria-labelledby="governance-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Visual */}
          <motion.div {...fadeUp} className="order-last lg:order-first">
            <div
              className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--fs-bg-surface-inset)] overflow-hidden"
              style={{ boxShadow: "var(--signal-shadow-md)" }}
            >
              <div className="px-5 py-4 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  Audit Log
                </p>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                  All changes are tamper-evident and immutable
                </p>
              </div>
              <div className="p-5 space-y-2.5">
                {[
                  {
                    action: "Flag toggled ON",
                    user: "jane@acme.com",
                    time: "2 min ago",
                    env: "production",
                  },
                  {
                    action: "Targeting rule updated",
                    user: "mike@acme.com",
                    time: "18 min ago",
                    env: "staging",
                  },
                  {
                    action: "Segment modified",
                    user: "sarah@acme.com",
                    time: "1 hour ago",
                    env: "production",
                  },
                  {
                    action: "Approval requested",
                    user: "alex@acme.com",
                    time: "3 hours ago",
                    env: "production",
                  },
                ].map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck
                        size={14}
                        className="text-[var(--signal-fg-secondary)]"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                          {entry.action}
                        </p>
                        <p className="text-[11px] text-[var(--signal-fg-secondary)]">
                          {entry.user} &middot; {entry.env}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--signal-fg-secondary)] tabular-nums">
                      {entry.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Text */}
          <motion.div {...fadeUpDelayed(0.1)}>
            <SectionLabel icon={ShieldCheck} text="Governance & RBAC" />
            <h2
              id="governance-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
            >
              Ship fast without{" "}
              <span className="text-[var(--signal-fg-accent)]">
                compromising compliance
              </span>
            </h2>
            <p className="text-base text-[var(--signal-fg-secondary)] mt-4 leading-relaxed max-w-lg">
              Enterprise-grade access control, audit logging, and change
              management built into every plan. Know who changed what, when, and
              why — with tamper-evident records you can trust.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Four built-in roles: Owner, Admin, Developer, Viewer",
                "Per-environment permissions: can_toggle, can_edit_rules, can_manage",
                "Change approval workflows with configurable reviewers",
                "Tamper-evident audit logging with before/after diffs for every change",
                "SSO (SAML/OIDC), SCIM provisioning, and MFA enforcement",
                "IP allowlisting and custom roles (Enterprise plan)",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/docs/advanced/rbac"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            >
              Learn more about governance
              <ChevronRight size={14} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   8. Automation & Webhooks Section
   ========================================================================== */

function AutomationSection() {
  return (
    <section
      id="automation"
      className="py-20 sm:py-28 bg-[var(--fs-bg-surface-inset)]"
      aria-labelledby="automation-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={Workflow} text="Automation & Webhooks" />
            <h2
              id="automation-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
            >
              Automate your{" "}
              <span className="text-[var(--signal-fg-accent)]">
                release pipeline
              </span>
            </h2>
            <p className="text-base text-[var(--signal-fg-secondary)] mt-4 leading-relaxed max-w-lg">
              Connect FeatureSignals to your existing toolchain with webhooks,
              scheduling, and infrastructure as code providers. Flags respond to
              your pipeline — not the other way around.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "Webhook notifications for flag lifecycle events: created, toggled, archived",
                "HMAC-SHA256 signature verification for secure payload delivery",
                "Flag scheduling: time-based enable/disable with timezone support",
                "CI/CD pipeline integration: flip flags from GitHub Actions, GitLab CI, Jenkins",
                "Infrastructure as Code: Terraform, Pulumi, Ansible providers",
                "Relay proxy for edge-cached evaluation with local sub-100µs latency",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/docs/advanced/approval-workflows"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            >
              Learn more about automation
              <ChevronRight size={14} />
            </Link>
          </motion.div>

          {/* Right: Webhook event visual */}
          <motion.div
            {...fadeUpDelayed(0.1)}
            className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] overflow-hidden premium-card"
          >
            <div className="px-5 py-4 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                Webhook Events
              </p>
              <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                3 active endpoints &middot; 99.8% delivery rate
              </p>
            </div>
            <div className="p-5 space-y-3">
              {[
                {
                  event: "flag.toggled",
                  payload:
                    '{"flag":"dark-mode","env":"production","value":true}',
                  time: "Just now",
                },
                {
                  event: "flag.archived",
                  payload:
                    '{"flag":"old-checkout","env":"production","archived_by":"jane"}',
                  time: "5 min ago",
                },
                {
                  event: "flag.scheduled",
                  payload:
                    '{"flag":"holiday-promo","env":"production","activate_at":"2026-12-01T00:00:00Z"}',
                  time: "12 min ago",
                },
              ].map((evt, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--fs-bg-surface-inset)] p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[var(--signal-fg-accent)] font-mono">
                      {evt.event}
                    </span>
                    <span className="text-[11px] text-[var(--signal-fg-secondary)]">
                      {evt.time}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[var(--signal-fg-secondary)] bg-[var(--signal-bg-secondary)] p-2 rounded break-all leading-relaxed">
                    {evt.payload}
                  </div>
                </div>
              ))}
              {/* HMAC badge */}
              <div className="flex items-center gap-2 pt-2">
                <ShieldCheck
                  size={14}
                  className="text-[var(--signal-fg-success)]"
                />
                <span className="text-xs text-[var(--signal-fg-secondary)]">
                  All payloads signed with HMAC-SHA256
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   9. Integrations Section
   ========================================================================== */

function IntegrationsSection() {
  const sdkLanguages = [
    "Go",
    "Node.js",
    "Python",
    "Java",
    ".NET",
    "Ruby",
    "React",
    "Vue",
  ];

  const iacTools = ["Terraform", "Pulumi", "Ansible", "Crossplane"];

  const ssoProviders = ["Okta", "Azure AD", "Google", "GitHub", "Custom OIDC"];

  return (
    <section
      id="integrations"
      className="py-20 sm:py-28 bg-[var(--signal-bg-primary)]"
      aria-labelledby="integrations-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div {...fadeUp}>
            <SectionLabel icon={Package} text="Integrations" />
            <h2
              id="integrations-heading"
              className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
            >
              Works with your{" "}
              <span className="text-[var(--signal-fg-accent)]">
                entire stack
              </span>
            </h2>
            <p className="text-base text-[var(--signal-fg-secondary)] mt-4 leading-relaxed max-w-lg">
              Eight native SDKs, infrastructure as code providers, Git
              integrations, and SSO — all built on OpenFeature so you&apos;re
              never locked in.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                "8 SDKs: Go, Node.js, Python, Java, .NET, Ruby, React, Vue — all implementing OpenFeature natively",
                "Infrastructure as Code: Terraform, Pulumi, Ansible, Crossplane providers for GitOps",
                "Git integrations for AI Janitor: GitHub, GitLab, Bitbucket, Azure DevOps",
                "SSO providers: Okta, Azure AD, Google, GitHub, custom OIDC",
                "Log streaming to SIEM platforms: Datadog, Splunk, Elastic, Grafana Loki",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
                >
                  <CheckCircle
                    size={14}
                    className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/integrations"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            >
              View all integrations
              <ChevronRight size={14} />
            </Link>
          </motion.div>

          {/* Right: Technology grid */}
          <motion.div {...fadeUpDelayed(0.1)} className="flex flex-col gap-5">
            <div
              className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--fs-bg-surface-inset)] p-6"
              style={{ boxShadow: "var(--signal-shadow-md)" }}
            >
              {/* SDKs */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-3">
                  SDKs &amp; Languages
                </p>
                <div className="flex flex-wrap gap-2">
                  {sdkLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              {/* IaC */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-3">
                  Infrastructure as Code
                </p>
                <div className="flex flex-wrap gap-2">
                  {iacTools.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)] border border-transparent"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* SSO */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-3">
                  SSO Providers
                </p>
                <div className="flex flex-wrap gap-2">
                  {ssoProviders.map((provider) => (
                    <span
                      key={provider}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)] border border-[var(--signal-border-success-muted)]"
                    >
                      {provider}
                    </span>
                  ))}
                </div>
              </div>

              {/* Git providers */}
              <div>
                <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-3">
                  Git Providers
                </p>
                <div className="flex flex-wrap gap-2">
                  {["GitHub", "GitLab", "Bitbucket", "Azure DevOps"].map(
                    (git) => (
                      <span
                        key={git}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)] border border-[var(--signal-border-warning-muted)]"
                      >
                        {git}
                      </span>
                    ),
                  )}
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
   10. Final CTA Section
   ========================================================================== */

function FinalCtaSection() {
  return (
    <section
      id="cta"
      className="relative overflow-hidden py-20 sm:py-28 bg-gradient-mesh-dark"
      aria-labelledby="features-cta-heading"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 bg-dots-dark" aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <Rocket
            size={40}
            fill="#54aeff"
            className="mx-auto mb-6"
            aria-hidden="true"
          />

          <h2
            id="features-cta-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight"
          >
            Ready to take control of your release infrastructure?
          </h2>

          <p className="text-base sm:text-lg text-white/60 mt-4 max-w-xl mx-auto leading-relaxed">
            Open source. Sub-millisecond. No vendor lock-in. Start free on our
            cloud or self-host in minutes. Every feature on this page is
            available in every plan.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a href={REGISTER_URL} className="btn-primary-success">
              Start Free — No Credit Card
              <ArrowRight size={16} />
            </a>
            <a
              href={SALES_EMAIL}
              className="btn-secondary !text-white !bg-white/10 !border-white/50 hover:!bg-white/15 hover:!border-white/60"
            >
              Contact Sales
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white/60 hover:text-white transition-colors"
            >
              <GitPullRequest size={16} />
              Star on GitHub
            </a>
          </div>

          <p className="text-xs text-white/60 mt-6">
            Free forever for up to 50 flags. No credit card required.{" "}
            <span className="inline-flex items-center gap-1">
              <Heart size={10} className="text-red-400" />
              Open source under Apache 2.0.
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
