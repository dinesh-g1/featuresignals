---
sidebar_position: 10
title: Team Management
---

# Team Management API

Manage organization members, roles, and environment-level permissions.

## Roles

| Role | Description |
|------|-------------|
| `owner` | Full access, can manage billing and organization settings |
| `admin` | Can manage members, API keys, webhooks, and approve changes |
| `developer` | Can create and modify flags, segments, and submit approvals |
| `viewer` | Read-only access to all resources |

## List Members

```
GET /v1/members
```

**Auth**: JWT (All roles)

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "member-uuid",
      "org_id": "org-uuid",
      "role": "owner",
      "email": "admin@example.com",
      "name": "Admin User"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

---

## Invite Member

```
POST /v1/members/invite
```

**Auth**: JWT (Owner, Admin)

### Request

```json
{
  "email": "dev@example.com",
  "role": "developer"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `email` | string | Yes | — | Invitee's email |
| `role` | string | No | `developer` | `owner`, `admin`, `developer`, `viewer` |

### Response `201 Created`

Returns a member response object. If the user doesn't have an account, a stub account is created.

### Error `409 Conflict`

Returned if the user is already a member of the organization.

---

## Update Role

```
PUT /v1/members/{memberID}
```

**Auth**: JWT (Owner, Admin)

### Request

```json
{
  "role": "admin"
}
```

### Response `204 No Content`

---

## Remove Member

```
DELETE /v1/members/{memberID}
```

**Auth**: JWT (Owner, Admin)

### Response `204 No Content`

Members cannot remove themselves.

---

## Environment Permissions

Fine-grained permissions control what a member can do in specific environments.

### List Permissions

```
GET /v1/members/{memberID}/permissions
```

### Response `200 OK`

```json
[
  {
    "id": "uuid",
    "member_id": "uuid",
    "env_id": "uuid",
    "can_toggle": true,
    "can_edit_rules": false
  }
]
```

### Update Permissions

```
PUT /v1/members/{memberID}/permissions
```

**Auth**: JWT (Owner, Admin)

### Request

```json
{
  "permissions": [
    {
      "env_id": "production-uuid",
      "can_toggle": true,
      "can_edit_rules": false
    }
  ]
}
```

### Response `200 OK`

Returns the full updated permission list.
