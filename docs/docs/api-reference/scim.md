---
sidebar_label: SCIM
description: "FeatureSignals SCIM 2.0 API — automate user provisioning and deprovisioning from your identity provider."
---
# SCIM Provisioning (SCIM 2.0)

Automate user provisioning and deprovisioning from your identity provider (Okta, Azure AD, OneLogin, etc.). When a user is assigned or removed in your IdP, SCIM syncs the change to FeatureSignals automatically.

## Requirements

| Requirement | Value |
|-------------|-------|
| Plan | Enterprise |
| Auth | Bearer token (SCIM token) |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/scim/Users` | List provisioned users |
| `POST` | `/v1/scim/Users` | Provision a new user |
| `GET` | `/v1/scim/Users/{userID}` | Get a single user |
| `PUT` | `/v1/scim/Users/{userID}` | Update or deactivate a user |
| `DELETE` | `/v1/scim/Users/{userID}` | Remove a user from the organization |

---

## List Users

```
GET /v1/scim/Users?startIndex=1&count=100
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `startIndex` | 1 | 1-based pagination offset |
| `count` | 100 | Maximum results per page |
| `filter` | — | SCIM filter (e.g., `userName eq "jane@co.com"`) |

### Response `200 OK`

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
  "totalResults": 1,
  "startIndex": 1,
  "itemsPerPage": 1,
  "Resources": [
    {
      "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
      "id": "uuid",
      "userName": "jane@company.com",
      "name": { "formatted": "Jane Smith" },
      "active": true
    }
  ]
}
```

---

## Create User

```
POST /v1/scim/Users
```

### Request

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "newuser@company.com",
  "name": { "givenName": "New", "familyName": "User" },
  "emails": [{ "value": "newuser@company.com", "primary": true }]
}
```

### Response `201 Created`

Returns the created SCIM User resource. If the user already exists, returns `200 OK`.

---

## Get User

```
GET /v1/scim/Users/{userID}
```

### Response `200 OK`

Returns a single SCIM User resource. Returns `404` if the user is not found.

---

## Update User

```
PUT /v1/scim/Users/{userID}
```

Set `active: false` to deactivate and remove the user's organization membership.

### Response `200 OK`

---

## Delete User

```
DELETE /v1/scim/Users/{userID}
```

Removes the user's membership in the organization. Does not delete the user account.

### Response `204 No Content`
