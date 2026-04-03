---
title: "Feature Flag a Checkout Flow in 5 Minutes"
sidebar_label: "Feature Flag a Checkout"
---

# Feature Flag a Checkout Flow in 5 Minutes

Learn how to wrap a new checkout experience behind a feature flag and roll it out safely.

## Prerequisites

- FeatureSignals server running (locally or hosted)
- An API key for your environment
- Node.js SDK installed (`npm install @featuresignals/node-sdk`)

## Step 1: Create the Flag

In the FeatureSignals Flag Engine, navigate to your project and create a new flag:

- **Key**: `new-checkout`
- **Name**: New Checkout Flow
- **Type**: Boolean
- **Default value**: `false`

Or use the API:

```bash
curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "new-checkout",
    "name": "New Checkout Flow",
    "type": "boolean",
    "defaultValue": false
  }'
```

## Step 2: Install and Initialize the SDK

```bash
npm install @featuresignals/node-sdk
```

Initialize the client in your application entry point:

```javascript
const { FeatureSignals } = require('@featuresignals/node-sdk');

const client = new FeatureSignals({
  apiKey: process.env.FEATURESIGNALS_API_KEY,
});

await client.initialize();
```

## Step 3: Wrap Your Checkout Code

Use `boolVariation` to branch between the old and new checkout paths:

```javascript
app.post('/checkout', async (req, res) => {
  const user = req.user;

  const useNewCheckout = await client.boolVariation('new-checkout', {
    userID: user.id,
    email: user.email,
    plan: user.plan,
  }, false);

  if (useNewCheckout) {
    return handleNewCheckout(req, res);
  }

  return handleLegacyCheckout(req, res);
});
```

The third argument (`false`) is the fallback value returned if the flag can't be evaluated.

## Step 4: Enable in Staging First

1. Go to the **Environments** tab for the `new-checkout` flag
2. Select your **Staging** environment
3. Toggle **Enabled** to `true`
4. Click **Save**

Run your test suite against staging to verify the new checkout works correctly.

## Step 5: Roll Out to Production

Once verified in staging, enable the flag in production:

1. Select **Production** environment
2. Set percentage to **10%** for a canary release
3. Monitor error rates and conversion metrics
4. Gradually increase to 50%, then 100%

Or use the promote API to copy staging state to production:

```bash
curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags/new-checkout/promote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromEnvID": "staging-env-id",
    "toEnvID": "production-env-id"
  }'
```

## Step 6: Clean Up

Once the new checkout is stable and serving 100% of traffic:

1. Remove the flag check from your code — keep only the new checkout path
2. Deploy the simplified code
3. Delete the flag from the Flag Engine

```javascript
// After cleanup — no more flag check
app.post('/checkout', async (req, res) => {
  return handleNewCheckout(req, res);
});
```

## Next Steps

- [Set up a kill switch](/docs/tutorials/kill-switch) for instant rollback
- [Add A/B testing](/docs/tutorials/ab-testing-react) to measure conversion rates
- [Configure approval workflows](/docs/advanced/approval-workflows) for production changes
