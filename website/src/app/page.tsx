"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Rocket,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Activity,
  Box,
  Code,
  Settings,
  Check,
  CheckCircle,
  Star,
  Heart,
  MessageSquarePlus,
  X,
  ArrowRight,
  Zap,
  ExternalLink,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        "inline-flex items-center justify-center rounded-md px-6 h-10 text-sm font-semibold",
        "text-white",
        "bg-[var(--signal-bg-success-emphasis)]",
        "hover:opacity-90 transition-opacity",
        className,
      )}
    >
      {children}
    </a>
  );
}

function CtaSecondary({
  href = DOCS_URL,
  children = "Read Docs",
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
        "inline-flex items-center justify-center rounded-md border px-6 h-10 text-sm font-semibold",
        "text-[var(--signal-fg-primary)] border-[var(--signal-border-default)]",
        "bg-[var(--signal-bg-primary)]",
        "hover:bg-[var(--signal-bg-secondary)] transition-colors",
        className,
      )}
    >
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
   1. Hero Section
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="flex flex-col items-start text-left">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
              {...fadeUp}
            >
              <span className="text-[var(--signal-fg-accent)]">
                Feature flags
              </span>
              <br />
              <span className="text-[var(--signal-fg-info)]">
                that don&apos;t slow you down
              </span>
            </motion.h1>

            <motion.p
              className="text-lg font-normal max-w-[600px] text-[var(--signal-fg-secondary)] mt-6 leading-relaxed break-words"
              {...fadeUpDelayed(0.1)}
            >
              Sub-millisecond evaluation. Flat-rate pricing &mdash; $29/mo for
              unlimited seats. Open-source Apache 2.0. Deploy anywhere in 3
              minutes.
            </motion.p>

            <motion.div
              className="flex items-center gap-3 mt-8"
              {...fadeUpDelayed(0.15)}
            >
              <CtaPrimary>Start Free</CtaPrimary>
              <CtaSecondary href="#how-it-works">See How It Works</CtaSecondary>
            </motion.div>

            <motion.div
              className="flex flex-wrap items-center gap-2 mt-4"
              {...fadeUpDelayed(0.2)}
            >
              <a
                href="https://github.com/dinesh-g1/featuresignals"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-[var(--signal-border-default)] px-3 py-1 text-xs font-medium text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-accent-emphasis)] transition-colors"
              >
                500+ GitHub Stars
              </a>
              <a
                href="https://openfeature.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-[var(--signal-border-default)] px-3 py-1 text-xs font-medium text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-accent-emphasis)] transition-colors"
              >
                OpenFeature Certified
              </a>
              <span className="inline-flex items-center rounded-full border border-[var(--signal-border-default)] px-3 py-1 text-xs font-medium text-[var(--signal-fg-secondary)]">
                Apache 2.0
              </span>
              <span className="inline-flex items-center rounded-full border border-[var(--signal-border-default)] px-3 py-1 text-xs font-medium text-[var(--signal-fg-secondary)]">
                Deploy in 3 min
              </span>
            </motion.div>
          </div>

          {/* Right: Dashboard preview card */}
          <motion.div
            className="flex justify-center lg:justify-end"
            {...fadeUpDelayed(0.15)}
          >
            <div className="w-full max-w-[480px] rounded-xl border border-[var(--signal-border-default)] border-l-[3px] border-l-[var(--signal-border-accent-emphasis)] bg-linear-to-b from-[var(--signal-bg-primary)] to-[var(--signal-bg-secondary)] shadow-[var(--signal-shadow-md)] overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--signal-bg-success-emphasis)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--signal-bg-success-emphasis)]" />
                    </span>
                    <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                      Production deploy v2.4.1
                    </span>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]">
                  ● Live
                </span>
              </div>

              {/* Card body */}
              <div className="p-5 space-y-5">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-[var(--signal-fg-secondary)] mb-1.5">
                    <span>Rollout progress</span>
                    <span className="font-medium text-[var(--signal-fg-primary)]">
                      15%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[var(--signal-bg-secondary)] rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full rounded-full bg-[var(--signal-bg-success-emphasis)]"
                      style={{}}
                      initial={{ width: 0 }}
                      whileInView={{ width: "15%" }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 1,
                        delay: 0.5,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-3 shadow-[var(--signal-shadow-sm)]">
                    <p className="text-2xl font-bold text-[var(--signal-fg-primary)]">
                      47
                    </p>
                    <p className="text-sm text-[var(--signal-fg-secondary)]">
                      flags active
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-3 shadow-[var(--signal-shadow-sm)]">
                    <p className="text-2xl font-bold text-[var(--signal-fg-primary)]">
                      0.4ms
                    </p>
                    <p className="text-sm text-[var(--signal-fg-secondary)]">
                      eval latency
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-3 shadow-[var(--signal-shadow-sm)]">
                    <p className="text-2xl font-bold text-[var(--signal-fg-primary)]">
                      3
                    </p>
                    <p className="text-sm text-[var(--signal-fg-secondary)]">
                      experiments
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-3 shadow-[var(--signal-shadow-sm)]">
                    <p className="text-2xl font-bold text-[var(--signal-fg-primary)]">
                      12.4M
                    </p>
                    <p className="text-sm text-[var(--signal-fg-secondary)]">
                      evals
                    </p>
                  </div>
                </div>

                {/* Quickstart command bar */}
                <div className="flex items-center gap-2 rounded-md bg-[var(--signal-bg-inverse)] px-4 py-3 font-mono text-sm text-white">
                  <span className="text-[var(--signal-fg-secondary)] select-none">
                    $
                  </span>
                  <span className="truncate">
                    docker run -p 8080:8080 featuresignals/app
                  </span>
                  <button
                    className="ml-auto text-white/60 hover:text-white transition-colors"
                    aria-label="Copy command"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        "docker run -p 8080:8080 featuresignals/app",
                      );
                    }}
                  >
                    <Check size={14} />
                  </button>
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
   2. Trust Bar Section
   ========================================================================== */

