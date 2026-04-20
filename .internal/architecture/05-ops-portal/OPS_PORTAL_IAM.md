# FeatureSignals — Operations Portal IAM Architecture

> **Version:** 1.1.0  
> **Status:** Design Document — Pending Review  
> **Author:** Engineering  
> **Last Updated:** 2026-01-15  
> **Audience:** Engineering, Security, Ops Team, Founders, Sales

---

## Table of Contents

1. [Current Problem Statement](#1-current-problem-statement)
2. [IAM Architecture Overview](#2-iam-architecture-overview)
3. [Authentication Design](#3-authentication-design)
4. [Authorization & RBAC](#4-authorization--rbac)
5. [Access Control Matrix](#5-access-control-matrix)
6. [Enterprise Onboarding Flow](#6-enterprise-onboarding-flow)
7. [Session & Token Management](#7-session--token-management)
8. [Audit Logging & Compliance](#8-audit-logging--compliance)
9. [Code-Level Implementation](#9-code-level-implementation)
10. [Security Considerations](#10-security-considerations)
11. [Migration from Current System](#11-migration-from-current-system)
12. [Future Integrations](#12-future-integrations)
13. [Implementation Checklist](#13-implementation-checklist)

---

## 1. Current Problem Statement

The ops portal currently uses the same authentication mechanism as the customer dashboard — a simple `@featuresignals.com` domain check on JWT claims. This approach has critical limitations:

| Limitation | Impact |
|------------|--------|
| No role-based access control | Everyone with a `@featuresignals.com` email has full access |
| No external contractor support | Cannot grant temporary access to partners, auditors, or contractors |
| No granular permissions | Cannot restrict finance data from engineers, or provisioning from support |
| No audit trail for auth events | Cannot track who accessed what, when, or from where |
| No corporate SSO integration | Cannot integrate with Okta, Azure AD, or Google Workspace SSO |
| No session management | Cannot revoke sessions, enforce MFA, or set session timeouts |
| Tied to customer auth system | Ops portal availability depends on customer-facing auth |

**This document defines the new IAM architecture that solves all of these problems.**

---

## 2. IAM Architecture Overview

### 2.1 Design Principles

1. **Ops portal is independent** — Separate auth system from customer dashboard. Ops portal has its own VPS, database, and auth flow.
2. **RBAC is granular** — Permissions are defined at the resource + action level, not just role-based.
3. **Authentication is flexible** — Supports Google Workspace SSO (primary), email magic link (secondary), and future SAML/OIDC.
4. **Audit is comprehensive** — Every authentication event, permission check, and privileged action is logged.
5. **Least privilege by default** — New users start with minimal permissions; access is granted explicitly.

### 2.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Ops Portal IAM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Authentication Layer:                                                │
│  ├── Google Workspace SSO (primary)                                   │
│  ├── Email + Magic Link (contractors, partners)                       │
│  └── Future: SAML/OIDC (Okta, Azure AD)                               │
│                                                                       │
│  Authorization Layer:                                                 │
│  ├── RBAC Engine (role → permission mapping)                          │
│  ├── Policy Engine (resource + action + condition checks)             │
│  └── Session Manager (token validation, expiry, revocation)           │
│                                                                       │
│  Data Layer:                                                          │
│  ├── ops_users table (user profiles, roles, status)                   │
│  ├── ops_roles table (role definitions, permissions)                  │
│  ├── ops_permissions table (granular permission definitions)          │
│  ├── ops_sessions table (active sessions, revocation list)            │
│  └── ops_audit_log table (comprehensive audit trail)                  │
│                                                                       │
│  Integration Layer:                                                   │
│  ├── Google OAuth2 API (SSO)                                          │
│  ├── ZeptoMail / SES (magic link emails)                              │
│  └── Slack (auth alerts, session notifications)                       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Ops Portal VPS Isolation

The ops portal runs on a dedicated VPS, completely separate from customer-facing infrastructure:

```
Ops Portal VPS (Hetzner cx22, €4.51/mo)
├── Next.js ops portal (port 3001)
├── Caddy (ops.featuresignals.com)
├── PostgreSQL (ops DB: users, roles, sessions, audit, env registry, cost data)
├── No customer data — only metadata about environments
└── Independent auth, independent deployment, independent backups
```

**Why separate VPS?**
- Ops portal is always available even if customer VPSes are down
- Ops portal has its own auth, independent of customer auth
- Audit logs are stored separately from customer data
- Cost tracking data is isolated
- Security boundary: compromise of customer infra doesn't expose ops portal

---

## 3. Authentication Design

### 3.1 Authentication Methods

| Method | Audience | Setup | Security Level |
|--------|----------|-------|----------------|
| **Google Workspace SSO** | Full-time employees (`@featuresignals.com`) | Google OAuth2, domain-restricted | High (MFA enforced by Google) |
| **Email Magic Link** | Contractors, partners, temporary access | Time-limited link (15 min expiry) | Medium (email account security) |
| **Future: SAML/OIDC** | Enterprise integrations (Okta, Azure AD) | SAML/OIDC provider config | High (enterprise MFA) |

### 3.2 Google Workspace SSO Flow

```
User clicks "Sign in with Google"
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Google OAuth2 Flow                                           │
│ 1. Redirect to Google consent screen                         │
│ 2. User authenticates with Google credentials                │
│ 3. Google redirects back with authorization code             │
│ 4. Ops Portal exchanges code for access token + ID token     │
│ 5. Validate ID token:                                        │
│    ├── Signature valid                                       │
│    ├── Audience matches ops portal client ID                 │
│    ├── Issuer is accounts.google.com                         │
│    └── Email domain is @featuresignals.com                   │
│ 6. Check if user exists in ops_users table                   │
│    ├── If exists: load role, create session                  │
│    └── If not: reject access (user must be pre-provisioned)  │
│ 7. Create session, set secure cookie                         │
│ 8. Redirect to dashboard                                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Magic Link Flow

```
User enters email address
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Magic Link Generation                                        │
│ 1. Validate email is in allowed domains list                 │
│ 2. Generate cryptographically secure token (32 bytes)        │
│ 3. Store token in ops_sessions table with:                   │
│    ├── email address                                         │
│    ├── expiry: 15 minutes                                    │
│    ├── used: false                                           │
│    └── ip_address (for audit)                                │
│ 4. Send email with magic link:                               │
│    https://ops.featuresignals.com/auth/magic?token=xxx       │
│ 5. User clicks link → token validated → session created      │
│ 6. Token marked as used, cannot be reused                    │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Authentication Configuration

```go
// ops/src/lib/auth-config.ts

export const authConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    allowedDomains: ["featuresignals.com"],
    scopes: ["openid", "email", "profile"],
  },
  magicLink: {
    tokenExpiryMinutes: 15,
    maxTokensPerEmail: 3, // Prevent email flooding
    allowedDomains: ["featuresignals.com", "contractor-domain.com"],
  },
  session: {
    cookieName: "ops_session",
    maxAgeHours: 8, // Work day session
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  },
};
```

---

## 4. Authorization & RBAC

### 4.1 Role Definitions

| Role | Description | Typical User |
|------|-------------|--------------|
| `founder` | Full access — everything, including billing, org settings, user management | Founders (Dinesh, Shashi) |
| `engineer` | Provision, debug, manage environments, view logs, SSH access | Backend/Frontend engineers |
| `qa` | Create sandbox environments, view logs, run tests against sandboxes | QA engineers |
| `perf_tester` | Create performance test environments, view metrics, run load tests | Performance engineers |
| `customer_success` | View environments, customers, logs (read-only), enable debug mode temporarily | Customer success team |
| `demo_team` | Create/manage sandbox environments, view demo data, share demo URLs | Sales/demo team |
| `finance` | Cost dashboards, billing, revenue analysis, margin reports | Finance team |
| `sales` | View customer environments (read-only), demo access, customer usage metrics | Sales team |
| `support` | View logs, enable debug mode, no provisioning, no cost access | Support team |

### 4.2 Permission Model

Permissions are defined at the **resource + action** level:

```typescript
// ops/src/lib/permissions.ts

export type Resource =
  | "environment"
  | "customer"
  | "license"
  | "cost"
  | "audit_log"
  | "ops_user"
  | "sandbox"
  | "debug_mode"
  | "ssh_access"
  | "billing";

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "execute"  // For actions like deploy, restart, SSH
  | "export";  // For data exports

export interface Permission {
  resource: Resource;
  action: Action;
  condition?: string;  // Optional condition (e.g., "own_sandbox_only")
}
```

### 4.3 Role → Permission Mapping

```typescript
// ops/src/lib/role-permissions.ts

export const rolePermissions: Record<string, Permission[]> = {
  founder: [
    { resource: "environment", action: "create" },
    { resource: "environment", action: "read" },
    { resource: "environment", action: "update" },
    { resource: "environment", action: "delete" },
    { resource: "environment", action: "execute" },
    { resource: "customer", action: "read" },
    { resource: "customer", action: "update" },
    { resource: "license", action: "create" },
    { resource: "license", action: "read" },
    { resource: "license", action: "update" },
    { resource: "license", action: "delete" },
    { resource: "cost", action: "read" },
    { resource: "cost", action: "export" },
    { resource: "audit_log", action: "read" },
    { resource: "audit_log", action: "export" },
    { resource: "ops_user", action: "create" },
    { resource: "ops_user", action: "read" },
    { resource: "ops_user", action: "update" },
    { resource: "ops_user", action: "delete" },
    { resource: "sandbox", action: "create" },
    { resource: "sandbox", action: "read" },
    { resource: "sandbox", action: "delete" },
    { resource: "debug_mode", action: "execute" },
    { resource: "ssh_access", action: "execute" },
    { resource: "billing", action: "read" },
    { resource: "billing", action: "update" },
  ],
  engineer: [
    { resource: "environment", action: "create" },
    { resource: "environment", action: "read" },
    { resource: "environment", action: "update" },
    { resource: "environment", action: "delete" },
    { resource: "environment", action: "execute" },
    { resource: "customer", action: "read" },
    { resource: "license", action: "read" },
    { resource: "license", action: "update" },
    { resource: "cost", action: "read" },
    { resource: "audit_log", action: "read" },
    { resource: "sandbox", action: "create" },
    { resource: "sandbox", action: "read" },
    { resource: "sandbox", action: "delete" },
    { resource: "debug_mode", action: "execute" },
    { resource: "ssh_access", action: "execute" },
  ],
  qa: [
    { resource: "environment", action: "read" },
    { resource: "sandbox", action: "create" },
    { resource: "sandbox", action: "read" },
    { resource: "sandbox", action: "delete" },
    { resource: "audit_log", action: "read" },
  ],
  perf_tester: [
    { resource: "environment", action: "create" }, // Creates perf-specific envs
    { resource: "environment", action: "read" },
    { resource: "environment", action: "delete" }, // Own envs only
    { resource: "audit_log", action: "read" },
  ],
  customer_success: [
    { resource: "environment", action: "read" },
    { resource: "customer", action: "read" },
    { resource: "audit_log", action: "read" },
    { resource: "debug_mode", action: "execute" }, // Temporary enable
  ],
  demo_team: [
    { resource: "sandbox", action: "create" },
    { resource: "sandbox", action: "read" },
    { resource: "sandbox", action: "delete" },
    { resource: "environment", action: "read" },
  ],
  finance: [
    { resource: "cost", action: "read" },
    { resource: "cost", action: "export" },
    { resource: "customer", action: "read" },
    { resource: "billing", action: "read" },
  ],
  sales: [
    { resource: "environment", action: "read" },
    { resource: "customer", action: "read" },
  ],
  support: [
    { resource: "environment", action: "read" },
    { resource: "audit_log", action: "read" },
    { resource: "debug_mode", action: "execute" },
  ],
};
```

### 4.4 Permission Check Engine

```typescript
// ops/src/lib/auth-guard.ts

export function hasPermission(
  userRole: string,
  resource: Resource,
  action: Action,
  context?: Record<string, unknown>
): boolean {
  const permissions = rolePermissions[userRole];
  if (!permissions) return false;

  return permissions.some((p) => {
    if (p.resource !== resource || p.action !== action) return false;
    if (p.condition) {
      return evaluateCondition(p.condition, context);
    }
    return true;
  });
}

function evaluateCondition(condition: string, context?: Record<string, unknown>): boolean {
  switch (condition) {
    case "own_sandbox_only":
      return context?.isOwner === true;
    case "temporary_debug":
      return context?.debugEnabledUntil
        ? new Date(context.debugEnabledUntil as string) > new Date()
        : false;
    default:
      return false;
  }
}
```

---

## 5. Access Control Matrix

### 5.1 Resource-Level Access

| Resource | founder | engineer | qa | perf_tester | customer_success | demo_team | finance | sales | support |
|----------|---------|----------|----|-------------|------------------|-----------|---------|-------|---------|
| **Create env** | ✅ | ✅ | ✅ (sandbox) | ✅ (perf) | ❌ | ✅ (sandbox) | ❌ | ❌ | ❌ |
| **Read env** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Update env** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Delete env** | ✅ | ✅ | ✅ (own) | ✅ (own) | ❌ | ✅ (own) | ❌ | ❌ | ❌ |
| **Deploy to env** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Read customers** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Update customers** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create license** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Read license** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Update license** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Read costs** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Export costs** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Read audit log** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Export audit log** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manage ops users** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create sandbox** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Read sandbox** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Delete sandbox** | ✅ | ✅ | ✅ (own) | ❌ | ❌ | ✅ (own) | ❌ | ❌ | ❌ |
| **Enable debug mode** | ✅ | ✅ | ❌ | ❌ | ✅ (temp) | ❌ | ❌ | ❌ | ✅ (temp) |
| **SSH access** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Read billing** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Update billing** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 5.2 Conditional Access Rules

| Rule | Description | Applies To |
|------|-------------|------------|
| `own_sandbox_only` | Can only delete sandboxes they created | qa, demo_team |
| `temporary_debug` | Debug mode auto-disables after 2 hours | customer_success, support |
| `perf_env_auto_delete` | Perf environments auto-delete after 3 days | perf_tester |
| `sandbox_auto_expire` | Sandboxes auto-expire after 7 days | qa, demo_team |
| `cost_view_internal_only` | Internal cost data hidden from customer_success | customer_success |

---

## 6. Session & Token Management

### 6.1 Session Lifecycle

```
User authenticates (SSO or Magic Link)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Session Creation                                             │
│ 1. Generate session ID (UUID v4)                             │
│ 2. Store in ops_sessions table:                              │
│    ├── session_id (primary key)                              │
│    ├── user_id                                               │
│    ├── ip_address                                            │
│    ├── user_agent                                            │
│    ├── created_at                                            │
│    ├── expires_at (8 hours from creation)                    │
│    ├── last_active_at                                        │
│    └── revoked (boolean, default false)                      │
│ 3. Set secure HTTP-only cookie with session ID               │
│ 4. Return user profile + permissions                         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Session Validation (on each request)                         │
│ 1. Extract session ID from cookie                            │
│ 2. Query ops_sessions table:                                 │
│    ├── Session exists?                                       │
│    ├── revoked == false?                                     │
│    ├── expires_at > now?                                     │
│    └── If any fail: reject, redirect to login                │
│ 3. Update last_active_at (throttled to once per 5 minutes)   │
│ 4. Load user role + permissions from cache                   │
│ 5. Attach to request context                                 │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Session Termination                                          │
│ 1. User clicks logout → mark session as revoked              │
│ 2. Session expires → auto-cleanup via cron job               │
│ 3. Admin revokes session → mark as revoked, notify user      │
│ 4. Password change (future) → revoke all sessions            │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Session Database Schema

```sql
-- ops DB: ops_sessions
CREATE TABLE ops_sessions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES ops_users(id) ON DELETE CASCADE,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    last_active_at  TIMESTAMPTZ DEFAULT NOW(),
    revoked         BOOLEAN DEFAULT FALSE,
    revoke_reason   TEXT
);

CREATE INDEX idx_ops_sessions_user_id ON ops_sessions(user_id);
CREATE INDEX idx_ops_sessions_expires_at ON ops_sessions(expires_at) WHERE revoked = FALSE;

-- Cleanup expired sessions (run daily)
DELETE FROM ops_sessions WHERE expires_at < NOW() OR revoked = TRUE;
```

### 6.3 Token Format (Internal API)

The ops portal communicates with the provisioning service via internal API tokens:

```
Token Format: ops_tok_{base64url(JWT payload)}.{signature}

JWT Payload:
{
    "user_id": "user_xxx",
    "role": "engineer",
    "permissions": ["environment:create", "environment:read", "..."],
    "exp": 1705363200,  // 8 hours from issuance
    "iat": 1705334400,
    "session_id": "sess_xxx"
}

Signature: HMAC-SHA256 with ops portal secret (never exposed)
```

---

## 6. Enterprise Onboarding Flow

### 6.1 Ops Portal Role in Enterprise Onboarding

The Ops Portal is the central hub for enterprise customer onboarding. When a customer comes through "Talk to Sales" instead of self-serve signup, the Ops Portal manages the entire provisioning workflow.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Enterprise Onboarding via Ops Portal              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Step 1: Sales Rep Creates Customer Record                           │
│  ├── Ops Portal → Customers → "Add Enterprise Customer"              │
│  ├── Fields: org name, contact email, company size, region           │
│  ├── Sales selects deployment model:                                 │
│  │   ○ Multi-Tenant SaaS (default)                                   │
│  │   ○ Dedicated VPS (requires justification)                        │
│  │   ○ On-Premises (requires license key generation)                 │
│  └── Customer record created with status = "pending_provisioning"    │
│                                                                       │
│  Step 2: Multi-Tenant SaaS Path (Instant)                            │
│  ├── Ops Portal creates org in regional PostgreSQL                   │
│  ├── 14-day trial license auto-generated                             │
│  ├── Enterprise license key attached (if Pro/Enterprise plan)        │
│  ├── Welcome email sent with login credentials                       │
│  └── Status → "active"                                               │
│                                                                       │
│  Step 3: Dedicated VPS Path (5-8 minutes)                            │
│  ├── Ops Portal triggers Provisioning Service API                    │
│  ├── Terraform creates VPS, firewall, volume, DNS records            │
│  ├── Ansible configures OS, Docker, Caddy                            │
│  ├── Docker Compose deploys app with enterprise license pre-config   │
│  ├── Custom DNS created: app.{customer}.featuresignals.com           │
│  ├── Smoke tests pass → Status → "active"                            │
│  └── Welcome email sent with subdomain URL and credentials           │
│                                                                       │
│  Step 4: On-Premises Path (License Key Only)                         │
│  ├── Ops Portal generates enterprise license key                     │
│  ├── License key delivered to customer (secure channel)              │
│  ├── Customer deploys on their own infrastructure                    │
│  ├── Phone-home agent configured to report to our license service    │
│  └── Status → "active" (pending first phone-home)                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Dedicated VPS Provisioning from Ops Portal

The Ops Portal provides a unified interface for provisioning dedicated VPS environments:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Ops Portal → Environments → "Create Environment"                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Environment Name: acme-prod                                          │
│  Type: ○ Shared  ● Dedicated  ○ On-Prem                              │
│  Region: ○ India  ● US  ○ EU  ○ Asia                                 │
│  Customer: Acme Corp (dropdown, auto-populated from customer record)  │
│  Plan: ○ Pro  ● Enterprise                                            │
│  VPS Plan: ○ 4 vCPU/8GB  ● 8 vCPU/16GB  ○ 16 vCPU/32GB             │
│  Disk: [160] GB                                                       │
│                                                                       │
│  [Provision Environment]                                              │
│                                                                       │
│  After clicking Provision:                                            │
│  ├── Progress bar shows provisioning stages                          │
│  ├── Real-time logs from Terraform/Ansible                           │
│  ├── Estimated time: 5-8 minutes                                     │
│  └── On completion: subdomain URL, status = "active"                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Ops Portal Permissions for Enterprise Onboarding

| Action | founder | engineer | sales | customer_success |
|--------|---------|----------|-------|------------------|
| Create customer record | ✅ | ✅ | ✅ | ✅ (view only) |
| Provision dedicated VPS | ✅ | ✅ | ❌ | ❌ |
| Generate enterprise license | ✅ | ✅ | ❌ | ❌ |
| View customer environments | ✅ | ✅ | ✅ (read) | ✅ (read) |
| Update customer plan | ✅ | ✅ | ✅ | ❌ |
| Decommission environment | ✅ | ✅ | ❌ | ❌ |

**Sales team can create customer records and view environments, but cannot provision infrastructure or generate licenses.** This ensures proper separation of duties.

### 6.4 Customer Subdomain Management

For dedicated VPS customers, the Ops Portal manages custom subdomains:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Ops Portal → Customers → Acme Corp → Subdomains                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Primary Subdomain:                                                   │
│    app.acme.featuresignals.com → 52.10.20.30 (Virginia VPS)          │
│    api.acme.featuresignals.com → 52.10.20.30 (Virginia VPS)          │
│    Status: ✅ Active  |  TLS: ✅ Valid  |  Health: ✅ Healthy         │
│                                                                       │
│  DNS Records (Cloudflare, auto-managed):                              │
│    app.acme.featuresignals.com  A  52.10.20.30  Proxied: ✅          │
│    api.acme.featuresignals.com  A  52.10.20.30  Proxied: ✅          │
│                                                                       │
│  Actions: [Restart Services] [View Logs] [SSH Access] [Decommission]  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Session & Token Management

### 7.1 Audit Log Schema

```sql
-- ops DB: ops_audit_log
CREATE TABLE ops_audit_log (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES ops_users(id),
    action          TEXT NOT NULL,  -- e.g., "env.create", "env.delete", "user.login"
    resource_type   TEXT NOT NULL,  -- e.g., "environment", "ops_user", "license"
    resource_id     TEXT,           -- ID of the affected resource
    details         JSONB,          -- Additional context (redacted secrets)
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ops_audit_log_user_id ON ops_audit_log(user_id);
CREATE INDEX idx_ops_audit_log_action ON ops_audit_log(action);
CREATE INDEX idx_ops_audit_log_created_at ON ops_audit_log(created_at);
CREATE INDEX idx_ops_audit_log_resource ON ops_audit_log(resource_type, resource_id);
```

### 7.2 Logged Events

| Event Category | Events Logged |
|----------------|---------------|
| **Authentication** | login_success, login_failure, logout, session_revoked, magic_link_sent, magic_link_used |
| **Authorization** | permission_denied, role_changed, permission_granted |
| **Environment** | env.create, env.update, env.delete, env.deploy, env.suspend, env.resume, env.decommission |
| **License** | license.create, license.update, license.revoke, license.quota_override |
| **User Management** | user.create, user.update, user.delete, user.role_change, user.session_revoke |
| **Debug Mode** | debug.enable, debug.disable, debug.timeout |
| **SSH Access** | ssh.connect, ssh.disconnect, ssh.command_executed |
| **Cost/Billing** | cost.export, billing.update, pricing.change |
| **System** | config.change, backup.created, backup.restored, migration.run |

### 7.3 Audit Log Implementation

```typescript
// ops/src/lib/audit.ts

export async function logAuditEvent(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, unknown>,
  req: NextRequest
): Promise<void> {
  // Redact sensitive fields
  const sanitizedDetails = redactSensitiveData(details);

  await db.ops_audit_log.create({
    data: {
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: sanitizedDetails,
      ip_address: req.ip,
      user_agent: req.headers.get("user-agent"),
    },
  });
}

function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["password", "secret", "token", "key", "authorization"];
  const redacted = { ...data };

  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      redacted[key] = "[REDACTED]";
    }
  }

  return redacted;
}
```

---

## 8. Code-Level Implementation

### 8.1 Database Schema (Complete)

```sql
-- ops DB: ops_users
CREATE TABLE ops_users (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN (
        'founder', 'engineer', 'qa', 'perf_tester', 
        'customer_success', 'demo_team', 'finance', 'sales', 'support'
    )),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited')),
    auth_method     TEXT NOT NULL CHECK (auth_method IN ('google_sso', 'magic_link', 'saml')),
    google_sub      TEXT UNIQUE,  -- Google OAuth2 subject ID
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      TEXT REFERENCES ops_users(id)
);

CREATE INDEX idx_ops_users_email ON ops_users(email);
CREATE INDEX idx_ops_users_role ON ops_users(role);
CREATE INDEX idx_ops_users_status ON ops_users(status);

-- ops DB: ops_roles (for future custom role support)
CREATE TABLE ops_roles (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    description     TEXT,
    permissions     JSONB NOT NULL DEFAULT '[]',
    is_system       BOOLEAN DEFAULT FALSE,  -- System roles cannot be deleted
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed system roles
INSERT INTO ops_roles (id, name, description, permissions, is_system) VALUES
('role_founder', 'founder', 'Full access to all ops portal features', '[{"resource":"*","action":"*"}]', true),
('role_engineer', 'engineer', 'Provision, debug, manage environments', '[{"resource":"environment","action":"create"},{"resource":"environment","action":"read"},{"resource":"environment","action":"update"},{"resource":"environment","action":"delete"},{"resource":"environment","action":"execute"},{"resource":"customer","action":"read"},{"resource":"license","action":"read"},{"resource":"license","action":"update"},{"resource":"cost","action":"read"},{"resource":"audit_log","action":"read"},{"resource":"sandbox","action":"create"},{"resource":"sandbox","action":"read"},{"resource":"sandbox","action":"delete"},{"resource":"debug_mode","action":"execute"},{"resource":"ssh_access","action":"execute"}]', true),
('role_qa', 'qa', 'Create sandbox environments, view logs', '[{"resource":"environment","action":"read"},{"resource":"sandbox","action":"create"},{"resource":"sandbox","action":"read"},{"resource":"sandbox","action":"delete"},{"resource":"audit_log","action":"read"}]', true),
('role_perf_tester', 'perf_tester', 'Create performance test environments', '[{"resource":"environment","action":"create"},{"resource":"environment","action":"read"},{"resource":"environment","action":"delete"}]', true),
('role_customer_success', 'customer_success', 'View environments, customers, logs (read-only)', '[{"resource":"environment","action":"read"},{"resource":"customer","action":"read"},{"resource":"audit_log","action":"read"},{"resource":"debug_mode","action":"execute"}]', true),
('role_demo_team', 'demo_team', 'Create/manage sandbox environments', '[{"resource":"sandbox","action":"create"},{"resource":"sandbox","action":"read"},{"resource":"sandbox","action":"delete"},{"resource":"environment","action":"read"}]', true),
('role_finance', 'finance', 'Cost dashboards, billing, revenue analysis', '[{"resource":"cost","action":"read"},{"resource":"cost","action":"export"},{"resource":"customer","action":"read"},{"resource":"billing","action":"read"}]', true),
('role_sales', 'sales', 'View customer environments, demo access', '[{"resource":"environment","action":"read"},{"resource":"customer","action":"read"}]', true),
('role_support', 'support', 'View logs, enable debug mode', '[{"resource":"environment","action":"read"},{"resource":"audit_log","action":"read"},{"resource":"debug_mode","action":"execute"}]', true);
```

### 8.2 Next.js Auth Middleware

```typescript
// ops/src/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateSession } from "./lib/auth";
import { hasPermission } from "./lib/auth-guard";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname.startsWith("/auth/") || pathname === "/login") {
    return NextResponse.next();
  }

  // Validate session
  const session = await validateSession(request);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check permissions for protected routes
  const requiredPermission = getRequiredPermission(pathname, request.method);
  if (requiredPermission) {
    const allowed = hasPermission(
      session.user.role,
      requiredPermission.resource,
      requiredPermission.action,
      { userId: session.user.id }
    );

    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
  }

  // Attach user context to headers for downstream use
  const response = NextResponse.next();
  response.headers.set("x-user-id", session.user.id);
  response.headers.set("x-user-role", session.user.role);

  return response;
}

function getRequiredPermission(
  pathname: string,
  method: string
): { resource: string; action: string } | null {
  if (pathname.startsWith("/api/v1/ops/environments")) {
    return {
      resource: "environment",
      action: method === "GET" ? "read" : method === "POST" ? "create" : method === "DELETE" ? "delete" : "update",
    };
  }
  if (pathname.startsWith("/api/v1/ops/cost")) {
    return { resource: "cost", action: method === "GET" ? "read" : "export" };
  }
  if (pathname.startsWith("/api/v1/ops/users")) {
    return {
      resource: "ops_user",
      action: method === "GET" ? "read" : method === "POST" ? "create" : method === "DELETE" ? "delete" : "update",
    };
  }
  return null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 8.3 Auth Guard Component (Frontend)

```tsx
// ops/src/components/auth-guard.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission, type Resource, type Action } from "@/lib/auth-guard";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredResource: Resource;
  requiredAction: Action;
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requiredResource,
  requiredAction,
  fallback,
}: AuthGuardProps) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoading && user) {
      const allowed = hasPermission(user.role, requiredResource, requiredAction);
      if (!allowed) {
        router.push("/unauthorized");
      }
      setIsChecking(false);
    }
  }, [user, isLoading, requiredResource, requiredAction, router]);

  if (isLoading || isChecking) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    router.push(`/login?redirect=${pathname}`);
    return null;
  }

  const allowed = hasPermission(user.role, requiredResource, requiredAction);
  if (!allowed) {
    return fallback ?? <div className="p-8 text-center text-red-600">Access Denied</div>;
  }

  return <>{children}</>;
}
```

---

## 9. Security Considerations

### 9.1 Security Controls

| Control | Implementation |
|---------|----------------|
| **MFA** | Enforced by Google Workspace SSO (primary method) |
| **Session timeout** | 8 hours max, auto-logout on inactivity (30 min) |
| **IP restriction** | Optional: restrict access to office VPN IPs (future) |
| **Brute force protection** | Magic link rate limiting (3 per email per hour) |
| **Cookie security** | `Secure`, `HttpOnly`, `SameSite=Lax`, short expiry |
| **CSRF protection** | Next.js built-in CSRF tokens for state-changing requests |
| **XSS protection** | Content Security Policy headers, sanitized inputs |
| **Secret rotation** | Ops portal JWT secret rotated quarterly |
| **Audit trail** | Every auth event, permission check, privileged action logged |

### 9.2 Threat Model

| Threat | Mitigation |
|--------|------------|
| Stolen session cookie | Short expiry (8h), IP binding (optional), revocation endpoint |
| Phishing attack on SSO | Google Workspace MFA, domain-restricted OAuth |
| Magic link interception | 15-minute expiry, single-use, IP logging |
| Privilege escalation | RBAC enforced at API layer, not just frontend |
| Insider threat | Comprehensive audit logging, least privilege by default |
| Ops portal compromise | Isolated VPS, no customer data, separate auth system |

### 9.3 Incident Response

```
Security Incident Detected
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Revoke affected sessions immediately                     │
│ 2. Disable compromised user account                         │
│ 3. Rotate ops portal JWT secret                             │
│ 4. Review audit logs for scope of compromise                │
│ 5. Notify affected users                                    │
│ 6. Document incident in audit log                           │
│ 7. Post-incident review within 48 hours                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Migration from Current System

### 10.1 Current State

```
Current Auth Flow:
  User logs in to app.featuresignals.com
       │
       │ (same JWT)
       ▼
  User accesses ops.featuresignals.com
       │
       ▼
  Check: email ends with @featuresignals.com?
       │
       ├── Yes → Grant full access
       └── No  → Reject
```

### 10.2 Migration Steps

```
Step 1: Deploy new ops portal VPS with independent auth (Week 1)
  ├── Set up new VPS, PostgreSQL, Next.js app
  ├── Implement Google SSO + magic link auth
  ├── Seed ops_users table with existing team members
  └── Test auth flow independently

Step 2: Parallel run (Week 2)
  ├── Both old and new auth systems active
  ├── Users can log in via either method
  ├── Monitor for auth failures, permission issues
  └── Collect feedback from team

Step 3: Cutover (Week 3)
  ├── Disable old auth method on ops portal
  ├── Redirect old ops URL to new ops portal
  ├── Notify team of new login flow
  └── Monitor for 48 hours

Step 4: Cleanup (Week 4)
  ├── Remove old auth code from ops portal
  ├── Archive old session data
  ├── Update documentation
  └── Conduct post-migration review
```

### 10.3 User Migration Script

```typescript
// ops/scripts/migrate-users.ts

import { db } from "../src/lib/db";

async function migrateUsers() {
  // Existing team members (manually curated)
  const existingUsers = [
    { email: "dinesh@featuresignals.com", name: "Dinesh", role: "founder" },
    { email: "shashi@featuresignals.com", name: "Shashi", role: "founder" },
    // Add other team members...
  ];

  for (const user of existingUsers) {
    await db.ops_users.upsert({
      where: { email: user.email },
      create: {
        id: generateId(),
        email: user.email,
        name: user.name,
        role: user.role,
        status: "active",
        auth_method: "google_sso",
        created_by: "system",
      },
      update: {
        role: user.role,
        status: "active",
      },
    });

    console.log(`✓ Migrated ${user.email} as ${user.role}`);
  }
}

migrateUsers().catch(console.error);
```

---

## 11. Future Integrations

### 11.1 SAML/OIDC Support

```
When to implement: When team grows beyond 20 people or enterprise customers request SSO for their ops access.

Implementation:
  ├── Add SAML/OIDC provider configuration to ops portal
  ├── Map SAML attributes to ops_users fields
  ├── Support multiple IdPs (Okta, Azure AD, Google Workspace)
  └── Maintain backward compatibility with Google SSO + magic link
```

### 11.2 IP Restriction

```
When to implement: When security requirements mandate office-only access.

Implementation:
  ├── Configure allowed IP ranges in ops portal config
  ├── Middleware checks request IP against allowed ranges
  ├── VPN IPs whitelisted for remote work
  └── Audit log records IP for every request
```

### 11.3 Just-In-Time (JIT) Provisioning

```
When to implement: When onboarding contractors frequently.

Implementation:
  ├── User authenticates via SSO/magic link
  ├── If user doesn't exist in ops_users, create with default role (support)
  ├── Send notification to founders for role adjustment
  └── Auto-expire contractor accounts after contract end date
```

---

## 13. Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Implement customer record creation UI in Ops Portal
- [ ] Implement enterprise onboarding workflow (multi-tenant, dedicated VPS, on-prem)
- [ ] Implement dedicated VPS provisioning UI with progress tracking
- [ ] Implement customer subdomain management UI
- [ ] Add sales team role with appropriate permissions (create customers, view envs, no provisioning)
- [ ] Set up ops portal VPS with independent PostgreSQL
- [ ] Implement Google Workspace SSO authentication
- [ ] Implement email magic link authentication
- [ ] Create ops_users, ops_sessions, ops_roles, ops_audit_log tables
- [ ] Seed system roles and initial team members
- [ ] Implement session management (create, validate, revoke)
- [ ] Implement RBAC permission engine
- [ ] Write unit tests for auth flows

### Phase 2: Authorization & UI (Weeks 3-4)
- [ ] Implement Next.js middleware for route protection
- [ ] Build AuthGuard component for frontend
- [ ] Implement role-based sidebar navigation (hide unauthorized links)
- [ ] Build user management page (founder-only)
- [ ] Build role management page (founder-only)
- [ ] Implement audit log viewer
- [ ] Write integration tests for permission checks

### Phase 3: Security & Hardening (Weeks 5-6)
- [ ] Implement session timeout and auto-logout
- [ ] Implement magic link rate limiting
- [ ] Add Content Security Policy headers
- [ ] Implement CSRF protection for state-changing requests
- [ ] Add IP logging to all audit events
- [ ] Implement sensitive data redaction in audit logs
- [ ] Conduct security review
- [ ] Write runbooks for auth incidents

### Phase 4: Migration & Cutover (Weeks 7-8)
- [ ] Run user migration script
- [ ] Parallel run old and new auth systems
- [ ] Collect team feedback, fix issues
- [ ] Cutover to new auth system
- [ ] Disable old auth method
- [ ] Monitor for 48 hours
- [ ] Post-migration review
- [ ] Update documentation

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial Ops Portal IAM architecture |
| 1.1.0 | 2026-01-15 | Engineering | Added enterprise onboarding flow, dedicated VPS provisioning UI, customer subdomain management, sales team permissions |

---

## Next Steps

1. **Review** this document with security team and founders
2. **Approve** role definitions and permission matrix
3. **Implement** authentication flows (Google SSO + magic link)
4. **Implement** RBAC engine and permission checks
5. **Test** auth flows end-to-end
6. **Migrate** from current system using parallel run approach
7. **Document** runbooks for auth incidents and user management