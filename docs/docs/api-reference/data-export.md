---
sidebar_label: Data Export
description: "FeatureSignals Data Export API — download your organization's data as a JSON archive."
---
# Data Export

Download your organization's data as a JSON archive. The export includes projects, environments, flags, segments, team members, and audit log entries.

## Requirements

| Requirement | Value |
|-------------|-------|
| Plan | Pro+ |
| Role | Owner, Admin |
| Auth | JWT |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/data/export` | Export organization data |

---

## Export Data

```
GET /v1/data/export
```

### Response `200 OK`

Returns a JSON object containing all organization data:

```json
{
  "organization": {
    "id": "uuid",
    "name": "Acme Corp",
    "plan": "pro"
  },
  "projects": ["..."],
  "environments": ["..."],
  "flags": ["..."],
  "segments": ["..."],
  "members": ["..."],
  "audit_log": ["..."],
  "exported_at": "2026-04-01T12:00:00Z"
}
```

Arrays are fully expanded in the actual response. Large organizations may experience longer response times.

:::tip
Use data exports for backup, compliance audits, or migrating between FeatureSignals instances.
:::
