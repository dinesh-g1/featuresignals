---
sidebar_position: 4
title: Environments
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
| `color` | string | No | `#6B7280` | Hex color for dashboard display |

### Response `201 Created`

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "QA",
  "slug": "qa",
  "color": "#8b5cf6",
  "created_at": "2026-04-01T00:00:00Z"
}
```

---

## List Environments

```
GET /v1/projects/{projectID}/environments
```

**Auth**: JWT (All roles)

### Response `200 OK`

```json
[
  {"id": "uuid", "project_id": "uuid", "name": "Development", "slug": "dev", "color": "#22c55e"},
  {"id": "uuid", "project_id": "uuid", "name": "Staging", "slug": "staging", "color": "#f59e0b"},
  {"id": "uuid", "project_id": "uuid", "name": "Production", "slug": "production", "color": "#ef4444"}
]
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
