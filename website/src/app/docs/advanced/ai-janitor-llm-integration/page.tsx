import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cpu, Server, Shield } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "AI Janitor LLM Integration",
  description:
    "Configure LLM providers for AI Janitor — OpenAI, Anthropic, and self-hosted models — with rate limits, token usage tracking, and prompt customization.",
};

export default function AiJanitorLlmIntegrationPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        AI Janitor LLM Integration
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        AI Janitor uses large language models (LLMs) to analyze flag usage patterns and
        generate code removal suggestions. Choose between OpenAI, Anthropic, or bring your
        own self-hosted model — each with different cost, accuracy, and data residency
        characteristics.
      </p>

      {/* Provider Comparison */}
      <SectionHeading>Provider Comparison</SectionHeading>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-8">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Feature</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">OpenAI</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Anthropic</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Self-Hosted</th>
            </tr>
          </thead>
          <tbody>
            {[
              { feature: "Recommended Model", openai: "gpt-4o-mini", anthropic: "claude-3-5-sonnet-latest", selfhosted: "Any OpenAI-compatible" },
              { feature: "Data Residency", openai: "US/EU (via API)", anthropic: "US (via API)", selfhosted: "Your infrastructure" },
              { feature: "Cost per Scan (est.)", openai: "$0.02–$0.15", anthropic: "$0.05–$0.30", selfhosted: "Infra cost only" },
              { feature: "Setup Time", openai: "5 min (API key)", anthropic: "5 min (API key)", selfhosted: "1–4 hours (deploy model)" },
              { feature: "Prompt Customization", openai: "Full", anthropic: "Full", selfhosted: "Full" },
              { feature: "Rate Limit Handling", openai: "Built-in retry", anthropic: "Built-in retry", selfhosted: "Configurable" },
            ].map((row) => (
              <tr
                key={row.feature}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-2.5 text-[var(--signal-fg-primary)] font-medium">
                  {row.feature}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">{row.openai}</td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">{row.anthropic}</td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">{row.selfhosted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* OpenAI Setup */}
      <SectionHeading>OpenAI Setup</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        OpenAI is the default LLM provider. It offers the best speed/cost/accuracy
        balance for flag cleanup analysis and requires only an API key to get started.
      </p>
      <StepsSimple>
        <StepSimple title="1. Get an API key">
          <p>
            Create an API key at{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--signal-fg-accent)] hover:underline font-medium"
            >
              platform.openai.com/api-keys
            </a>
            . You&apos;ll need a funded OpenAI account with API access.
          </p>
        </StepSimple>
        <StepSimple title="2. Configure AI Janitor">
          <p>In the AI Janitor settings page, select OpenAI as your provider and enter your API key:</p>
          <CodeBlock language="json">
            {`{
  "llm_provider": "openai",
  "llm_model": "gpt-4o-mini",
  "openai_api_key": "sk-..."
}`}
          </CodeBlock>
        </StepSimple>
        <StepSimple title="3. Choose a model">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <strong className="text-[var(--signal-fg-primary)]">gpt-4o-mini</strong>{" "}
              — Recommended. Fast, cost-effective, sufficient for 95% of flag cleanup tasks.
            </li>
            <li>
              <strong className="text-[var(--signal-fg-primary)]">gpt-4o</strong>{" "}
              — Higher accuracy for complex refactors involving many flags or intricate logic.
            </li>
          </ul>
        </StepSimple>
      </StepsSimple>

      {/* Anthropic Setup */}
      <SectionHeading>Anthropic Setup</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Anthropic&apos;s Claude models offer strong code understanding and are a good
        alternative if you prefer Anthropic&apos;s API or have existing Anthropic
        contracts.
      </p>
      <StepsSimple>
        <StepSimple title="1. Get an API key">
          <p>
            Create an API key at{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--signal-fg-accent)] hover:underline font-medium"
            >
              console.anthropic.com/settings/keys
            </a>
            .
          </p>
        </StepSimple>
        <StepSimple title="2. Configure AI Janitor">
          <CodeBlock language="json">
            {`{
  "llm_provider": "anthropic",
  "llm_model": "claude-3-5-sonnet-latest",
  "anthropic_api_key": "sk-ant-..."
}`}
          </CodeBlock>
        </StepSimple>
        <StepSimple title="3. Choose a model">
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <strong className="text-[var(--signal-fg-primary)]">claude-3-5-sonnet-latest</strong>{" "}
              — Recommended. Excellent code understanding and generation.
            </li>
            <li>
              <strong className="text-[var(--signal-fg-primary)]">claude-3-haiku-latest</strong>{" "}
              — Faster and cheaper, suitable for straightforward flag removals.
            </li>
          </ul>
        </StepSimple>
      </StepsSimple>

      {/* Self-Hosted Setup */}
      <SectionHeading>Self-Hosted Setup</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For organizations with strict data residency requirements or existing GPU
        infrastructure, AI Janitor supports any OpenAI-compatible API endpoint. This
        includes popular model serving frameworks like vLLM, Ollama, and LM Studio.
      </p>

      <Callout variant="info" title="Compatibility requirements">
        Your self-hosted endpoint must be OpenAI API-compatible (support the{" "}
        <InlineCode>/v1/chat/completions</InlineCode> endpoint) and accessible from
        FeatureSignals&apos; infrastructure. Models should support at least 8K tokens
        of context for effective code analysis.
      </Callout>

      <StepsSimple>
        <StepSimple title="1. Deploy a compatible model">
          <CodeBlock language="bash" title="Example: Deploy with vLLM">
            {`# Deploy an OpenAI-compatible model with vLLM
python -m vllm.entrypoints.openai.api_server \\
  --model meta-llama/Llama-3.1-8B-Instruct \\
  --host 0.0.0.0 \\
  --port 8000`}
          </CodeBlock>
        </StepSimple>
        <StepSimple title="2. Configure AI Janitor">
          <CodeBlock language="json">
            {`{
  "llm_provider": "self_hosted",
  "llm_model": "meta-llama/Llama-3.1-8B-Instruct",
  "self_hosted_endpoint": "https://llm.internal.example.com/v1",
  "self_hosted_api_key": "optional-auth-token"
}`}
          </CodeBlock>
        </StepSimple>
      </StepsSimple>

      {/* Rate Limits & Token Usage */}
      <SectionHeading>Rate Limits &amp; Token Usage</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        AI Janitor makes multiple LLM calls per scan — one per file that references
        a stale flag. Understanding rate limits and token consumption helps you
        estimate costs and avoid throttling.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
          <h3 className="font-semibold text-[var(--signal-fg-primary)] mb-2 flex items-center gap-2">
            <Cpu size={16} className="text-[var(--signal-fg-accent)]" />
            Token Estimation
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--signal-fg-secondary)]">
            <li>~500 tokens per file for context (system prompt + flag metadata)</li>
            <li>~1K–3K tokens per file for the code being analyzed</li>
            <li>~500–2K tokens per file for the generated response (diff)</li>
            <li>Total per file: ~2K–5.5K tokens</li>
            <li>Total per 50-flag scan: ~10K–50K tokens</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]">
          <h3 className="font-semibold text-[var(--signal-fg-primary)] mb-2 flex items-center gap-2">
            <Shield size={16} className="text-[var(--signal-fg-accent)]" />
            Rate Limit Handling
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--signal-fg-secondary)]">
            <li>AI Janitor automatically respects rate limit headers</li>
            <li>Exponential backoff with jitter on 429 responses</li>
            <li>Maximum 3 retries per LLM call before failing</li>
            <li>Scans are paused (not failed) when rate limits are hit</li>
            <li>Concurrent LLM calls limited to 5 by default</li>
          </ul>
        </div>
      </div>

      {/* Prompt Customization */}
      <SectionHeading>Prompt Customization</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Advanced users can customize the system prompt AI Janitor sends to the LLM.
        This is useful for enforcing code style conventions, adding organization-specific
        instructions, or improving accuracy for your codebase.
      </p>
      <CodeBlock language="json" title="Custom prompt configuration">
        {`{
  "custom_system_prompt": "You are an expert code reviewer specializing in feature flag cleanup. Follow these rules:\\n1. Always preserve the active code path (the branch that was always taken)\\n2. Remove any now-unused imports\\n3. If removing a flag eliminates the last reference to an imported module, remove that import\\n4. Keep JSDoc/comment headers intact\\n5. Do not modify any code outside the flag conditional block\\n6. Format output as a unified diff"
}`}
      </CodeBlock>
      <Callout variant="warning" title="Prompt changes affect accuracy">
        Custom prompts can significantly change AI Janitor&apos;s behavior. Test
        prompt changes on a small set of flags before applying them organization-wide.
        Poorly designed prompts may cause the LLM to remove incorrect code paths,
        delete unrelated code, or fail to generate valid diffs.
      </Callout>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "AI Janitor Configuration — All config options", href: "/docs/advanced/ai-janitor-configuration" },
          { label: "PR Workflow — Review process and auto-merge", href: "/docs/advanced/ai-janitor-pr-workflow" },
          { label: "AI Janitor Quickstart — Get started in 5 minutes", href: "/docs/advanced/ai-janitor-quickstart" },
          { label: "Troubleshooting — Common issues and solutions", href: "/docs/advanced/ai-janitor-troubleshooting" },
        ].map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors font-medium"
          >
            <ArrowRight size={14} />
            <span>{step.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}

function StepsSimple({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 mb-6">
      {children}
    </div>
  );
}

function StepSimple({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-2">{title}</h4>
      <div className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}
