---
sidebar_position: 8
title: Segments
---

# Segments API

Segments are reusable groups of targeting conditions that can be referenced by multiple flags.

## Create Segment

```
POST /v1/projects/{projectID}/segments
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

```json
{
  "key": "enterprise-users",
  "name": "Enterprise Users",
  "description": "Users on enterprise plan",
  "match_type": "all",
  "rules": [
    {"attribute": "plan", "operator": "eq", "values": ["enterprise"]},
    {"attribute": "verified", "operator": "eq", "values": ["true"]}
  ]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `key` | string | Yes | — | Unique identifier |
| `name` | string | Yes | — | Display name |
| `description` | string | No | `""` | Description |
| `match_type` | string | No | `all` | `all` (AND) or `any` (OR) |
| `rules` | Condition[] | Yes | — | Conditions to match |

### Response `201 Created`

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "key": "enterprise-users",
  "name": "Enterprise Users",
  "description": "Users on enterprise plan",
  "match_type": "all",
  "rules": [
    {"attribute": "plan", "operator": "eq", "values": ["enterprise"]},
    {"attribute": "verified", "operator": "eq", "values": ["true"]}
  ],
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z"
}
```

---

## List Segments

```
GET /v1/projects/{projectID}/segments
```

**Auth**: JWT (All roles)

### Response `200 OK`

Returns an array of segment objects.

---

## Get Segment

```
GET /v1/projects/{projectID}/segments/{segmentKey}
```

**Auth**: JWT (All roles)

### Response `200 OK`

Returns a single segment object.

---

## Update Segment

```
PUT /v1/projects/{projectID}/segments/{segmentKey}
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

Partial update — only provided fields are changed.

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "match_type": "any",
  "rules": [
    {"attribute": "plan", "operator": "in", "values": ["enterprise", "business"]}
  ]
}
```

### Response `200 OK`

---

## Delete Segment

```
DELETE /v1/projects/{projectID}/segments/{segmentKey}
```

**Auth**: JWT (Owner, Admin, Developer)

### Response `204 No Content`

:::warning
Deleting a segment that is referenced by targeting rules will cause those rules to no longer match on that segment condition.
:::
