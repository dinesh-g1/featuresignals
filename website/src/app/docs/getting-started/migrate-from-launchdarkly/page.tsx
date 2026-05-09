import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import Steps, { Step } from "@/components/docs/Steps";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Migrate from LaunchDarkly",
  description:
    "Step-by-step guide to migrate feature flags from LaunchDarkly to FeatureSignals — export, transform, import, validate, and cut over your SDKs.",
};

export default function MigrateFromLaunchDarklyPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Migrate from LaunchDarkly
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Follow this step-by-step guide to migrate your feature flags from LaunchDarkly to
        FeatureSignals. The process takes most teams under an hour. You can run the import
        against a staging environment first to validate without risk.
      </p>

      {/* Callout */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <CheckCircle size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Before you start
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Make sure you have an active FeatureSignals account, a project and environment
              set up, and a LaunchDarkly API access token with read access. See{" "}
              <Link
                href="/docs/getting-started/quickstart"
                className="text-[var(--signal-fg-accent)] hover:underline font-medium"
              >
                Quickstart
              </Link>{" "}
              if you haven&apos;t created your first project yet.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <Steps>
        <Step title="1. Export flags from LaunchDarkly">
          <p className="mb-3">
            Use the FeatureSignals migration CLI to pull a complete flag snapshot from
            LaunchDarkly. The CLI uses the LaunchDarkly REST API to export all flags, segments,
            and environments.
          </p>
          <CodeBlock
            language="bash"
            code={`# Install the FeatureSignals migration CLI
npm install -g @featuresignals/migration-cli

# Export all flags from LaunchDarkly
fs-migrate export launchdarkly \\
  --api-token "$LD_API_TOKEN" \\
  --project-key "my-project" \\
  --output ./ld-export.json`}
          />
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-3">
            The export file contains all boolean flags, multivariate flags, targeting rules,
            segments, and rollout configurations. The CLI preserves the LaunchDarkly project
            and environment structure for mapping in the next step.
          </p>
        </Step>

        <Step title="2. Transform flags to FeatureSignals format">
          <p className="mb-3">
            Run the transform command to map LaunchDarkly entities to FeatureSignals equivalents.
            The migration engine handles:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-3">
            <li>Boolean flags → <InlineCode>boolean</InlineCode> flag type</li>
            <li>Multivariate flags → <InlineCode>ab</InlineCode> flag type with variants</li>
            <li>Targeting rules → FeatureSignals targeting rules</li>
            <li>Segments → FeatureSignals segments</li>
            <li>Environments → FeatureSignals environments</li>
            <li>Percentage rollouts → FeatureSignals percentage rollout</li>
          </ul>
          <CodeBlock
            language="bash"
            code={`# Transform the LaunchDarkly export to FeatureSignals format
fs-migrate transform launchdarkly \\
  --input ./ld-export.json \\
  --output ./fs-import.json \\
  --project-id "$FS_PROJECT_ID" \\
  --environment-mapping "production:prod,staging:staging,development:dev"`}
          />
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-3">
            A preview report is generated showing flags that will be created, updated, or
            skipped. Review this report carefully before importing.
          </p>
        </Step>

        <Step title="3. Import flags to FeatureSignals">
          <p className="mb-3">
            Import the transformed flags into your FeatureSignals project. The import is
            transactional — if any flag creation fails, the entire batch is rolled back.
          </p>
          <CodeBlock
            language="bash"
            code={`# Import to FeatureSignals (staging environment first)
fs-migrate import \\
  --input ./fs-import.json \\
  --api-key "$FS_API_KEY" \\
  --base-url "https://api.featuresignals.com" \\
  --target-environment "staging"`}
          />
          <div className="p-3 mt-3 rounded-md bg-[var(--signal-bg-accent-muted)] border border-[var(--signal-border-default)]">
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              <span className="font-semibold text-[var(--signal-fg-primary)]">Tip: </span>
              Import to staging first. Validate everything looks correct, then run the import
              again targeting your production environment.
            </p>
          </div>
        </Step>

        <Step title="4. Validate parity between platforms">
          <p className="mb-3">
            Run the validation engine to confirm flag evaluations produce identical results in
            both LaunchDarkly and FeatureSignals. The validator evaluates each flag with a
            representative sample of user contexts and compares the results.
          </p>
          <CodeBlock
            language="bash"
            code={`# Validate evaluation parity
fs-migrate validate \\
  --source launchdarkly \\
  --source-api-token "$LD_API_TOKEN" \\
  --target featuresignals \\
  --target-api-key "$FS_API_KEY" \\
  --sample-size 100`}
          />
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-3">
            The validation report shows a pass/fail for each flag and a summary of any
            discrepancies. Address any mismatches before proceeding to the cutover.
          </p>
        </Step>

        <Step title="5. Cut over your SDKs">
          <p className="mb-3">
            With your flags imported and validated, switch your SDK initialization from
            LaunchDarkly to FeatureSignals. If you&apos;re using OpenFeature (recommended),
            this is a one-line change:
          </p>
          <CodeBlock
            language="typescript"
            code={`// Before: LaunchDarkly provider
OpenFeature.setProvider(new LaunchDarklyProvider({ clientSideID: '...' }));

// After: FeatureSignals provider
OpenFeature.setProvider(new FeatureSignalsProvider({
  environmentKey: 'env_your_key_here',
}));

// The rest of your flag evaluation code stays the same
const client = OpenFeature.getClient();
const myFlag = await client.getBooleanValue('my-flag', false, { targetKey: user.id });`}
          />
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-3">
            See the{" "}
            <Link href="/docs/sdks" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
              SDK documentation
            </Link>{" "}
            for language-specific initialization examples. After cutover, keep LaunchDarkly
            as read-only for a week as a safety net, then decommission.
          </p>
        </Step>
      </Steps>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "SDK Integration — Set up SDKs in your language", href: "/docs/sdks" },
          { label: "Create Your First Flag — Start fresh with FeatureSignals", href: "/docs/getting-started/create-your-first-flag" },
          { label: "Migration Overview — Compare migration paths", href: "/docs/getting-started/migration-overview" },
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
