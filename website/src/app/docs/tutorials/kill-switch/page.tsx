import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lightbulb, Shield } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Kill Switch Pattern",
  description:
    "Learn how to implement a kill switch flag pattern to instantly disable features in production without deploying code.",
};

export default function KillSwitchTutorialPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Kill Switch Pattern
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        A kill switch is a feature flag designed to be flipped OFF in an
        emergency — instantly disabling a feature, integration, or code path
        without waiting for a deployment. It&apos;s your fastest rollback
        mechanism.
      </p>

      <Callout variant="info" title="What you'll build">
        You&apos;ll create a kill switch for a third-party payment integration.
        When the payment provider has an outage, you can flip the kill switch to
        OFF — instantly falling back to a cached or queued payment flow without
        impacting your users.
      </Callout>

      {/* When to use */}
      <SectionHeading>When to Use a Kill Switch</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Kill switches are ideal for high-risk or externally-dependent
        functionality:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>Third-party API integrations (payment, email, SMS, mapping)</li>
        <li>New infrastructure that may degrade under load</li>
        <li>Experimental features with unknown failure modes</li>
        <li>Features with regulatory or compliance risk</li>
        <li>Code paths that touch customer billing or PII</li>
      </ul>

      <Callout variant="warning" title="Kill switches vs. feature flags">
        While all feature flags can serve as kill switches, a dedicated kill
        switch flag has different characteristics: it should default to{" "}
        <strong>ON</strong>
        (not OFF), be categorized as <InlineCode>ops</InlineCode> (indefinite
        lifespan), and be tested regularly with fire drills.
      </Callout>

      {/* Step 1 */}
      <SectionHeading>Step 1: Create the Kill Switch Flag</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Create an ops-category flag with a default value of{" "}
        <InlineCode>true</InlineCode>. This means &quot;feature is active&quot;
        by default, and flipping it OFF disables the feature.
      </p>
      <CodeBlock language="bash" title="Create kill switch via API">
        {`curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "killswitch-payment-provider",
    "name": "Payment Provider Kill Switch",
    "type": "boolean",
    "defaultValue": true,
    "toggleCategory": "ops",
    "description": "Emergency kill switch for the third-party payment provider. Flip OFF to disable and fall back to queued/cached payments."
  }'`}
      </CodeBlock>
      <p className="text-sm text-[var(--signal-fg-secondary)] mt-2">
        The <InlineCode>ops</InlineCode> category tells FeatureSignals this flag
        should never be marked stale — it&apos;s expected to live indefinitely.
      </p>

      {/* Step 2 */}
      <SectionHeading>
        Step 2: Wire the Kill Switch Into Your App
      </SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Wrap the risky code path with the kill switch. The flag is checked on
        every request to ensure the fastest possible reaction to an emergency
        toggle.
      </p>

      <CodeBlock
        language="typescript"
        title="Node.js — Payment service with kill switch"
      >
        {`import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient(process.env.FS_API_KEY!, {
  envKey: 'production',
});
await client.waitForReady();

interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
}

async function processPayment(req: PaymentRequest) {
  // Check kill switch FIRST — before any payment processing
  const providerActive = client.boolVariation(
    'killswitch-payment-provider',
    { key: req.userId },
    true, // Default ON — if SDK is unreachable, keep the feature active
  );

  if (!providerActive) {
    // Kill switch is OFF — fall back to queued payment
    logger.warn('Payment provider kill switch active — queuing payment', {
      userId: req.userId,
      amount: req.amount,
    });
    return queuePaymentForLater(req);
  }

  // Normal path — call the third-party provider
  try {
    const result = await paymentProvider.charge(req);
    return result;
  } catch (error) {
    logger.error('Payment provider failed', { error, userId: req.userId });

    // Optionally check kill switch again — provider might have been disabled
    // during the request due to cascading failures
    const stillActive = client.boolVariation(
      'killswitch-payment-provider',
      { key: req.userId },
      true,
    );

    if (!stillActive) {
      return queuePaymentForLater(req);
    }

    throw error;
  }
}`}
      </CodeBlock>

      <CodeBlock language="go" title="Go — HTTP middleware kill switch">
        {`package middleware

import (
    "net/http"
    fs "github.com/featuresignals/sdk-go"
)

// KillSwitchMiddleware wraps an HTTP handler with a kill switch check.
// If the kill switch flag is OFF, the handler returns a 503 with a
// Retry-After header instead of processing the request.
func KillSwitchMiddleware(
    client *fs.Client,
    flagKey string,
) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            userID := r.Header.Get("X-User-ID")

            // Check kill switch — default ON
            active := client.BoolVariation(
                flagKey,
                fs.NewContext(userID),
                true,
            )

            if !active {
                w.Header().Set("Retry-After", "60")
                http.Error(w, "Service temporarily unavailable", http.StatusServiceUnavailable)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}

// Usage in router setup:
// r := chi.NewRouter()
// r.Use(KillSwitchMiddleware(fsClient, "killswitch-payment-provider"))
// r.Post("/api/payments", paymentHandler)`}
      </CodeBlock>

      <CodeBlock language="python" title="Python — Decorator-based kill switch">
        {`from functools import wraps
from featuresignals import FeatureSignalsClient, EvalContext

client: FeatureSignalsClient = None  # Initialized at app startup

def kill_switch(flag_key: str):
    """Decorator that gates a function behind a kill switch flag."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user context — adjust based on your framework
            user_id = kwargs.get("user_id", "unknown")

            active = client.bool_variation(
                flag_key,
                EvalContext(key=user_id),
                True,  # Default ON
            )

            if not active:
                raise ServiceUnavailableError(
                    f"Kill switch '{flag_key}' is active"
                )

            return func(*args, **kwargs)
        return wrapper
    return decorator


# Usage
@kill_switch("killswitch-payment-provider")
def process_payment(user_id: str, amount: int, currency: str):
    return payment_provider.charge(user_id, amount, currency)`}
      </CodeBlock>

      {/* Step 3 */}
      <SectionHeading>Step 3: Enable in All Environments</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Kill switches should be <strong>enabled (ON)</strong> in all
        environments from day one. They exist as a safety net — always ready,
        rarely used. Configure them:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Production:</strong> Enabled, 100% rollout (the kill switch is
          ON; the feature is active)
        </li>
        <li>
          <strong>Staging:</strong> Enabled, 100% rollout (test the kill switch
          in staging regularly)
        </li>
        <li>
          <strong>Development:</strong> Enabled, 100% rollout (developers can
          toggle locally to test fallback paths)
        </li>
      </ul>

      {/* Step 4 */}
      <SectionHeading>Step 4: Create a Runbook</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Every kill switch needs a runbook so any on-call engineer can operate
        it. Document the following:
      </p>
      <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] mb-6">
        <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-2 flex items-center gap-2">
          <Shield size={18} className="text-[var(--signal-fg-accent)]" />
          Kill Switch Runbook: Payment Provider
        </h3>
        <dl className="space-y-2 text-sm">
          {[
            { dt: "Flag Key", dd: "killswitch-payment-provider" },
            {
              dt: "Dashboard Link",
              dd: "https://app.featuresignals.com/flags/killswitch-payment-provider",
            },
            {
              dt: "Default State",
              dd: "ON (feature active, kill switch dormant)",
            },
            {
              dt: "When to Flip OFF",
              dd: "Payment provider outage, elevated error rates > 5%, provider security incident, or on-call manager directive",
            },
            {
              dt: "Effect of OFF",
              dd: "Payments are queued; users see 'Payment processing — confirmation email will be sent within 15 minutes'",
            },
            {
              dt: "Fallback Behavior",
              dd: "Payment queued to outbox table; processed when provider recovers and kill switch is re-enabled",
            },
            {
              dt: "Who Can Toggle",
              dd: "On-call engineer with Owner or Admin role",
            },
            {
              dt: "Notification",
              dd: "Flip triggers Slack #incidents and PagerDuty alert",
            },
          ].map((item) => (
            <div key={item.dt} className="flex gap-4">
              <dt className="font-semibold text-[var(--signal-fg-primary)] w-36 shrink-0">
                {item.dt}
              </dt>
              <dd className="text-[var(--signal-fg-secondary)]">{item.dd}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Step 5 */}
      <SectionHeading>Step 5: Test with a Fire Drill</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Kill switches that aren&apos;t tested don&apos;t work. Schedule regular
        fire drills to verify:
      </p>
      <ol className="list-decimal pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Toggle response time:</strong> Flip the kill switch OFF in
          staging and measure how long until your app starts returning the
          fallback behavior.
        </li>
        <li>
          <strong>Fallback correctness:</strong> Verify the fallback path
          actually works — queued payments are persisted, users see the right
          message, no data is lost.
        </li>
        <li>
          <strong>Re-enable response time:</strong> Flip the kill switch back ON
          and verify the primary path resumes correctly.
        </li>
        <li>
          <strong>Monitoring alert:</strong> Verify your alert fires when the
          kill switch is toggled.
        </li>
      </ol>

      <CodeBlock language="bash" title="Fire drill automation script">
        {`#!/bin/bash
# killswitch-drill.sh — automated fire drill for a kill switch

FLAG_KEY="killswitch-payment-provider"
API_KEY="$FS_API_KEY"
BASE_URL="https://api.featuresignals.com"

echo "=== Kill Switch Fire Drill: $FLAG_KEY ==="
echo ""

# 1. Record start time
START=$(date +%s)

# 2. Flip kill switch OFF
echo "[1/4] Flipping kill switch OFF..."
curl -s -X PATCH \\
  "$BASE_URL/v1/flags/by-key/$FLAG_KEY/environments/production" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled": false}' > /dev/null

# 3. Wait for propagation and test
echo "[2/4] Waiting for propagation (30s)..."
sleep 30

# 4. Verify fallback
echo "[3/4] Verifying fallback behavior..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \\
  -X POST "https://api.example.com/payments" \\
  -H "X-User-ID: drill-test-user" \\
  -d '{"amount": 100, "currency": "USD"}')

if [ "$RESPONSE" = "202" ]; then
  echo "  ✓ Fallback working (HTTP $RESPONSE — payment queued)"
else
  echo "  ✗ Unexpected response: HTTP $RESPONSE"
fi

# 5. Re-enable kill switch
echo "[4/4] Re-enabling kill switch..."
curl -s -X PATCH \\
  "$BASE_URL/v1/flags/by-key/$FLAG_KEY/environments/production" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled": true}' > /dev/null

END=$(date +%s)
DURATION=$((END - START))
echo ""
echo "=== Drill complete in \${DURATION}s ==="`}
      </CodeBlock>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          {
            label: "Progressive Rollout Tutorial — Safe feature releases",
            href: "/docs/tutorials/progressive-rollout",
          },
          {
            label: "Feature Flag a Checkout Flow — Another tutorial",
            href: "/docs/tutorials/feature-flag-checkout",
          },
          {
            label: "A/B Testing in React — Run experiments",
            href: "/docs/tutorials/ab-testing-react",
          },
          {
            label:
              "Emergency Kill Switch (Advanced) — Global emergency controls",
            href: "/docs/advanced/kill-switch",
          },
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
