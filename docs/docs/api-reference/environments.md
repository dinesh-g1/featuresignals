---
sidebar_position: 4
title: Environments
description: "FeatureSignals Environments API — manage deployment stages with independent flag states and API keys."
---

# Environments API

Environments represent deployment stages (e.g., dev, staging, production). Each environment has independent flag states and API keys.

## Create Environment

```
POST /v1/projects/{projectID}/environments
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

```json
{
  "name": "QA",
  "slug": "qa",
  "color": "#8b5cf6"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Environment name |
| `slug` | string | No | Auto-generated | URL-friendly identifier |
| `color` | string | No | `#6B7280` | Hex color for Flag Engine display |

### Response `201 Created`

```json
{
  "id": "uuid",
  "name": "QA",
  "slug": "qa",
  "color": "#8b5cf6",
  "created_at": "2026-04-01T00:00:00Z"
}
```

---

## List Environments

```
GET /v1/projects/{projectID}/environments?limit=50&offset=0
```

**Auth**: JWT (All roles)

### Query Parameters

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of environments to return |
| `offset` | 0 | — | Pagination offset |

### Response `200 OK`

```json
{
  "data": [
    {"id": "uuid", "name": "Development", "slug": "dev", "color": "#22c55e"},
    {"id": "uuid", "name": "Staging", "slug": "staging", "color": "#f59e0b"},
    {"id": "uuid", "name": "Production", "slug": "production", "color": "#ef4444"}
  ],
  "total": 3,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

---

## Delete Environment

```
DELETE /v1/projects/{projectID}/environments/{envID}
```

**Auth**: JWT (Owner, Admin)

### Response `204 No Content`

:::warning
Deleting an environment removes all associated flag states and API keys.
:::
