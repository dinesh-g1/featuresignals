import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Wrench,
  Search,
  RefreshCw,
  HelpCircle,
  FileCode,
  Terminal,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Migration Troubleshooting",
  description:
    "Troubleshoot common issues when migrating feature flags to FeatureSignals — export errors, transform failures, import validation, and parity discrepancies.",
};

export default function MigrationTroubleshootingPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Migration Troubleshooting
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Migration from another feature flag platform is designed to be smooth,
        but every platform has its quirks. This guide covers the most common
        issues you might encounter during export, transform, import, and
        validation — with specific fixes for LaunchDarkly, Flagsmith, and
        Unleash migrations.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <HelpCircle
            size={18}
            className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Need Help?
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              If you&apos;re stuck on a migration issue not covered here, reach
              out to{" "}
              <a
                href="mailto:support@featuresignals.com"
                className="text-[var(--signal-fg-accent)] hover:underline font-medium"
              >
                support@featuresignals.com
              </a>{" "}
              with your migration log and we&apos;ll help you get unblocked.
              Include the output of <InlineCode>fs-migrate diagnose</InlineCode>{" "}
              for faster resolution.
            </p>
          </div>
        </div>
      </div>

      {/* Export Issues */}
      <SectionHeading>Export Issues</SectionHeading>

      <IssueBlock
        title="&ldquo;Authentication failed&rdquo; during export"
        cause="Invalid or expired API token, insufficient permissions, or network connectivity issues."
        fix={[
          "Verify your API token is still valid and hasn&apos;t expired",
          "Ensure the token has admin-level read access (required for full export)",
          "Check that your source platform&apos;s API URL is correct and reachable",
          "LaunchDarkly: use a server-side SDK key or a read-only API token with all projects access",
          "Flagsmith: use an admin API key (not a regular API key)",
          "Unleash: use an admin token with &lsquo;Client API&rsquo; and &lsquo;Admin API&rsquo; access",
        ]}
      />

      <IssueBlock
        title="Export times out for large flag counts"
        cause="Exporting hundreds or thousands of flags can exceed default timeouts."
        fix={[
          "Increase the timeout: <InlineCode>--timeout 300</InlineCode> (5 minutes)",
          "Export flags per project instead of all at once: <InlineCode>--project my-project</InlineCode>",
          "Use the <InlineCode>--concurrency</InlineCode> flag to parallelize: <InlineCode>--concurrency 5</InlineCode>",
          "For LaunchDarkly: projects with 500+ flags may need pagination tuning — add <InlineCode>--page-size 100</InlineCode>",
        ]}
      />

      <IssueBlock
        title="Export produces empty or incomplete output"
        cause="The source platform may have flags in a state that the exporter doesn't handle by default."
        fix={[
          "Check that flags are in active projects/environments (archived/deleted flags are excluded by default)",
          "Use <InlineCode>--include-archived</InlineCode> to export archived flags",
          "Verify the export file isn&apos;t empty: <InlineCode>cat export.json | jq &apos;.flags | length&apos;</InlineCode>",
          "Run <InlineCode>fs-migrate diagnose</InlineCode> to check connectivity and permissions",
        ]}
      />

      {/* Transform Issues */}
      <SectionHeading>Transform Issues</SectionHeading>

      <IssueBlock
        title="&ldquo;Unsupported rule type&rdquo; warnings"
        cause="The source platform uses targeting rules or operators that don't have a direct FeatureSignals equivalent."
        fix={[
          "Review the preview report to see exactly which rules couldn&apos;t be auto-mapped",
          "LaunchDarkly: custom rule operators (semver, date comparison) need manual conversion to context attributes with value comparison",
          "Flagsmith: multivariate flags with 3+ variations may need AB flag type or a custom strategy",
          "Unleash: custom activation strategies need to be reimplemented as FeatureSignals targeting rules",
          "Use <InlineCode>--skip-unsupported</InlineCode> to skip problematic flags and handle them separately",
          "Use <InlineCode>--warn-only</InlineCode> to generate a detailed report without aborting the transform",
        ]}
      />

      <IssueBlock
        title="Segment/prerequisite mapping is incorrect"
        cause="Cross-flag dependencies and segment references are platform-specific and may not map cleanly."
        fix={[
          "LaunchDarkly: prerequisite flags are imported as separate flags — you&apos;ll need to recreate the prerequisite relationship manually in FeatureSignals",
          "Flagsmith: segments are imported as FeatureSignals segments with the same name. Verify the segment conditions match.",
          "Unleash: segments with complex constraint logic may need manual adjustment. Review each segment in the preview.",
          "After import, validate segment-based targeting by testing with users that should and shouldn&apos;t match",
        ]}
      />

      <IssueBlock
        title="Boolean flag becomes a percentage rollout"
        cause="A simple on/off flag in the source platform has an implicit or default rule that the exporter interprets as a targeting rule."
        fix={[
          "This is usually correct behavior — the flag had targeting in the source platform",
          "If you want a pure boolean flag with no rules, edit the transformed JSON before importing: set the rule array to empty",
          "After import, you can remove rules via the Flag Engine dashboard or via IaC",
        ]}
      />

      {/* Import Issues */}
      <SectionHeading>Import Issues</SectionHeading>

      <IssueBlock
        title="Import fails with &ldquo;transaction rolled back&rdquo;"
        cause="One or more flags in the batch failed validation, causing the entire transaction to roll back."
        fix={[
          "Check the error log for the specific flag and validation error that caused the failure",
          "Common causes: flag key too long, invalid characters in flag key, duplicate flag key, missing required fields",
          "Fix the problematic flag in the transformed JSON and retry",
          "Use <InlineCode>--continue-on-error</InlineCode> to import valid flags and skip failures (not recommended for production)",
          "Validate the transformed JSON before import: <InlineCode>fs-migrate validate --input transformed.json</InlineCode>",
        ]}
      />

      <IssueBlock
        title="&ldquo;Rate limit exceeded&rdquo; during import"
        cause="Too many API calls in a short period."
        fix={[
          "Reduce import concurrency: <InlineCode>--concurrency 1</InlineCode>",
          "Add a delay between requests: <InlineCode>--delay 200</InlineCode> (milliseconds)",
          "Split the import into smaller batches by project or environment",
          "Management API rate limit is 100 requests/minute — adjust your import speed accordingly",
        ]}
      />

      {/* Validation Issues */}
      <SectionHeading>Validation &amp; Parity Issues</SectionHeading>

      <IssueBlock
        title="Flag evaluates differently in FeatureSignals"
        cause="Subtle differences in how targeting rules, rollout percentages, or default values are applied between platforms."
        fix={[
          "Check the specific flag and context in the parity report",
          "Verify the default value matches — FeatureSignals returns the default when no rules match",
          "Check rollout stickiness: both platforms should use the same attribute (e.g., user_id) for consistent bucketing",
          "Verify user context attributes: FeatureSignals uses flat key-value context; nested objects may need flattening",
          "Re-run validation with a larger sample: <InlineCode>--sample-size 5000</InlineCode>",
          "For percentage rollouts, run validation multiple times to distinguish between random variance and real discrepancies",
        ]}
      />

      <IssueBlock
        title="Flag works in staging but not production"
        cause="Different environment configurations between the two platforms."
        fix={[
          "Check that the environment key mapping is correct in your migration config",
          "Verify that you imported to the correct target environment",
          "Ensure production-specific targeting rules were preserved during export",
          "Compare environment configurations: <InlineCode>fs-migrate diff-env --source-config source.json --target-config target.json</InlineCode>",
        ]}
      />

      <IssueBlock
        title="SDK returns stale values after migration"
        cause="Cached flag values from the old platform are still being served."
        fix={[
          "Clear the FeatureSignals SDK cache: restart your application or call the cache invalidation method",
          "Verify your SDK is connecting to FeatureSignals (not the old platform): check the base URL configuration",
          "Wait for the old platform&apos;s DNS/TTL to expire if using the same hostname",
          "Use the OpenFeature provider&apos;s <InlineCode>onContextChange</InlineCode> to force a refresh",
          "Monitor evaluation traffic to confirm SDKs are hitting FeatureSignals endpoints",
        ]}
      />

      {/* Diagnostic Command */}
      <SectionHeading>Diagnostic Command</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When troubleshooting any migration issue, start with the diagnostic
        command. It checks connectivity, permissions, and configuration for both
        source and target platforms:
      </p>
      <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] mb-4 font-mono text-sm text-[var(--signal-fg-primary)]">
        fs-migrate diagnose \ --source unleash \ --source-config
        ./unleash-config.json \ --target featuresignals \ --target-config
        ./fs-config.json
      </div>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        The diagnostic report includes:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Source and target connectivity status</li>
        <li>Authentication/permission verification</li>
        <li>Flag and segment count on each platform</li>
        <li>API rate limit status</li>
        <li>Configuration validation</li>
      </ul>

      {/* Common Fixes Quick Reference */}
      <SectionHeading>Common Fixes Quick Reference</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Symptom</Th>
            <Th>Likely Fix</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>401 Unauthorized</Td>
            <Td>
              Verify API token permissions, check token hasn&apos;t expired
            </Td>
          </Tr>
          <Tr>
            <Td>403 Forbidden</Td>
            <Td>
              Token needs admin scope, not read-only; check project access
            </Td>
          </Tr>
          <Tr>
            <Td>429 Too Many Requests</Td>
            <Td>Reduce concurrency, add delay between calls</Td>
          </Tr>
          <Tr>
            <Td>Connection timeout</Td>
            <Td>Check network connectivity, increase timeout, verify URL</Td>
          </Tr>
          <Tr>
            <Td>Validation errors</Td>
            <Td>
              Check flag key format (alphanumeric + hyphens), fix in transformed
              JSON
            </Td>
          </Tr>
          <Tr>
            <Td>Missing flags post-import</Td>
            <Td>
              Archived flags excluded by default — use{" "}
              <InlineCode>--include-archived</InlineCode>
            </Td>
          </Tr>
          <Tr>
            <Td>Parity check fails</Td>
            <Td>
              Verify default values, context attributes, and stickiness
              configuration
            </Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          {
            label: "Migration Overview",
            href: "/docs/getting-started/migration-overview",
          },
          {
            label: "Migrate from LaunchDarkly",
            href: "/docs/getting-started/migrate-from-launchdarkly",
          },
          {
            label: "Migrate from Flagsmith",
            href: "/docs/getting-started/migrate-from-flagsmith",
          },
          {
            label: "Migrate from Unleash",
            href: "/docs/getting-started/migrate-from-unleash",
          },
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
/*  Issue Block Helper                                                 */
/* ------------------------------------------------------------------ */

function IssueBlock({
  title,
  cause,
  fix,
}: {
  title: string;
  cause: string;
  fix: string[];
}) {
  return (
    <div className="mb-6 p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle
          size={16}
          className="text-[var(--signal-fg-warning)] mt-0.5 shrink-0"
        />
        <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
          {title}
        </p>
      </div>
      <div className="ml-7 space-y-2">
        <div>
          <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wide mb-1">
            Cause
          </p>
          <p className="text-sm text-[var(--signal-fg-secondary)]">{cause}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wide mb-1">
            Fix
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {fix.map((item) => (
              <li
                key={item}
                className="text-sm text-[var(--signal-fg-primary)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
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

function SimpleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">
      {children}
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>
  );
}