function TrustBarSection() {
  return (
    <section className="py-10 border-b border-[var(--signal-border-default)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider mb-6">
          Trusted by engineering teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
          <span className="text-sm font-semibold text-[var(--signal-fg-secondary)]">
            Series A Startups
          </span>
          <span className="text-sm font-semibold text-[var(--signal-fg-secondary)]">
            Open Source Projects
          </span>
          <span className="text-sm font-semibold text-[var(--signal-fg-secondary)]">
            Platform Teams
          </span>
          <span className="text-sm font-semibold text-[var(--signal-fg-secondary)]">
            SaaS Companies
          </span>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   3. Capability Cards Section (3x2 grid)
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
      "Deploy behind feature flags. Roll out gradually to 1%, 10%, 100%. Kill any feature instantly — no redeploy, no downtime.",
  },
  {
    icon: Lightbulb,
    title: "Automate Cleanup",
    description:
      "The AI Janitor scans your codebase, finds stale flags, and opens PRs to remove them automatically.",
  },
  {
    icon: RefreshCw,
    title: "Migrate Without Risk",
    description:
      "Import flags, environments, and targeting rules from LaunchDarkly, ConfigCat, or Flagsmith in minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Govern Every Change",
    description:
      "RBAC with per-environment permissions. Tamper-evident audit logs. Change approval workflows. SSO.",
  },
  {
    icon: Activity,
    title: "Experiment at Scale",
    description:
      "Weighted variants with impression tracking. A/B test anything — built into every plan.",
  },
  {
    icon: Box,
    title: "Deploy Anywhere",
    description:
      "Single Go binary. Docker or bare metal. Cloud or self-hosted. Apache 2.0.",
  },
];

function CapabilityCardsSection() {
  return (
    <section id="capabilities" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-14" {...fadeUp}>
          <SectionLabel icon={Rocket} text="Platform Capabilities" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            Everything you need to ship
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal">
            No per-seat pricing. No surprises. Just powerful feature management.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, i) => {
            const accents = [
              {
                bg: "bg-[var(--signal-bg-accent-muted)]",
                fg: "text-[var(--signal-fg-accent)]",
                border: "border-l-[var(--signal-border-accent-emphasis)]",
              },
              {
                bg: "bg-[var(--signal-bg-info-muted)]",
                fg: "text-[var(--signal-fg-info)]",
                border: "border-l-[var(--borderColor-done-emphasis)]",
              },
              {
                bg: "bg-[var(--signal-bg-warning-muted)]",
                fg: "text-[var(--signal-fg-warning)]",
                border: "border-l-[var(--signal-border-warning-emphasis)]",
              },
              {
                bg: "bg-[var(--signal-bg-danger-muted)]",
                fg: "text-[var(--signal-fg-danger)]",
                border: "border-l-[var(--signal-border-danger-emphasis)]",
              },
              {
                bg: "bg-[var(--signal-bg-success-muted)]",
                fg: "text-[var(--signal-fg-success)]",
                border: "border-l-[var(--signal-border-success-emphasis)]",
              },
              {
                bg: "bg-[var(--signal-bg-accent-muted)]",
                fg: "text-[var(--signal-fg-accent)]",
                border: "border-l-[var(--signal-border-accent-emphasis)]",
              },
            ];
            const a = accents[i % accents.length];
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-48px" }}
                transition={{
                  duration: 0.4,
                  delay: 0.05 * i,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "group flex flex-col gap-4 rounded-xl border border-[var(--signal-border-default)] border-l-[3px] bg-[var(--signal-bg-primary)] p-6 shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow",
                  a.border,
                )}
              >
                <div
                  className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                    a.bg,
                  )}
                >
                  <cap.icon size={22} className={a.fg} />
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
   4. How It Works Section (3 numbered steps)
   ========================================================================== */

interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

const howItWorksSteps: HowItWorksStep[] = [
  {
    number: "01",
    title: "Create a flag",
    description:
      "Define your feature flag with targeting rules, percentage rollouts, or A/B variants.",
  },
  {
    number: "02",
    title: "Target users",
    description:
      "Use 13 targeting operators, custom attributes, and reusable segments to control who sees what.",
  },
  {
    number: "03",
    title: "Ship with confidence",
    description:
      "Monitor evaluations in real-time. Kill switches. Gradual rollouts. Zero stress.",
  },
];

function HowItWorksSection() {
  const stepColors = [
    {
      bg: "bg-[var(--signal-bg-accent-muted)]",
      fg: "text-[var(--signal-fg-accent)]",
      border: "border-[var(--signal-border-accent-muted)]",
    },
    {
      bg: "bg-[var(--signal-bg-info-muted)]",
      fg: "text-[var(--signal-fg-info)]",
      border: "border-[var(--signal-border-accent-muted)]",
    },
    {
      bg: "bg-[var(--signal-bg-success-muted)]",
      fg: "text-[var(--signal-fg-success)]",
      border: "border-[var(--signal-border-success-muted)]",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 md:py-28 bg-[var(--signal-bg-secondary)]"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-14" {...fadeUp}>
          <SectionLabel icon={RefreshCw} text="How It Works" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            How it works
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal">
            Three steps from idea to production. No YAML required.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorksSteps.map((step, i) => {
            const c = stepColors[i];
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-48px" }}
                transition={{
                  duration: 0.4,
                  delay: 0.08 * i,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative flex flex-col items-center text-center gap-4"
              >
                <span
                  className={cn(
                    "relative z-10 flex items-center justify-center w-16 h-16 rounded-full border text-2xl font-extrabold select-none shadow-[var(--signal-shadow-sm)]",
                    c.bg,
                    c.fg,
                    c.border,
                  )}
                >
                  {i + 1}
                </span>
                <h3 className="text-xl font-semibold text-[var(--signal-fg-primary)]">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--signal-fg-secondary)] max-w-[280px] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Code snippet visual */}
        <motion.div className="mt-14 max-w-xl mx-auto" {...fadeUpDelayed(0.3)}>
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] overflow-hidden shadow-[var(--signal-shadow-md)]">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-xs text-[var(--signal-fg-secondary)] font-mono">
                create-flag.ts
              </span>
            </div>
            <div className="p-4 font-mono text-xs leading-relaxed text-[var(--signal-fg-primary)]">
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;1
                </span>
                <span className="text-[var(--signal-fg-accent)]">import</span>{" "}
                <span className="text-[var(--signal-fg-success)]">
                  FeatureSignals
                </span>{" "}
                <span className="text-[var(--signal-fg-accent)]">from</span>{" "}
                <span className="text-[var(--signal-fg-info)]">
                  &apos;@featuresignals/sdk&apos;
                </span>
              </div>
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;2
                </span>
              </div>
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;3
                </span>
                <span className="text-[var(--signal-fg-accent)]">const</span>{" "}
                <span>fs</span> ={" "}
                <span className="text-[var(--signal-fg-accent)]">new</span>{" "}
                <span className="text-[var(--signal-fg-success)]">
                  FeatureSignals
                </span>
                (&#123;
              </div>
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;4
                </span>
                &nbsp;&nbsp;apiKey:{" "}
                <span className="text-[var(--signal-fg-info)]">
                  &apos;fs_sk_...&apos;
                </span>
              </div>
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;5
                </span>
                &#125;)
              </div>
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;6
                </span>
              </div>
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;7
                </span>
                <span className="text-[var(--signal-fg-accent)]">const</span>{" "}
                <span>enabled</span> ={" "}
                <span className="text-[var(--signal-fg-accent)]">await</span>{" "}
                fs.
                <span className="text-[var(--signal-fg-info)]">isEnabled</span>(
              </div>
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;8
                </span>
                &nbsp;&nbsp;
                <span className="text-[var(--signal-fg-info)]">
                  &apos;dark-mode-v2&apos;
                </span>
              </div>
              <div>
                <span className="text-[var(--signal-fg-secondary)] select-none mr-3">
                  &nbsp;9
                </span>
                )
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   5. Persona Tabs Section
   ========================================================================== */

interface PersonaTab {
  id: string;
  label: string;
}

const personaTabs: PersonaTab[] = [
  { id: "developers", label: "For Developers" },
  { id: "platform", label: "For Platform Teams" },
  { id: "security", label: "For Security & Compliance" },
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
      title: "Sub-millisecond evaluation in 8 languages",
      description:
        "Go, Node.js, Python, Java, .NET, Ruby, React, Vue — all with native SDKs optimized for minimal overhead.",
    },
    {
      icon: Code,
      title: "One-line SDK integration",
      description:
        "Import, initialize, evaluate. The simplest integration of any feature flag platform.",
    },
    {
      icon: ExternalLink,
      title: "OpenFeature native — zero vendor lock-in",
      description:
        "All SDKs implement the OpenFeature standard. Swap providers with a single line of config.",
    },
    {
      icon: Box,
      title: "Local evaluation from in-memory cache",
      description:
        "Flags evaluate locally in under 1ms. No network round-trips on the hot path.",
    },
  ],
  platform: [
    {
      icon: Settings,
      title: "Terraform, Pulumi, Ansible providers for GitOps",
      description:
        "Manage flags as code in your existing infrastructure pipelines. Full GitOps support.",
    },
    {
      icon: Box,
      title: "Relay proxy for edge caching and high availability",
      description:
        "Deploy relay proxies at the edge for sub-millisecond evaluation across all regions.",
    },
    {
      icon: RefreshCw,
      title: "Webhooks, scheduling, CI/CD integration",
      description:
        "Trigger deployments, notifications, and automated workflows on flag changes.",
    },
    {
      icon: Rocket,
      title: "Multi-environment management with flag promotion",
      description:
        "Promote flags from dev → staging → production with confidence. Environment-specific targeting.",
    },
  ],
  security: [
    {
      icon: ShieldCheck,
      title: "RBAC with 4 built-in roles and per-environment permissions",
      description:
        "Admin, Editor, Viewer, and custom roles with granular environment-level access control.",
    },
    {
      icon: ShieldCheck,
      title: "Tamper-evident audit logging with before/after diffs",
      description:
        "Every change is recorded with actor identity, timestamp, and full before/after state diff.",
    },
    {
      icon: Check,
      title: "SSO (SAML/OIDC), SCIM, MFA enforcement",
      description:
        "Enterprise authentication with Okta, Azure AD, Google Workspace, and any SAML/OIDC provider.",
    },
    {
      icon: CheckCircle,
      title: "SOC 2 Type II, GDPR, HIPAA compliance ready",
      description:
        "Auditor-ready compliance posture with data residency controls and DPA support.",
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
    <section id="personas" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-12" {...fadeUp}>
          <SectionLabel icon={Users} text="Built For Your Team" />
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            Built for every team
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal">
            Feature management that scales from indie devs to the Fortune 500.
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
                  "px-5 h-10 rounded-full text-sm font-semibold transition-all duration-200",
                  isActive
                    ? cn("text-white border", accent.active)
                    : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-transparent hover:bg-[var(--signal-bg-secondary)]",
                )}
              >
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
                whileHover={{ scale: 1.02 }}
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
   6. Open Source Proof Section
   ========================================================================== */

const ossMetrics = [
  {
    value: "500+",
    label: "GitHub Stars",
    href: "https://github.com/dinesh-g1/featuresignals",
  },
  { value: "8", label: "SDK Languages", href: "/integrations#sdks" },
  {
    value: "Apache 2.0",
    label: "Open Source License",
    href: "https://github.com/dinesh-g1/featuresignals/blob/main/LICENSE",
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
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal">
            Apache 2.0 licensed. OpenFeature certified. No vendor lock-in. Ever.
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
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-48px" }}
              transition={{
                duration: 0.4,
                delay: 0.05 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-6 shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow text-center group"
            >
              <span
                className={cn(
                  "text-3xl font-bold",
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

        <motion.blockquote
          className="mt-12 max-w-2xl mx-auto text-center"
          {...fadeUpDelayed(0.3)}
        >
          {/* Real user quote will go here when available */}
        </motion.blockquote>
      </div>
    </section>
  );
}

/* ==========================================================================
   7. Pricing Overview Section (3 cards)
   ========================================================================== */

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  badge?: string;
  highlighted?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description:
      "1 project, 2 environments, 3 team members. All SDKs + OpenFeature.",
    features: [
      "Unlimited feature flags",
      "All 8 SDKs + OpenFeature",
      "Community support",
      "Apache 2.0 license",
    ],
    cta: "Start Free",
    ctaHref: REGISTER_URL,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month flat",
    description:
      "Unlimited everything. AI Janitor, RBAC, audit logs, webhooks.",
    features: [
      "Unlimited projects & environments",
      "AI Janitor stale flag removal",
      "RBAC & audit logs",
      "Webhooks & integrations",
      "Email support",
    ],
    cta: "Start Free",
    ctaHref: REGISTER_URL,
    badge: "Most Popular",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "SSO, SCIM, 99.9% SLA, dedicated support, on-prem deployment.",
    features: [
      "Everything in Pro",
      "SSO (SAML/OIDC) & SCIM",
      "99.9% uptime SLA",
      "Dedicated support engineer",
      "On-prem / air-gapped deployment",
    ],
    cta: "Contact Sales",
    ctaHref: SALES_EMAIL,
  },
];

function PricingOverviewSection() {
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div className="text-center mb-14" {...fadeUp}>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--signal-fg-primary)]">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 font-normal">
            No per-seat fees. No surprise MAU billing. Just fair, flat pricing.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-48px" }}
              transition={{
                duration: 0.4,
                delay: 0.08 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "relative flex flex-col rounded-xl border p-6 shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow",
                plan.highlighted
                  ? "border-[var(--signal-border-accent-emphasis)] bg-[var(--signal-bg-primary)]"
                  : "border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]",
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--signal-bg-accent-emphasis)] text-white px-3 py-1 text-xs font-semibold">
                    <Star size={12} />
                    {plan.badge}
                  </span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
                {plan.name}
              </h3>

              <div className="mt-3 mb-1">
                <span className="text-3xl font-bold text-[var(--signal-fg-primary)]">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-[var(--signal-fg-secondary)] ml-1">
                    {plan.period}
                  </span>
                )}
              </div>

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
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-6 h-10 text-sm font-semibold w-full transition-opacity",
                  plan.highlighted
                    ? "text-white bg-[var(--signal-bg-success-emphasis)] hover:opacity-90"
                    : "text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] hover:bg-[var(--signal-bg-secondary)]",
                )}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div className="text-center mt-8" {...fadeUpDelayed(0.2)}>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline underline-offset-4"
          >
            View full pricing
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   8. Final CTA Section
   ========================================================================== */

