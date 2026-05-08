import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Ruby SDK", description: "FeatureSignals Ruby SDK — gem installation, polling, SSE, and OpenFeature provider." };

export default function RubySdkPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Ruby SDK</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Thread-safe client for evaluating feature flags in Ruby applications.</p>

      <SectionHeading>Installation</SectionHeading>
      <CodeBlock language="ruby" code={`# Gemfile
gem "featuresignals"`} />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6"><strong>Requirements:</strong> Ruby 3.1+</p>

      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock language="ruby" code={`require "featuresignals"

options = FeatureSignals::ClientOptions.new(env_key: "production")
client = FeatureSignals::Client.new("fs_srv_your_api_key", options)
client.wait_for_ready

user = FeatureSignals::EvalContext.new(
  key: "user-123",
  attributes: { "plan" => "pro" }
)

enabled = client.bool_variation("new-feature", user, false)
puts "Feature enabled: #{enabled}"`} />

      <SectionHeading>Rails Integration</SectionHeading>
      <CodeBlock language="ruby" code={`# config/initializers/feature_signals.rb
Rails.application.config.to_prepare do
  options = FeatureSignals::ClientOptions.new(
    env_key: Rails.env.production? ? "production" : "development",
    streaming: true,
  )
  FEATURE_FLAGS = FeatureSignals::Client.new(
    ENV.fetch("FEATURESIGNALS_API_KEY"), options
  )
end

at_exit { FEATURE_FLAGS&.close }`} />

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
