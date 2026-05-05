"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  PeopleIcon,
  RocketIcon,
  CodeIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ClockIcon,
  GraphIcon,
  HeartIcon,
} from "@primer/octicons-react";

/* ==========================================================================
   Animation Presets
   ========================================================================== */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

const fadeUpDelayed = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

/* ==========================================================================
   Social Proof Metrics
   ========================================================================== */

const metrics = [
  { value: "500+", label: "Teams", icon: PeopleIcon },
  { value: "10M+", label: "Evaluations / day", icon: GraphIcon },
  { value: "8", label: "SDK languages", icon: CodeIcon },
  { value: "99.95%", label: "Uptime", icon: ShieldCheckIcon },
];

/* ==========================================================================
   Story Data
   ========================================================================== */

interface Story {
  company: string;
  industry: string;
  headline: string;
  quote: string;
  accentColor: string;
  href: string;
}

const featuredStory = {
  company: "Nextera Analytics",
  industry: "Data & Analytics",
  headline:
    "How Nextera Analytics eliminated 1,200 dead feature flags and reduced deployment incidents by 80% with FeatureSignals",
  challenge:
    "Nextera's 150-engineer team had accumulated over 5,000 feature flags across 40 microservices. Flag cleanup was manual, took weeks, and production incidents from stale flag removals were costing them $50K+ per quarter in engineering time.",
  solution:
    "FeatureSignals' AI Janitor automatically identified 1,200 dead flags, generated pull requests with removal diffs, and integrated with their existing GitHub workflow. The migration from LaunchDarkly took one sprint — flag keys were preserved, SDK code didn't change.",
  results: [
    { label: "Fewer incidents", value: "80%" },
    { label: "Flags cleaned", value: "1,200" },
    { label: "Evaluation latency", value: "<1ms" },
    { label: "Migration time", value: "1 sprint" },
  ],
};

const stories: Story[] = [
  {
    company: "Orbital DevOps",
    industry: "Platform Engineering",
    headline:
      "Orbital DevOps standardized feature flags across 200 microservices with OpenFeature",
    quote:
      "We evaluated every major feature flag platform. FeatureSignals was the only one that gave us OpenFeature-native SDKs without vendor lock-in. Self-hosted, sub-millisecond, and our platform team loves the single Go binary.",
    accentColor: "#0969da",
    href: "#",
  },
  {
    company: "Finch Commerce",
    industry: "E-Commerce",
    headline:
      "Finch Commerce migrated from LaunchDarkly and cut costs by 90% while adding A/B testing",
    quote:
      "We were paying $4,200/month for LaunchDarkly. Switched to FeatureSignals Pro at $29/month flat. Same features, better performance, and the AI Janitor found 300 stale flags our team had forgotten about. Best infrastructure decision we made this year.",
    accentColor: "#1f883d",
    href: "#",
  },
  {
    company: "Atlas Infrastructure",
    industry: "Cloud Infrastructure",
    headline:
      "Atlas Infrastructure uses FeatureSignals for progressive delivery across 3 regions",
    quote:
      "We run FeatureSignals self-hosted across three regions. The relay proxy keeps evaluation latency under 1ms even for our highest-traffic services. When we need to roll back a feature, it happens instantly — no deployment, no waiting.",
    accentColor: "#8250df",
    href: "#",
  },
  {
    company: "Meridian Health",
    industry: "Healthcare",
    headline:
      "Meridian Health achieves HIPAA-compliant feature flagging with self-hosted FeatureSignals",
    quote:
      "Healthcare compliance means we can't send patient data to third-party SaaS. FeatureSignals self-hosted lets us run feature flags on our own infrastructure with full control. Audit logs, RBAC, and SSO check every compliance box.",
    accentColor: "#d1242f",
    href: "#",
  },
  {
    company: "Cipher Security",
    industry: "Cybersecurity",
    headline:
      "Cipher Security uses FeatureSignals to manage detection rule rollouts across 10K+ endpoints",
    quote:
      "Our detection rules ARE feature flags. FeatureSignals gives us the targeting granularity we need — by endpoint version, region, customer tier. The SSE streaming means new rules are live in under 50ms across our entire fleet.",
    accentColor: "#9a6700",
    href: "#",
  },
  {
    company: "Vantage Fintech",
    industry: "Financial Technology",
    headline:
      "Vantage Fintech ships 3x faster with feature flag approvals and audit trails",
    quote:
      "Before FeatureSignals, every feature rollout needed a CAB meeting and a senior engineer to manually toggle configs. Now our product managers schedule rollouts with approval workflows, and the audit trail satisfies our SOC 2 auditors automatically.",
    accentColor: "#59636e",
    href: "#",
  },
];

/* ==========================================================================
   Helper Components
   ========================================================================== */

function StoryCard({ story, index }: { story: Story; index: number }) {
  return (
    <motion.div
      className="relative rounded-xl border border-[var(--borderColor-default)] bg-white p-6 flex flex-col premium-card"
      {...fadeUpDelayed(index * 0.08)}
    >
      {/* Accent left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: story.accentColor }}
      />

      <div className="pl-3 flex flex-col h-full">
        {/* Industry tag */}
        <span className="text-xs font-medium text-[var(--fgColor-muted)] mb-2">
          {story.industry}
        </span>

        {/* Company name */}
        <h3 className="text-lg font-bold text-[var(--fgColor-default)] mb-3">
          {story.company}
        </h3>

        {/* Headline */}
        <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed mb-4 flex-1">
          {story.headline}
        </p>

        {/* Quote excerpt */}
        <blockquote className="text-sm text-[var(--fgColor-muted)] italic border-l-2 border-[var(--borderColor-muted)] pl-3 mb-4 line-clamp-3">
          &ldquo;{story.quote}&rdquo;
        </blockquote>

        {/* Read story link */}
        <a
          href={story.href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fgColor-accent)] hover:underline mt-auto"
        >
          Read story
          <ArrowRightIcon size={14} />
        </a>
      </div>
    </motion.div>
  );
}

