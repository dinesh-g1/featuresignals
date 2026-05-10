"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap,
  GitPullRequest,
  ShieldCheck,
  Lightbulb,
  Heart,
  Users,
  Globe,
  Building,
  Scale,
  Clock,
  Rocket,
  CheckCircle,
  Target,
  Eye,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Animation Presets
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
   Data
   ========================================================================== */

const principles = [
  {
    icon: Zap,
    title: "Performance as a feature",
    description:
      "Sub-millisecond evaluation with no database calls on the hot path. An in-memory ruleset cache, a stateless eval engine, and relentless optimisation. Your users should never wait on a feature flag.",
  },
  {
    icon: GitPullRequest,
    title: "Open by default",
    description:
      "Apache 2.0. Community Edition source is public. Self-host or cloud — your choice. Our roadmap is in the open. Our community shapes the product, not a pricing committee.",
  },
  {
    icon: ShieldCheck,
    title: "No vendor lock-in",
    description:
      "OpenFeature-native across all 8 SDKs. Your application code depends on an open standard, not on us. Switching platforms is a configuration change — not a rewrite. Zero lock-in, by design.",
  },
  {
    icon: Lightbulb,
    title: "AI as an accelerator",
    description:
      "The AI Janitor finds stale flags, suggests cleanups, and automates flag hygiene — the kind of tedious maintenance that shipping teams hate. AI augments developers; it does not replace them.",
  },
  {
    icon: Scale,
    title: "Transparent, flat pricing",
    description:
      "Flat rate with unlimited seats. INR 1,999/mo for Pro. No per-seat penalties, no surprise overage bills, no usage-based multipliers. Enterprise features are included — not nickel-and-dimed behind upgrade gates.",
  },
  {
    icon: Heart,
    title: "Built for engineers, by engineers",
    description:
      "We are developers building tools for developers. Every design decision starts with: would we use this ourselves? Every API is designed for DX first. Every feature exists because we needed it.",
  },
];

const values = [
  {
    icon: Target,
    title: "Transparency",
    description:
      "Open source code. Public roadmap. Honest pricing. We share what we are building, what it costs, and why. No dark patterns, no hidden fees, no bait-and-switch.",
  },
  {
    icon: Eye,
    title: "Craft",
    description:
      "We sweat the details. Every millisecond of latency, every line of documentation, every API design choice. We believe great infrastructure software is craftsmanship, not assembly-line output.",
  },
  {
    icon: Handshake,
    title: "Independence",
    description:
      "Bootstrapped and self-funded. We answer to our users — not to VCs with growth-at-all-costs mandates. Our incentives are aligned with building a sustainable product, not chasing an exit.",
  },
  {
    icon: Users,
    title: "Customer Success",
    description:
      "Your success is our success. We ship features our customers ask for, not features our competitors have. Support is done by engineers who built the product, not by script-reading chatbots.",
  },
];

const companyFacts = [
  { label: "Trade Name", value: "FeatureSignals" },
  { label: "Legal Entity", value: "Vivekananda Technology Labs" },
  { label: "Founded", value: "2025" },
  { label: "Headquarters", value: "Hyderabad, Telangana, India" },
  { label: "License", value: "Apache 2.0 (Community Edition)" },
  { label: "Architecture", value: "Single Go binary, sub-ms eval" },
  { label: "OpenFeature", value: "Native across all 8 SDKs" },
  { label: "Business Model", value: "B2B SaaS + Open Source" },
];