function FinalCtaSection() {
  return (
    <section
      id="final-cta"
      className="py-20 md:py-28 bg-[var(--signal-bg-inverse)]"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-white max-w-[700px] mx-auto"
          {...fadeUp}
        >
          Ready to take control of your release infrastructure?
        </motion.h2>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mt-8"
          {...fadeUpDelayed(0.1)}
        >
          <a
            href={REGISTER_URL}
            className="inline-flex items-center justify-center rounded-md px-6 h-11 text-sm font-semibold text-[var(--signal-fg-primary)] bg-white hover:opacity-90 transition-opacity"
          >
            Start Free
          </a>
          <a
            href={SALES_EMAIL}
            className="inline-flex items-center justify-center rounded-md border border-white/30 px-6 h-11 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Contact Sales
          </a>
        </motion.div>

        <motion.p
          className="text-sm text-[var(--signal-fg-secondary)] mt-6 font-normal max-w-[500px] mx-auto"
          {...fadeUpDelayed(0.2)}
        >
          Open source. Apache 2.0. Self-host or cloud. No vendor lock-in.
        </motion.p>
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
      <CapabilityCardsSection />
      <HowItWorksSection />
      <PersonaFeaturesSection />
      <OpenSourceProofSection />
      <PricingOverviewSection />
      <FinalCtaSection />
    </>
  );
}
