---
sidebar_position: 6
title: Audit Logging
---

# Audit Logging

FeatureSignals maintains a comprehensive audit log that records all changes to flags, environments, and team configuration. The log is tamper-evident and includes before/after state diffs.

## What's Logged

Every significant action creates an audit entry:

| Action | Description |
|--------|-------------|
| `flag.created` | New flag created |
| `flag.updated` | Flag metadata changed |
| `flag.deleted` | Flag deleted |
| `flag.killed` | Kill switch activated |
| `flag.promoted` | Config promoted between environments |
| `flag.scheduled_toggle` | Scheduled enable/disable (system actor) |
| `flag.approved_change_applied` | Approved change applied |

## Before/After State Diffs

Each audit entry captures the resource state before and after the change:

```json
{
  "action": "flag.updated",
  "before_state": {
    "name": "Old Name",
    "tags": ["beta"]
  },
  "after_state": {
    "name": "New Name",
    "tags": ["beta", "production"]
  }
}
```

This enables:
- Understanding exactly what changed
- Meeting compliance and regulatory requirements
- Debugging unexpected flag behavior

## Actor Types

| Actor Type | Description |
|------------|-------------|
| `user` | A human user triggered the action |
| `system` | An automated process (e.g., scheduler) |

## Viewing the Audit Log

### Dashboard

Navigate to **Audit Log** in the sidebar to browse entries.

### API

```bash
curl "http://localhost:8080/v1/audit?limit=50&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

See the [Audit Log API Reference](/api-reference/audit-log) for details.
