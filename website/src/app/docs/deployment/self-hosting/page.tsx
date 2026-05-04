import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Self-Hosting Guide", description: "Self-host FeatureSignals on your own infrastructure with full control over data and configuration." };

export default function SelfHostingPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3">Self-Hosting Guide</h1>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">Run FeatureSignals on your own infrastructure for full control over your data and deployment.</p>

      <SectionHeading>Infrastructure Requirements</SectionHeading>
      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-2">Minimum (Development/Small Teams)</h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-4">
        <li><strong>1 VPS</strong> (2 CPU, 4GB RAM)</li>
        <li><strong>PostgreSQL 14+</strong></li>
        <li>Cost: ~$10-20/month</li>
      </ul>
      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-2">Recommended (Production)</h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li><strong>API Server:</strong> 2+ instances behind a load balancer</li>
        <li><strong>Flag Engine:</strong> 1 instance (or static hosting)</li>
        <li><strong>PostgreSQL:</strong> Managed or self-hosted with backups</li>
        <li><strong>Relay Proxy:</strong> 1+ per region (optional)</li>
      </ul>

      <SectionHeading>Single VPS with Docker Compose</SectionHeading>
      <CodeBlock language="bash" code={`git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals

cat > .env.production << 'EOF'
DATABASE_URL=postgres://fs:strong-password@localhost:5432/featuresignals?sslmode=disable
JWT_SECRET=generate-a-strong-random-secret-here
CORS_ORIGIN=https://flags.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
EOF

docker compose -f docker-compose.yml up -d`} />

      <SectionHeading>Security Checklist</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>Set a strong <InlineCode>JWT_SECRET</InlineCode></li>
        <li>Use strong PostgreSQL passwords</li>
        <li>Enable SSL/TLS (via Caddy or reverse proxy)</li>
        <li>Restrict <InlineCode>CORS_ORIGIN</InlineCode></li>
        <li>Set up database backups</li>
      </ul>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "Configuration", href: "/docs/deployment/configuration" }, { label: "Docker Compose", href: "/docs/deployment/docker-compose" }].map((step) => (
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
