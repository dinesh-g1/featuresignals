import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "React SDK", description: "FeatureSignals React SDK — provider component, useFlag hook, SSE streaming, and OpenFeature support." };

export default function ReactSdkPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3">React SDK</h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">React components and hooks for evaluating feature flags in React applications.</p>

      <SectionHeading>Installation</SectionHeading>
      <CodeBlock language="bash" code="npm install @featuresignals/react" />
      <p className="text-sm text-[var(--fgColor-muted)] mb-6"><strong>Requirements:</strong> React 18+</p>

      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock language="tsx" code={`import { FeatureSignalsProvider, useFlag, useReady } from '@featuresignals/react';

function App() {
  return (
    <FeatureSignalsProvider
      sdkKey="fs_cli_your_client_key"
      envKey="production"
      userKey="user-123"
    >
      <YourApp />
    </FeatureSignalsProvider>
  );
}

function MyComponent() {
  const ready = useReady();
  const darkMode = useFlag('dark-mode', false);

  if (!ready) return <div>Loading...</div>;
  return <div className={darkMode ? 'dark' : 'light'}>...</div>;
}`} />

      <SectionHeading>Hooks</SectionHeading>
      <CodeBlock language="tsx" code={`// Single flag
const enabled = useFlag('my-flag', false);

// All flags
const flags = useFlags();

// Readiness state
const ready = useReady();

// Error state
const error = useError();`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "SDK Overview", href: "/docs/sdks/overview" }, { label: "Tutorial: A/B Testing in React", href: "/docs/tutorials/ab-testing-react" }].map((step) => (
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
