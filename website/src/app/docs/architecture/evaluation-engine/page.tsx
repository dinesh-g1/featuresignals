import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Evaluation Engine", description: "How the FeatureSignals evaluation engine processes targeting rules, segments, and percentage rollouts in sub-millisecond time." };

export default function EvaluationEnginePage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Evaluation Engine</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">The evaluation engine is the core of FeatureSignals. It determines what value a feature flag returns for a given evaluation context.</p>

      <SectionHeading>Evaluation Flow</SectionHeading>
      <CodeBlock language="text" code={`1. Flag exists?          → NO: NOT_FOUND
2. Flag expired?         → YES: DISABLED
3. Env state enabled?   → NO: DISABLED
4. Mutex group winner?  → NO: EXCLUDED
5. Prerequisites met?   → NO: PREREQ
6. Targeting rules      → MATCH: value
7. Default rollout      → IN: rollout
8. A/B variants         → ASSIGN variant
9. Fallthrough           → default value`} />
      <p className="text-[var(--signal-fg-primary)] mb-6">Each step short-circuits — the first matching condition determines the result.</p>

      <SectionHeading>Consistent Hashing</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">FeatureSignals uses <strong>MurmurHash3 (x86, 32-bit)</strong> for all bucket assignments:</p>
      <CodeBlock language="text" code={`hash = MurmurHash3(flagKey + "." + userKey, seed=0)
bucket = hash % 10000   // range: 0–9999`} />

      <SectionHeading>Performance</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li><strong>Zero-allocation hot path</strong> (except rule sorting)</li>
        <li><strong>No database calls</strong> during evaluation (cache hit)</li>
        <li><strong>No network calls</strong> from SDKs during variation reads</li>
        <li><strong>O(rules + conditions)</strong> per evaluation</li>
      </ul>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Architecture Overview", href: "/docs/architecture/overview" }, { label: "Targeting & Segments", href: "/docs/core-concepts/targeting-and-segments" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"><ArrowRight size={14} /><span>{step.label}</span></Link></li>
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
