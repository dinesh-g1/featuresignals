---
sidebar_position: 15
title: IP Allowlist
---

# IP Allowlist

Restrict management API access to specific IP ranges. Requires **Enterprise plan**. The evaluation API is not restricted to ensure SDK connectivity from customer applications.

**Auth:** JWT (Owner or Admin role)

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

If no allowlist has been configured, returns `enabled: false` with an empty `cidr_ranges` array.

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
| `cidr_ranges` | string[] | Yes | List of CIDR ranges (IPv4 or IPv6) |

### Response `200 OK`

```json
{
  "message": "IP allowlist updated"
}
```

### Validation

- Each entry must be a valid CIDR range (e.g., `10.0.0.0/8`, `2001:db8::/32`)
- Invalid CIDR notation returns `422 Unprocessable Entity`

:::danger
Enabling the allowlist with ranges that exclude your current IP will lock you out of the management API. Always include your current IP range before enabling.
:::
