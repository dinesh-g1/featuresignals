---
title: "Progressive Rollout: 10% → 50% → 100%"
sidebar_label: "Progressive Rollout"
---

# Progressive Rollout: 10% → 50% → 100%

Learn how to safely roll out a feature to your entire user base using percentage-based targeting.

## Prerequisites

- FeatureSignals server running
- A project with production and staging environments
- An SDK integrated in your application

## Why Progressive Rollouts?

Shipping a feature to 100% of users on day one is risky. Progressive rollouts let you:

- Catch bugs early with a small group
- Monitor performance and error rates at each stage
- Roll back instantly if something goes wrong
- Build confidence before full release

## Step 1: Create the Flag

Create a boolean flag for the feature you want to roll out:

- **Key**: `redesigned-dashboard`
- **Name**: Redesigned Dashboard
- **Type**: Boolean
- **Default**: `false`

```bash
curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "redesigned-dashboard",
    "name": "Redesigned Dashboard",
    "type": "boolean",
    "defaultValue": false
  }'
```

## Step 2: Integrate the SDK

Use the flag in your application code:

```javascript
const showNewDashboard = await client.boolVariation(
  'redesigned-dashboard',
  { userID: user.id, email: user.email },
  false
);

if (showNewDashboard) {
  renderRedesignedDashboard();
} else {
  renderCurrentDashboard();
}
```

## Step 3: Start at 10%

Enable the flag in production with a 10% rollout:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/{projectID}/flags/redesigned-dashboard/environments/{prodEnvID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "percentage": 10
  }'
```

Or in the dashboard:
1. Go to the `redesigned-dashboard` flag
2. Select the **Production** environment
3. Toggle **Enabled** on
4. Set **Percentage** to `10`
5. Save

### What to Monitor

Wait 24–48 hours and check:

- **Error rates**: Are flagged users seeing more errors?
- **Performance**: Any latency regressions?
- **Evaluation metrics**: Check the dashboard under Metrics → Evaluations
- **User feedback**: Support tickets or complaints from the 10% cohort

## Step 4: Increase to 50%

If everything looks healthy, bump the rollout:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/{projectID}/flags/redesigned-dashboard/environments/{prodEnvID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "percentage": 50
  }'
```

At 50%, you get much better signal on edge cases and performance under load. Monitor for another 24–48 hours.

## Step 5: Go to 100%

Once you're confident:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/{projectID}/flags/redesigned-dashboard/environments/{prodEnvID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "percentage": 100
  }'
```

## Emergency Rollback

If you detect issues at any stage, use the kill switch to instantly disable:

```bash
curl -X POST https://api.featuresignals.com/v1/projects/{projectID}/flags/redesigned-dashboard/kill \
  -H "Authorization: Bearer $TOKEN"
```

This disables the flag across **all** environments immediately. All users revert to the default (`false`) value.

## Step 6: Clean Up

After the feature has been at 100% for a stable period:

1. Remove the feature flag check from code
2. Delete the old dashboard code path
3. Deploy
4. Delete the flag from FeatureSignals

## Advanced: Combine with Targeting

You can layer percentage rollouts with segment targeting for more control:

```bash
curl -X PUT https://api.featuresignals.com/v1/projects/{projectID}/flags/redesigned-dashboard/environments/{prodEnvID} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "percentage": 10,
    "rules": [
      { "segmentKey": "internal-team", "value": true },
      { "segmentKey": "beta-users", "value": true }
    ]
  }'
```

This gives 100% of internal team and beta users the new dashboard, plus 10% of everyone else.

## Next Steps

- [Set up approval workflows](/docs/advanced/approval-workflows) to require review before production rollout changes
- [Configure webhooks](/docs/advanced/webhooks) to notify Slack when rollout percentages change
- [Track A/B metrics](/docs/tutorials/ab-testing-react) to measure the impact of your rollout
