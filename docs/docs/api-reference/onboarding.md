---
sidebar_position: 16
title: Onboarding
description: "FeatureSignals Onboarding API — track user setup progress through the guided onboarding wizard."
---

# Onboarding

The onboarding system tracks new users through a guided setup wizard after registration. It ensures users complete key setup steps: choosing a plan, creating their first flag, installing an SDK, and completing an optional product tour.

---

## Get Onboarding State

Retrieve the current onboarding progress for the authenticated user's organization.

```
GET /v1/onboarding
```

**Authentication:** Bearer JWT

### Response `200 OK`

```json
{
  "org_id": "uuid",
  "plan_selected": true,
  "first_flag_created": false,
  "first_sdk_connected": false,
  "first_evaluation": false,
  "tour_completed": false,
  "completed": false,
  "completed_at": null,
  "updated_at": "2026-04-01T00:00:00Z"
}
```

---

## Update Onboarding State

Mark one or more onboarding steps as complete.

```
PATCH /v1/onboarding
```

**Authentication:** Bearer JWT

### Request

```json
{
  "plan_selected": true,
  "first_flag_created": true
}
```

Only include the fields you want to update. All fields are optional booleans.

### Response `200 OK`

Returns the full updated onboarding state (same structure as GET response).

---

## Onboarding Steps

| Step | Flag Engine action | Backend Key |
|------|-----------------|-------------|
| Choose Plan | Select Free, Pro, or Enterprise | `plan_selected` |
| Create Flag | Create the first feature flag | `first_flag_created` |
| Install SDK | View SDK install instructions | `first_sdk_connected` |
| First Evaluation | SDK evaluates a flag | `first_evaluation` |
| Product Tour | Complete the guided tour | `tour_completed` |

When all steps are marked true, the `completed` field is set automatically along with `completed_at`.
