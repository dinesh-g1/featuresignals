import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Migration Overview", description: "Migrate your feature flags from LaunchDarkly, Unleash, or Flagsmith to FeatureSignals." };

export default function MigrationPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Migration Overview</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">FeatureSignals provides a built-in migration system that lets you import feature flags, environments, segments, and targeting rules from other feature flag platforms.</p>

      <SectionHeading>Supported Providers</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Provider</Th><Th>Flags</Th><Th>Environments</Th><Th>Segments</Th></tr></thead>
        <tbody>
          <Tr><Td><strong>LaunchDarkly</strong></Td><Td>✅</Td><Td>✅</Td><Td>✅ Partial</Td></Tr>
          <Tr><Td><strong>Unleash</strong></Td><Td>✅</Td><Td>✅</Td><Td>✅</Td></Tr>
          <Tr><Td><strong>Flagsmith</strong></Td><Td>✅</Td><Td>✅</Td><Td>✅</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Prerequisites</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>FeatureSignals installed and running</li>
        <li>Admin access (owner or admin role)</li>
        <li>API credentials for your source provider</li>
        <li>A target project in FeatureSignals</li>
      </ul>

      <SectionHeading>Migration Workflow</SectionHeading>
      <CodeBlock language="bash" code={`# Step 1: Discover providers
curl -X POST https://api.featuresignals.com/v1/migration/providers \\
  -H "Authorization: Bearer YOUR_JWT"

# Step 2: Validate connection
curl -X POST https://api.featuresignals.com/v1/migration/connect \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -d '{"provider": "launchdarkly", "api_key": "api-xxxxx", "project_key": "my-project"}'

# Step 3: Analyze source (dry-run)
curl -X POST https://api.featuresignals.com/v1/migration/analyze \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -d '{"provider": "launchdarkly", "api_key": "api-xxxxx", "target_project_id": "proj_abc123"}'

# Step 4: Execute migration
curl -X POST https://api.featuresignals.com/v1/migration/execute \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -d '{"provider": "launchdarkly", "api_key": "api-xxxxx", "target_project_id": "proj_abc123"}'`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Self-Hosting Guide", href: "/docs/deployment/self-hosting" }, { label: "Configuration", href: "/docs/deployment/configuration" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"><ArrowRightIcon size={14} /><span>{step.label}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) { return <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">{children}</h2>; }
function InlineCode({ children }: { children: React.ReactNode }) { return <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">{children}</code>; }
function SimpleTable({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6"><table className="w-full text-sm text-left">{children}</table></div>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">{children}</th>; }
function Tr({ children }: { children: React.ReactNode }) { return <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">{children}</tr>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>; }
