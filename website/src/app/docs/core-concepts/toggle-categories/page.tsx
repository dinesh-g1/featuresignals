import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "Toggle Categories",
  description:
    "Classify feature flags as release, experiment, ops, or permission toggles with category-aware staleness thresholds.",
};

export default function ToggleCategoriesPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">
        Toggle Categories
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals classifies feature flags into four categories based on how long they live, how dynamic they are, and which teams typically manage them. This classification is inspired by Martin Fowler&apos;s{" "}
        <a href="https://martinfowler.com/articles/feature-toggles.html" className="text-[var(--signal-fg-accent)] hover:underline">Feature Toggles</a> taxonomy.
      </p>

      <SectionHeading>The Four Categories</SectionHeading>
      <SimpleTable>
        <thead>
          <tr><Th>Category</Th><Th>Lifespan</Th><Th>Dynamism</Th><Th>Typical Owner</Th><Th>Example</Th></tr>
        </thead>
        <tbody>
          <Tr><Td className="font-semibold">Release</Td><Td>Days to weeks</Td><Td>Static per deploy</Td><Td>Engineering</Td><Td><InlineCode>enable-new-checkout</InlineCode></Td></Tr>
          <Tr><Td className="font-semibold">Experiment</Td><Td>Weeks to months</Td><Td>Dynamic per request</Td><Td>Product / Data</Td><Td><InlineCode>pricing-page-test</InlineCode></Td></Tr>
          <Tr><Td className="font-semibold">Ops</Td><Td>Indefinite</Td><Td>Dynamic per request</Td><Td>Ops / SRE</Td><Td><InlineCode>circuit-breaker-payments</InlineCode></Td></Tr>
          <Tr><Td className="font-semibold">Permission</Td><Td>Indefinite</Td><Td>Dynamic per request</Td><Td>Product / Sales</Td><Td><InlineCode>premium-analytics</InlineCode></Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Release Toggles</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Release toggles decouple deployment from release. They let your team merge incomplete or risky features into <InlineCode>main</InlineCode> behind a flag and enable them when ready.
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Default staleness threshold: <strong>14 days</strong></li>
        <li>Set an <InlineCode>expires_at</InlineCode> date at creation time</li>
        <li>Remove from code immediately after full rollout</li>
        <li>Keep the number of active release toggles small — each one is temporary technical debt</li>
      </ul>

      <SectionHeading>Experiment Toggles</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Experiment toggles drive A/B tests and multivariate experiments. They route each user to a variant using consistent hashing.
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Default staleness threshold: <strong>30 days</strong></li>
        <li>Always pair with impression tracking to measure outcomes</li>
        <li>Use mutual exclusion groups to prevent experiment interference</li>
        <li>Archive (don&apos;t delete) after experiment concludes</li>
      </ul>

      <SectionHeading>Ops Toggles</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Ops toggles control operational aspects of system behavior — circuit breakers, degradation switches, maintenance modes.</p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Default staleness threshold: <strong>90 days</strong></li>
        <li>Document the operational runbook for each toggle</li>
        <li>Require admin/ops role for toggling in production</li>
      </ul>

      <SectionHeading>Permission Toggles</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">Permission toggles gate access to features for specific user segments, tenants, or pricing tiers.</p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Default staleness threshold: <strong>90 days</strong></li>
        <li>Use segment-based targeting rules for clean permission logic</li>
        <li>Pair with RBAC — only admins or sales should modify permission toggles</li>
      </ul>

      <SectionHeading>Setting a Category</SectionHeading>
      <CodeBlock
        language="bash"
        code={`curl -X POST https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "enable-dark-mode",
    "name": "Dark Mode",
    "flag_type": "boolean",
    "default_value": "false",
    "category": "release",
    "status": "active"
  }'`}
      />

      <SectionHeading>Category-Aware Flag Health</SectionHeading>
      <SimpleTable>
        <thead>
          <tr><Th>Category</Th><Th>Stale After</Th></tr>
        </thead>
        <tbody>
          <Tr><Td>Release</Td><Td>14 days</Td></Tr>
          <Tr><Td>Experiment</Td><Td>30 days</Td></Tr>
          <Tr><Td>Ops</Td><Td>90 days</Td></Tr>
          <Tr><Td>Permission</Td><Td>90 days</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Best Practices</SectionHeading>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li><strong>Assign a category at creation</strong> — Don&apos;t leave flags uncategorized.</li>
        <li><strong>Match the lifecycle to the category</strong> — Release toggles should be removed quickly; permission toggles can live indefinitely.</li>
        <li><strong>Use status to track progress</strong> — Combine category with status for full lifecycle visibility.</li>
        <li><strong>Filter by category in the Flag Engine</strong> — The flags list page supports category and status filters.</li>
        <li><strong>Review categories in flag health audits</strong> — A release toggle that&apos;s been around for 6 months probably needs re-categorization.</li>
      </ol>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Feature Flags", href: "/docs/core-concepts/feature-flags" },
          { label: "Flag Lifecycle", href: "/docs/core-concepts/flag-lifecycle" },
          { label: "Projects & Environments", href: "/docs/core-concepts/projects-and-environments" },
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

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 text-[var(--signal-fg-primary)] ${className || ""}`}>{children}</td>;
}
