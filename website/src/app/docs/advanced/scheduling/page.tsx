import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Flag Scheduling", description: "Schedule feature flags to enable or disable automatically at specific dates and times." };

export default function SchedulingPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3">Flag Scheduling</h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">Schedule flags to automatically enable or disable at specific times. Useful for timed releases, promotions, or time-limited features.</p>

      <SectionHeading>How It Works</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">The server runs a background scheduler that checks every <strong>30 seconds</strong> for pending schedules. When a schedule triggers, the flag state is updated, an audit entry is created, and SSE notifications are broadcast.</p>

      <SectionHeading>Setting a Schedule</SectionHeading>
      <CodeBlock language="bash" code={`curl -X PUT https://api.featuresignals.com/v1/projects/$PROJECT_ID/flags/my-flag/environments/$ENV_ID \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"scheduled_enable_at": "2026-04-15T09:00:00Z", "scheduled_disable_at": "2026-04-15T18:00:00Z"}'`} />

      <SectionHeading>Use Cases</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li><strong>Timed launches:</strong> Enable a feature at a specific launch time</li>
        <li><strong>Time-limited promotions:</strong> Enable a discount feature for 24 hours</li>
        <li><strong>Maintenance windows:</strong> Disable a feature during planned maintenance</li>
        <li><strong>Regional launches:</strong> Schedule different times per environment</li>
      </ul>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Flag Lifecycle", href: "/docs/core-concepts/flag-lifecycle" }, { label: "Approval Workflows", href: "/docs/advanced/approval-workflows" }].map((step) => (
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
