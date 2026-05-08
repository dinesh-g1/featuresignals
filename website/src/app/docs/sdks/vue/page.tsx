import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = { title: "Vue SDK", description: "FeatureSignals Vue SDK — plugin setup, composables, polling, SSE, and OpenFeature provider." };

export default function VueSdkPage() {
  return (
    <div>
      <h1 id="docs-main-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3">Vue SDK</h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">Composables for evaluating feature flags in Vue 3 applications using the Composition API.</p>

      <SectionHeading>Installation</SectionHeading>
      <CodeBlock language="bash" code="npm install @featuresignals/vue" />
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6"><strong>Requirements:</strong> Vue 3.3+</p>

      <SectionHeading>Quick Start</SectionHeading>
      <CodeBlock language="typescript" code={`// main.ts
import { createApp } from "vue";
import { FeatureSignalsPlugin } from "@featuresignals/vue";
import App from "./App.vue";

const app = createApp(App);
app.use(FeatureSignalsPlugin, {
  sdkKey: "fs_cli_your_api_key",
  envKey: "production",
});
app.mount("#app");`} />

      <SectionHeading>Composables</SectionHeading>
      <CodeBlock language="html" code={`<script setup lang="ts">
import { useFlag, useReady } from "@featuresignals/vue";

const showCheckout = useFlag("new-checkout", false);
const ready = useReady();
</script>

<template>
  <LoadingSpinner v-if="!ready" />
  <NewCheckout v-else-if="showCheckout" />
  <OldCheckout v-else />
</template>`} />

      <SectionHeading>Feature Gate Component</SectionHeading>
      <CodeBlock language="html" code={`<!-- FeatureGate.vue -->
<script setup lang="ts">
import { useFlag } from "@featuresignals/vue";
const props = defineProps<{ flagKey: string }>();
const enabled = useFlag(props.flagKey, false);
</script>

<template>
  <slot v-if="enabled" />
  <slot v-else name="fallback" />
</template>`} />

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[{ label: "SDK Overview", href: "/docs/sdks/overview" }, { label: "React SDK", href: "/docs/sdks/react" }].map((step) => (
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
