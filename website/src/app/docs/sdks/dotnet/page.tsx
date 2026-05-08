import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: ".NET SDK", description: "FeatureSignals .NET SDK — NuGet installation, polling, SSE, and OpenFeature provider." };

export default function DotnetSdkPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">.NET SDK</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Thread-safe client for evaluating feature flags in C# and .NET applications.</p>

      <SectionHeading>Installation</SectionHeading>
      <CodeBlock language="bash" code="dotnet add package FeatureSignals" />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6"><strong>Requirements:</strong> .NET 8.0+</p>

      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock language="csharp" code={`using FeatureSignals;

var options = new ClientOptions { EnvKey = "production" };
using var client = new FeatureSignalsClient("fs_srv_your_api_key", options);
await client.WaitForReadyAsync();

var user = new EvalContext("user-123")
    .WithAttribute("plan", "pro");

bool enabled = client.BoolVariation("new-feature", user, false);
Console.WriteLine($"Feature enabled: {enabled}");`} />

      <SectionHeading>Variation Methods</SectionHeading>
      <CodeBlock language="csharp" code={`bool enabled = client.BoolVariation("flag-key", ctx, false);
string value = client.StringVariation("banner-text", ctx, "default");
double limit = client.NumberVariation("rate-limit", ctx, 100.0);
T config = client.JsonVariation<T>("config", ctx, defaultConfig);`} />

      <SectionHeading>ASP.NET Core Integration</SectionHeading>
      <CodeBlock language="csharp" code={`builder.Services.AddSingleton<FeatureSignalsClient>(sp => {
    var options = new ClientOptions { EnvKey = "production" };
    return new FeatureSignalsClient(
        builder.Configuration["FeatureSignals:ApiKey"]!, options);
});`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "SDK Overview", href: "/docs/sdks/overview" }, { label: "OpenFeature Guide", href: "/docs/sdks/openfeature" }].map((step) => (
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
