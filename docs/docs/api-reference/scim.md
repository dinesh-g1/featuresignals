---
sidebar_position: 14
title: SCIM Provisioning
---

# SCIM 2.0 User Provisioning

Automate user lifecycle management through your identity provider (Okta, Azure AD, OneLogin, etc.). Requires **Enterprise plan**.

**Base path:** `/v1/scim/Users`

**Auth:** JWT (Owner or Admin role)

---

## List Users

```
GET /v1/scim/Users?startIndex=1&count=100
```

### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `startIndex` | 1 | 1-based pagination offset |
| `count` | 100 | Maximum results per page |
| `filter` | — | SCIM filter expression (e.g., `userName eq "jane@co.com"`) |

### Response `200 OK`

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
  "totalResults": 2,
  "startIndex": 1,
  "itemsPerPage": 2,
  "Resources": [
    {
      "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
      "id": "uuid",
      "userName": "jane@company.com",
      "name": { "formatted": "Jane Smith" },
      "active": true,
      "meta": {
        "resourceType": "User",
        "created": "2026-04-01T00:00:00Z"
      }
    }
  ]
}
```

---

## Get User

```
GET /v1/scim/Users/{userID}
```

### Response `200 OK`

Returns a single SCIM User resource.

### Error `404 Not Found`

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:Error"],
  "status": "404",
  "detail": "user not found"
}
```

---

## Create User (JIT Provisioning)

```
POST /v1/scim/Users
```

### Request

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "newuser@company.com",
  "name": {
    "givenName": "New",
    "familyName": "User"
  },
  "emails": [
    { "value": "newuser@company.com", "primary": true }
  ]
}
```

### Response `201 Created`

Returns the created SCIM User resource. If the user already exists, returns `200 OK` and ensures organization membership.

---

## Update User (Deactivation)

```
PUT /v1/scim/Users/{userID}
```

Set `active: false` to remove the user's organization membership:

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "active": false
}
```

### Response `200 OK`

---

## Delete User

```
DELETE /v1/scim/Users/{userID}
```

Removes the user's membership in the current organization. Does not delete the user account.

### Response `204 No Content`
