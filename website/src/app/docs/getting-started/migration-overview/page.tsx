import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeftRight, Download, Upload, FileCode, CheckCircle, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Migration Overview",
  description:
    "Migrate from LaunchDarkly, Flagsmith, or Unleash to FeatureSignals with our automated migration engine. Export, transform, import, and validate your feature flags.",
};

export default function MigrationOverviewPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Migration Overview
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Moving from another feature flag platform? FeatureSignals provides an automated migration
        engine that exports your flags, transforms them to the FeatureSignals model, imports
        them, and validates parity — so you can switch with confidence.
      </p>

      {/* Supported Platforms */}
      <SectionHeading>Supported Platforms</SectionHeading>
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {[
          {
            name: "LaunchDarkly",
            href: "/docs/getting-started/migrate-from-launchdarkly",
          },
          {
            name: "Flagsmith",
            href: "/docs/getting-started/migrate-from-flagsmith",
          },
          {
            name: "Unleash",
            href: "/docs/getting-started/migrate-from-unleash",
          },
        ].map((platform) => (
          <Link
            key={platform.name}
            href={platform.href}
            className="flex items-center gap-2 p-3 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] hover:border-[var(--signal-fg-accent)] transition-colors text-sm font-medium"
          >
            <ArrowLeftRight size={16} className="text-[var(--signal-fg-accent)] shrink-0" />
            {platform.name} → FeatureSignals
          </Link>
        ))}
      </div>

      {/* Migration Process */}
      <SectionHeading>The Migration Process</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Every migration follows the same four-phase process:
      </p>

      <div className="space-y-4 mb-8">
        {[
          {
            step: 1,
            icon: Download,
            title: "Export",
            description:
              "Use your current platform's API or export tool to pull a complete snapshot of your feature flags. The migration engine supports JSON, CSV, and platform-specific export formats. You'll get flag keys, types, targeting rules, segments, environments, and rollout configurations.",
          },
          {
            step: 2,
            icon: FileCode,
            title: "Transform",
            description:
              "The migration engine maps your exported data to the FeatureSignals flag model. It handles type conversions (e.g., multivariate flags → AB flag type), targeting rule translation, segment mapping, and default value normalization. A preview report shows what will be created, updated, or skipped before any write occurs.",
          },
          {
            step: 3,
            icon: Upload,
            title: "Import",
            description:
              "The transformed flags are created in your FeatureSignals project. The import is transactional — if any flag creation fails, the entire batch is rolled back. You can import to a staging or test environment first to validate without affecting production traffic.",
          },
          {
            step: 4,
            icon: CheckCircle,
            title: "Validate",
            description:
              "Run parity checks to confirm that flag evaluations produce the same results in both platforms. The validation engine evaluates each flag in both systems with a sample of user contexts and compares the results. Any discrepancies are reported with the specific flag, context, and expected vs. actual value.",
          },
        ].map((phase) => (
          <div
            key={phase.step}
            className="flex items-start gap-4 p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold select-none"
              style={{
                backgroundColor: "var(--signal-bg-accent-emphasis)",
                color: "var(--signal-fg-on-emphasis)",
              }}
              aria-hidden="true"
            >
              {phase.step}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <phase.icon size={16} className="text-[var(--signal-fg-accent)]" />
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  {phase.title}
                </p>
              </div>
              <p className="text-sm text-[var(--signal-fg-secondary)]">
                {phase.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Cutover Strategy */}
      <SectionHeading>Cutover Strategy</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Once your flags are imported and validated, you&apos;ll cut over your SDKs. The
        recommended approach:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Dual-write (optional).</strong> During a transition period, update flags in
          both platforms simultaneously. This gives you a safety net while you validate the new
          setup.
        </li>
        <li>
          <strong>Cut over non-critical environments first.</strong> Switch your dev and staging
          environments to FeatureSignals. Monitor for a few days.
        </li>
        <li>
          <strong>Canary production traffic.</strong> Route a percentage of production traffic
          to FeatureSignals SDKs. Compare evaluation results.
        </li>
        <li>
          <strong>Full cutover.</strong> Switch all traffic to FeatureSignals. Keep the old
          platform as read-only for a week as a fallback.
        </li>
        <li>
          <strong>Deprovision old platform.</strong> Export a final backup, then decomission
          the old platform.
        </li>
      </ol>

      {/* Important Callout */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Globe size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              SDK migration is straightforward
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Because FeatureSignals SDKs are OpenFeature-native, migrating your code is often
              as simple as swapping the provider. The OpenFeature API is{" "}
              <InlineCode>client.getBooleanValue(flagKey, defaultValue, context)</InlineCode>{" "}
              regardless of which platform is behind it. See{" "}
              <Link href="/docs/sdks" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
                SDK documentation
              </Link>{" "}
              for language-specific examples.
            </p>
          </div>
        </div>
      </div>

      {/* Platform-Specific Guides */}
      <SectionHeading>Platform-Specific Migration Guides</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Migrate from LaunchDarkly — Step-by-step guide", href: "/docs/getting-started/migrate-from-launchdarkly" },
          { label: "Migrate from Flagsmith — Step-by-step guide", href: "/docs/getting-started/migrate-from-flagsmith" },
          { label: "Migrate from Unleash — Step-by-step guide", href: "/docs/getting-started/migrate-from-unleash" },
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

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}
