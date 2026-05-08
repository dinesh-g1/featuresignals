import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Go SDK", description: "FeatureSignals Go SDK — installation, initialization, flag evaluation, and OpenFeature provider." };

export default function GoSdkPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Go SDK</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Thread-safe client for evaluating feature flags in Go applications.</p>

      <SectionHeading>Installation</SectionHeading>
      <CodeBlock language="bash" code="go get github.com/featuresignals/sdk-go" />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6"><strong>Requirements:</strong> Go 1.22+</p>

      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock language="go" code={`package main

import (
    "fmt"
    fs "github.com/featuresignals/sdk-go"
)

func main() {
    client := fs.NewClient("fs_srv_your_api_key", "production",
        fs.WithBaseURL("https://api.featuresignals.com"),
    )
    defer client.Close()
    <-client.Ready()

    ctx := fs.NewContext("user-123").
        WithAttribute("country", "US").
        WithAttribute("plan", "enterprise")

    enabled := client.BoolVariation("new-feature", ctx, false)
    fmt.Println("Feature enabled:", enabled)
}`} />

      <SectionHeading>Configuration Options</SectionHeading>
      <SimpleTable>
        <thead><tr><Th>Option</Th><Th>Default</Th><Th>Description</Th></tr></thead>
        <tbody>
          <Tr><Td><InlineCode>WithBaseURL</InlineCode></Td><Td><InlineCode>https://api.featuresignals.com</InlineCode></Td><Td>API server URL</Td></Tr>
          <Tr><Td><InlineCode>WithPollingInterval</InlineCode></Td><Td><InlineCode>30s</InlineCode></Td><Td>Flag refresh interval</Td></Tr>
          <Tr><Td><InlineCode>WithSSE</InlineCode></Td><Td><InlineCode>false</InlineCode></Td><Td>Use SSE instead of polling</Td></Tr>
          <Tr><Td><InlineCode>WithLogger</InlineCode></Td><Td><InlineCode>slog.Default()</InlineCode></Td><Td>Structured logger</Td></Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Variation Methods</SectionHeading>
      <CodeBlock language="go" code={`// Boolean
enabled := client.BoolVariation("flag-key", ctx, false)

// String
theme := client.StringVariation("theme", ctx, "light")

// Number (returns float64)
limit := client.NumberVariation("rate-limit", ctx, 100.0)

// JSON (returns interface{})
config := client.JSONVariation("feature-config", ctx, map[string]interface{}{})`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "SDK Overview", href: "/docs/sdks/overview" }, { label: "OpenFeature Guide", href: "/docs/sdks/openfeature" }].map((step) => (
          <li key={step.href}><Link href={step.href} className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"><ArrowRightIcon size={14} /><span>{step.label}</span></Link></li>
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
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>;
}
