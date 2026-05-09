import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import Steps, { Step } from "@/components/docs/Steps";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Migrate from Flagsmith",
  description:
    "Step-by-step guide to migrate feature flags from Flagsmith to FeatureSignals — export, transform, import, validate, and cut over your SDKs.",
};

export default function MigrateFromFlagsmithPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Migrate from Flagsmith
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Follow this step-by-step guide to migrate your feature flags from Flagsmith to
        FeatureSignals. The process mirrors the standard migration workflow — export,
        transform, import, validate, and cut over.
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
              set up, and a Flagsmith API key with read access. See{" "}
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
        <Step title="1. Export flags from Flagsmith">
          <p className="mb-3">
            Use the FeatureSignals migration CLI to export all flags, segments, and
            environments from Flagsmith. The CLI uses the Flagsmith REST API to pull a
            complete snapshot.
          </p>
          <CodeBlock
            language="bash"
            code={`# Install the FeatureSignals migration CLI
npm install -g @featuresignals/migration-cli

# Export all flags from Flagsmith
fs-migrate export flagsmith \\
  --api-key "$FLAGSMITH_API_KEY" \\
  --base-url "https://api.flagsmith.com" \\
  --output ./flagsmith-export.json`}
          />
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-3">
            The export includes standard flags, multivariate flags, segments, identities,
            and environment-specific overrides. Traits and identity overrides are preserved
            for mapping during the transform step.
          </p>
        </Step>

        <Step title="2. Transform flags to FeatureSignals format">
          <p className="mb-3">
            Transform the Flagsmith export to the FeatureSignals flag model. The migration
            engine handles:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-3">
            <li>Standard flags → <InlineCode>boolean</InlineCode> flag type</li>
            <li>Multivariate flags → <InlineCode>ab</InlineCode> flag type with variants</li>
            <li>Segments → FeatureSignals segments with rule conditions</li>
            <li>Identity overrides → Individual targeting rules</li>
            <li>Environment-specific values → Per-environment flag state</li>
            <li>Feature-specific values → <InlineCode>string</InlineCode>, <InlineCode>number</InlineCode>, or <InlineCode>json</InlineCode> flags</li>
          </ul>
          <CodeBlock
            language="bash"
            code={`# Transform the Flagsmith export to FeatureSignals format
fs-migrate transform flagsmith \\
  --input ./flagsmith-export.json \\
  --output ./fs-import.json \\
  --project-id "$FS_PROJECT_ID" \\
  --environment-mapping "production:prod,development:dev"`}
          />
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-3">
            Review the preview report. Pay special attention to flags that map to
            non-boolean types — Flagsmith&apos;s feature-specific values become separate
            configuration flags in FeatureSignals.
          </p>
        </Step>

        <Step title="3. Import flags to FeatureSignals">
          <p className="mb-3">
            Import the transformed flags into your FeatureSignals project. Import to a
            staging or development environment first to validate without affecting production
            traffic.
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
              Flagsmith remote config values (non-boolean flags) are imported as string,
              number, or JSON flag types. Verify the type mapping in the preview report
              before importing.
            </p>
          </div>
        </Step>

        <Step title="4. Validate parity between platforms">
          <p className="mb-3">
            Run parity checks to ensure flag evaluations produce consistent results. The
            validator evaluates each flag in both Flagsmith and FeatureSignals across a
            sample of user contexts.
          </p>
          <CodeBlock
            language="bash"
            code={`# Validate evaluation parity
fs-migrate validate \\
  --source flagsmith \\
  --source-api-key "$FLAGSMITH_API_KEY" \\
  --target featuresignals \\
  --target-api-key "$FS_API_KEY" \\
  --sample-size 100`}
          />
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-3">
            Any discrepancies are reported with the specific flag, user context, and
            expected vs. actual value. Resolve mismatches before proceeding to cutover.
          </p>
        </Step>

        <Step title="5. Cut over your SDKs">
          <p className="mb-3">
            Switch your SDK initialization from Flagsmith to FeatureSignals. If your
            application uses the Flagsmith JavaScript or React SDK directly:
          </p>
          <CodeBlock
            language="typescript"
            code={`// Before: Flagsmith client
import flagsmith from 'flagsmith';

await flagsmith.init({
  environmentID: 'env_flagsmith_key',
});

const isEnabled = flagsmith.hasFeature('my-feature');

// After: FeatureSignals OpenFeature provider
import { FeatureSignalsProvider } from '@featuresignals/openfeature-web';

await OpenFeature.setProviderAndWait(new FeatureSignalsProvider({
  environmentKey: 'env_your_key_here',
}));

const client = OpenFeature.getClient();
const isEnabled = await client.getBooleanValue('my-feature', false, {
  targetKey: user.id,
});`}
          />
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-3">
            For server-side Flagsmith SDKs (Python, Node.js, Java, Go, etc.), see the{" "}
            <Link href="/docs/sdks" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
              SDK documentation
            </Link>{" "}
            for language-specific migration examples. Keep Flagsmith as read-only for a
            week after cutover, then decommission.
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
          { label: "Migrate from LaunchDarkly — Another migration path", href: "/docs/getting-started/migrate-from-launchdarkly" },
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
