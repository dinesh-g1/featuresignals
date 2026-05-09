import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Progressive Rollout Tutorial",
  description:
    "Learn how to implement a progressive percentage rollout from 0% to 100% over time using FeatureSignals feature flags and SDKs.",
};

export default function ProgressiveRolloutPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Progressive Rollout Tutorial
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Learn how to safely release a new feature by gradually increasing the percentage
        of users who see it — from 0% to 100% — while monitoring for errors and regressions
        at every step.
      </p>

      <Callout variant="info" title="What you'll build">
        In this tutorial, you&apos;ll implement a progressive rollout for a new search
        algorithm. You&apos;ll start at 0%, ramp to 5% (canary), then 25%, 50%, 75%, and
        finally 100% — all without deploying code. Each step is gated by monitoring checks.
      </Callout>

      {/* Overview */}
      <SectionHeading>How Percentage Rollouts Work</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals uses <strong>consistent hashing</strong> for percentage rollouts.
        When you set a flag to roll out at 25%, exactly 25% of your users receive the
        enabled variation — and the same users consistently receive it throughout the
        rollout. The hash is computed from a user attribute you specify (typically{" "}
        <InlineCode>user_id</InlineCode> or <InlineCode>email</InlineCode>).
      </p>
      <p className="text-[var(--signal-fg-secondary)] mb-6">
        This means a user who sees the new feature at 10% will still see it at 50% and
        100%. They&apos;re never &quot;flipped back&quot; to the old behavior as the
        percentage increases — unless you explicitly change the stickiness attribute.
      </p>

      {/* Step 1 */}
      <SectionHeading>Step 1: Create the Feature Flag</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Create a boolean flag that will control the new search algorithm. You can do
        this via the dashboard or the API.
      </p>
      <CodeBlock language="bash" title="Create flag via API">
        {`curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "new-search-algorithm",
    "name": "New Search Algorithm",
    "type": "boolean",
    "defaultValue": false,
    "toggleCategory": "release"
  }'`}
      </CodeBlock>

      {/* Step 2 */}
      <SectionHeading>Step 2: Instrument Your Code</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Wrap the new search algorithm behind the feature flag. Here are examples in
        several languages:
      </p>

      <CodeBlock language="typescript" title="Node.js">
        {`import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient(process.env.FS_API_KEY!, {
  envKey: 'production',
});

await client.waitForReady();

async function search(query: string, user: { id: string }) {
  const useNewAlgorithm = client.boolVariation(
    'new-search-algorithm',
    { key: user.id },
    false,
  );

  if (useNewAlgorithm) {
    return newSearchAlgorithm(query);
  }
  return legacySearchAlgorithm(query);
}`}
      </CodeBlock>

      <CodeBlock language="go" title="Go">
        {`package search

import (
    fs "github.com/featuresignals/sdk-go"
)

var client *fs.Client

func init() {
    client = fs.NewClient(
        os.Getenv("FS_API_KEY"),
        "production",
    )
    <-client.Ready()
}

func Search(ctx context.Context, query string, userID string) ([]Result, error) {
    useNew := client.BoolVariation(
        "new-search-algorithm",
        fs.NewContext(userID),
        false,
    )

    if useNew {
        return newSearchAlgorithm(ctx, query)
    }
    return legacySearchAlgorithm(ctx, query)
}`}
      </CodeBlock>

      <CodeBlock language="python" title="Python">
        {`from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext
import os

client = FeatureSignalsClient(
    os.environ["FS_API_KEY"],
    ClientOptions(env_key="production"),
)
client.wait_for_ready()

def search(query: str, user_id: str) -> list[dict]:
    use_new = client.bool_variation(
        "new-search-algorithm",
        EvalContext(key=user_id),
        False,
    )

    if use_new:
        return new_search_algorithm(query)
    return legacy_search_algorithm(query)`}
      </CodeBlock>

      {/* Step 3 */}
      <SectionHeading>Step 3: Start at 0% (Dark Launch)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Deploy the instrumented code with the flag set to <strong>0%</strong> in
        production. This is a &quot;dark launch&quot; — the new code path is deployed
        but no users hit it yet. Monitor your application for any unrelated regressions
        from the code deploy.
      </p>
      <Callout variant="info">
        Always deploy the flag-wrapped code first with 0% rollout. This decouples the
        code deployment from the feature release and lets you verify the wrapping code
        itself doesn&apos;t introduce issues.
      </Callout>

      {/* Step 4 */}
      <SectionHeading>Step 4: Canary at 5%</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Enable the flag for 5% of users via the FeatureSignals dashboard:
      </p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>Open the <strong>new-search-algorithm</strong> flag</li>
        <li>Select the <strong>production</strong> environment</li>
        <li>Set <strong>Rollout Percentage</strong> to <strong>5%</strong></li>
        <li>Set <strong>Stickiness Attribute</strong> to <InlineCode>user_id</InlineCode></li>
        <li>Click <strong>Save</strong></li>
      </ol>

      <p className="text-[var(--signal-fg-secondary)] mb-4">
        Monitor for at least 30 minutes at 5%. Watch for:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Increased error rates on the search endpoint</li>
        <li>Increased p95/p99 latency</li>
        <li>Unexpected log patterns or warnings</li>
        <li>User-reported issues via support channels</li>
      </ul>

      {/* Step 5 */}
      <SectionHeading>Step 5: Ramp Through Checkpoints</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Gradually increase the percentage, monitoring at each checkpoint before
        proceeding. Here&apos;s a recommended ramp schedule:
      </p>

      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Stage</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Percentage</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Minimum Wait</th>
              <th className="px-4 py-2.5 font-semibold text-[var(--signal-fg-primary)]">Check</th>
            </tr>
          </thead>
          <tbody>
            {[
              { stage: "Canary", pct: "5%", wait: "30 min", check: "Error rates, latency" },
              { stage: "Early Ramp", pct: "25%", wait: "1 hour", check: "Error budget, conversion" },
              { stage: "Half Rollout", pct: "50%", wait: "2 hours", check: "A/B metrics comparison" },
              { stage: "Late Ramp", pct: "75%", wait: "4 hours", check: "Infra load, DB query perf" },
              { stage: "Full Rollout", pct: "100%", wait: "N/A", check: "Remove flag after 1 week" },
            ].map((row) => (
              <tr
                key={row.stage}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-2.5 text-[var(--signal-fg-primary)] font-medium">
                  {row.stage}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-accent)] font-mono">
                  {row.pct}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">
                  {row.wait}
                </td>
                <td className="px-4 py-2.5 text-[var(--signal-fg-secondary)]">
                  {row.check}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout variant="warning" title="Have a rollback plan">
        At any stage, you can instantly set the percentage back to 0% if something
        goes wrong. FeatureSignals propagates the change to all SDKs within your
        configured polling interval (default: 30 seconds). No code deploy required.
      </Callout>

      {/* Step 6 */}
      <SectionHeading>Step 6: Automate Ramp Checks (Optional)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        For teams practicing continuous delivery, you can automate the ramp using the
        FeatureSignals API and your CI/CD pipeline:
      </p>

      <CodeBlock language="bash" title="Automated ramp script">
        {`#!/bin/bash
# ramp-flag.sh — progressively increase rollout percentage

API_KEY="$FS_API_KEY"
FLAG_KEY="new-search-algorithm"
ENV_KEY="production"
BASE_URL="https://api.featuresignals.com"

ramp() {
  local percentage=$1
  echo "Ramping $FLAG_KEY to $percentage%..."

  curl -X PATCH \\
    "$BASE_URL/v1/flags/by-key/$FLAG_KEY/environments/$ENV_KEY" \\
    -H "Authorization: Bearer $API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"rolloutPercentage\\": $percentage, \\"enabled\\": true}"

  echo "Waiting for propagation..."
  sleep 60  # Allow SDKs to pick up the change
}

# Check error rate before proceeding
check_errors() {
  # Replace with your monitoring tool's API
  error_rate=$(curl -s "$MONITORING_URL/api/errors?service=search" | jq '.rate')
  if (( $(echo "$error_rate > 0.01" | bc -l) )); then
    echo "ERROR: Error rate too high ($error_rate). Aborting!"
    ramp 0  # Rollback to 0%
    exit 1
  fi
  echo "Error rate OK: $error_rate"
}

# Ramp sequence
ramp 5   && sleep 1800 && check_errors  # 30 min at 5%
ramp 25  && sleep 3600 && check_errors  # 1 hour at 25%
ramp 50  && sleep 7200 && check_errors  # 2 hours at 50%
ramp 75  && sleep 14400 && check_errors # 4 hours at 75%
ramp 100

echo "Full rollout complete!"`}
      </CodeBlock>

      {/* Step 7 */}
      <SectionHeading>Step 7: Clean Up the Flag</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        After the flag has been at 100% for at least a week with no issues, it&apos;s
        time to remove the flag from your codebase. The AI Janitor can help detect
        flags ready for cleanup:
      </p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          Navigate to <strong>AI Janitor</strong> in the FeatureSignals dashboard
        </li>
        <li>
          The Janitor will flag <InlineCode>new-search-algorithm</InlineCode> as a
          stale candidate (100% rollout, no recent toggles)
        </li>
        <li>
          Click <strong>Generate PR</strong> to automatically remove the flag from
          your codebase, keeping the new search algorithm path
        </li>
      </ol>

      <CodeBlock language="typescript" title="After cleanup — no more flag">
        {`// The cleaned-up code — flag check removed, new algorithm is the default
async function search(query: string) {
  return newSearchAlgorithm(query);
}`}
      </CodeBlock>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Kill Switch Pattern — Emergency off switches", href: "/docs/tutorials/kill-switch" },
          { label: "A/B Testing in React — Run experiments", href: "/docs/tutorials/ab-testing-react" },
          { label: "Feature Flag a Checkout Flow — Another tutorial", href: "/docs/tutorials/feature-flag-checkout" },
          { label: "AI Janitor — Automate flag cleanup", href: "/docs/advanced/ai-janitor" },
        ].map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRight size={14} />
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
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