const differentiators = [
  {
    title: "Sub-millisecond evaluation",
    description:
      "Our evaluation engine runs entirely in-memory with zero database calls on the hot path. Flag checks are served from a synchronised in-memory ruleset cache. The result: p99 latencies under 1ms. Your application code calls a flag, and the answer is back before the next CPU instruction matters.",
  },
  {
    title: "OpenFeature-native, zero lock-in",
    description:
      "FeatureSignals is built on the OpenFeature standard. All 8 language SDKs implement the OpenFeature provider interface. Your application code calls the OpenFeature API — not our proprietary one. If you ever decide to leave, you swap the provider, not your codebase. That is real portability.",
  },
  {
    title: "Single Go binary, self-host in 3 minutes",
    description:
      "No JVM. No Kubernetes requirement. No 12 microservices to orchestrate. The entire FeatureSignals server compiles to a single statically-linked Go binary. Self-host it on a €6/month VPS. Deploy it behind your firewall. Run it air-gapped. It is the same binary that powers our cloud.",
  },
  {
    title: "AI Janitor for automated flag hygiene",
    description:
      "Feature flags rot. Teams ship a flag, forget about it, and three years later it is still wrapping dead code in production. The AI Janitor scans your flags, identifies staleness, traces flag usage through your codebase, and suggests removals — or removes them automatically if you configure it to. Technical debt, deleted.",
  },
  {
    title: "Flat pricing with unlimited seats",
    description:
      "Pro is INR 1,999 per month — period. Unlimited team members, unlimited flags, unlimited environments. No per-seat calculus. No overage anxiety. No growth penalty. The bill you see is the bill you pay, every month. Enterprise adds SLAs, dedicated support, and self-hosting — quoted transparently, not negotiated against you.",
  },
];

/* ==========================================================================
   Page
   ========================================================================== */

export default function AboutPage() {
  return (
    <>
      <HeroSection />
      <MissionSection />
      <WhatMakesUsDifferent />
      <PrinciplesSection />
      <OriginSection />
      <ValuesSection />
      <TeamSection />
      <OpenSourceSection />
    </>
  );
}

/* ==========================================================================
   Hero
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="hero"
      className="relative py-20 sm:py-28 bg-[var(--signal-bg-primary)] bg-glow-orbs"
      aria-labelledby="about-hero-heading"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.p
          className="text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-4"
          {...fadeUp}
        >
          About FeatureSignals
        </motion.p>
        <motion.h1
          id="about-hero-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-4"
          {...fadeUp}
        >
          Enterprise-grade feature flags, without the enterprise lock-in
        </motion.h1>
        <motion.p
          className="text-lg text-[var(--signal-fg-secondary)] max-w-xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-64px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Built in Hyderabad by engineers who were tired of feature flag
          platforms that were too expensive, too slow, or too determined to own
          your stack.
        </motion.p>
      </div>
    </section>
  );
}

/* ==========================================================================
   Mission
   ========================================================================== */

