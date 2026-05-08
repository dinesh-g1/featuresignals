"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ZapIcon,
  GitPullRequestIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  HeartFillIcon,
  PeopleIcon,
  GlobeIcon,
  OrganizationIcon,
  LawIcon,
  ClockIcon,
  RocketIcon,
  CheckCircleIcon,
} from "@primer/octicons-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Animation Presets
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
   Data
   ========================================================================== */

const principles = [
  {
    icon: ZapIcon,
    title: "Performance as a feature",
    description:
      "Sub-millisecond evaluation. Every flag check matters. We optimise relentlessly because your users shouldn't wait on a feature flag.",
  },
  {
    icon: GitPullRequestIcon,
    title: "Open by default",
    description:
      "Apache 2.0. Self-host or cloud. Your choice. Our code is open, our roadmap is public, and our community shapes the product.",
  },
  {
    icon: ShieldCheckIcon,
    title: "No vendor lock-in",
    description:
      "OpenFeature native. Leave anytime. Your application code depends on an open standard, not on us. Switching is a config change, not a rewrite.",
  },
  {
    icon: LightBulbIcon,
    title: "AI as an accelerator",
    description:
      "The AI Janitor automates technical debt cleanup — finding stale flags and removing them. AI augments developers; it doesn't replace them.",
  },
  {
    icon: LawIcon,
    title: "Transparent pricing",
    description:
      "Flat rate. No per-seat penalties. No surprise bills. Enterprise features are included, not nickel-and-dimed. Pricing that respects your budget.",
  },
];

const companyFacts = [
  { label: "Founded", value: "2024" },
  { label: "Built by", value: "Vivekananda Technology Labs" },
  { label: "Location", value: "Hyderabad, India" },
  { label: "License", value: "Apache 2.0" },
  { label: "Architecture", value: "Single Go binary, no JVM" },
  { label: "OpenFeature", value: "Native across all 8 SDKs" },
];

/* ==========================================================================
   Page
   ========================================================================== */

export default function AboutPage() {
  return (
    <>
      <HeroSection />
      <MissionSection />
      <PrinciplesSection />
      <OriginSection />
      <TeamSection />
      <BackersSection />
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
          About
        </motion.p>
        <motion.h1
          id="about-hero-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-4"
          {...fadeUp}
        >
          We&apos;re building the control plane for software delivery
        </motion.h1>
        <motion.p
          className="text-lg text-[var(--signal-fg-secondary)] max-w-xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-64px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          FeatureSignals was born from a simple observation: feature flag
          management shouldn&apos;t require a PhD in pricing complexity.
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
            Real tools for real engineering teams
          </h2>
        </motion.div>

        <motion.div
          className="space-y-6 text-base text-[var(--signal-fg-secondary)] leading-relaxed"
          {...fadeUpDelayed(0.1)}
        >
          <p>
            We believe feature flags should be{" "}
            <strong className="text-[var(--signal-fg-primary)]">
              fast, open, and affordable
            </strong>{" "}
            — infrastructure, not a profit center. The platforms that came
            before us built pricing models designed to extract maximum revenue
            from engineering teams. We think differently.
          </p>
          <p>
            Feature flags are critical infrastructure — like your database, your
            CI pipeline, your monitoring stack. They should be fast enough that
            you never think about them. They should be open enough that you can
            inspect, modify, and self-host them. And they should be priced like
            infrastructure: predictable, transparent, and fair.
          </p>
          <p>
            <strong className="text-[var(--signal-fg-primary)]">
              Open source is not a marketing tactic. It&apos;s how we build
              trust.
            </strong>{" "}
            Every line of FeatureSignals is Apache 2.0. You can read it, fork
            it, run it on your own hardware, and contribute back. We don&apos;t
            do &quot;open core&quot; with a proprietary enterprise layer that
            locks you in. The same binary powers our cloud and your self-hosted
            instance.
          </p>
        </motion.div>
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
      className="py-20 sm:py-28 bg-[var(--signal-bg-primary)]"
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
            to pricing.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {principles.map((principle, i) => (
            <motion.div
              key={principle.title}
              className="group rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-6 hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-md)] transition-all duration-200"
              initial={{ opacity: 0, y: 24 }}
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
      className="py-20 sm:py-28 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="origin-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text */}
          <motion.div {...fadeUp}>
            <p className="text-xs font-semibold text-[var(--signal-fg-accent)] uppercase tracking-wider mb-3">
              Our Story
            </p>
            <h2
              id="origin-heading"
              className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-6"
            >
              Built by engineers, for engineers
            </h2>
            <div className="space-y-4 text-base text-[var(--signal-fg-secondary)] leading-relaxed">
              <p>
                FeatureSignals started with a real problem: an engineering team
                needed feature flags, and the market options were either
                eye-wateringly expensive SaaS platforms or under-maintained open
                source projects that hadn&apos;t seen a commit in years.
              </p>
              <p>
                The SaaS platforms were fast, but their pricing scaled with your
                team size — not your usage. The open source alternatives were
                free, but they were slow, missing critical features, and
                abandoned. There was no middle ground.
              </p>
              <p>
                So we built one. A single Go binary with sub-millisecond
                evaluation, an in-memory ruleset cache, 8 language SDKs, and an
                AI janitor that cleans up stale flags. Apache 2.0. Self-host or
                cloud. The platform we wished existed.
              </p>
            </div>
          </motion.div>

          {/* Company Facts */}
          <motion.div
            className="flex flex-col gap-5"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rounded-2xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-8">
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
          </motion.div>
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
            <PeopleIcon size={28} className="text-[var(--signal-fg-accent)]" />
          </div>
          <h2
            id="team-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-4"
          >
            Built by a small, focused team
          </h2>
          <p className="text-base text-[var(--signal-fg-secondary)] max-w-lg mx-auto leading-relaxed">
            We&apos;re a small, focused team of engineers passionate about
            developer tools. We believe great infrastructure software comes from
            teams that understand the problem deeply — not from the largest
            headcount or the most funding.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Backers / Independence
   ========================================================================== */

function BackersSection() {
  return (
    <section
      id="backers"
      className="py-20 sm:py-28 bg-[var(--signal-bg-secondary)]"
      aria-labelledby="backers-heading"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div {...fadeUp}>
          <div className="w-14 h-14 rounded-2xl bg-[var(--signal-bg-info-muted)] flex items-center justify-center mx-auto mb-6">
            <RocketIcon size={28} className="text-[var(--signal-fg-info)]" />
          </div>
          <h2
            id="backers-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-4"
          >
            Bootstrapped and independent
          </h2>
          <p className="text-base text-[var(--signal-fg-secondary)] max-w-lg mx-auto leading-relaxed">
            We answer to our users, not VCs. FeatureSignals is self-funded and
            profitable. Our incentives are aligned with yours — build a product
            so good that you choose to pay for it. No growth-at-all-costs
            pressure. No exit timeline. Just great software, sustainably built.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
