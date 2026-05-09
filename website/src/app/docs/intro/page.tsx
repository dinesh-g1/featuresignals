import type { Metadata } from "next";
import Link from "next/link";
import { Rocket, Zap, Bot, Code, ArrowRight, Users, Globe, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "What is FeatureSignals?",
  description:
    "FeatureSignals is an open-core feature flag platform built for teams that ship fast. Sub-millisecond flag evaluation, AI-powered stale flag detection, and OpenFeature-native SDKs.",
};

export default function IntroPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        What is FeatureSignals?
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals is an <strong>open-core feature flag platform</strong> built for teams that
        ship fast. It gives you sub-millisecond flag evaluation, AI-powered stale flag detection,
        and OpenFeature-native SDKs — so you can deploy when you want, release when you&apos;re
        ready, and keep your codebase clean.
      </p>

      {/* What Are Feature Flags */}
      <SectionHeading>What Are Feature Flags?</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A <strong>feature flag</strong> (also called a feature toggle) is a conditional switch in
        your code that lets you turn functionality on or off without deploying new code. Instead of
        coupling deployment to release, you decouple them:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Deploy</strong> — Push code to production behind a flag (inactive).
        </li>
        <li>
          <strong>Test</strong> — Enable the flag for internal users, staging, or a subset of
          production traffic.
        </li>
        <li>
          <strong>Release</strong> — Gradually roll out to all users. If something breaks, flip
          the flag off — no rollback, no hotfix, no downtime.
        </li>
        <li>
          <strong>Clean up</strong> — Remove the flag and the old code path once the feature is
          stable and fully released.
        </li>
      </ul>

      {/* What Makes FeatureSignals Different */}
      <SectionHeading>What Makes FeatureSignals Different</SectionHeading>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <FeatureCard
          icon={Zap}
          title="Sub-Millisecond Evaluation"
          description="The evaluation engine is built in Go and optimized for the hot path. Flags resolve in &lt;1ms p99, so your application never feels the overhead."
        />
        <FeatureCard
          icon={Bot}
          title="AI Janitor"
          description="Our AI Janitor automatically detects stale, unreachable, and zombie flags. It surfaces cleanup recommendations before they become technical debt."
        />
        <FeatureCard
          icon={Code}
          title="OpenFeature-Native SDKs"
          description="Server SDKs for Go, Node.js, Python, Java, Ruby, .NET, and more. Built on the OpenFeature standard so you can switch providers without rewriting code."
        />
        <FeatureCard
          icon={Globe}
          title="Open-Core"
          description="The core platform is free and open source under Apache 2.0. Enterprise features — RBAC, audit logs, SSO, and SLA-backed uptime — are available with a license."
        />
      </div>

      {/* Who It's For */}
      <SectionHeading>Who It&apos;s For</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals is built for engineering teams that value speed, reliability, and clean
        code:
      </p>
      <ul className="space-y-3 mb-6">
        {[
          {
            icon: Users,
            title: "Startups & Scale-ups",
            desc: "Move fast without breaking things. Toggle features, run experiments, and clean up flags before they pile up.",
          },
          {
            icon: Shield,
            title: "Mid-Market Teams",
            desc: "RBAC, audit logs, and SLA-backed reliability. The control plane grows with your team and your compliance needs.",
          },
          {
            icon: Rocket,
            title: "Enterprises",
            desc: "Self-host or dedicated cloud. SSO, SCIM, custom roles, and dedicated support. FeatureSignals meets you where you are.",
          },
        ].map((item) => (
          <li key={item.title} className="flex items-start gap-3">
            <item.icon
              size={18}
              className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                {item.title}
              </p>
              <p className="text-sm text-[var(--signal-fg-secondary)]">{item.desc}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Quick Links */}
      <SectionHeading>Quick Links</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Getting Started — Install and create your first flag", href: "/docs/getting-started/quickstart" },
          { label: "Core Concepts — Feature flags, targeting, segments, and more", href: "/docs/core-concepts/feature-flags" },
          { label: "SDKs — Integrate with your stack", href: "/docs/sdks" },
          { label: "Architecture — How FeatureSignals works under the hood", href: "/docs/architecture/overview" },
        ].map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRight size={14} />
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]">
      <div className="flex items-start gap-3">
        <Icon size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
            {title}
          </p>
          <p className="text-sm text-[var(--signal-fg-secondary)]">{description}</p>
        </div>
      </div>
    </div>
  );
}
