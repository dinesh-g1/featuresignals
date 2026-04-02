---
title: "Set Up an Instant Kill Switch"
sidebar_label: "Kill Switch"
---

# Set Up an Instant Kill Switch

Learn how to use FeatureSignals as an emergency kill switch to instantly disable a critical feature across all environments.

## Prerequisites

- FeatureSignals server running
- A project with at least one environment
- An SDK integrated in your application

## What Is a Kill Switch?

A kill switch is a feature flag that controls a critical code path. When something goes wrong in production — a third-party API outage, a payment processor failure, a runaway query — you can disable the flag in seconds instead of deploying a hotfix.

## Step 1: Create the Flag

Create a boolean flag that gates the critical functionality:

- **Key**: `payment-processing`
- **Name**: Payment Processing
- **Type**: Boolean
- **Default**: `true` (enabled by default)

```bash
curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "payment-processing",
    "name": "Payment Processing",
    "type": "boolean",
    "defaultValue": true
  }'
```

Enable it in all environments so the feature works normally.

## Step 2: Wrap the Critical Path

Guard your critical functionality with the flag:

```javascript
const { FeatureSignals } = require('@featuresignals/node-sdk');

const client = new FeatureSignals({
  apiKey: process.env.FEATURESIGNALS_API_KEY,
  streaming: true, // real-time updates via SSE
});

await client.initialize();

app.post('/api/charge', async (req, res) => {
  const paymentEnabled = await client.boolVariation(
    'payment-processing',
    { userID: req.user.id },
    false // safe fallback: disable if SDK can't reach server
  );

  if (!paymentEnabled) {
    return res.status(503).json({
      error: 'Payment processing is temporarily unavailable. Please try again later.',
    });
  }

  const result = await processPayment(req.body);
  return res.json(result);
});
```

### Key Design Decisions

- **`streaming: true`**: Ensures your application receives flag changes in real time via SSE, no polling delay
- **`false` fallback**: If the SDK can't connect to FeatureSignals, payments are disabled as a safety measure — adjust this based on your risk tolerance
- **Graceful error response**: Return a 503 with a user-friendly message instead of crashing

## Step 3: Test the Kill Switch

Before you need it in an emergency, verify it works:

1. In a **staging** environment, disable the `payment-processing` flag
2. Confirm your application returns the 503 response
3. Re-enable the flag and confirm payments resume
4. Measure propagation time — with streaming enabled, it should be under 1 second

## Step 4: Emergency — Hit the Kill Switch

When an incident occurs, use the kill endpoint to disable the flag across **all** environments instantly:

```bash
curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags/payment-processing/kill \
  -H "Authorization: Bearer $TOKEN"
```

This single API call:
- Disables the flag in every environment (staging, production, etc.)
- Propagates to all connected SDKs via SSE within milliseconds
- Gets logged in the audit trail for post-incident review

You can also hit the kill switch from the dashboard: go to the flag → click the **Kill Switch** button.

## Step 5: Recover

Once the underlying issue is resolved:

1. Re-enable the flag in **staging** first
2. Test that payments work correctly
3. Re-enable in **production**

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/{projectID}/flags/payment-processing/environments/{prodEnvID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "enabled": true, "percentage": 100 }'
```

## Step 6: Set Up Alerts

Combine the kill switch with webhooks to notify your team:

```bash
curl -X POST https://api.featuresignals.com/v1/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "events": ["flag.killed", "flag.updated"]
  }'
```

Now your Slack channel is notified whenever the kill switch is activated or the flag state changes.

## Best Practices

- **Use streaming**: Set `streaming: true` in SDK config for sub-second propagation
- **Choose safe defaults**: For kill switches, the fallback value should match the "off" state
- **Test regularly**: Run kill switch drills during game days — don't wait for a real incident
- **Document runbooks**: Note which flags are kill switches and when to use them in your incident response docs
- **Use approval workflows**: For re-enabling after an incident, require [approval](/docs/advanced/approval-workflows) to prevent accidental re-activation

## Common Kill Switch Patterns

| Scenario | Flag Key | Default | Fallback |
|----------|----------|---------|----------|
| Payment processing | `payment-processing` | `true` | `false` |
| Third-party API calls | `external-api-enabled` | `true` | `false` |
| New feature rollout | `new-feature` | `false` | `false` |
| Resource-heavy computation | `heavy-computation` | `true` | `false` |

## Next Steps

- [Progressive rollout](/docs/tutorials/progressive-rollout) — gradually re-enable after an incident
- [Audit logging](/docs/advanced/audit-logging) — review who triggered the kill switch and when
- [Webhooks](/docs/advanced/webhooks) — integrate kill switch events with PagerDuty, Slack, or custom alerting
