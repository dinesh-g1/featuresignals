import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Create Your First Flag",
  description:
    "Step-by-step guide to creating your first feature flag in FeatureSignals, adding targeting rules, and evaluating flags with SDKs.",
};

export default function CreateFirstFlagPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">
        Create Your First Flag
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        This guide walks through creating a feature flag, enabling it per environment, adding targeting rules, and evaluating it from your application.
      </p>

      <SectionHeading>Step 1: Register and Set Up</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        After installing FeatureSignals, register at{" "}
        <a href="https://app.featuresignals.com" className="text-[var(--signal-fg-accent)] hover:underline">https://app.featuresignals.com</a>.
        Registration automatically creates:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Your user with <strong>owner</strong> role</li>
        <li>A default organization</li>
        <li>A <strong>Default Project</strong> with environments: <InlineCode>dev</InlineCode>, <InlineCode>staging</InlineCode>, <InlineCode>production</InlineCode></li>
      </ul>

      <SectionHeading>Step 2: Create a Flag</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Navigate to <strong>Flags</strong> and click <strong>Create Flag</strong>.</p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Field</Th>
            <Th>Value</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          <Tr><Td><InlineCode>key</InlineCode></Td><Td><InlineCode>dark-mode</InlineCode></Td><Td>Unique identifier used in code</Td></Tr>
          <Tr><Td><InlineCode>name</InlineCode></Td><Td>Dark Mode</Td><Td>Human-readable label</Td></Tr>
          <Tr><Td><InlineCode>type</InlineCode></Td><Td><InlineCode>boolean</InlineCode></Td><Td>Flag type</Td></Tr>
          <Tr><Td><InlineCode>default_value</InlineCode></Td><Td><InlineCode>false</InlineCode></Td><Td>Returned when the flag is disabled</Td></Tr>
        </tbody>
      </SimpleTable>
      <p className="text-[var(--signal-fg-secondary)] text-sm mb-6">
        The flag key is immutable after creation and is what your SDKs reference.
      </p>

      <SectionHeading>Step 3: Enable Per Environment</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Flags are <strong>disabled by default</strong> in all environments. To enable:</p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Open the flag detail page</li>
        <li>Select the <strong>dev</strong> environment tab</li>
        <li>Toggle <strong>Enabled</strong> to ON</li>
        <li>The flag now returns <InlineCode>true</InlineCode> for all users in <InlineCode>dev</InlineCode></li>
      </ol>

      <SectionHeading>Step 4: Add Targeting Rules</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Targeting rules let you return specific values based on user attributes:</p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>In the flag&apos;s <strong>dev</strong> environment, click <strong>Add Rule</strong></li>
        <li>Configure: <strong>Condition</strong>: <InlineCode>country</InlineCode> <InlineCode>equals</InlineCode> <InlineCode>US</InlineCode>, <strong>Value</strong>: <InlineCode>true</InlineCode></li>
        <li>Save</li>
      </ol>
      <p className="text-[var(--signal-fg-primary)] mb-6">Now only users with <InlineCode>country: &quot;US&quot;</InlineCode> in their evaluation context get <InlineCode>true</InlineCode>.</p>

      <SectionHeading>Step 5: Evaluate from Code</SectionHeading>
      <CodeBlock
        language="typescript"
        code={`import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('fs_srv_...', {
  envKey: 'dev',
  baseURL: 'https://api.featuresignals.com',
});

await client.waitForReady();

// User from US gets targeting rule match
const usUser = client.boolVariation('dark-mode', {
  key: 'user-1',
  attributes: { country: 'US' }
}, false);
// → true

// User from UK falls through to default
const ukUser = client.boolVariation('dark-mode', {
  key: 'user-2',
  attributes: { country: 'UK' }
}, false);
// → false`}
      />

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <Lightbulb size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            The <InlineCode>key</InlineCode> field is required and uniquely identifies the user. It&apos;s used for percentage rollouts and A/B variant assignment via consistent hashing.
          </p>
        </div>
      </div>

      <SectionHeading>Step 6: Gradual Rollout</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Instead of enabling for all users, do a percentage rollout:</p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Set <strong>Percentage Rollout</strong> to <InlineCode>2500</InlineCode> (25%)</li>
        <li>Save</li>
      </ol>
      <p className="text-[var(--signal-fg-primary)] mb-6">Now 25% of users (deterministically based on their key) see <InlineCode>true</InlineCode>.</p>

      <SectionHeading>Understanding Evaluation Reasons</SectionHeading>
      <SimpleTable>
        <thead>
          <tr><Th>Reason</Th><Th>Meaning</Th></tr>
        </thead>
        <tbody>
          <Tr><Td><InlineCode>DISABLED</InlineCode></Td><Td>Flag is off in this environment</Td></Tr>
          <Tr><Td><InlineCode>TARGETED</InlineCode></Td><Td>Matched a targeting rule at 100%</Td></Tr>
          <Tr><Td><InlineCode>ROLLOUT</InlineCode></Td><Td>Matched via percentage rollout</Td></Tr>
          <Tr><Td><InlineCode>FALLTHROUGH</InlineCode></Td><Td>Flag enabled but no rules matched</Td></Tr>
          <Tr><Td><InlineCode>NOT_FOUND</InlineCode></Td><Td>Flag key doesn&apos;t exist</Td></Tr>
          <Tr><Td><InlineCode>PREREQUISITE_FAILED</InlineCode></Td><Td>A prerequisite flag condition wasn&apos;t met</Td></Tr>
          <Tr><Td><InlineCode>MUTUALLY_EXCLUDED</InlineCode></Td><Td>Another flag in the mutex group won</Td></Tr>
          <Tr><Td><InlineCode>VARIANT</InlineCode></Td><Td>A/B experiment variant assigned</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Targeting & Segments", href: "/docs/core-concepts/targeting-and-segments" },
          { label: "A/B Experimentation", href: "/docs/core-concepts/ab-experimentation" },
          { label: "Flag Lifecycle", href: "/docs/core-concepts/flag-lifecycle" },
        ].map((step) => (
          <li key={step.href}>
            <Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium">
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
  return <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">{children}</tr>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>;
}
