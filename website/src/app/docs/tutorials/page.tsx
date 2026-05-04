import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Feature Flag a Checkout Flow", description: "Tutorial: use feature flags to safely release a new checkout flow with gradual rollout." };

export default function FeatureFlagCheckoutPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3">Feature Flag a Checkout Flow</h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">Learn how to wrap a new checkout experience behind a feature flag and roll it out safely.</p>

      <SectionHeading>Prerequisites</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>FeatureSignals server running (locally or hosted)</li>
        <li>An API key for your environment</li>
        <li>Node.js SDK installed (<InlineCode>npm install @featuresignals/node</InlineCode>)</li>
      </ul>

      <SectionHeading>Step 1: Create the Flag</SectionHeading>
      <CodeBlock language="bash" code={`curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "new-checkout", "name": "New Checkout Flow", "type": "boolean", "defaultValue": false}'`} />

      <SectionHeading>Step 2: Install and Initialize</SectionHeading>
      <CodeBlock language="javascript" code={`const { FeatureSignals } = require('@featuresignals/node');

const client = new FeatureSignals({
  apiKey: process.env.FEATURESIGNALS_API_KEY,
});
await client.initialize();`} />

      <SectionHeading>Step 3: Wrap Your Checkout</SectionHeading>
      <CodeBlock language="javascript" code={`app.post('/checkout', async (req, res) => {
  const user = req.user;
  const useNewCheckout = await client.boolVariation('new-checkout', {
    userID: user.id,
    email: user.email,
    plan: user.plan,
  }, false);

  if (useNewCheckout) {
    return handleNewCheckout(req, res);
  }
  return handleLegacyCheckout(req, res);
});`} />

      <SectionHeading>Step 4: Enable in Staging First</SectionHeading>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>Go to the <strong>Environments</strong> tab for the <InlineCode>new-checkout</InlineCode> flag</li>
        <li>Select your <strong>Staging</strong> environment, toggle <strong>Enabled</strong> to <InlineCode>true</InlineCode></li>
        <li>Run your test suite against staging to verify</li>
      </ol>

      <SectionHeading>Step 5: Roll Out to Production</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">Start with a canary release:</p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--fgColor-default)] mb-4">
        <li>Select <strong>Production</strong> environment</li>
        <li>Set percentage to <strong>10%</strong> for a canary release</li>
        <li>Monitor error rates and conversion metrics</li>
        <li>Gradually increase to 50%, then 100%</li>
      </ol>

      <SectionHeading>Step 6: Clean Up</SectionHeading>
      <CodeBlock language="javascript" code={`// After cleanup — no more flag check
app.post('/checkout', async (req, res) => {
  return handleNewCheckout(req, res);
});`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "A/B Testing in React", href: "/docs/tutorials/ab-testing-react" }, { label: "Approval Workflows", href: "/docs/advanced/approval-workflows" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--fgColor-accent)] hover:underline text-sm font-medium"><ArrowRightIcon size={14} /><span>{step.label}</span></Link></li>
        ))}
      </ul>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) { return <h2 className="text-xl font-semibold text-[var(--fgColor-default)] mt-10 mb-4 pb-2 border-b border-[var(--borderColor-default)]">{children}</h2>; }
function InlineCode({ children }: { children: React.ReactNode }) { return <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--bgColor-inset)] text-[var(--fgColor-default)] border border-[var(--borderColor-default)]">{children}</code>; }
function SimpleTable({ children }: { children: React.ReactNode }) { return <div className="overflow-x-auto border border-[var(--borderColor-default)] rounded-lg mb-6"><table className="w-full text-sm text-left">{children}</table></div>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-2.5 font-semibold bg-[var(--bgColor-inset)] border-b border-[var(--borderColor-default)] text-[var(--fgColor-default)]">{children}</th>; }
function Tr({ children }: { children: React.ReactNode }) { return <tr className="border-b border-[var(--borderColor-default)] last:border-b-0">{children}</tr>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-2.5 text-[var(--fgColor-default)]">{children}</td>; }
