---
sidebar_label: IP Allowlist
description: "FeatureSignals IP Allowlist API — restrict management API access to specific IP address ranges."
---
# IP Allowlist

Restrict management API access to specific IP address ranges. The evaluation API is not restricted, ensuring SDK connectivity from customer applications.

## Requirements

| Requirement | Value |
|-------------|-------|
| Plan | Enterprise |
| Role | Owner, Admin |
| Auth | JWT |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/ip-allowlist` | Get current allowlist |
| `PUT` | `/v1/ip-allowlist` | Update allowlist |

---

## Get IP Allowlist

```
GET /v1/ip-allowlist
```

### Response `200 OK`

```json
{
  "enabled": true,
  "cidr_ranges": [
    "10.0.0.0/8",
    "192.168.1.0/24",
    "203.0.113.42/32"
  ]
}
```

Returns `enabled: false` with an empty `cidr_ranges` array if no allowlist is configured.

---

## Update IP Allowlist

```
PUT /v1/ip-allowlist
```

### Request

```json
{
  "enabled": true,
  "cidr_ranges": [
    "10.0.0.0/8",
    "192.168.1.0/24"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | Yes | Whether the allowlist is active |
| `cidr_ranges` | string[] | Yes | CIDR ranges (IPv4 or IPv6) |

### Response `200 OK`

```json
{
  "message": "IP allowlist updated"
}
```

Invalid CIDR notation returns `422 Unprocessable Entity`.

:::danger
Enabling the allowlist with ranges that exclude your current IP will lock you out of the management API. Always include your current IP range.
:::
