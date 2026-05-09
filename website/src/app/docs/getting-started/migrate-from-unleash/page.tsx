import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeftRight,
  Download,
  FileCode,
  Upload,
  CheckCircle,
  AlertTriangle,
  Terminal,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Migrate from Unleash",
  description:
    "Step-by-step guide to migrate feature flags from Unleash to FeatureSignals. Export, transform, import, and validate with our automated migration engine.",
};

export default function MigrateFromUnleashPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Migrate from Unleash
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Moving from Unleash to FeatureSignals? This step-by-step guide walks you
        through exporting your Unleash feature toggles, transforming them to the
        FeatureSignals flag model, importing them, and validating parity — so
        you can switch with confidence.
      </p>

      {/* Prerequisites */}
      <SectionHeading>Prerequisites</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>A running Unleash instance with admin access</li>
        <li>
          A FeatureSignals account (Free tier is fine for migration testing)
        </li>
        <li>A FeatureSignals API key with admin scope</li>
        <li>
          The FeatureSignals CLI installed (
          <InlineCode>npm i -g @featuresignals/cli</InlineCode>)
        </li>
      </ul>

      {/* Step 1: Export */}
      <SectionHeading>Step 1: Export from Unleash</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Unleash provides an admin API for exporting feature toggles. Use the
        FeatureSignals migration CLI to automate the export:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4 font-mono text-sm text-[var(--signal-fg-primary)]">
        fs-migrate export unleash \ --url https://your-unleash-instance.com/api
        \ --token $UNLEASH_ADMIN_TOKEN \ --output ./unleash-export.json
      </div>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The export captures:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Feature toggles with their strategies and variants</li>
        <li>Activation strategies (gradual rollout, user IDs, IPs, etc.)</li>
        <li>Strategy constraints and segments</li>
        <li>Project and environment associations</li>
        <li>Toggle state (enabled/disabled per environment)</li>
      </ul>

      {/* Strategy Mapping */}
      <div className="p-4 mb-6 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <ArrowLeftRight
            size={18}
            className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Unleash Strategy → FeatureSignals Rule Mapping
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Unleash activation strategies map to FeatureSignals targeting
              rules. The migration engine handles these automatically:
            </p>
            <div className="mt-2 space-y-1 text-xs text-[var(--signal-fg-secondary)]">
              <p>
                <strong>default</strong> → Boolean flag with default serve value
              </p>
              <p>
                <strong>userWithId</strong> → Individual targeting (user ID
                list)
              </p>
              <p>
                <strong>gradualRolloutUserId</strong> → Percentage rollout
                (deterministic by user ID)
              </p>
              <p>
                <strong>gradualRolloutSessionId</strong> → Percentage rollout
                (deterministic by session)
              </p>
              <p>
                <strong>remoteAddress</strong> → IP-based targeting rule
              </p>
              <p>
                <strong>flexibleRollout</strong> → Percentage rollout with
                stickiness
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Transform */}
      <SectionHeading>Step 2: Transform for FeatureSignals</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The migration engine analyzes your exported data and generates a preview
        report before writing anything:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4 font-mono text-sm text-[var(--signal-fg-primary)]">
        fs-migrate transform unleash \ --input ./unleash-export.json \ --project
        my-project \ --preview
      </div>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The preview report shows:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Number of feature toggles that will be created</li>
        <li>Strategy-to-rule mappings with rationale</li>
        <li>Any unsupported strategies that need manual migration</li>
        <li>
          Variant mappings (Unleash variants → FeatureSignals AB flag type)
        </li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Unleash-Specific Considerations
      </h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Custom activation strategies:</strong> Custom strategies are
          flagged for manual review. You&apos;ll need to reimplement them as
          FeatureSignals targeting rules.
        </li>
        <li>
          <strong>Segments (Unleash 4.x):</strong> Unleash segments map to
          FeatureSignals segments. Constraints with IN/NOT_IN operators are
          translated directly.
        </li>
        <li>
          <strong>Impression data:</strong> Unleash impression events don&apos;t
          have a direct equivalent. Consider the FeatureSignals evaluation
          reason feature for debugging.
        </li>
        <li>
          <strong>Stickiness:</strong> FeatureSignals uses deterministic hashing
          (MurmurHash3) for consistent percentage rollouts. The same user ID
          will consistently resolve to the same bucket.
        </li>
      </ul>

      {/* Step 3: Import */}
      <SectionHeading>Step 3: Import to FeatureSignals</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Once you&apos;re satisfied with the preview, run the import:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4 font-mono text-sm text-[var(--signal-fg-primary)]">
        fs-migrate import \ --input ./unleash-transformed.json \ --api-key
        $FS_API_KEY \ --env staging
      </div>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The import is transactional — if any flag fails, the entire batch is
        rolled back. Always import to a staging or test environment first.
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Import to a non-production environment first</li>
        <li>Verify flags appear correctly in the Flag Engine dashboard</li>
        <li>Test evaluations match expected Unleash behavior</li>
        <li>Review targeting rules for accuracy</li>
      </ul>

      {/* Step 4: SDK Migration */}
      <SectionHeading>Step 4: Migrate Your SDK</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Unleash and FeatureSignals both support OpenFeature, making SDK
        migration straightforward. Replace the Unleash provider with the
        FeatureSignals provider:
      </p>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Node.js Example
      </h3>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-6 font-mono text-sm text-[var(--signal-fg-primary)]">
        {`// Before (Unleash)
const unleash = require('unleash-client');
unleash.initialize({ url, appName, instanceId });

// After (FeatureSignals with OpenFeature)
const { FeatureSignalsProvider } = require('@featuresignals/openfeature');
OpenFeature.setProvider(new FeatureSignalsProvider({
  apiKey: process.env.FS_API_KEY,
}));
const client = OpenFeature.getClient();`}
      </div>

      {/* Step 5: Validate */}
      <SectionHeading>Step 5: Validate Parity</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Run the parity checker to confirm flags evaluate identically in both
        systems:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4 font-mono text-sm text-[var(--signal-fg-primary)]">
        fs-migrate validate \ --source unleash \ --source-config
        ./unleash-config.json \ --target featuresignals \ --target-config
        ./fs-config.json \ --sample-size 1000
      </div>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        The validator evaluates each flag in both systems with 1,000 random user
        contexts and reports any discrepancies with the specific flag, context,
        and expected vs. actual value.
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          {
            label: "Migration Overview",
            href: "/docs/getting-started/migration-overview",
          },
          {
            label: "Migration IaC Export",
            href: "/docs/getting-started/migration-iac-export",
          },
          {
            label: "Migration Troubleshooting",
            href: "/docs/getting-started/migration-troubleshooting",
          },
          { label: "SDK Documentation", href: "/docs/sdks" },
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
