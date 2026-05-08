import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "A/B Testing with React",
  description:
    "Tutorial: run an A/B test in a React app using the FeatureSignals React SDK.",
};

export default function ABTestingReactPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        A/B Testing with the React SDK
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Learn how to set up an A/B test using FeatureSignals and the React SDK
        to measure which variant performs better.
      </p>

      <SectionHeading>Prerequisites</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>FeatureSignals server running</li>
        <li>A React application (Create React App, Next.js, Vite, etc.)</li>
        <li>
          React SDK installed (
          <InlineCode>npm install @featuresignals/react</InlineCode>)
        </li>
      </ul>

      <SectionHeading>Step 1: Create a Multi-Variant Flag</SectionHeading>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"key": "pricing-page-layout", "name": "Pricing Page Layout Test", "type": "string", "variants": [
    {"key": "control", "value": "control", "name": "Control"},
    {"key": "variant-a", "value": "variant-a", "name": "Feature Comparison"},
    {"key": "variant-b", "value": "variant-b", "name": "Simplified"}
  ]}'`}
      />

      <SectionHeading>Step 2: Set Up the Provider</SectionHeading>
      <CodeBlock
        language="tsx"
        code={`import { FeatureSignalsProvider } from '@featuresignals/react';

function App() {
  return (
    <FeatureSignalsProvider
      apiKey={process.env.REACT_APP_FS_CLIENT_KEY}
      context={{ userID: currentUser.id }}
    >
      <Router><Routes /></Router>
    </FeatureSignalsProvider>
  );
}`}
      />

      <SectionHeading>Step 3: Use the Flag</SectionHeading>
      <CodeBlock
        language="tsx"
        code={`import { useFlag } from '@featuresignals/react';

function PricingPage() {
  const layout = useFlag('pricing-page-layout', 'control');

  return (
    <div className="pricing-page">
      <h1>Choose Your Plan</h1>
      {layout === 'control' && <CurrentPricingLayout />}
      {layout === 'variant-a' && <ComparisonTableLayout />}
      {layout === 'variant-b' && <SimplifiedLayout />}
    </div>
  );
}`}
      />

      <SectionHeading>Step 4: Track Conversions</SectionHeading>
      <CodeBlock
        language="tsx"
        code={`import { useTrack } from '@featuresignals/react';

interface Plan { id: string; name: string; price: number }

function PricingCard({ plan }: { plan: Plan }) {
  const track = useTrack();

  const handleSubscribe = async () => {
    await subscribeToPlan(plan.id);
    track('pricing-conversion', { plan: plan.id, revenue: plan.price });
  };

  return (
    <div className="pricing-card">
      <h3>{plan.name}</h3>
      <p>\${plan.price}/mo</p>
      <button onClick={handleSubscribe}>Subscribe</button>
    </div>
  );
}`}
      />

      <SectionHeading>Tips for Reliable A/B Tests</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Sample size:</strong> Run tests long enough to reach
          statistical significance (1,000+ conversions per variant)
        </li>
        <li>
          <strong>One change at a time:</strong> Avoid running overlapping tests
          on the same page
        </li>
        <li>
          <strong>Consistent assignment:</strong> Always pass a stable{" "}
          <InlineCode>userID</InlineCode>
        </li>
        <li>
          <strong>Monitor guardrail metrics:</strong> Watch error rates and page
          load times alongside conversion metrics
        </li>
      </ul>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          {
            label: "Feature Flag a Checkout",
            href: "/docs/tutorials/feature-flag-checkout",
          },
          {
            label: "A/B Experimentation",
            href: "/docs/core-concepts/ab-experimentation",
          },
          { label: "React SDK", href: "/docs/sdks/react" },
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