function MissionSection() {
  return (
    <section
      id="mission"
      className="py-20 sm:py-28 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="mission-heading"
    >
      <div className="mx-auto max-w-3xl px-6">
        <motion.div {...fadeUp}>
          <p className="text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-4 text-center">
            Our Mission
          </p>
          <h2
            id="mission-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-8 text-center"
          >
            To give every engineering team enterprise-grade feature flag
            management — without the enterprise price tag or lock-in
          </h2>
        </motion.div>

        <motion.div
          className="space-y-6 text-base text-[var(--signal-fg-secondary)] leading-relaxed"
          {...fadeUpDelayed(0.1)}
        >
          <p>
            Feature flags are critical infrastructure. They control who sees
            what in production. They gate feature rollouts, power A/B
            experiments, and isolate risky code behind kill switches. They sit
            on the request hot path — every millisecond of evaluation latency
            multiplies across every user, every request, every day.
          </p>
          <p>
            Yet the market for feature flag management has been dominated by
            platforms that treat this infrastructure as a profit centre —
            charging per-seat prices that grow with your team, locking you into
            proprietary SDKs, and making self-hosting an afterthought reserved
            for the highest enterprise tiers.
          </p>
          <p>
            We believe feature flags should be{" "}
            <strong className="text-[var(--signal-fg-primary)]">
              fast, open, and affordable
            </strong>
            . Fast enough that you never think about them. Open enough that you
            can inspect, modify, and self-host them. And priced like
            infrastructure: predictable, transparent, and fair — regardless of
            how many engineers you hire.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   What Makes Us Different
   ========================================================================== */

function WhatMakesUsDifferent() {
  return (
    <section
      id="differentiators"
      className="py-20 sm:py-28 bg-[var(--signal-bg-primary)]"
      aria-labelledby="differentiators-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <motion.div className="text-center max-w-2xl mx-auto mb-14" {...fadeUp}>
          <p className="text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-3">
            Why FeatureSignals
          </p>
          <h2
            id="differentiators-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            What makes us different
          </h2>
          <p className="text-base text-[var(--signal-fg-secondary)] mt-3">
            Five things that set FeatureSignals apart from every other feature
            flag platform on the market.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {differentiators.map((item, i) => (
            <motion.div
              key={item.title}
              className="group rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-6 hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-md)] transition-all duration-200"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Principles
   ========================================================================== */

function PrinciplesSection() {
  return (
    <section
      id="principles"
      className="py-20 sm:py-28 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="principles-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <motion.div className="text-center max-w-2xl mx-auto mb-14" {...fadeUp}>
          <p className="text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-3">
            Guiding Principles
          </p>
          <h2
            id="principles-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            What we stand for
          </h2>
          <p className="text-base text-[var(--signal-fg-secondary)] mt-3">
            The principles that guide every decision we make — from architecture
            to pricing, from hiring to support.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {principles.map((principle, i) => (
            <motion.div
              key={principle.title}
              className="group rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-6 hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-md)] transition-all duration-200"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--signal-bg-accent-muted)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200">
                <principle.icon
                  size={20}
                  className="text-[var(--signal-fg-accent)]"
                />
              </div>
              <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-2">
                {principle.title}
              </h3>
              <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                {principle.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Origin Story
   ========================================================================== */

function OriginSection() {
  return (
    <section
      id="origin"
      className="py-20 sm:py-28 bg-[var(--signal-bg-primary)]"
      aria-labelledby="origin-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Text */}
          <motion.div {...fadeUp}>
            <p className="text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-3">
              Our Story
            </p>
            <h2
              id="origin-heading"
              className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-6"
            >
              Built by engineers, for engineers — in Hyderabad
            </h2>
            <div className="space-y-4 text-base text-[var(--signal-fg-secondary)] leading-relaxed">
              <p>
                FeatureSignals started in 2025 with a real problem: our founding
                team needed feature flags for a production system serving
                millions of requests per day. The market options fell into two
                buckets — enterprise SaaS platforms that cost more than the rest
                of our infrastructure combined, or open-source projects that
                were too slow, under-maintained, or both.
              </p>
              <p>
                The SaaS platforms were fast but their per-seat pricing meant
                our costs would scale linearly with every engineer we hired. The
                open source alternatives were free but added double-digit
                milliseconds of latency to every request — unacceptable for a
                performance-sensitive application.
              </p>
              <p>
                There was no middle ground. So we built one — a single Go binary
                with sub-millisecond evaluation, an in-memory ruleset cache
                synchronised via PostgreSQL LISTEN/NOTIFY, 8 language SDKs
                implementing the OpenFeature standard, and an AI-powered janitor
                that finds stale flags before they become technical debt. Apache
                2.0 licensed. Self-host or cloud. The platform we wished had
                existed when we needed it.
              </p>
            </div>
          </motion.div>

          {/* Company Facts */}
          <motion.div
            className="flex flex-col gap-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-8">
              <h3 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-6">
                Company
              </h3>
              <dl className="space-y-4">
                {companyFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-center justify-between py-2 border-b border-[var(--signal-border-default)] last:border-b-0"
                  >
                    <dt className="text-sm text-[var(--signal-fg-secondary)]">
                      {fact.label}
                    </dt>
                    <dd className="text-sm font-medium text-[var(--signal-fg-primary)] text-right">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Contact Card */}
            <div className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-8">
              <h3 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-4">
                Get in Touch
              </h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-[var(--signal-fg-secondary)] mb-0.5">
                    Registered Office
                  </dt>
                  <dd className="text-[var(--signal-fg-primary)]">
                    Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda
                    <br />
                    Hyderabad, Telangana – 500104
                    <br />
                    India
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--signal-fg-secondary)] mb-0.5">
                    Email
                  </dt>
                  <dd className="text-[var(--signal-fg-primary)]">
                    <a
                      href="mailto:hello@featuresignals.com"
                      className="text-[var(--signal-fg-accent)] hover:underline"
                    >
                      hello@featuresignals.com
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--signal-fg-secondary)] mb-0.5">
                    Support
                  </dt>
                  <dd className="text-[var(--signal-fg-primary)]">
                    <a
                      href="mailto:support@featuresignals.com"
                      className="text-[var(--signal-fg-accent)] hover:underline"
                    >
                      support@featuresignals.com
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Values
   ========================================================================== */

function ValuesSection() {
  return (
    <section
      id="values"
      className="py-20 sm:py-28 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="values-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <motion.div className="text-center max-w-2xl mx-auto mb-14" {...fadeUp}>
          <p className="text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-3">
            Our Values
          </p>
          <h2
            id="values-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            The beliefs that shape every decision
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {values.map((value, i) => (
            <motion.div
              key={value.title}
              className="group rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-6 hover:border-[var(--signal-border-accent-muted)] transition-all duration-200"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--signal-bg-accent-muted)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <value.icon
                    size={20}
                    className="text-[var(--signal-fg-accent)]"
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Team
   ========================================================================== */

function TeamSection() {
  return (
    <section
      id="team"
      className="py-20 sm:py-28 bg-[var(--signal-bg-primary)]"
      aria-labelledby="team-heading"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <div className="w-14 h-14 rounded-2xl bg-[var(--signal-bg-accent-muted)] flex items-center justify-center mx-auto mb-6">
            <Users size={28} className="text-[var(--signal-fg-accent)]" />
          </div>
          <h2
            id="team-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-4"
          >
            Remote-first, engineering-driven, based in India
          </h2>
          <p className="text-base text-[var(--signal-fg-secondary)] max-w-lg mx-auto leading-relaxed">
            We are a small, focused team of engineers passionate about developer
            tooling and infrastructure. Remote-first by design, with roots in
            Hyderabad, Telangana — India&apos;s startup capital. We believe
            great infrastructure software comes from teams that deeply
            understand the problem, not from the largest headcount or the most
            funding.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Open Source Commitment
   ========================================================================== */

function OpenSourceSection() {
  return (
    <section
      id="open-source"
      className="py-20 sm:py-28 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="open-source-heading"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <div className="w-14 h-14 rounded-2xl bg-[var(--signal-bg-accent-muted)] flex items-center justify-center mx-auto mb-6">
            <GitPullRequest
              size={28}
              className="text-[var(--signal-fg-accent)]"
            />
          </div>
          <h2
            id="open-source-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-4"
          >
            Open source is not a marketing tactic — it is how we build trust
          </h2>
          <p className="text-base text-[var(--signal-fg-secondary)] max-w-lg mx-auto leading-relaxed mb-6">
            The Community Edition of FeatureSignals is Apache 2.0 licensed. You
            can read every line of code, fork it, run it on your own hardware,
            and contribute back. The same binary that powers our cloud offering
            powers your self-hosted instance. No &ldquo;open core&rdquo; with a
            proprietary enterprise layer. No feature gating behind a license key
            for core functionality. Real open source, because trust is built on
            transparency.
          </p>
          <Link
            href="https://github.com/dinesh-g1/featuresignals"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitPullRequest size={16} />
            View on GitHub
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
