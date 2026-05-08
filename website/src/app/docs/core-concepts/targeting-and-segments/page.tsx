import type { Metadata } from "next";
import Link from "next/link";
import { LightBulbIcon, ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Targeting & Segments",
  description: "Target specific users with feature flags using segments, attributes, and targeting rules in FeatureSignals.",
};

export default function TargetingSegmentsPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">
        Targeting & Segments
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Targeting lets you deliver different flag values to different users based on their attributes. Segments are reusable groups of targeting conditions.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <LightBulbIcon size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            Create and manage segments in the{" "}
            <a href="https://app.featuresignals.com/segments" className="text-[var(--signal-fg-accent)] hover:underline font-medium">Flag Engine →</a>
          </p>
        </div>
      </div>

      <SectionHeading>Targeting Rules</SectionHeading>
      <SimpleTable>
        <thead>
          <tr><Th>Component</Th><Th>Description</Th></tr>
        </thead>
        <tbody>
          <Tr><Td><strong>Conditions</strong></Td><Td>Attribute-based filters (e.g., <InlineCode>country equals &quot;US&quot;</InlineCode>)</Td></Tr>
          <Tr><Td><strong>Segment Keys</strong></Td><Td>Reference to reusable segments</Td></Tr>
          <Tr><Td><strong>Value</strong></Td><Td>The value to return when the rule matches</Td></Tr>
          <Tr><Td><strong>Percentage</strong></Td><Td>Percentage of matching users to target (basis points: 0–10000)</Td></Tr>
          <Tr><Td><strong>Priority</strong></Td><Td>Evaluation order (lower = evaluated first)</Td></Tr>
          <Tr><Td><strong>Match Type</strong></Td><Td><InlineCode>all</InlineCode> (AND logic) or <InlineCode>any</InlineCode> (OR logic)</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Operators</SectionHeading>
      <SimpleTable>
        <thead>
          <tr><Th>Operator</Th><Th>Key</Th><Th>Description</Th></tr>
        </thead>
        <tbody>
          <Tr><Td>Equals</Td><Td><InlineCode>eq</InlineCode></Td><Td>Exact match</Td></Tr>
          <Tr><Td>Not Equals</Td><Td><InlineCode>neq</InlineCode></Td><Td>Inverse match</Td></Tr>
          <Tr><Td>Contains</Td><Td><InlineCode>contains</InlineCode></Td><Td>Substring match</Td></Tr>
          <Tr><Td>Starts With</Td><Td><InlineCode>startsWith</InlineCode></Td><Td>Prefix match</Td></Tr>
          <Tr><Td>Ends With</Td><Td><InlineCode>endsWith</InlineCode></Td><Td>Suffix match</Td></Tr>
          <Tr><Td>In</Td><Td><InlineCode>in</InlineCode></Td><Td>Value is in the list</Td></Tr>
          <Tr><Td>Not In</Td><Td><InlineCode>notIn</InlineCode></Td><Td>Value is not in the list</Td></Tr>
          <Tr><Td>Greater Than</Td><Td><InlineCode>gt</InlineCode></Td><Td>Numeric comparison</Td></Tr>
          <Tr><Td>Less Than</Td><Td><InlineCode>lt</InlineCode></Td><Td>Numeric comparison</Td></Tr>
          <Tr><Td>Regex</Td><Td><InlineCode>regex</InlineCode></Td><Td>Regular expression match</Td></Tr>
          <Tr><Td>Exists</Td><Td><InlineCode>exists</InlineCode></Td><Td>Attribute is present</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Example: Target Beta Users in the US</SectionHeading>
      <CodeBlock
        language="json"
        code={`{
  "rules": [
    {
      "priority": 1,
      "description": "Beta users in US",
      "match_type": "all",
      "conditions": [
        {"attribute": "country", "operator": "eq", "values": ["US"]},
        {"attribute": "beta", "operator": "eq", "values": ["true"]}
      ],
      "value": true,
      "percentage": 10000
    }
  ]
}`}
      />

      <SectionHeading>Segments</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Segments are reusable groups of conditions that can be referenced by multiple flags.</p>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/segments \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "enterprise-users",
    "name": "Enterprise Users",
    "description": "Users on enterprise plan",
    "match_type": "all",
    "rules": [
      {"attribute": "plan", "operator": "eq", "values": ["enterprise"]}
    ]
  }'`}
      />

      <SectionHeading>Evaluation Order</SectionHeading>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Sort rules by <InlineCode>priority</InlineCode> (lowest first)</li>
        <li>For each rule: check segments, then conditions</li>
        <li>If match and <InlineCode>percentage == 10000</InlineCode>: return rule value (<InlineCode>TARGETED</InlineCode>)</li>
        <li>If match and <InlineCode>percentage &gt; 0</InlineCode>: check user&apos;s hash bucket (<InlineCode>ROLLOUT</InlineCode> if in range)</li>
        <li>If no rule matches: check default percentage rollout</li>
        <li>If nothing matches: return flag&apos;s default value (<InlineCode>FALLTHROUGH</InlineCode>)</li>
      </ol>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Percentage Rollouts", href: "/docs/core-concepts/percentage-rollouts" },
          { label: "A/B Experimentation", href: "/docs/core-concepts/ab-experimentation" },
          { label: "Kill Switch", href: "/docs/advanced/relay-proxy" },
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
