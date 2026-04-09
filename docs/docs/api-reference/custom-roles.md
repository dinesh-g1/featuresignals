---
sidebar_label: Custom Roles
description: "FeatureSignals Custom Roles API — create granular permission templates beyond built-in roles."
---
# Custom Roles

Create named permission templates beyond the built-in roles (Owner, Admin, Editor, Viewer). Custom roles let you define granular access policies tailored to your organization's workflow.

## Requirements

| Requirement | Value |
|-------------|-------|
| Plan | Enterprise |
| Role | Owner, Admin |
| Auth | JWT |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/roles` | List all roles |
| `POST` | `/v1/roles` | Create a custom role |
| `GET` | `/v1/roles/{roleID}` | Get a role by ID |
| `PUT` | `/v1/roles/{roleID}` | Update a custom role |
| `DELETE` | `/v1/roles/{roleID}` | Delete a custom role |

---

## List Roles

```
GET /v1/roles
```

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Release Manager",
      "permissions": ["flags.read", "flags.toggle", "environments.read"],
      "built_in": false,
      "created_at": "2026-04-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

Built-in roles are included with `built_in: true` and cannot be modified or deleted.

---

## Create Role

```
POST /v1/roles
```

### Request

```json
{
  "name": "Release Manager",
  "permissions": ["flags.read", "flags.toggle", "environments.read"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique role name |
| `permissions` | string[] | Yes | List of permission keys |

### Response `201 Created`

Returns the created role. Returns `409 Conflict` if the name is already taken.

---

## Get Role

```
GET /v1/roles/{roleID}
```

### Response `200 OK`

Returns the role object. Returns `404` if not found.

---

## Update Role

```
PUT /v1/roles/{roleID}
```

Accepts the same body as create. Built-in roles cannot be updated (`403 Forbidden`).

### Response `200 OK`

---

## Delete Role

```
DELETE /v1/roles/{roleID}
```

Built-in roles cannot be deleted. Roles currently assigned to members cannot be deleted until reassigned.

### Response `204 No Content`
