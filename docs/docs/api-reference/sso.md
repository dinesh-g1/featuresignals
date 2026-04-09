---
sidebar_label: SSO
description: "FeatureSignals SSO API — configure SAML 2.0 or OIDC single sign-on for your organization."
---
# SSO Configuration

Configure Single Sign-On for your organization using SAML 2.0 or OIDC. Once enabled, members authenticate through your identity provider (Okta, Azure AD, Google Workspace, etc.) instead of email/password.

## Requirements

| Requirement | Value |
|-------------|-------|
| Plan | Enterprise |
| Role | Owner |
| Auth | JWT |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/sso/config` | Get current SSO configuration |
| `POST` | `/v1/sso/config` | Create or update SSO configuration |
| `DELETE` | `/v1/sso/config` | Remove SSO configuration |
| `POST` | `/v1/sso/config/test` | Test SSO configuration before enforcing |

---

## Get SSO Config

```
GET /v1/sso/config
```

### Response `200 OK`

```json
{
  "provider": "saml",
  "issuer": "https://idp.example.com",
  "sso_url": "https://idp.example.com/sso/saml",
  "certificate": "MIIC...",
  "enforced": true,
  "created_at": "2026-04-01T00:00:00Z"
}
```

Returns `404` if no SSO configuration exists.

---

## Create/Update SSO Config

```
POST /v1/sso/config
```

### Request

```json
{
  "provider": "saml",
  "issuer": "https://idp.example.com",
  "sso_url": "https://idp.example.com/sso/saml",
  "certificate": "MIIC...",
  "enforced": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | Yes | `saml` or `oidc` |
| `issuer` | string | Yes | Identity provider issuer URL |
| `sso_url` | string | Yes | SSO login endpoint |
| `certificate` | string | Yes | IdP signing certificate (PEM, base64) |
| `enforced` | boolean | No | If `true`, all members must use SSO |

### Response `200 OK`

```json
{
  "message": "SSO configuration saved"
}
```

---

## Delete SSO Config

```
DELETE /v1/sso/config
```

### Response `204 No Content`

---

## Test SSO Config

Validates the configuration against the IdP without enforcing it.

```
POST /v1/sso/config/test
```

### Response `200 OK`

```json
{
  "success": true,
  "provider": "saml",
  "issuer": "https://idp.example.com"
}
```

Returns `422` with a descriptive error if the configuration is invalid or the IdP is unreachable.