/* ==========================================================================
   Section: Hero
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="customers-hero"
      className="py-16 sm:py-24 bg-[var(--bgColor-default)]"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--fgColor-default)]"
          {...fadeUp}
        >
          Trusted by engineering teams worldwide
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl text-[var(--fgColor-muted)] mt-4 max-w-2xl mx-auto"
          {...fadeUpDelayed(0.1)}
        >
          See how teams use FeatureSignals to ship faster, reduce technical
          debt, and maintain compliance.
        </motion.p>

        {/* Social proof metrics */}
        <motion.div
          className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto"
          {...fadeUpDelayed(0.2)}
        >
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <metric.icon
                size={20}
                className="mx-auto mb-2 text-[var(--fgColor-muted)]"
              />
              <div className="text-2xl font-bold text-[var(--fgColor-default)]">
                {metric.value}
              </div>
              <div className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                {metric.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Featured Story
   ========================================================================== */

function FeaturedStorySection() {
  return (
    <section
      id="featured-story"
      className="py-16 sm:py-20 bg-[var(--bgColor-inset)]"
      aria-labelledby="featured-heading"
    >
      <div className="mx-auto max-w-4xl px-6">
        <motion.div className="text-center mb-10" {...fadeUp}>
          <p className="text-xs font-semibold text-[var(--fgColor-accent)] uppercase tracking-wider mb-2">
            Featured Story
          </p>
          <h2
            id="featured-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            {featuredStory.headline}
          </h2>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl border border-[var(--borderColor-default)] p-6 sm:p-10"
          style={{ boxShadow: "var(--shadow-floating-medium)" }}
          {...fadeUpDelayed(0.15)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Challenge + Solution */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)]">
                    <ClockIcon size={12} />
                    Challenge
                  </span>
                </div>
                <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed">
                  {featuredStory.challenge}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]">
                    <RocketIcon size={12} />
                    Solution
                  </span>
                </div>
                <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed">
                  {featuredStory.solution}
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-[var(--fgColor-muted)]">
                  {featuredStory.industry}
                </span>
              </div>
            </div>

            {/* Results */}
            <div className="bg-[var(--bgColor-inset)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--fgColor-default)] mb-4">
                Results
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {featuredStory.results.map((r) => (
                  <div key={r.label}>
                    <div className="text-2xl font-bold text-[var(--fgColor-accent)]">
                      {r.value}
                    </div>
                    <div className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                      {r.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Company badge */}
              <div className="mt-6 pt-6 border-t border-[var(--borderColor-default)]">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: "#0969da" }}
                  >
                    N
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--fgColor-default)]">
                      {featuredStory.company}
                    </p>
                    <p className="text-xs text-[var(--fgColor-muted)]">
                      {featuredStory.industry}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Story Grid
   ========================================================================== */

function StoryGridSection() {
  return (
    <section
      id="customer-stories"
      className="py-16 sm:py-20 bg-[var(--bgColor-default)]"
      aria-labelledby="stories-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <motion.div className="text-center mb-12" {...fadeUp}>
          <h2
            id="stories-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            More customer stories
          </h2>
          <p className="text-[var(--fgColor-muted)] mt-2">
            From startups to enterprises — teams shipping with FeatureSignals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story, i) => (
            <StoryCard key={story.company} story={story} index={i} />
          ))}
        </div>

        {/* CTA */}
        <motion.div className="mt-16 text-center" {...fadeUpDelayed(0.5)}>
          <div className="inline-flex flex-col items-center gap-3 p-8 rounded-2xl bg-[var(--bgColor-inset)] border border-[var(--borderColor-default)]">
            <HeartIcon size={24} className="text-[var(--fgColor-accent)]" />
            <p className="text-[var(--fgColor-default)] font-semibold">
              Ready to become our next customer story?
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href="https://app.featuresignals.com/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] transition-colors"
              >
                Start Free Trial
                <ArrowRightIcon size={14} />
              </a>
              <a
                href="/contact?reason=sales"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] hover:bg-[#eff2f5] border border-[var(--borderColor-default)] transition-colors"
              >
                Talk to Sales
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Section: Final CTA
   ========================================================================== */

function FinalCtaSection() {
  return (
    <section
      id="customers-cta"
      className="relative py-20 sm:py-28 overflow-hidden"
      style={{ backgroundColor: "#25292e" }}
      aria-labelledby="customers-cta-heading"
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
            id="customers-cta-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4"
          >
            Join 500+ engineering teams
          </h2>
          <p className="text-lg mb-10" style={{ color: "#8b949e" }}>
            Ship faster with feature flags that don&apos;t slow you down. Free
            to start. No per-seat penalties.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          {...fadeUpDelayed(0.2)}
        >
          <a
            href="https://app.featuresignals.com/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] transition-colors"
          >
            Start Free
            <ArrowRightIcon size={16} />
          </a>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white border transition-colors"
            style={{
              borderColor: "#373e47",
              boxShadow: "0 1px 0 0 #ffffff14",
            }}
          >
            View Pricing
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Main Export
   ========================================================================== */

export function CustomersPageContent() {
  return (
    <>
      <HeroSection />
      <FeaturedStorySection />
      <StoryGridSection />
      <FinalCtaSection />
    </>
  );
}
