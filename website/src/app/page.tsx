"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Rocket,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  FlaskConical,
  Box,
  Zap,
  ArrowRight,
  Check,
  Star,
  Heart,
  Code2,
  Terminal,
  Settings,
  GitFork,
  Activity,
  Users,
  Globe,
  Lock,
  Server,
  BadgeCheck,
  ToggleLeft,
  ToggleRight,
  Target,
  Copy,
  X,
  GripHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  evaluateFlag,
  DEMO_FLAG,
  DEMO_CONTEXT,
  type EvaluationResult,
} from "@/lib/eval-engine";

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
const DOCS_URL = "/docs";
const GITHUB_URL = "https://github.com/dinesh-g1/featuresignals";

/* ==========================================================================
   Shared button class helpers
   ========================================================================== */

/** Primary CTA button — green, prominent, consistent across the page */
const btnPrimary = cn(
  "inline-flex items-center justify-center rounded-lg h-12 px-8 text-base font-semibold min-w-[140px] whitespace-nowrap w-full sm:w-auto",
  "text-white bg-[var(--signal-bg-success-emphasis)]",
  "hover:opacity-90 transition-all",
  "shadow-[var(--signal-shadow-md)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:ring-offset-2",
);

/** Secondary CTA button — white with border */
const btnSecondary = cn(
  "inline-flex items-center justify-center rounded-lg h-12 px-8 text-base font-semibold min-w-[140px] whitespace-nowrap w-full sm:w-auto",
  "text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]",
  "bg-[var(--signal-bg-primary)]",
  "hover:bg-[var(--signal-bg-secondary)] hover:shadow-[var(--signal-shadow-sm)] transition-all",
  "focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:ring-offset-2",
);

/** Dark-section CTA — white bg, dark text */
const btnDarkPrimary = cn(
  "inline-flex items-center justify-center rounded-lg h-12 px-8 text-base font-semibold min-w-[140px] whitespace-nowrap w-full sm:w-auto",
  "text-[var(--signal-fg-primary)] bg-white",
  "hover:bg-white/90 transition-all",
  "shadow-[var(--signal-shadow-md)]",
  "focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[var(--signal-bg-inverse)]",
);

/** Dark-section secondary — white outline, clearly visible */
const btnDarkSecondary = cn(
  "inline-flex items-center justify-center rounded-lg h-12 px-8 text-base font-semibold min-w-[140px] whitespace-nowrap w-full sm:w-auto",
  "text-white border border-white/60",
  "hover:bg-white/20 hover:border-white/70 transition-all",
  "focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[var(--signal-bg-inverse)]",
);

/** Pricing card CTA */
const btnPricingPrimary = cn(
  "inline-flex items-center justify-center rounded-lg h-11 w-full text-sm font-semibold",
  "text-white bg-[var(--signal-bg-success-emphasis)]",
  "hover:opacity-90 transition-all",
  "focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:ring-offset-2",
);

const btnPricingSecondary = cn(
  "inline-flex items-center justify-center rounded-lg h-11 w-full text-sm font-semibold",
  "text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]",
  "bg-[var(--signal-bg-primary)]",
  "hover:bg-[var(--signal-bg-secondary)] transition-all",
  "focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:ring-offset-2",
);

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
   1. Hero Section — The 3-Second Test
   ========================================================================== */

