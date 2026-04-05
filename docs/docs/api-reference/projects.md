---
sidebar_position: 3
title: Projects
---

# Projects API

Projects organize flags, environments, and segments for a single application or service.

## Create Project

```
POST /v1/projects
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

```json
{
  "name": "Mobile App",
  "slug": "mobile-app"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `slug` | string | No | URL-friendly identifier (auto-generated from name if omitted) |

### Response `201 Created`

```json
{
  "id": "uuid",
  "name": "Mobile App",
  "slug": "mobile-app",
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z"
}
```

### Error `409 Conflict`

Returned if the slug already exists.

---

## List Projects

```
GET /v1/projects
```

**Auth**: JWT (All roles)

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Default Project",
      "slug": "default",
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

## Get Project

```
GET /v1/projects/{projectID}
```

**Auth**: JWT (All roles)

### Response `200 OK`

Returns a single project object.

### Error `404 Not Found`

---

## Delete Project

```
DELETE /v1/projects/{projectID}
```

**Auth**: JWT (Owner, Admin)

### Response `204 No Content`

:::warning
Deleting a project removes all associated flags, environments, segments, and flag states.
:::
