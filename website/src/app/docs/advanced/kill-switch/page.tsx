import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, AlertTriangle, Zap } from "lucide-react";
import CodeBlock from "@/components/docs/CodeBlock";
import Callout from "@/components/docs/Callout";
import Steps, { Step } from "@/components/docs/Steps";

export const metadata: Metadata = {
  title: "Kill Switch",
  description:
    "Create a global emergency kill switch — wire it into your application, test the emergency procedure, and integrate with incident management workflows.",
};

export default function KillSwitchAdvancedPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Kill Switch
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        A global kill switch is your last line of defense — a single flag that
        can disable an entire subsystem, feature area, or even your whole
        application in an emergency. This guide covers creating, wiring,
        testing, and integrating a global kill switch into your incident
        response workflow.
      </p>

      <Callout variant="danger" title="This is an emergency control">
        A global kill switch is not a feature flag — it&apos;s a circuit
        breaker. It should only be toggled during incidents by authorized
        personnel. Every toggle should trigger alerts, create an audit trail,
        and initiate your incident response process.
      </Callout>

      {/* Architecture */}
      <SectionHeading>Global Kill Switch Architecture</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A global kill switch works by placing a flag check at the highest level
        of your application — before any business logic executes. When toggled
        OFF, all requests are short-circuited with a controlled degradation
        response.
      </p>
      <div className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] mb-6">
        <pre className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed font-mono">
          {`┌─────────────────────────────────────────┐
│            Incoming Request               │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│     Kill Switch Middleware (FIRST)       │
│  ┌───────────────────────────────────┐  │
│  │ boolVariation("global-killswitch") │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│         ┌────────┴────────┐             │
│         ▼                 ▼             │
│    [ON: Continue]   [OFF: 503 +        │
│     ▼                Retry-After]      │
│  Normal Request                        │
│  Processing                            │
└─────────────────────────────────────────┘`}
        </pre>
      </div>

      {/* Steps */}
      <Steps>
        <Step title="1. Create the global kill switch flag">
          <p className="mb-3">
            Create an ops-category flag that will serve as your global circuit
            breaker. Default to <InlineCode>true</InlineCode> (ON = application
            normal; OFF = kill switch engaged).
          </p>
          <CodeBlock language="bash" title="Create global kill switch">
            {`curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "global-killswitch",
    "name": "Global Kill Switch",
    "type": "boolean",
    "defaultValue": true,
    "toggleCategory": "ops",
    "description": "EMERGENCY: Global circuit breaker. Flip OFF to immediately degrade all traffic. Toggles are audited and trigger PagerDuty alerts."
  }'`}
          </CodeBlock>
        </Step>

        <Step title="2. Wire it at the highest level of your app">
          <p className="mb-3">
            The kill switch must execute before any business logic — in your
            HTTP middleware stack, API gateway, or service mesh. Here&apos;s how
            to implement it in various architectures:
          </p>

          <CodeBlock
            language="typescript"
            title="Express/Node.js — Top-level middleware"
          >
            {`import express from 'express';
import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient(process.env.FS_API_KEY!, {
  envKey: 'production',
});
await client.waitForReady();

const app = express();

// ⚠️ Global kill switch — MUST be the first middleware
app.use(async (req, res, next) => {
  const appActive = client.boolVariation(
    'global-killswitch',
    { key: 'global' }, // Global flag — no user context needed
    true, // Default ON — keep serving if SDK unreachable
  );

  if (!appActive) {
    // Kill switch is OFF — degrade immediately
    res.setHeader('Retry-After', '120');
    res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'The application is undergoing emergency maintenance.',
      incident_id: req.headers['x-incident-id'] || 'unknown',
    });
    return;
  }

  next();
});

// ... rest of your middleware and routes`}
          </CodeBlock>

          <CodeBlock language="go" title="Go — Chi middleware">
            {`package middleware

import (
    "net/http"
    fs "github.com/featuresignals/sdk-go"
)

// GlobalKillSwitch is the first middleware in the chain.
// When the kill switch flag is OFF, all requests return 503 immediately.
func GlobalKillSwitch(client *fs.Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Check global kill switch with no user context
            active := client.BoolVariation(
                "global-killswitch",
                fs.NewContext("global"),
                true, // Default ON
            )

            if !active {
                w.Header().Set("Content-Type", "application/json")
                w.Header().Set("Retry-After", "120")
                w.WriteHeader(http.StatusServiceUnavailable)
                w.Write([]byte(\`{
  "error": "Service temporarily unavailable",
  "message": "The application is undergoing emergency maintenance."
}\`))
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}`}
          </CodeBlock>

          <CodeBlock language="yaml" title="API Gateway — Kong / NGINX">
            {`# Kong declarative config — global kill switch via FeatureSignals
# Requires a custom plugin or sidecar that checks the flag

_format_version: "3.0"
services:
  - name: my-api
    url: http://my-api-service:8080
    routes:
      - name: api-route
        paths:
          - /api
        plugins:
          - name: featuresignals-killswitch
            config:
              flag_key: global-killswitch
              environment_key: production
              api_key: $FS_API_KEY
              fallback_status: 503
              retry_after: 120
              degradation_message: |
                The application is undergoing emergency maintenance.
                Please try again in 2 minutes.`}
          </CodeBlock>
        </Step>

        <Step title="3. Create the emergency procedure">
          <p className="mb-3">
            Document the exact steps for engaging and disengaging the kill
            switch. This procedure should be in your incident runbook and
            practiced during fire drills.
          </p>

          <div className="p-4 rounded-lg border border-[var(--signal-border-danger-muted)] bg-[var(--signal-bg-danger-muted)] mb-3">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle
                size={18}
                className="text-[var(--signal-fg-danger)]"
              />
              <h4 className="text-base font-semibold text-[var(--signal-fg-primary)]">
                Emergency Kill Switch Procedure
              </h4>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-[var(--signal-fg-primary)] mb-1">
                  To ENGAGE (disable traffic):
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-[var(--signal-fg-secondary)]">
                  <li>Declare an incident in your incident management tool</li>
                  <li>
                    Navigate to the global kill switch flag in FeatureSignals
                  </li>
                  <li>Toggle the flag OFF for the production environment</li>
                  <li>Verify your monitoring shows traffic being diverted</li>
                  <li>Post in #incidents Slack channel with incident ID</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-[var(--signal-fg-primary)] mb-1">
                  To DISENGAGE (restore traffic):
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-[var(--signal-fg-secondary)]">
                  <li>Confirm the underlying issue is resolved</li>
                  <li>Toggle the flag ON for the production environment</li>
                  <li>Monitor error rates and latency for 5 minutes</li>
                  <li>If stable, resolve the incident</li>
                </ol>
              </div>
            </div>
          </div>
        </Step>

        <Step title="4. Set up audit alerts">
          <p className="mb-3">
            Every toggle of a global kill switch must be audited and alerted.
            Configure webhooks to notify your incident management tools:
          </p>
          <CodeBlock
            language="bash"
            title="Create webhook for kill switch toggles"
          >
            {`curl -X POST https://api.featuresignals.com/v1/webhooks \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "events": ["flag.environment.updated"],
    "filter": {
      "flag_keys": ["global-killswitch"],
      "environments": ["production"]
    },
    "description": "Alert #incidents when global kill switch is toggled"
  }'`}
          </CodeBlock>
        </Step>

        <Step title="5. Test the kill switch">
          <p className="mb-3">
            Test the kill switch in staging at least once per sprint. A kill
            switch that hasn&apos;t been tested is a kill switch that won&apos;t
            work.
          </p>
          <CodeBlock language="bash" title="Kill switch test script">
            {`#!/bin/bash
# test-global-killswitch.sh — automated kill switch test

echo "=== Global Kill Switch Test ==="

# 1. Verify normal traffic
echo "[1/3] Testing normal traffic..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.staging.example.com/health)
if [ "$STATUS" != "200" ]; then
  echo "FAIL: Health check returned $STATUS before kill switch"
  exit 1
fi
echo "  ✓ Normal traffic OK"

# 2. Engage kill switch
echo "[2/3] Engaging kill switch..."
curl -s -X PATCH \\
  "https://api.featuresignals.com/v1/flags/by-key/global-killswitch/environments/staging" \\
  -H "Authorization: Bearer $FS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled": false}' > /dev/null

sleep 30  # Wait for propagation

# 3. Verify degradation
echo "[3/3] Verifying kill switch degradation..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.staging.example.com/health)
RETRY=$(curl -s -I https://api.staging.example.com/health | grep -i "retry-after" || echo "")

if [ "$STATUS" = "503" ] && [ -n "$RETRY" ]; then
  echo "  ✓ Kill switch working (HTTP $STATUS, Retry-After present)"
else
  echo "  ✗ Kill switch NOT working (HTTP $STATUS, Retry-After: \${RETRY:-none})"
fi

# Restore
echo "Restoring kill switch..."
curl -s -X PATCH \\
  "https://api.featuresignals.com/v1/flags/by-key/global-killswitch/environments/staging" \\
  -H "Authorization: Bearer $FS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled": true}' > /dev/null

echo "=== Test complete ==="`}
          </CodeBlock>
        </Step>
      </Steps>

      {/* Best Practices */}
      <SectionHeading>Best Practices</SectionHeading>
      <div className="space-y-3 mb-6">
        {[
          {
            icon: Shield,
            title: "Default ON, not OFF",
            desc: "The kill switch flag should default to true (ON). If your SDK can't reach FeatureSignals, the application should continue serving traffic — not degrade. The kill switch is a deliberate action, not an accidental state.",
          },
          {
            icon: Zap,
            title: "Minimize propagation delay",
            desc: "Configure your SDK's polling interval to 15–30 seconds for kill switch flags. In an emergency, every second counts. Consider using the streaming/SSE update mode if your SDK supports it.",
          },
          {
            icon: AlertTriangle,
            title: "Never automate kill switch toggles",
            desc: "Kill switches should only be toggled by humans. Automated toggling (e.g., based on error rate thresholds) can create feedback loops where the kill switch engages, reducing load, which makes the error rate drop, which disengages the kill switch, which restores load...",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex gap-3 p-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]"
          >
            <item.icon
              size={18}
              className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
            />
            <div>
              <h4 className="font-semibold text-[var(--signal-fg-primary)] text-sm mb-0.5">
                {item.title}
              </h4>
              <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          {
            label: "Kill Switch Pattern Tutorial — Per-feature kill switches",
            href: "/docs/tutorials/kill-switch",
          },
          {
            label: "Progressive Rollout Tutorial — Safe feature releases",
            href: "/docs/tutorials/progressive-rollout",
          },
          {
            label: "Webhooks — Set up automated alerts",
            href: "/docs/advanced/webhooks",
          },
          {
            label: "Audit Logging — Track every toggle",
            href: "/docs/advanced/audit-logging",
          },
          {
            label: "AI Janitor — Clean up stale flags automatically",
            href: "/docs/advanced/ai-janitor",
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
