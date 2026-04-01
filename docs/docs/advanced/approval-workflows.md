---
sidebar_position: 4
title: Approval Workflows
---

# Approval Workflows

Approval workflows add a review step before flag changes are applied, providing an extra layer of safety for production environments.

## How It Works

1. A developer **creates an approval request** with the desired change
2. The request enters a `pending` state
3. An admin or owner **reviews** the request (approve or reject)
4. If approved, the change is **automatically applied** to the flag state
5. An audit entry `flag.approved_change_applied` is created

## Creating an Approval Request

```bash
curl -X POST http://localhost:8080/v1/approvals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_id": "flag-uuid",
    "env_id": "production-uuid",
    "change_type": "enable_with_rollout",
    "payload": {
      "enabled": true,
      "percentage_rollout": 5000
    }
  }'
```

The `payload` contains the flag state that will be applied on approval.

## Reviewing

```bash
# Approve
curl -X POST http://localhost:8080/v1/approvals/$APPROVAL_ID/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "note": "Looks good for 50% rollout"}'

# Reject
curl -X POST http://localhost:8080/v1/approvals/$APPROVAL_ID/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "reject", "note": "Needs more testing in staging first"}'
```

## Rules

- Only `pending` requests can be reviewed
- **Self-approval is not allowed** — the requestor cannot review their own request
- Only users with `owner` or `admin` roles can review

## Status Flow

```
pending → approved → applied
pending → rejected
```

On approval, the status transitions through `approved` to `applied` as the payload is upserted as a flag state.

## Use Cases

- **Production changes**: Require approval before enabling flags in production
- **Compliance**: Audit trail showing who requested and who approved changes
- **Team coordination**: Ensure changes are reviewed before deployment
