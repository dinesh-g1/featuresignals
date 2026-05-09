import type { Metadata } from "next";
import Link from "next/link";
import { ToggleRight, FlaskConical, ShieldAlert, Percent, Beaker, Key, Sliders, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Implementation Patterns",
  description:
    "Common patterns for implementing feature flags in your application — basic toggles, canary releases, kill switches, gradual rollouts, A/B tests, permission flags, and config flags.",
};

interface Pattern {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  whenToUse: string;
}

const patterns: Pattern[] = [
  {
    icon: ToggleRight,
    title: "Basic Toggle",
    description:
      "The simplest pattern: wrap new code in a boolean flag check. Deploy the code with the flag OFF, then flip it ON when you're ready to release. If something goes wrong, turn the flag OFF — no rollback needed.",
    whenToUse:
      "Every new feature or code change that you want to decouple from deployment. Start here and graduate to more advanced patterns as needed.",
  },
  {
    icon: FlaskConical,
    title: "Canary Release",
    description:
      "Enable a feature for a small, specific subset of users first — internal employees, beta testers, or a single region. Monitor metrics and expand the audience gradually. This minimizes blast radius if something breaks.",
    whenToUse:
      "High-risk changes, infrastructure migrations, or any feature where you want early signals before a broad rollout.",
  },
  {
    icon: ShieldAlert,
    title: "Kill Switch",
    description:
      "An operational toggle that can immediately disable a subsystem or feature path. Kill switches are pre-deployed and tested — when a downstream dependency fails or a performance incident begins, you flip the switch instead of deploying a hotfix.",
    whenToUse:
      "Third-party API integrations, payment processing, search indexing, or any dependency that can fail outside your control. Use the ops toggle category.",
  },
  {
    icon: Percent,
    title: "Gradual Rollout",
    description:
      "Progressively increase the percentage of users who see a feature — 5% → 25% → 50% → 100%. FeatureSignals uses consistent hashing so the same user always gets the same experience during the rollout. Monitor error rates and latency at each step.",
    whenToUse:
      "Features where you want to validate performance and reliability under increasing load. Combine with monitoring dashboards and automated rollback triggers.",
  },
  {
    icon: Beaker,
    title: "A/B Testing Setup",
    description:
      "Split users into two or more variants to measure the impact of different feature implementations. Use the AB flag type to define variants with weights, track impression events, and analyze results in your analytics platform.",
    whenToUse:
      "When you have a hypothesis about user behavior and want data-driven decisions. Always define success metrics before starting the experiment. Use mutual exclusion groups if running multiple experiments.",
  },
  {
    icon: Key,
    title: "Permission Flags",
    description:
      "Gate access to features based on user attributes — plan tier, team, region, or custom properties. Permission flags typically use segment-based targeting: create a 'Premium Users' segment and target it to the premium-feature flag.",
    whenToUse:
      "Feature gating by pricing tier, beta features for specific customers, region-specific compliance requirements, or internal-only admin features.",
  },
  {
    icon: Sliders,
    title: "Config Flags",
    description:
      "Use string, number, or JSON flags to store operational configuration that can change at runtime — rate limits, feature parameters, UI themes, or algorithm thresholds. Config flags let you tune behavior without deploying code.",
    whenToUse:
      "Any operational parameter you might need to adjust in production without a full deploy cycle. Keep security-sensitive config in environment variables or a secrets manager.",
  },
];

export default function ImplementationPatternsPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Implementation Patterns
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Feature flags are a versatile tool. The same mechanism can serve many purposes — from
        simple on/off toggles to sophisticated A/B experiments. These patterns represent proven
        approaches that teams use to ship faster, safer, and smarter.
      </p>

      {/* Patterns */}
      {patterns.map((pattern, index) => (
        <section key={pattern.title} className={index > 0 ? "mt-10" : ""}>
          <SectionHeading>
            <pattern.icon size={20} className="text-[var(--signal-fg-accent)] inline mr-2 -mt-0.5" />
            {pattern.title}
          </SectionHeading>
          <p className="text-[var(--signal-fg-primary)] mb-3">{pattern.description}</p>
          <div className="p-3 rounded-md bg-[var(--signal-bg-accent-muted)] border border-[var(--signal-border-default)] mb-4">
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              <span className="font-semibold text-[var(--signal-fg-primary)]">When to use: </span>
              {pattern.whenToUse}
            </p>
          </div>
        </section>
      ))}

      {/* General Advice */}
      <SectionHeading>General Advice</SectionHeading>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Start simple.</strong> Use a basic boolean toggle. Graduate to gradual rollouts
          or A/B tests only when you need them.
        </li>
        <li>
          <strong>Set a category and expiration date.</strong> The{" "}
          <Link href="/docs/core-concepts/toggle-categories" className="text-[var(--signal-fg-accent)] hover:underline">
            toggle category
          </Link>{" "}
          sets lifecycle expectations. An expiration date prevents stale flags from accumulating.
        </li>
        <li>
          <strong>Clean up after rollout.</strong> Once a feature is at 100% and stable, remove
          the flag and the old code path. Every flag left behind is technical debt.
        </li>
        <li>
          <strong>Keep flags short-lived.</strong> The longer a flag exists, the more context is
          lost and the harder it becomes to remove safely.
        </li>
        <li>
          <strong>Use the right flag type.</strong> Boolean for on/off, string/number/JSON for
          config, AB for experiments. Don&apos;t abuse a boolean flag to carry configuration
          values.
        </li>
      </ul>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Feature Flags — Understanding flag types and structure", href: "/docs/core-concepts/feature-flags" },
          { label: "Toggle Categories — Release, experiment, ops, and permission", href: "/docs/core-concepts/toggle-categories" },
          { label: "Targeting & Segments — Control who sees what", href: "/docs/core-concepts/targeting-and-segments" },
          { label: "A/B Experimentation — Run data-driven experiments", href: "/docs/core-concepts/ab-experimentation" },
        ].map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRight size={14} />
              <span>{step.label}</span>
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
