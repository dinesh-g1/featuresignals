import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "A/B Experimentation",
  description: "Run A/B experiments with weighted variants, consistent user assignment, and impression tracking in FeatureSignals.",
};

export default function ABExperimentationPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">A/B Experimentation</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">FeatureSignals has built-in A/B experimentation support. Create flags with the <InlineCode>ab</InlineCode> type to assign users to weighted variants using consistent hashing.</p>

      <SectionHeading>Concepts</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Term</Th><Th>Description</Th></tr></thead>
        <tbody>
          <Tr><Td><strong>Variant</strong></Td><Td>One arm of an experiment with a key, value, and weight</Td></Tr>
          <Tr><Td><strong>Weight</strong></Td><Td>Relative proportion in basis points (must sum to 10000)</Td></Tr>
          <Tr><Td><strong>Impression</strong></Td><Td>A record of a user seeing a specific variant</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Configuring Variants</SectionHeading>
      <CodeBlock language="bash" code={`curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/checkout-experiment/environments/$ENV_ID \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "enabled": true,
    "variants": [
      {"key": "control", "value": "original-checkout", "weight": 5000},
      {"key": "treatment-a", "value": "streamlined-checkout", "weight": 3000},
      {"key": "treatment-b", "value": "one-click-checkout", "weight": 2000}
    ]
  }'`} />

      <SectionHeading>How Assignment Works</SectionHeading>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>A hash bucket is computed from <InlineCode>flagKey + &quot;.&quot; + userKey</InlineCode> (0–9999)</li>
        <li>Variants are walked in order, accumulating weights</li>
        <li>The first variant where <InlineCode>bucket &lt; cumulative_weight</InlineCode> is assigned</li>
      </ol>

      <SectionHeading>Evaluating Variants</SectionHeading>
      <CodeBlock language="typescript" code={`const variant = client.stringVariation(
  'checkout-experiment',
  { key: 'user-123' },
  'control'
);
// → "streamlined-checkout" or "original-checkout" or "one-click-checkout"`} />

      <SectionHeading>Tracking Impressions</SectionHeading>
      <CodeBlock language="bash" code={`curl -X POST https://api.featuresignals.com/v1/track \\
  -H "X-API-Key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "flag_key": "checkout-experiment",
    "variant_key": "treatment-a",
    "user_key": "user-123"
  }'`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Percentage Rollouts", href: "/docs/core-concepts/percentage-rollouts" }, { label: "Tutorial: A/B Testing in React", href: "/docs/tutorials/ab-testing-react" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"><ArrowRight size={14} /><span>{step.label}</span></Link></li>
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
