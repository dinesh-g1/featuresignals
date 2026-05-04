import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Percentage Rollouts",
  description: "Gradually roll out features to a percentage of users with consistent hashing for deterministic assignment.",
};

export default function PercentageRolloutsPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3">
        Percentage Rollouts
      </h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">
        Percentage rollouts let you gradually release a feature to a subset of users. FeatureSignals uses <strong>consistent hashing</strong> to deterministically assign users to buckets.
      </p>

      <SectionHeading>How It Works</SectionHeading>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>A hash is computed from <InlineCode>flagKey + &quot;.&quot; + userKey</InlineCode> using MurmurHash3</li>
        <li>The hash maps to a bucket in the range <strong>0–9999</strong> (basis points)</li>
        <li>If the user&apos;s bucket is less than the rollout percentage, they&apos;re included</li>
      </ol>

      <SectionHeading>Basis Points</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Basis Points</Th><Th>Percentage</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>0</InlineCode></Td><Td>0%</Td></Tr>
          <Tr><Td><InlineCode>2500</InlineCode></Td><Td>25%</Td></Tr>
          <Tr><Td><InlineCode>5000</InlineCode></Td><Td>50%</Td></Tr>
          <Tr><Td><InlineCode>7500</InlineCode></Td><Td>75%</Td></Tr>
          <Tr><Td><InlineCode>10000</InlineCode></Td><Td>100%</Td></Tr>
        </tbody>
      </SimpleTable>
      <p className="text-sm text-[var(--fgColor-muted)] mb-6">This provides granularity down to 0.01%.</p>

      <SectionHeading>Setting a Rollout</SectionHeading>
      <CodeBlock
        language="bash"
        code={`curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/environments/$ENV_ID \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled": true, "percentage_rollout": 2500}'`}
      />

      <SectionHeading>Consistency Guarantees</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li><strong>Deterministic:</strong> The same <InlineCode>userKey</InlineCode> + <InlineCode>flagKey</InlineCode> always maps to the same bucket</li>
        <li><strong>Uniform distribution:</strong> MurmurHash3 provides excellent distribution</li>
        <li><strong>Cross-flag independence:</strong> Different flags use different hash inputs</li>
      </ul>

      <SectionHeading>Progressive Rollout Strategy</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Stage</Th><Th>Percentage</Th><Th>Duration</Th></tr></thead>
        <tbody>
          <Tr><Td>Canary</Td><Td>1% (100 bp)</Td><Td>1 day</Td></Tr>
          <Tr><Td>Early adopters</Td><Td>10% (1000 bp)</Td><Td>3 days</Td></Tr>
          <Tr><Td>Wider rollout</Td><Td>50% (5000 bp)</Td><Td>1 week</Td></Tr>
          <Tr><Td>Full rollout</Td><Td>100% (10000 bp)</Td><Td>—</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Rule-Level Rollouts</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">You can also set percentages on individual targeting rules:</p>
      <CodeBlock
        language="json"
        code={`{
  "rules": [{
    "priority": 1,
    "conditions": [
      {"attribute": "country", "operator": "eq", "values": ["US"]}
    ],
    "value": true,
    "percentage": 5000
  }]
}`}
      />
      <p className="text-sm text-[var(--fgColor-muted)] mb-6">This targets 50% of US users specifically.</p>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Targeting & Segments", href: "/docs/core-concepts/targeting-and-segments" },
          { label: "A/B Experimentation", href: "/docs/core-concepts/ab-experimentation" },
          { label: "Flag Lifecycle", href: "/docs/core-concepts/flag-lifecycle" },
        ].map((step) => (
          <li key={step.href}>
            <Link href={step.href} className="flex items-center gap-2 text-[var(--fgColor-accent)] hover:underline text-sm font-medium">
              <ArrowRightIcon size={14} /><span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-[var(--fgColor-default)] mt-10 mb-4 pb-2 border-b border-[var(--borderColor-default)]">{children}</h2>;
}
function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--bgColor-inset)] text-[var(--fgColor-default)] border border-[var(--borderColor-default)]">{children}</code>;
}
function SimpleTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto border border-[var(--borderColor-default)] rounded-lg mb-6"><table className="w-full text-sm text-left">{children}</table></div>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 font-semibold bg-[var(--bgColor-inset)] border-b border-[var(--borderColor-default)] text-[var(--fgColor-default)]">{children}</th>;
}
function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--borderColor-default)] last:border-b-0">{children}</tr>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--fgColor-default)]">{children}</td>;
}