function MiniEvalDemo() {
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [evalResult, setEvalResult] = useState<EvaluationResult>({
    flagKey: DEMO_FLAG.key,
    value: true,
    matchedRule: null,
    reason: "Loading…",
    latencyMs: 0,
    enabled: true,
  });

  useEffect(() => {
    setEvalResult(evaluateFlag(DEMO_FLAG, DEMO_CONTEXT));
    setHydrated(true);
  }, []);

  const handleToggle = useCallback(() => {
    setFlagEnabled((prev) => {
      const next = !prev;
      const updatedFlag = { ...DEMO_FLAG, enabled: next };
      setEvalResult(evaluateFlag(updatedFlag, DEMO_CONTEXT));
      return next;
    });
  }, []);

  const isSubMs = evalResult.latencyMs < 1;

  return (
    <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-md)] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--signal-bg-success-emphasis)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--signal-bg-success-emphasis)]" />
          </span>
          <span className="text-xs font-semibold text-[var(--signal-fg-primary)]">
            Live evaluation demo
          </span>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]">
          ● Running
        </span>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-4">
        {/* Flag toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--signal-fg-primary)] font-mono">
              {DEMO_FLAG.key}
            </div>
            <div className="text-xs text-[var(--signal-fg-secondary)]">
              {DEMO_FLAG.name}
            </div>
          </div>
          <button
            onClick={handleToggle}
            role="switch"
            aria-checked={flagEnabled}
            aria-label={`Toggle ${DEMO_FLAG.key}`}
            className={cn(
              "relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:ring-offset-2",
              flagEnabled
                ? "bg-[var(--signal-bg-success-emphasis)]"
                : "bg-[var(--signal-border-default)]",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-150",
                flagEnabled ? "translate-x-5" : "translate-x-1",
              )}
            />
          </button>
        </div>

        {/* Evaluation result */}
        <motion.div
          key={`${evalResult.enabled}-${evalResult.latencyMs}`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          suppressHydrationWarning
          className={cn(
            "rounded-lg p-3 flex items-center justify-between",
            evalResult.enabled
              ? "bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]"
              : "bg-[var(--signal-bg-danger-muted)] border border-[var(--signal-border-danger-emphasis)]",
          )}
        >
          <div>
            <div
              suppressHydrationWarning
              className={cn(
                "text-sm font-bold font-mono",
                evalResult.enabled
                  ? "text-[var(--signal-fg-success)]"
                  : "text-[var(--signal-fg-danger)]",
              )}
            >
              {evalResult.enabled ? "ENABLED" : "DISABLED"}
            </div>
            <div
              suppressHydrationWarning
              className="text-xs text-[var(--signal-fg-secondary)] mt-0.5"
            >
              {evalResult.reason}
            </div>
          </div>
          <div
            suppressHydrationWarning
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-bold tabular-nums",
              isSubMs
                ? "bg-[var(--signal-bg-success-emphasis)] text-white"
                : "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]",
            )}
          >
            <Zap size={10} />
            {evalResult.latencyMs.toFixed(2)}ms
          </div>
        </motion.div>

        {/* One-line code snippet */}
        <div className="flex items-center gap-2 rounded-md bg-[var(--signal-bg-inverse)] px-3 py-2 font-mono text-xs text-white overflow-hidden">
          <span className="text-[var(--signal-fg-tertiary)] select-none shrink-0">
            $
          </span>
          <span className="truncate text-[#86efac]">fs.getFlag</span>
          <span className="text-[#e2e8f0]">(</span>
          <span className="text-[#86efac]">&apos;{DEMO_FLAG.key}&apos;</span>
          <span className="text-[#e2e8f0]">)</span>
          <span
            suppressHydrationWarning
            className="text-[var(--signal-fg-tertiary)] ml-auto shrink-0"
          >
            → {evalResult.enabled ? "ON" : "OFF"}
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28"
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(9,105,218,0.06)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-20%] left-[-5%] w-[40%] h-[50%] bg-[radial-gradient(ellipse_at_center,rgba(31,136,61,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="flex flex-col items-start text-left">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--signal-fg-primary)] leading-[1.08]"
              {...fadeUp}
            >
              Ship faster.
              <br />
              Break nothing.
              <br />
              <span className="text-[var(--signal-fg-success)]">
                Pay less than lunch.
              </span>
            </motion.h1>

            <motion.p
              className="text-lg font-normal max-w-[560px] text-[var(--signal-fg-secondary)] mt-6 leading-relaxed"
              {...fadeUpDelayed(0.1)}
            >
              Feature flags that evaluate in &lt;1ms. Unlimited seats.{" "}
              <strong className="text-[var(--signal-fg-primary)]">
                $24/month flat.
              </strong>{" "}
              Open-source Apache 2.0. Self-host or cloud.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-3 mt-8"
              {...fadeUpDelayed(0.15)}
            >
              <a href={REGISTER_URL} className={btnPrimary}>
                Start free — no credit card
              </a>
              <a href="#how-it-works" className={btnSecondary}>
                See how it works
              </a>
            </motion.div>

            {/* Trust row */}
            <motion.div
              className="flex flex-wrap items-center gap-2 mt-5"
              {...fadeUpDelayed(0.2)}
            >
              {[
                {
                  label: "500+ GitHub Stars",
                  href: GITHUB_URL,
                  external: true,
                },
                {
                  label: "OpenFeature Certified",
                  href: "https://openfeature.dev",
                  external: true,
                },
                { label: "Apache 2.0", href: null, external: false },
                { label: "Deploy in 3 min", href: null, external: false },
              ].map((badge) => {
                const badgeContent = (
                  <span className="inline-flex items-center rounded-full border border-[var(--signal-border-default)] px-3 py-1 text-xs font-medium text-[var(--signal-fg-secondary)] transition-colors">
                    {badge.label}
                  </span>
                );
                if (badge.href) {
                  return (
                    <a
                      key={badge.label}
                      href={badge.href}
                      target={badge.external ? "_blank" : undefined}
                      rel={badge.external ? "noopener noreferrer" : undefined}
                      className="hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-accent-emphasis)]"
                    >
                      {badgeContent}
                    </a>
                  );
                }
                return <span key={badge.label}>{badgeContent}</span>;
              })}
            </motion.div>
          </div>

          {/* Right: Live evaluation demo card */}
          <motion.div
            className="flex justify-center lg:justify-end"
            {...fadeUpDelayed(0.15)}
          >
            <div className="w-full max-w-[440px]">
              <MiniEvalDemo />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   2. Trust Bar — Social Proof
   ========================================================================== */

function TrustBarSection() {
  const orgs = [
    { label: "Series A Startups", icon: Rocket },
    { label: "Open Source Projects", icon: GitFork },
    { label: "Platform Teams", icon: Server },
    { label: "SaaS Companies", icon: Globe },
  ];

  return (
    <section className="py-10 border-y border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-6">
          Trusted by engineering teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 opacity-80">
          {orgs.map((org) => (
            <div
              key={org.label}
              className="flex items-center gap-2.5 text-sm text-[var(--signal-fg-secondary)]"
            >
              <org.icon
                size={16}
                className="text-[var(--signal-fg-tertiary)]"
              />
              {org.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   3. How It Works — 4-Step Visual Narrative
   ========================================================================== */

interface HowItWorksStep {
  number: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  detail: string;
}

const howItWorksSteps: HowItWorksStep[] = [
  {
    number: "01",
    icon: ToggleRight,
    title: "Create a flag",
    description: "One click. Or use our API.",
    detail:
      "Define your feature flag with a key, description, and type. Available in the dashboard, API, or Terraform provider.",
  },
  {
    number: "02",
    icon: Target,
    title: "Add targeting",
    description: "Roll out to beta users, then 10%, then everyone.",
    detail:
      "13 targeting operators, custom attributes, reusable segments, and percentage-based rollouts.",
  },
  {
    number: "03",
    icon: Code2,
    title: "Ship your code",
    description: "Deploy once. Toggle forever.",
    detail:
      "Wrap features in a single line of code. All 8 SDKs implement OpenFeature. No vendor lock-in.",
  },
  {
    number: "04",
    icon: Activity,
    title: "Watch it work",
    description: "See evaluations in real-time. <1ms latency.",
    detail:
      "Live evaluation counter, per-flag analytics, webhook notifications, and audit logging.",
  },
];

function HowItWorksSection() {
  const stepColors = [
    {
      bg: "bg-[var(--signal-bg-accent-muted)]",
      fg: "text-[var(--signal-fg-accent)]",
      border: "border-[var(--signal-border-accent-muted)]",
      numBg: "bg-[var(--signal-bg-accent-emphasis)]",
    },
    {
      bg: "bg-[var(--signal-bg-info-muted)]",
      fg: "text-[var(--signal-fg-info)]",
      border: "border-[var(--signal-border-accent-muted)]",
      numBg: "bg-[var(--signal-bg-info-emphasis)]",
    },
    {
      bg: "bg-[var(--signal-bg-warning-muted)]",
      fg: "text-[var(--signal-fg-warning)]",
      border: "border-[var(--signal-border-warning-muted)]",
      numBg: "bg-[var(--signal-bg-warning-emphasis)]",
    },
    {
      bg: "bg-[var(--signal-bg-success-muted)]",
      fg: "text-[var(--signal-fg-success)]",
      border: "border-[var(--signal-border-success-muted)]",
      numBg: "bg-[var(--signal-bg-success-emphasis)]",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 md:py-28 bg-[var(--signal-bg-secondary)]"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-16" {...fadeUp}>
          <SectionLabel icon={RefreshCw} text="How It Works" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            From idea to production in four steps
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal max-w-2xl mx-auto">
            People learn through stories, not feature lists. Here&apos;s the
            narrative of how you ship with FeatureSignals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorksSteps.map((step, i) => {
            const c = stepColors[i];
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-48px" }}
                transition={{
                  duration: 0.4,
                  delay: 0.08 * i,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "group flex flex-col gap-4 rounded-xl border border-[var(--signal-border-default)] border-t-[3px] bg-[var(--signal-bg-primary)] p-6 shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow",
                )}
                style={{
                  borderTopColor:
                    i === 0
                      ? "var(--signal-border-accent-emphasis)"
                      : i === 1
                        ? "var(--signal-fg-info)"
                        : i === 2
                          ? "var(--signal-border-warning-emphasis)"
                          : "var(--signal-border-success-emphasis)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                      c.bg,
                    )}
                  >
                    <step.icon size={20} className={c.fg} />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-full text-white",
                      c.numBg,
                    )}
                  >
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
                    {step.title}
                  </h3>
                  <p className="text-sm font-semibold text-[var(--signal-fg-accent)] mt-1">
                    {step.description}
                  </p>
                  <p className="text-sm text-[var(--signal-fg-secondary)] mt-2 leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Code snippet showcase */}
        <motion.div className="mt-14 max-w-2xl mx-auto" {...fadeUpDelayed(0.3)}>
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] overflow-hidden shadow-[var(--signal-shadow-md)]">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-xs text-[var(--signal-fg-secondary)] font-mono">
                app.ts — your application
              </span>
            </div>
            <div className="p-5 font-mono text-sm leading-relaxed bg-[#0d1117]">
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  1
                </span>
                <span className="text-[#c084fc]">import</span>{" "}
                <span className="text-[#86efac]">{`{ FeatureSignals }`}</span>{" "}
                <span className="text-[#c084fc]">from</span>{" "}
                <span className="text-[#86efac]">
                  &apos;@featuresignals/sdk&apos;
                </span>
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  2
                </span>
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  3
                </span>
                <span className="text-[#c084fc]">const</span>{" "}
                <span className="text-[#e2e8f0]">fs</span> ={" "}
                <span className="text-[#c084fc]">new</span>{" "}
                <span className="text-[#86efac]">FeatureSignals</span>
                (&#123;
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  4
                </span>
                <span className="pl-6">
                  apiKey:{" "}
                  <span className="text-[#86efac]">
                    &apos;fs_sk_your_api_key&apos;
                  </span>
                </span>
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  5
                </span>
                <span className="pl-6">&#125;)</span>
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  6
                </span>
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  7
                </span>
                <span className="text-[#e2e8f0]">
                  {"// Deploy once. Toggle forever."}
                </span>
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  8
                </span>
                <span className="text-[#c084fc]">const</span>{" "}
                <span className="text-[#e2e8f0]">enabled</span> ={" "}
                <span className="text-[#c084fc]">await</span> fs.
                <span className="text-[#60a5fa]">getFlag</span>(
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  9
                </span>
                <span className="pl-6">
                  <span className="text-[#86efac]">
                    &apos;dark-mode-v2&apos;
                  </span>
                  , <span className="text-[#e2e8f0]">{`{ userId }`}</span>,{" "}
                  <span className="text-[#fbbf24]">false</span>
                </span>
              </div>
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  10
                </span>
                <span className="pl-6">)</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   4. Capability Cards — 3x2 Grid
   ========================================================================== */

interface CapabilityCard {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

const capabilities: CapabilityCard[] = [
  {
    icon: Rocket,
    title: "Release with Confidence",
    description:
      "Deploy behind feature flags. Roll out gradually to 1%, then 10%, then everyone. Kill any feature instantly — no redeploy, no downtime.",
  },
  {
    icon: Sparkles,
    title: "Automate Cleanup",
    description:
      "The AI Janitor scans your codebase, finds stale flags, and opens PRs to remove them automatically. Keep your codebase clean without lifting a finger.",
  },
  {
    icon: RefreshCw,
    title: "Migrate Without Risk",
    description:
      "Import flags, environments, and targeting rules from LaunchDarkly, ConfigCat, or Flagsmith in minutes. We handle the heavy lifting.",
  },
  {
    icon: ShieldCheck,
    title: "Govern Every Change",
    description:
      "RBAC with per-environment permissions. Tamper-evident audit logs. Change approval workflows. SSO with SAML/OIDC. Enterprise-ready governance.",
  },
  {
    icon: FlaskConical,
    title: "Experiment at Scale",
    description:
      "Weighted variants with impression tracking. A/B test anything — feature variations, UI changes, pricing models. Built into every plan, not an add-on.",
  },
  {
    icon: Box,
    title: "Deploy Anywhere",
    description:
      "Single Go binary. Docker or bare metal. Cloud or self-hosted. Air-gapped environments. Apache 2.0 licensed — no vendor lock-in, ever.",
  },
];

function CapabilityCardsSection() {
  const borderColors = [
    { style: { borderTopColor: "var(--signal-border-accent-emphasis)" } },
    { style: { borderTopColor: "var(--signal-fg-info)" } },
    { style: { borderTopColor: "var(--signal-border-warning-emphasis)" } },
    { style: { borderTopColor: "var(--signal-border-danger-emphasis)" } },
    { style: { borderTopColor: "var(--signal-border-success-emphasis)" } },
    { style: { borderTopColor: "var(--signal-border-accent-emphasis)" } },
  ];

  const iconStyles = [
    {
      bg: "bg-[var(--signal-bg-accent-muted)]",
      fg: "text-[var(--signal-fg-accent)]",
    },
    {
      bg: "bg-[var(--signal-bg-info-muted)]",
      fg: "text-[var(--signal-fg-info)]",
    },
    {
      bg: "bg-[var(--signal-bg-warning-muted)]",
      fg: "text-[var(--signal-fg-warning)]",
    },
    {
      bg: "bg-[var(--signal-bg-danger-muted)]",
      fg: "text-[var(--signal-fg-danger)]",
    },
    {
      bg: "bg-[var(--signal-bg-success-muted)]",
      fg: "text-[var(--signal-fg-success)]",
    },
    {
      bg: "bg-[var(--signal-bg-accent-muted)]",
      fg: "text-[var(--signal-fg-accent)]",
    },
  ];

  return (
    <section id="capabilities" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-14" {...fadeUp}>
          <SectionLabel icon={Rocket} text="Capabilities" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            Everything you need to ship
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal">
            No per-seat pricing. No surprise bills. Just powerful feature
            management.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, i) => {
            const b = borderColors[i];
            const s = iconStyles[i];
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-48px" }}
                transition={{
                  duration: 0.4,
                  delay: 0.05 * i,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{ scale: 1.02 }}
                className="group flex flex-col gap-4 rounded-xl border border-[var(--signal-border-default)] border-t-[3px] bg-[var(--signal-bg-primary)] p-6 shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow"
                style={b.style}
              >
                <div
                  className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                    s.bg,
                  )}
                >
                  <cap.icon size={22} className={s.fg} />
                </div>
                <h3 className="text-lg font-bold text-[var(--signal-fg-primary)]">
                  {cap.title}
                </h3>
                <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                  {cap.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   5. Persona Tabs — "Built for Your Team"
   ========================================================================== */

interface PersonaTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const personaTabs: PersonaTab[] = [
  { id: "developers", label: "For Developers", icon: Code2 },
  { id: "platform", label: "For Platform Teams", icon: Server },
  { id: "security", label: "For Security & Compliance", icon: ShieldCheck },
];

interface PersonaFeature {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

const personaFeatures: Record<string, PersonaFeature[]> = {
  developers: [
    {
      icon: Zap,
      title: "Sub-millisecond evaluation",
      description:
        "Flags evaluate locally from an in-memory cache. No network round-trips on the hot path. 8 language SDKs, all OpenFeature native.",
    },
    {
      icon: Code2,
      title: "One-line SDK integration",
      description:
        "Import, initialize, evaluate. The simplest integration of any feature flag platform. Get started in under 60 seconds.",
    },
    {
      icon: GitFork,
      title: "OpenFeature native — zero lock-in",
      description:
        "All SDKs implement the OpenFeature standard. Swap providers with a single line of config. Your code stays vendor-neutral.",
    },
    {
      icon: Box,
      title: "Local evaluation with instant sync",
      description:
        "Flags sync via WebSocket and evaluate locally. Milliseconds to propagate changes. No polling. No stale data.",
    },
  ],
  platform: [
    {
      icon: Settings,
      title: "GitOps with Terraform & Pulumi",
      description:
        "Manage flags as code in your existing infrastructure pipelines. Full GitOps support with providers for Terraform, Pulumi, and Ansible.",
    },
    {
      icon: Server,
      title: "Relay proxy for edge caching",
      description:
        "Deploy relay proxies at the edge for sub-millisecond evaluation across all regions. High availability by default.",
    },
    {
      icon: RefreshCw,
      title: "Webhooks, scheduling, CI/CD",
      description:
        "Trigger deployments, notifications, and automated workflows on flag changes. Integrates with any CI/CD pipeline.",
    },
    {
      icon: Rocket,
      title: "Multi-environment promotion",
      description:
        "Promote flags from dev → staging → production with confidence. Environment-specific targeting and configuration.",
    },
  ],
  security: [
    {
      icon: ShieldCheck,
      title: "RBAC with per-environment roles",
      description:
        "Admin, Editor, Viewer, and custom roles with granular environment-level access control. Four built-in roles, extensible permissions.",
    },
    {
      icon: Lock,
      title: "Tamper-evident audit logging",
      description:
        "Every change is recorded with actor identity, timestamp, and full before/after state diff. Immutable and exportable.",
    },
    {
      icon: BadgeCheck,
      title: "SSO (SAML/OIDC), SCIM, MFA",
      description:
        "Enterprise authentication with Okta, Azure AD, Google Workspace, and any SAML/OIDC provider. SCIM for automated provisioning.",
    },
    {
      icon: Globe,
      title: "SOC 2, GDPR, HIPAA compliance",
      description:
        "Auditor-ready compliance posture with data residency controls, DPA support, and encryption at rest and in transit.",
    },
  ],
};

function PersonaFeaturesSection() {
  const [activeTab, setActiveTab] = useState(personaTabs[0].id);
  const features = personaFeatures[activeTab] ?? personaFeatures.developers;

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIdx = personaTabs.findIndex((t) => t.id === activeTab);
      let nextIdx = currentIdx;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIdx = (currentIdx + 1) % personaTabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIdx = (currentIdx - 1 + personaTabs.length) % personaTabs.length;
      }
      const next = personaTabs[nextIdx];
      if (next) setActiveTab(next.id);
    },
    [activeTab],
  );

  const tabAccents: Record<
    string,
    { active: string; muted: string; fg: string }
  > = {
    developers: {
      active:
        "bg-[var(--signal-bg-accent-emphasis)] border-[var(--signal-bg-accent-emphasis)]",
      muted: "bg-[var(--signal-bg-accent-muted)]",
      fg: "text-[var(--signal-fg-accent)]",
    },
    platform: {
      active:
        "bg-[var(--signal-bg-info-emphasis)] border-[var(--signal-bg-info-emphasis)]",
      muted: "bg-[var(--signal-bg-info-muted)]",
      fg: "text-[var(--signal-fg-info)]",
    },
    security: {
      active:
        "bg-[var(--signal-bg-success-emphasis)] border-[var(--signal-bg-success-emphasis)]",
      muted: "bg-[var(--signal-bg-success-muted)]",
      fg: "text-[var(--signal-fg-success)]",
    },
  };
  const currentAccent = tabAccents[activeTab] ?? tabAccents.developers;

  return (
    <section
      id="personas"
      className="py-20 md:py-28 bg-[var(--signal-bg-secondary)]"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-12" {...fadeUp}>
          <SectionLabel icon={Users} text="Built For Your Team" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            Built for every team
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal max-w-2xl mx-auto">
            Feature management that scales from indie devs to the Fortune 500.
            Progressive disclosure means complexity unfolds as you need it.
          </p>
        </motion.div>

        {/* Pill tab buttons */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-10"
          role="tablist"
          aria-label="Persona tabs"
          onKeyDown={handleTabKeyDown}
          {...fadeUpDelayed(0.1)}
        >
          {personaTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const accent = tabAccents[tab.id] ?? tabAccents.developers;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`persona-panel-${tab.id}`}
                id={`persona-tab-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm font-semibold transition-all duration-200",
                  isActive
                    ? cn("text-white border", accent.active)
                    : "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)] hover:bg-[var(--signal-bg-secondary)]",
                )}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`persona-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`persona-tab-${activeTab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.05 * i,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{ scale: 1.01 }}
                className="flex items-start gap-4 rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-5 shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    currentAccent.muted,
                  )}
                >
                  <feature.icon size={20} className={currentAccent.fg} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--signal-fg-secondary)] mt-1 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ==========================================================================
   6. Live Evaluation Demo Section
   ========================================================================== */

function LatencyBadge({ latencyMs }: { latencyMs: number }) {
  const isSubMs = latencyMs < 1;
  return (
    <motion.span
      key={latencyMs}
      initial={{ scale: 1.2, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold tabular-nums",
        isSubMs
          ? "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
          : "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]",
      )}
    >
      <Zap size={12} />
      {latencyMs.toFixed(2)}ms
      {isSubMs && <span className="text-[10px] font-normal">(sub-ms ✓)</span>}
    </motion.span>
  );
}

function LiveEvalDemoSection() {
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [customKey, setCustomKey] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [evalResult, setEvalResult] = useState<EvaluationResult>({
    flagKey: DEMO_FLAG.key,
    value: true,
    matchedRule: null,
    reason: "Loading…",
    latencyMs: 0,
    enabled: true,
  });

  useEffect(() => {
    setEvalResult(evaluateFlag(DEMO_FLAG, DEMO_CONTEXT));
    setHydrated(true);
  }, []);

  const flag = useMemo(() => {
    if (customKey.trim()) {
      return { ...DEMO_FLAG, key: customKey.trim(), enabled: flagEnabled };
    }
    return { ...DEMO_FLAG, enabled: flagEnabled };
  }, [flagEnabled, customKey]);

  const handleToggleAndEval = useCallback(() => {
    setFlagEnabled((prev) => {
      const next = !prev;
      const updatedFlag = { ...flag, enabled: next };
      setEvalResult(evaluateFlag(updatedFlag, DEMO_CONTEXT));
      return next;
    });
  }, [flag]);

  const handleCustomKeySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!customKey.trim()) return;
      const tempFlag = {
        ...DEMO_FLAG,
        key: customKey.trim(),
        enabled: flagEnabled,
      };
      const result = evaluateFlag(tempFlag, DEMO_CONTEXT);
      setEvalResult(result);
    },
    [customKey, flagEnabled],
  );

  const isEnabled = evalResult.enabled;
  const matchedRule = evalResult.matchedRule;

  return (
    <section
      id="live-demo"
      className="py-20 md:py-28 border-y border-[var(--signal-border-default)]"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-14" {...fadeUp}>
          <SectionLabel icon={Zap} text="Live Demo" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            Sub-millisecond. In your browser. Right now.
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal max-w-2xl mx-auto">
            This is real flag evaluation. No server. No API call. No &ldquo;it
            depends on your setup.&rdquo; Toggle the switch and watch the result
            come back in under a millisecond. The same engine our SDKs run.
          </p>
        </motion.div>

        {/* Split panel: Code + Result */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Left: Code snippet */}
          <motion.div
            className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-inverse)] overflow-hidden shadow-[var(--signal-shadow-md)]"
            {...fadeUpDelayed(0.1)}
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-xs text-white/60 font-mono">
                evaluate-flag.ts
              </span>
            </div>
            <div className="p-5 font-mono text-sm leading-relaxed text-[#e2e8f0] overflow-x-auto">
              <div>
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  1
                </span>
                <span className="text-[#c084fc]">import</span>{" "}
                <span className="text-[#86efac]">{`{ FeatureSignals }`}</span>{" "}
                <span className="text-[#c084fc]">from</span>{" "}
                <span className="text-[#86efac]">
                  &apos;@featuresignals/sdk&apos;
                </span>
              </div>
              <div className="mt-1">
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  2
                </span>
              </div>
              <div className="mt-1">
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  3
                </span>
                <span className="text-[#c084fc]">const</span>{" "}
                <span className="text-[#e2e8f0]">fs</span> ={" "}
                <span className="text-[#c084fc]">new</span>{" "}
                <span className="text-[#86efac]">FeatureSignals</span>
                (&#123;
              </div>
              <div className="mt-1">
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  4
                </span>
                <span className="pl-6">
                  apiKey:{" "}
                  <span className="text-[#86efac]">
                    &apos;fs_live_demo_key&apos;
                  </span>
                </span>
              </div>
              <div className="mt-1">
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  5
                </span>
                <span className="pl-6">&#125;)</span>
              </div>
              <div className="mt-1">
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  6
                </span>
              </div>
              <div className="mt-1">
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  7
                </span>
                <span className="text-[#c084fc]">const</span>{" "}
                <span className="text-[#e2e8f0]">enabled</span> ={" "}
                <span className="text-[#c084fc]">await</span> fs.
                <span className="text-[#60a5fa]">getFlag</span>(
              </div>
              <div className="mt-1">
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  8
                </span>
                <span className="pl-6">
                  <span className="text-[#86efac]">
                    &apos;{evalResult.flagKey}&apos;
                  </span>
                  , <span className="text-[#e2e8f0]">{`{ userId }`}</span>,{" "}
                  <span className="text-[#fbbf24]">false</span>
                </span>
              </div>
              <div className="mt-1">
                <span className="inline-block w-7 text-right mr-3 text-[#6b7280] select-none flex-shrink-0">
                  9
                </span>
                <span className="pl-6">)</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Evaluation Result */}
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-6 shadow-[var(--signal-shadow-sm)]">
            <h3 className="text-sm font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-5">
              Evaluation Result
            </h3>

            {/* Flag key */}
            <div className="mb-4">
              <div className="text-xs text-[var(--signal-fg-tertiary)] mb-1">
                Flag
              </div>
              <div
                suppressHydrationWarning
                className="text-lg font-mono font-bold text-[var(--signal-fg-primary)]"
              >
                {evalResult.flagKey}
              </div>
            </div>

            {/* Result display */}
            <motion.div
              key={String(isEnabled) + String(evalResult.latencyMs)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              suppressHydrationWarning
              className={cn(
                "rounded-xl p-5 mb-4",
                isEnabled
                  ? "bg-[var(--signal-bg-success-muted)] border border-[var(--signal-border-success-muted)]"
                  : "bg-[var(--signal-bg-danger-muted)] border border-[var(--signal-border-danger-emphasis)]",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
                  Result
                </div>
                <LatencyBadge latencyMs={evalResult.latencyMs} />
              </div>

              <div
                suppressHydrationWarning
                className={cn(
                  "text-2xl font-bold",
                  isEnabled
                    ? "text-[var(--signal-fg-success)]"
                    : "text-[var(--signal-fg-danger)]",
                )}
              >
                {isEnabled ? "ENABLED" : "DISABLED"}
              </div>

              <div
                suppressHydrationWarning
                className="text-sm text-[var(--signal-fg-secondary)] mt-2"
              >
                {evalResult.reason}
              </div>

              {matchedRule && (
                <div className="mt-3 p-3 rounded-lg bg-white/60 border border-[var(--signal-border-subtle)]">
                  <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] mb-1">
                    Matched Rule
                  </div>
                  <div className="text-sm font-mono text-[var(--signal-fg-primary)]">
                    {matchedRule.attribute}{" "}
                    <span className="text-[var(--signal-fg-accent)]">
                      {matchedRule.operator}
                    </span>{" "}
                    <span className="text-[var(--signal-fg-info)]">
                      {JSON.stringify(matchedRule.value)}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4">
              <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                Toggle this flag
              </span>
              <button
                onClick={handleToggleAndEval}
                role="switch"
                aria-checked={flagEnabled}
                aria-label={`Flag ${flagEnabled ? "enabled" : "disabled"}. Click to toggle.`}
                className={cn(
                  "relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:ring-offset-2",
                  flagEnabled
                    ? "bg-[var(--signal-bg-success-emphasis)]"
                    : "bg-[var(--signal-border-default)]",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-150",
                    flagEnabled ? "translate-x-5" : "translate-x-1",
                  )}
                />
              </button>
            </div>

            {/* Try your own flag */}
            <form onSubmit={handleCustomKeySubmit}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Try your own flag key..."
                  className="flex-1 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm font-mono text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow"
                  aria-label="Custom flag key"
                />
                <button
                  type="submit"
                  disabled={!customKey.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-accent-emphasis)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:ring-offset-2"
                >
                  Evaluate
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   7. Pricing Overview — Radical Honesty
   ========================================================================== */

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  isPro: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description:
      "Up to 50 flags. 1 project, 2 environments, 3 team members. All SDKs + OpenFeature. No credit card required.",
    features: [
      "Up to 50 feature flags",
      "All 8 SDKs + OpenFeature",
      "Community support",
      "Apache 2.0 license",
    ],
    cta: "Start Free",
    ctaHref: REGISTER_URL,
    isPro: false,
  },
  {
    name: "Pro",
    price: "$24",
    period: "/month flat",
    description:
      "Unlimited everything. AI Janitor, RBAC, audit logs, webhooks. Flat rate — no per-seat fees.",
    features: [
      "Unlimited projects & environments",
      "Unlimited team members",
      "AI Janitor stale flag removal",
      "RBAC & audit logs",
      "Webhooks & integrations",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaHref: REGISTER_URL,
    isPro: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "SSO, SCIM, 99.9% SLA, dedicated support engineer, on-prem / air-gapped deployment.",
    features: [
      "Everything in Pro",
      "SSO (SAML/OIDC) & SCIM",
      "99.9% uptime SLA",
      "Dedicated support engineer",
      "On-prem / air-gapped deployment",
    ],
    cta: "Contact Sales",
    ctaHref: "/contact?reason=sales",
    isPro: false,
  },
];

function PricingOverviewSection() {
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-14" {...fadeUp}>
          <SectionLabel icon={Heart} text="Pricing" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            Radically honest pricing
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal max-w-2xl mx-auto">
            No dark patterns. No &ldquo;Contact Sales&rdquo; to see the price.
            No per-seat math. Just fair, flat pricing you can understand in one
            glance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-48px" }}
              transition={{
                duration: 0.4,
                delay: 0.08 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "relative flex flex-col rounded-xl border border-[var(--signal-border-default)] p-6 shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow bg-[var(--signal-bg-primary)]",
                plan.isPro &&
                  "border-t-[3px] border-[var(--signal-border-accent-emphasis)]",
              )}
              style={
                plan.isPro
                  ? { borderTopColor: "var(--signal-border-accent-emphasis)" }
                  : undefined
              }
            >
              <h3 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
                {plan.name}
              </h3>

              {/* Price — separated cleanly from period */}
              <div className="mt-3 mb-1">
                <span className="text-3xl font-bold text-[var(--signal-fg-primary)]">
                  {plan.price}
                </span>
              </div>
              {plan.period && (
                <div className="mb-1 -mt-1">
                  <span className="text-xs text-[var(--signal-fg-tertiary)]">
                    {plan.period}
                  </span>
                </div>
              )}

              <p className="text-sm text-[var(--signal-fg-secondary)] mb-5 leading-relaxed">
                {plan.description}
              </p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-[var(--signal-fg-primary)]"
                  >
                    <Check
                      size={14}
                      className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                className={plan.isPro ? btnPricingPrimary : btnPricingSecondary}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        {/* Cost comparison line */}
        <motion.div className="mt-8 text-center" {...fadeUpDelayed(0.2)}>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            <strong className="text-[var(--signal-fg-primary)]">
              50 engineers
            </strong>{" "}
            = $24/month on FeatureSignals. ~$416.50/month on LaunchDarkly.
          </p>
        </motion.div>

        {/* Trust line */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-6 text-xs text-[var(--signal-fg-tertiary)]"
          {...fadeUpDelayed(0.25)}
        >
          <span className="flex items-center gap-1">
            <Heart size={12} /> No dark patterns
          </span>
          <span className="flex items-center gap-1">
            <GitFork size={12} /> Open source core
          </span>
          <span className="flex items-center gap-1">
            <Lock size={12} /> No vendor lock-in
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   8. Open Source Proof Section
   ========================================================================== */

const ossMetrics = [
  { value: "500+", label: "GitHub Stars", href: GITHUB_URL },
  { value: "8", label: "SDK Languages", href: "/integrations" },
  {
    value: "Apache 2.0",
    label: "Open Source License",
    href: `${GITHUB_URL}/blob/main/LICENSE`,
  },
  {
    value: "OpenFeature",
    label: "Certified Provider",
    href: "https://openfeature.dev/ecosystem",
  },
];

function OpenSourceProofSection() {
  return (
    <section
      id="open-source"
      className="py-20 md:py-28 bg-[var(--signal-bg-secondary)]"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-14" {...fadeUp}>
          <SectionLabel icon={Star} text="Open Source First" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            Built in the open. Trusted by the community.
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal max-w-2xl mx-auto">
            Apache 2.0 licensed. OpenFeature certified. No vendor lock-in. Ever.
            Your code stays yours, always.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {ossMetrics.map((metric, i) => (
            <motion.a
              key={metric.label}
              href={metric.href}
              target={metric.href.startsWith("http") ? "_blank" : undefined}
              rel={
                metric.href.startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-48px" }}
              transition={{
                duration: 0.4,
                delay: 0.05 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-5 shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow text-center group min-w-0"
            >
              <span
                className={cn(
                  "text-2xl font-bold text-balance break-words",
                  [
                    "text-[var(--signal-fg-accent)]",
                    "text-[var(--signal-fg-info)]",
                    "text-[var(--signal-fg-success)]",
                    "text-[var(--signal-fg-warning)]",
                  ][i % 4],
                )}
              >
                {metric.value}
              </span>
              <span className="text-sm text-[var(--signal-fg-secondary)] group-hover:text-[var(--signal-fg-primary)] transition-colors">
                {metric.label}
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   9. Comparison Section — The FeatureSignals Difference
   ========================================================================== */

interface ComparisonRow {
  feature: string;
  featuresignals: string;
  others: string;
  fsPositive: boolean;
}

const comparisonData: ComparisonRow[] = [
  {
    feature: "Starting Price",
    featuresignals: "$0/mo",
    others: "$75+/mo for 10 seats",
    fsPositive: true,
  },
  {
    feature: "Pricing",
    featuresignals: "Flat rate, $24/mo unlimited",
    others: "$8.33/seat/month + overages",
    fsPositive: true,
  },
  {
    feature: "Evaluation",
    featuresignals: "<1ms, local",
    others: "10-50ms, network round-trip",
    fsPositive: true,
  },
  {
    feature: "Open Source",
    featuresignals: "Apache 2.0",
    others: "Source available / proprietary",
    fsPositive: true,
  },
  {
    feature: "Lock-in",
    featuresignals: "OpenFeature native",
    others: "Proprietary SDKs",
    fsPositive: true,
  },
  {
    feature: "Self-hosted",
    featuresignals: "Single binary, 3 min",
    others: "Complex infrastructure",
    fsPositive: true,
  },
  {
    feature: "AI Cleanup",
    featuresignals: "Built-in AI Janitor",
    others: "Manual cleanup only",
    fsPositive: true,
  },
  {
    feature: "A/B Testing",
    featuresignals: "Included in every plan",
    others: "Enterprise add-on",
    fsPositive: true,
  },
  {
    feature: "Seat Limit",
    featuresignals: "Unlimited",
    others: "Per-seat billing",
    fsPositive: true,
  },
];

function ComparisonSection() {
  return (
    <section id="comparison" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-14" {...fadeUp}>
          <SectionLabel icon={GripHorizontal} text="Comparison" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            The FeatureSignals difference
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal max-w-2xl mx-auto">
            We respect our competitors — they build good products. Here&apos;s
            how we choose to be different. No disparagement, just facts.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="overflow-hidden rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)]">
              <div className="px-5 py-3 text-sm font-semibold text-[var(--signal-fg-primary)] min-w-0">
                Feature
              </div>
              <div className="px-5 py-3 text-sm font-semibold text-[var(--signal-fg-success)] min-w-0">
                FeatureSignals
              </div>
              <div className="px-5 py-3 text-sm font-semibold text-[var(--signal-fg-tertiary)] min-w-0">
                Others
              </div>
            </div>

            {comparisonData.map((row, i) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-48px" }}
                transition={{
                  duration: 0.3,
                  delay: 0.03 * i,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={cn(
                  "grid grid-cols-3",
                  i % 2 === 0
                    ? "bg-[var(--signal-bg-primary)]"
                    : "bg-[var(--signal-bg-secondary)]",
                  i < comparisonData.length - 1 &&
                    "border-b border-[var(--signal-border-default)]",
                )}
              >
                <div className="px-5 py-3 text-sm font-medium text-[var(--signal-fg-primary)] min-w-0">
                  {row.feature}
                </div>
                <div className="px-5 py-3 text-sm text-[var(--signal-fg-success)] font-medium flex items-center gap-1.5 min-w-0">
                  <Check size={14} className="shrink-0" />
                  {row.featuresignals}
                </div>
                <div className="px-5 py-3 text-sm text-[var(--signal-fg-secondary)] flex items-center gap-1.5 min-w-0">
                  <X
                    size={14}
                    className="shrink-0 text-[var(--signal-fg-tertiary)]"
                  />
                  {row.others}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   10. Final CTA — Emotional + Trust
   ========================================================================== */

function FinalCtaSection() {
  return (
    <section
      id="final-cta"
      className="py-20 md:py-28 bg-[var(--signal-bg-inverse)] relative overflow-hidden"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[50%] bg-[radial-gradient(ellipse_at_center,rgba(9,105,218,0.12)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[35%] h-[45%] bg-[radial-gradient(ellipse_at_center,rgba(31,136,61,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center relative">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-white max-w-[700px] mx-auto"
          {...fadeUp}
        >
          Ready to take control of your release infrastructure?
        </motion.h2>

        <motion.p
          className="text-lg text-white/60 mt-4 max-w-[500px] mx-auto font-normal"
          {...fadeUpDelayed(0.05)}
        >
          Join the engineering teams who ship faster, break nothing, and pay
          less than lunch.
        </motion.p>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mt-8"
          {...fadeUpDelayed(0.1)}
        >
          <a href={REGISTER_URL} className={btnDarkPrimary}>
            Start free — no credit card
            <ArrowRight size={16} className="ml-2" />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={btnDarkSecondary}
          >
            <Star size={16} className="mr-2" />
            Star on GitHub
          </a>
        </motion.div>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60"
          {...fadeUpDelayed(0.2)}
        >
          <span className="flex items-center gap-1.5">
            <GitFork size={14} /> Apache 2.0
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={14} /> No vendor lock-in
          </span>
          <span className="flex items-center gap-1.5">
            <Server size={14} /> Self-host or cloud
          </span>
          <span className="flex items-center gap-1.5">
            <Zap size={14} /> Deploy in 3 minutes
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Homepage — default export
   ========================================================================== */

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustBarSection />
      <HowItWorksSection />
      <CapabilityCardsSection />
      <PersonaFeaturesSection />
      <LiveEvalDemoSection />
      <PricingOverviewSection />
      <OpenSourceProofSection />
      <ComparisonSection />
      <FinalCtaSection />
    </>
  );
}
