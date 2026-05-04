import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Architecture Overview", description: "Technical architecture overview of FeatureSignals — hexagonal design, evaluation engine, caching, and real-time updates." };

export default function ArchitectureOverviewPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3">Architecture Overview</h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">FeatureSignals is built as a modular, self-hosted platform with a clear separation between the API server, Flag Engine, SDKs, and relay proxy.</p>

      <SectionHeading>Components</SectionHeading>
      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-2">API Server (Go)</h3>
      <p className="text-[var(--fgColor-default)] mb-4">The core server built with Go and the chi router handles REST API, evaluation engine, in-memory cache, SSE server, webhook dispatcher, and flag scheduler.</p>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-2">Flag Engine (Next.js)</h3>
      <p className="text-[var(--fgColor-default)] mb-4">A React/Next.js web application providing a visual interface for all management operations. Uses Zustand for state management.</p>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-2">PostgreSQL</h3>
      <p className="text-[var(--fgColor-default)] mb-4">The single data store for all persistent state with LISTEN/NOTIFY channels for real-time cache invalidation.</p>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-2">SDKs</h3>
      <p className="text-[var(--fgColor-default)] mb-4">Client libraries for Go, Node.js, Python, Java, .NET, Ruby, React, and Vue. All follow the same pattern: initial fetch, background sync, local evaluation.</p>

      <SectionHeading>Data Flow</SectionHeading>
      <CodeBlock language="text" code={`# Flag Evaluation
SDK → (X-API-Key) → API Server
  → Resolve environment from API key
  → Load ruleset from cache (or DB on miss)
  → Evaluate flag(s) against context
  → Return result(s)

# Flag Change Propagation
Flag Engine / API → Update flag in PostgreSQL
  → PostgreSQL NOTIFY on channel
  → Cache evicts stale ruleset
  → SSE server broadcasts flag-update event
  → SDKs receive SSE → refetch flags`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Evaluation Engine", href: "/docs/architecture/evaluation-engine" }, { label: "Relay Proxy", href: "/docs/advanced/relay-proxy" }, { label: "SDK Overview", href: "/docs/sdks/overview" }].map((step) => (
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
