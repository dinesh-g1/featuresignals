---
sidebar_position: 7
title: RBAC
description: "Role-based access control with owner, admin, developer, and viewer roles plus per-environment permissions."
---

# Role-Based Access Control

:::tip Open in Flag Engine
Manage team roles in [Settings → Team →](https://app.featuresignals.com/settings/team)
:::

FeatureSignals implements RBAC to control what team members can do within the platform.

## Roles

| Role | Description |
|------|-------------|
| **Owner** | Full access. Can manage billing, organization settings, and all resources. |
| **Admin** | Can manage team members, API keys, webhooks, and approve changes. Cannot manage billing. |
| **Developer** | Can create, modify, and delete flags and segments. Can submit approval requests. |
| **Viewer** | Read-only access to all resources. Cannot make changes. |

## Permission Matrix

| Action | Owner | Admin | Developer | Viewer |
|--------|:-----:|:-----:|:---------:|:------:|
| View projects, flags, segments | Y | Y | Y | Y |
| View audit log | Y | Y | Y | Y |
| View approvals | Y | Y | Y | Y |
| View members | Y | Y | Y | Y |
| Create/modify flags | Y | Y | Y | - |
| Create/modify segments | Y | Y | Y | - |
| Toggle flag state | Y | Y | Y | - |
| Delete flags/segments | Y | Y | Y | - |
| Create approval requests | Y | Y | Y | - |
| Promote flags | Y | Y | Y | - |
| Kill switch | Y | Y | Y | - |
| Delete projects/environments | Y | Y | - | - |
| Create/revoke API keys | Y | Y | - | - |
| Review approvals | Y | Y | - | - |
| Manage webhooks | Y | Y | - | - |
| Invite/remove members | Y | Y | - | - |
| View/reset metrics | Y | Y | - | - |

## Environment-Level Permissions

Beyond roles, fine-grained permissions can be set per member per environment:

| Permission | Description |
|------------|-------------|
| `can_toggle` | Can enable/disable flags in this environment |
| `can_edit_rules` | Can modify targeting rules in this environment |

This allows scenarios like:
- Developers can toggle flags in `dev` and `staging` but not `production`
- Only admins can modify targeting rules in `production`

## Managing Roles

### Invite a Member

```bash
curl -X POST https://api.featuresignals.com/v1/members/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@example.com", "role": "developer"}'
```

### Update a Role

```bash
curl -X PUT https://api.featuresignals.com/v1/members/$MEMBER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### Set Environment Permissions

```bash
curl -X PUT https://api.featuresignals.com/v1/members/$MEMBER_ID/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      {"env_id": "production-uuid", "can_toggle": false, "can_edit_rules": false},
      {"env_id": "staging-uuid", "can_toggle": true, "can_edit_rules": true}
    ]
  }'
```
