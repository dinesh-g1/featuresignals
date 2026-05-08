import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Configuration Reference", description: "Environment variables and configuration options for the FeatureSignals API server and Flag Engine." };

export default function ConfigurationPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Configuration Reference</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">All configuration is done via environment variables.</p>

      <SectionHeading>API Server</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Variable</Th><Th>Default</Th><Th>Description</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>PORT</InlineCode></Td><Td><InlineCode>8080</InlineCode></Td><Td>HTTP server port</Td></Tr>
          <Tr><Td><InlineCode>DATABASE_URL</InlineCode></Td><Td><InlineCode>postgres://fs:fsdev@localhost:5432/featuresignals</InlineCode></Td><Td>PostgreSQL connection string</Td></Tr>
          <Tr><Td><InlineCode>JWT_SECRET</InlineCode></Td><Td>(development default)</Td><Td>JWT signing secret — must be changed in production</Td></Tr>
          <Tr><Td><InlineCode>TOKEN_TTL_MINUTES</InlineCode></Td><Td><InlineCode>60</InlineCode></Td><Td>Access token lifetime</Td></Tr>
          <Tr><Td><InlineCode>REFRESH_TTL_HOURS</InlineCode></Td><Td><InlineCode>168</InlineCode></Td><Td>Refresh token lifetime (7 days)</Td></Tr>
          <Tr><Td><InlineCode>LOG_LEVEL</InlineCode></Td><Td><InlineCode>info</InlineCode></Td><Td><InlineCode>debug</InlineCode>, <InlineCode>info</InlineCode>, <InlineCode>warn</InlineCode>, <InlineCode>error</InlineCode></Td></Tr>
          <Tr><Td><InlineCode>CORS_ORIGIN</InlineCode></Td><Td><InlineCode>http://localhost:3000</InlineCode></Td><Td>Comma-separated allowed CORS origins</Td></Tr>
          <Tr><Td><InlineCode>DASHBOARD_URL</InlineCode></Td><Td><InlineCode>http://localhost:3000</InlineCode></Td><Td>Flag Engine public URL</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Flag Engine</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Variable</Th><Th>Default</Th><Th>Description</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>NEXT_PUBLIC_API_URL</InlineCode></Td><Td><InlineCode>http://localhost:8080</InlineCode></Td><Td>API server URL (used by browser)</Td></Tr>
        </tbody>
      </SimpleTable>

      <div className="p-4 mb-6 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)]">
        <p className="text-sm text-[var(--signal-fg-primary)]"><strong>Caution:</strong> <InlineCode>NEXT_PUBLIC_API_URL</InlineCode> must be accessible from the user&apos;s browser. In production, use the public API URL.</p>
      </div>

      <SectionHeading>Example</SectionHeading>
      <CodeBlock language="bash" code={`export DATABASE_URL="postgres://fs:strongpass@db.example.com:5432/featuresignals?sslmode=require"
export JWT_SECRET="$(openssl rand -hex 32)"
export CORS_ORIGIN="https://app.example.com,https://docs.example.com"
export PORT=8080
export LOG_LEVEL=info`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Self-Hosting Guide", href: "/docs/deployment/self-hosting" }, { label: "Docker Compose", href: "/docs/deployment/docker-compose" }].map((step) => (
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
