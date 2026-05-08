import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Projects & Environments",
  description: "Understand how FeatureSignals organizes flags into projects and environments for multi-stage deployment workflows.",
};

export default function ProjectsEnvironmentsPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">
        Projects & Environments
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals organizes feature flags into <strong>projects</strong> and <strong>environments</strong>, mirroring how most teams structure their applications.
      </p>

      <SectionHeading>Projects</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">A project represents a single application or service. Each project has its own set of flags, environments, and segments.</p>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.featuresignals.com/v1/projects \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Mobile App", "slug": "mobile-app"}'`}
      />

      <SectionHeading>Environments</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Environments represent deployment stages. Default environments created on registration:</p>
      <SimpleTable>
        <thead>
          <tr><Th>Environment</Th><Th>Slug</Th><Th>Color</Th></tr>
        </thead>
        <tbody>
          <Tr><Td>Development</Td><Td><InlineCode>dev</InlineCode></Td><Td><span className="inline-block w-3 h-3 rounded-full bg-green-500" /></Td></Tr>
          <Tr><Td>Staging</Td><Td><InlineCode>staging</InlineCode></Td><Td><span className="inline-block w-3 h-3 rounded-full bg-amber-500" /></Td></Tr>
          <Tr><Td>Production</Td><Td><InlineCode>production</InlineCode></Td><Td><span className="inline-block w-3 h-3 rounded-full bg-red-500" /></Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Per-Environment Flag States</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">The same flag can be:</p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li><strong>ON</strong> in <InlineCode>dev</InlineCode> with a 100% rollout</li>
        <li><strong>ON</strong> in <InlineCode>staging</InlineCode> with 50% rollout for testing</li>
        <li><strong>OFF</strong> in <InlineCode>production</InlineCode> (not yet released)</li>
      </ul>

      <SectionHeading>API Keys</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Each environment has its own API keys. There are two types:</p>
      <SimpleTable>
        <thead>
          <tr><Th>Type</Th><Th>Prefix</Th><Th>Use Case</Th></tr>
        </thead>
        <tbody>
          <Tr><Td>Server</Td><Td><InlineCode>fs_srv_</InlineCode></Td><Td>Backend services (full evaluation)</Td></Tr>
          <Tr><Td>Client</Td><Td><InlineCode>fs_cli_</InlineCode></Td><Td>Frontend/mobile apps (read-only flag values)</Td></Tr>
        </tbody>
      </SimpleTable>
      <div className="p-4 mb-6 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)]">
        <p className="text-sm text-[var(--signal-fg-primary)]"><strong>Caution:</strong> The full API key is shown <strong>only once</strong> in the response. Store it securely.</p>
      </div>

      <SectionHeading>Flag Promotion</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Promote flag configurations from one environment to another:</p>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/promote \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"source_env_id": "dev-env-id", "target_env_id": "staging-env-id"}'`}
      />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">Promotion copies the enabled state, default value, targeting rules, and percentage rollout from the source to the target environment.</p>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Targeting & Segments", href: "/docs/core-concepts/targeting-and-segments" },
          { label: "Feature Flags", href: "/docs/core-concepts/feature-flags" },
          { label: "Configuration", href: "/docs/deployment/configuration" },
        ].map((step) => (
          <li key={step.href}>
            <Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium">
              <ArrowRightIcon size={14} />
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">{children}</h2>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">{children}</code>;
}

function SimpleTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6"><table className="w-full text-sm text-left">{children}</table></div>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">{children}</th>;
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">{children}</tr>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>;
}
