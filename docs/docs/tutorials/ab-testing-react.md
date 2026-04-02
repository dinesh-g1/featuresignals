---
title: "A/B Testing with the React SDK"
sidebar_label: "A/B Testing in React"
---

# A/B Testing with the React SDK

Learn how to set up an A/B test using FeatureSignals and the React SDK to measure which variant performs better.

## Prerequisites

- FeatureSignals server running
- A project with at least one environment
- A React application (Create React App, Next.js, Vite, etc.)

## Step 1: Create a Multi-Variant Flag

In the dashboard, create a new flag with string variants:

- **Key**: `pricing-page-layout`
- **Name**: Pricing Page Layout Test
- **Type**: String
- **Variants**:
  - `control` — Current pricing page (default)
  - `variant-a` — New layout with feature comparison table
  - `variant-b` — Simplified single-column layout

```bash
curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "pricing-page-layout",
    "name": "Pricing Page Layout Test",
    "type": "string",
    "defaultValue": "control",
    "variants": [
      { "key": "control", "value": "control", "name": "Control" },
      { "key": "variant-a", "value": "variant-a", "name": "Feature Comparison" },
      { "key": "variant-b", "value": "variant-b", "name": "Simplified" }
    ]
  }'
```

## Step 2: Install the React SDK

```bash
npm install @featuresignals/react-sdk
```

## Step 3: Set Up the Provider

Wrap your app with the `FeatureSignalsProvider`:

```tsx
import { FeatureSignalsProvider } from '@featuresignals/react-sdk';

function App() {
  return (
    <FeatureSignalsProvider
      apiKey={process.env.REACT_APP_FS_CLIENT_KEY}
      context={{ userID: currentUser.id, email: currentUser.email }}
    >
      <Router>
        <Routes />
      </Router>
    </FeatureSignalsProvider>
  );
}
```

## Step 4: Use the Flag in Your Component

Use the `useFlag` hook to get the variant value and render the appropriate layout:

```tsx
import { useFlag } from '@featuresignals/react-sdk';

function PricingPage() {
  const layout = useFlag('pricing-page-layout', 'control');

  return (
    <div className="pricing-page">
      <h1>Choose Your Plan</h1>
      {layout === 'control' && <CurrentPricingLayout />}
      {layout === 'variant-a' && <ComparisonTableLayout />}
      {layout === 'variant-b' && <SimplifiedLayout />}
    </div>
  );
}
```

## Step 5: Configure the Rollout

In the dashboard, go to the flag's environment settings:

1. **Enable** the flag in your production environment
2. Set the **percentage rollout** to distribute traffic:
   - `control`: 34%
   - `variant-a`: 33%
   - `variant-b`: 33%

The SDK hashes the user ID to ensure consistent assignment — the same user always sees the same variant.

## Step 6: Track Conversions

Fire conversion events when users complete the target action (e.g., subscribing):

```tsx
import { useTrack } from '@featuresignals/react-sdk';

function PricingCard({ plan }) {
  const track = useTrack();

  const handleSubscribe = async () => {
    await subscribeToPlan(plan.id);
    track('pricing-conversion', {
      plan: plan.id,
      revenue: plan.price,
    });
  };

  return (
    <div className="pricing-card">
      <h3>{plan.name}</h3>
      <p>${plan.price}/mo</p>
      <button onClick={handleSubscribe}>Subscribe</button>
    </div>
  );
}
```

## Step 7: Analyze Results

After collecting sufficient data, check the evaluation metrics in the dashboard:

1. Navigate to **Metrics → Evaluations**
2. Filter by `pricing-page-layout`
3. Compare conversion rates across variants
4. Look for statistical significance before declaring a winner

## Step 8: Roll Out the Winner

Once you've identified the best-performing variant:

1. Update the flag's default value to the winning variant
2. Set rollout percentage to 100% for the winner
3. Remove the other variants from your code
4. Eventually delete the flag and keep only the winning implementation

```tsx
// After the test — simplified code
function PricingPage() {
  return (
    <div className="pricing-page">
      <h1>Choose Your Plan</h1>
      <ComparisonTableLayout />
    </div>
  );
}
```

## Tips for Reliable A/B Tests

- **Sample size**: Run tests long enough to reach statistical significance (typically 1,000+ conversions per variant)
- **One change at a time**: Avoid running overlapping tests on the same page — use [mutual exclusion](/docs/core-concepts/mutual-exclusion) if needed
- **Consistent assignment**: Always pass a stable `userID` in context so users see the same variant across sessions
- **Monitor guardrail metrics**: Watch error rates and page load times alongside conversion metrics
