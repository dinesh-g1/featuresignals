---
sidebar_position: 5
title: Flags
description: "FeatureSignals Flags API — create, read, update, and delete feature flags programmatically."
---

# Flags API

Create, read, update, and delete feature flags.

## Create Flag

```
POST /v1/projects/{projectID}/flags
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

```json
{
  "key": "new-checkout",
  "name": "New Checkout Flow",
  "description": "Redesigned checkout experience",
  "flag_type": "boolean",
  "default_value": false,
  "tags": ["checkout", "experiment"],
  "prerequisites": ["billing-enabled"],
  "mutual_exclusion_group": "checkout-experiments"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `key` | string | Yes | — | Unique identifier (immutable) |
| `name` | string | Yes | — | Display name |
| `description` | string | No | `""` | Description |
| `flag_type` | string | No | `boolean` | `boolean`, `string`, `number`, `json`, `ab` |
| `default_value` | any | No | Depends on `flag_type` | Value returned when flag is disabled. Defaults: `false` (boolean), `""` (string), `0` (number), `{}` (json/ab). Must match the flag type. |
| `tags` | string[] | No | `[]` | Tags for organization |
| `prerequisites` | string[] | No | `[]` | Flag keys that must be enabled |
| `mutual_exclusion_group` | string | No | `""` | Mutex group name |

### Response `201 Created`

```json
{
  "id": "uuid",
  "key": "new-checkout",
  "name": "New Checkout Flow",
  "description": "Redesigned checkout experience",
  "flag_type": "boolean",
  "default_value": false,
  "tags": ["checkout", "experiment"],
  "prerequisites": ["billing-enabled"],
  "mutual_exclusion_group": "checkout-experiments",
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z"
}
```

---

## List Flags

```
GET /v1/projects/{projectID}/flags?limit=50&offset=0
```

**Auth**: JWT (All roles)

### Query Parameters

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of flags to return |
| `offset` | 0 | — | Pagination offset |

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "key": "new-checkout",
      "name": "New Checkout Flow",
      "flag_type": "boolean",
      "default_value": false,
      "tags": ["checkout", "experiment"],
      "created_at": "2026-04-01T00:00:00Z",
      "updated_at": "2026-04-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

---

## Get Flag

```
GET /v1/projects/{projectID}/flags/{flagKey}
```

**Auth**: JWT (All roles)

### Response `200 OK`

Returns a single flag object.

---

## Update Flag

```
PUT /v1/projects/{projectID}/flags/{flagKey}
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

Partial update — only provided fields are changed.

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "default_value": true,
  "tags": ["new-tag"],
  "prerequisites": [],
  "mutual_exclusion_group": ""
}
```

### Response `200 OK`

Returns the updated flag object.

---

## Delete Flag

```
DELETE /v1/projects/{projectID}/flags/{flagKey}
```

**Auth**: JWT (Owner, Admin, Developer)

### Response `204 No Content`

---

## Promote Flag

Copy flag configuration from one environment to another.

```
POST /v1/projects/{projectID}/flags/{flagKey}/promote
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

```json
{
  "source_env_id": "dev-env-uuid",
  "target_env_id": "staging-env-uuid"
}
```

### Response `200 OK`

Returns the target environment's updated flag state. Copies `enabled`, `default_value`, `rules`, and `percentage_rollout`.

---

## Kill Switch

Emergency disable a flag in an environment.

```
POST /v1/projects/{projectID}/flags/{flagKey}/kill
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

```json
{
  "env_id": "production-env-uuid"
}
```

### Response `200 OK`

Returns the flag state with `enabled: false`. Creates an audit entry with action `flag.killed`.
