---
sidebar_position: 13
title: Audit Log
---

# Audit Log API

The audit log provides a tamper-evident record of all changes in your organization.

## List Audit Entries

```
GET /v1/audit?limit=50&offset=0
```

**Auth**: JWT (All roles)

### Query Parameters

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of entries to return |
| `offset` | 0 | — | Pagination offset |

### Response `200 OK`

```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "actor_id": "user-uuid",
    "actor_type": "user",
    "action": "flag.created",
    "resource_type": "flag",
    "resource_id": "flag-uuid",
    "before_state": null,
    "after_state": {"key": "new-flag", "name": "New Flag", "flag_type": "boolean"},
    "metadata": {"project_id": "project-uuid"},
    "created_at": "2026-04-01T12:00:00Z"
  },
  {
    "id": "uuid",
    "org_id": "uuid",
    "actor_id": "system",
    "actor_type": "system",
    "action": "flag.scheduled_toggle",
    "resource_type": "flag_state",
    "resource_id": "state-uuid",
    "before_state": {"enabled": false},
    "after_state": {"enabled": true},
    "created_at": "2026-04-01T09:00:00Z"
  }
]
```

## Audit Entry Fields

| Field | Description |
|-------|-------------|
| `id` | Unique entry identifier |
| `org_id` | Organization ID |
| `actor_id` | User ID or `"system"` for automated actions |
| `actor_type` | `user` or `system` |
| `action` | What happened (see actions below) |
| `resource_type` | Type of resource changed |
| `resource_id` | ID of the affected resource |
| `before_state` | State before the change (JSON, nullable) |
| `after_state` | State after the change (JSON, nullable) |
| `metadata` | Additional context (JSON, nullable) |
| `created_at` | Timestamp of the event |

## Audit Actions

| Action | Description |
|--------|-------------|
| `flag.created` | New flag created |
| `flag.updated` | Flag metadata changed |
| `flag.deleted` | Flag deleted |
| `flag.killed` | Kill switch activated |
| `flag.promoted` | Flag config promoted between environments |
| `flag.scheduled_toggle` | Scheduled enable/disable executed by system |
| `flag.approved_change_applied` | Approved change applied |

## Before/After States

The `before_state` and `after_state` fields capture the resource state before and after the change, enabling:
- **Change diffing** — see exactly what changed
- **Compliance** — full audit trail for regulatory requirements
- **Debugging** — understand why a flag behaves a certain way
