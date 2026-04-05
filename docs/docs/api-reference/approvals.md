---
sidebar_position: 11
title: Approvals
---

# Approvals API

Approval workflows require changes to be reviewed before being applied. Useful for production environment changes.

## Create Approval Request

```
POST /v1/approvals
```

**Auth**: JWT (Owner, Admin, Developer)

### Request

```json
{
  "flag_id": "flag-uuid",
  "env_id": "production-uuid",
  "change_type": "enable",
  "payload": {
    "enabled": true,
    "percentage_rollout": 5000
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `flag_id` | string | Yes | Target flag ID |
| `env_id` | string | Yes | Target environment ID |
| `change_type` | string | Yes | Type of change (e.g., `enable`, `update_state`) |
| `payload` | object | No | The flag state to apply when approved |

### Response `201 Created`

```json
{
  "id": "uuid",
  "flag_id": "flag-uuid",
  "env_id": "production-uuid",
  "change_type": "enable",
  "status": "pending",
  "created_at": "2026-04-01T00:00:00Z",
  "updated_at": "2026-04-01T00:00:00Z"
}
```

---

## List Approval Requests

```
GET /v1/approvals?status=pending&limit=50&offset=0
```

**Auth**: JWT (All roles)

### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `status` | all | Filter by status: `pending`, `approved`, `rejected`, `applied` |
| `limit` | 50 | Max results (capped at 100) |
| `offset` | 0 | Pagination offset |

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "flag_id": "flag-uuid",
      "env_id": "production-uuid",
      "change_type": "enable",
      "status": "pending",
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

## Get Approval Request

```
GET /v1/approvals/{approvalID}
```

**Auth**: JWT (All roles)

### Response `200 OK`

Returns the full approval request object.

---

## Review Approval

Approve or reject a pending approval request.

```
POST /v1/approvals/{approvalID}/review
```

**Auth**: JWT (Owner, Admin)

### Request

```json
{
  "action": "approve",
  "note": "Looks good, approved for production rollout"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | `approve` or `reject` |
| `note` | string | No | Review comment |

### Behavior

- Only `pending` requests can be reviewed
- The requestor **cannot review their own request**
- On **approve**: the payload is applied as a flag state update, status becomes `applied`, and an audit entry `flag.approved_change_applied` is created
- On **reject**: status becomes `rejected`

### Response `200 OK`

Returns the updated approval request with reviewer information.

### Approval Statuses

| Status | Description |
|--------|-------------|
| `pending` | Waiting for review |
| `approved` | Approved (transitional) |
| `rejected` | Rejected by reviewer |
| `applied` | Approved and changes applied |
