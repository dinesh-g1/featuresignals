# FeatureSignals — Unified License Enforcement System Architecture

> **Version:** 1.1.0  
> **Status:** Design Document — Pending Review  
> **Author:** Engineering  
> **Last Updated:** 2026-01-15  
> **Audience:** Engineering, Security, Ops Team, Legal, Founders

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Principles](#2-core-principles)
3. [Open Core Enforcement Model](#3-open-core-enforcement-model)
4. [License Types & Feature Tiers](#4-license-types--feature-tiers)
5. [License Key Design](#5-license-key-design)
6. [Enforcement Mechanisms by Deployment Model](#6-enforcement-mechanisms-by-deployment-model)
7. [Trial → Free Degradation Flow](#7-trial--free-degradation-flow)
8. [Quota Tracking & Enforcement](#8-quota-tracking--enforcement)
9. [Phone-Home Agent (On-Prem)](#9-phone-home-agent-on-prem)
10. [Database Schema](#10-database-schema)
11. [Code-Level Implementation](#11-code-level-implementation)
12. [License Lifecycle Management](#12-license-lifecycle-management)
13. [Compliance & Audit Trail](#13-compliance--audit-trail)
14. [Security Considerations](#14-security-considerations)
15. [Implementation Checklist](#15-implementation-checklist)

---

## 1. Executive Summary

FeatureSignals operates on an **Open Core** business model. The same codebase serves Community Edition (free, open source, no license required) and Enterprise Edition (commercial, license-gated). This document defines a **unified license enforcement system** that:

- **Generates cryptographically signed license keys** (Trial, Pro, Enterprise) that are tamper-proof and verifiable offline.
- **Enforces feature gating** — Community features are always accessible. Pro and Enterprise features require a valid license.
- **Enforces quotas** (seats, environments, evaluations, regions) at the API layer for SaaS and via phone-home for on-prem.
- **Tracks usage** and reports breaches to the ops portal for visibility and enforcement.
- **Supports offline grace periods** for on-prem deployments with automatic read-only mode on expiry.
- **Automatically degrades expired trials** to the Free tier — data preserved, excess resources suspended, features return 402.
- **Provides a central license registry** in the ops portal for management, overrides, and audit.

**Key Outcomes:**
- Community Edition features NEVER require a license. Open-source users get full access to core features freely.
- Pro and Enterprise features are code-locked behind license validation.
- One license system serves all deployment models (SaaS, Dedicated VPS, On-Prem).
- License keys are cryptographically signed and cannot be forged.
- Trial licenses auto-degrade to Free on expiry (14 days). Data preserved, excess suspended.
- Quotas are enforced in real-time for SaaS, periodically for dedicated VPS, and with grace periods for on-prem.
- Ops portal has full visibility into license status, usage, and breaches.
- Audit trail records every license event for compliance.

---

## 2. Core Principles

### 2.1 Non-Negotiable Rules

1. **Open Core enforcement** — Community Edition features NEVER require a license. The license middleware only activates for Pro and Enterprise feature routes. Open-source users get full access to core features with no license key needed.
2. **One license system, all models** — The same license schema and enforcement logic serves SaaS, Dedicated VPS, and On-Prem. Differences are configuration, not code.
3. **Cryptographic integrity** — License keys are signed with HMAC-SHA256. Tampering is detected and rejected.
4. **Fail-open for SaaS, fail-closed for on-prem** — SaaS degrades gracefully on license service failure. On-prem enters read-only mode after grace period.
5. **Trial auto-degradation** — Expired trials automatically degrade to Free tier. Data preserved, excess resources suspended, features return 402.
6. **Usage is metered, not guessed** — Evaluation counts, seat usage, and environment counts are tracked accurately, not estimated.
7. **Audit everything** — Every license creation, validation, breach, override, and degradation is logged.

### 2.2 License Model Comparison

| Aspect | Multi-Tenant SaaS | Dedicated VPS | On-Premises |
|--------|-------------------|---------------|-------------|
| **Enforcement** | In-process middleware (real-time) | In-process middleware + phone-home (periodic) | Phone-home agent + offline grace period |
| **Validation Frequency** | Every API request | Every API request + phone-home every 24h | Phone-home every 24h, offline cache |
| **Offline Behavior** | N/A (always online) | 72-hour grace period | 72-hour grace period, then read-only |
| **Quota Enforcement** | Hard limit (429 on breach) | Hard limit + notification | Hard limit + notification |
| **License Key Format** | `fs_lic_{payload}.{signature}` | `fs_lic_{payload}.{signature}` | `fs_lic_{payload}.{signature}` |
| **Storage** | Ops DB (central) | Ops DB + local cache | Ops DB + local cache (encrypted) |

---

## 3. Open Core Enforcement Model

### 3.1 How License Enforcement Works

**Community Edition features are never gated.** The license middleware only activates for Pro and Enterprise feature routes. When an open-source user hits a Community feature, the request passes through without any license check. When they hit a Pro or Enterprise feature, the middleware validates the license and returns `402 Payment Required` if no valid license exists.

```
API Request received
   │
   ▼
1. Is this a Pro/Enterprise-only feature? (SSO, audit export, webhooks, approvals, etc.)
   ├── NO → Allow request (Community Edition feature, no license needed)
   └── YES → Continue to step 2
   │
   ▼
2. Is there a valid license configured?
   ├── NO → Return 402: "Feature requires a valid license. Upgrade to Pro/Enterprise."
   └── YES → Continue to step 3
   │
   ▼
3. Is the license active and not expired?
   ├── NO → Return 402: "License expired or suspended"
   └── YES → Continue to step 4
   │
   ▼
4. Does the license include this feature?
   ├── NO → Return 403: "Feature not enabled in your license tier"
   └── YES → Allow request
```

### 3.2 Enterprise Feature Routes (Gated)

| Route Prefix | Feature | Tier Required |
|-------------|---------|---------------|
| `/v1/sso/` | SSO/SAML configuration | Enterprise |
| `/v1/audit/export` | Audit log export | Enterprise |
| `/v1/roles/custom` | Custom RBAC roles | Enterprise |
| `/v1/ip-allowlist` | IP allowlist management | Enterprise |
| `/v1/approvals` | Approval workflows | Pro |
| `/v1/webhooks/config` | Webhook retry configuration | Pro |
| `/v1/flags/variant` | A/B testing (variant flags) | Pro |
| `/v1/flags/schedule` | Flag scheduling | Pro |

All other routes are Community Edition features and require no license.

---

## 4. License Types & Feature Tiers

### 4.1 License Types

| Type | Key Format | Features | Duration | Degradation |
|------|-----------|----------|----------|-------------|
| **Community** | None | Core only | Permanent | N/A |
| **Trial** | `fs_trial_{org_id}.{sig}` | All Pro + Enterprise | 14 days | Auto → Community (data preserved, excess suspended) |
| **Pro** | `fs_lic_pro_{org_id}.{sig}` | All Pro features | Monthly/Annual | 7-day grace → Community |
| **Enterprise** | `fs_lic_ent_{org_id}.{sig}` | All Pro + Enterprise | Annual | 30-day grace → Pro |

### 4.2 Feature Tier Matrix

| Feature | Community (Free) | Pro | Enterprise |
|---------|------------------|-----|------------|
| Boolean / String / Number / JSON flags | ✅ | ✅ | ✅ |
| Basic targeting (user attributes) | ✅ | ✅ | ✅ |
| Segments | ✅ | ✅ | ✅ |
| Percentage rollouts | ✅ (up to 5 flags) | ✅ (unlimited) | ✅ |
| Environments | 2 | 10 | Unlimited |
| Projects | 1 | 5 | Unlimited |
| Seats | 3 | 25 | Unlimited |
| SSE streaming | ✅ | ✅ | ✅ |
| Relay proxy | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ✅ | ✅ |
| Approval workflows | ❌ | ✅ | ✅ |
| A/B testing (variant flags) | ❌ | ✅ | ✅ |
| Flag scheduling | ❌ | ✅ | ✅ |
| Audit log export | ❌ | ❌ | ✅ |
| SSO / SAML | ❌ | ❌ | ✅ |
| Custom RBAC roles | ❌ | ❌ | ✅ |
| IP allowlists | ❌ | ❌ | ✅ |
| Priority support (SLA) | ❌ | ❌ | ✅ |

---

## 5. License Architecture Overview

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Unified License System                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Central License Registry (Ops DB)                                    │
│  ├── License key generation (cryptographically signed)                │
│  ├── Quota tracking (seats, envs, evaluations, regions)               │
│  ├── Expiry management                                                │
│  └── Enforcement policy per tier                                      │
│                                                                       │
│  Enforcement Points:                                                  │
│  ├── SaaS: Middleware in API server (in-process, real-time)           │
│  ├── Dedicated VPS: Middleware + periodic phone-home                  │
│  └── On-Prem: Phone-home agent + offline grace period                 │
│                                                                       │
│  Phone-Home Agent (On-Prem / Dedicated VPS):                          │
│  ├── Reports usage to central registry every 24h                      │
│  ├── Receives updated license state                                   │
│  ├── Caches license locally for offline validation                    │
│  └── Enters read-only mode after grace period                         │
│                                                                       │
│  Ops Portal Integration:                                              │
│  ├── License CRUD (create, update, revoke, suspend)                   │
│  ├── Quota override (temporary or permanent)                          │
│  ├── Usage dashboard (evaluations, seats, environments)               │
│  └── Breach alerts (Slack, email)                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 License Flow by Deployment Model

```
SaaS Flow:
  API Request → License Middleware → Check DB cache → Validate quota → Allow/Deny
  (Real-time, no phone-home needed)

Dedicated VPS Flow:
  API Request → License Middleware → Check local cache → Validate quota → Allow/Deny
  Phone-Home Agent → Report usage every 24h → Update local cache

On-Prem Flow:
  API Request → License Middleware → Check local cache → Validate quota → Allow/Deny
  Phone-Home Agent → Report usage every 24h → Update local cache
  If phone-home fails > 72h → Enter read-only mode
```

---

## 5. License Key Design

### 5.1 Key Format

```
fs_lic_{base64url(JWT payload)}.{HMAC-SHA256 signature}

Example:
fs_lic.eyJvcmdfaWQiOiJvcmdfMTIzIiwidGllciI6InBybyIsIm1vZGVsIjoic2FhcyIsIm1heF9zZWF0cyI6MTAsIm1heF9lbnZpcm9ubWVudHMiOjUsImZlYXR1cmVzIjpbInNzbyIsImF1ZGl0X2V4cG9ydCJdLCJ2YWxpZF91bnRpbCI6IjIwMjctMDEtMTVUMDA6MDA6MDBaIiwiaWF0IjoxNzA1Mjc2ODAwfQ.a1b2c3d4e5f6...

Payload (decoded):
{
    "org_id": "org_123",
    "tier": "pro",
    "model": "saas",
    "max_seats": 10,
    "max_environments": 5,
    "max_evaluations_per_month": 1000000,
    "max_regions": 1,
    "features": ["sso", "audit_export"],
    "valid_until": "2027-01-15T00:00:00Z",
    "iat": 1705276800
}

Signature: HMAC-SHA256(payload, server_secret)
```

### 5.2 Key Generation

```go
// server/internal/license/generator.go

type LicenseGenerator struct {
    secret []byte // HMAC-SHA256 secret (never exposed, stored in env var)
}

func (g *LicenseGenerator) Generate(req LicenseRequest) (string, error) {
    payload := LicensePayload{
        OrgID:                  req.OrgID,
        Tier:                   req.Tier,
        Model:                  req.Model,
        MaxSeats:               req.MaxSeats,
        MaxEnvironments:        req.MaxEnvironments,
        MaxEvaluationsPerMonth: req.MaxEvaluationsPerMonth,
        MaxRegions:             req.MaxRegions,
        Features:               req.Features,
        ValidUntil:             req.ValidUntil,
        Iat:                    time.Now().Unix(),
    }

    payloadJSON, err := json.Marshal(payload)
    if err != nil {
        return "", fmt.Errorf("marshal payload: %w", err)
    }

    encoded := base64.RawURLEncoding.EncodeToString(payloadJSON)

    mac := hmac.New(sha256.New, g.secret)
    mac.Write([]byte(encoded))
    signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

    return fmt.Sprintf("fs_lic_%s.%s", encoded, signature), nil
}

func (g *LicenseGenerator) Validate(key string) (*LicensePayload, error) {
    parts := strings.SplitN(strings.TrimPrefix(key, "fs_lic_"), ".", 2)
    if len(parts) != 2 {
        return nil, fmt.Errorf("invalid license key format")
    }

    encoded, signatureB64 := parts[0], parts[1]

    // Verify signature
    mac := hmac.New(sha256.New, g.secret)
    mac.Write([]byte(encoded))
    expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

    if !hmac.Equal([]byte(signatureB64), []byte(expectedSig)) {
        return nil, fmt.Errorf("invalid license signature")
    }

    // Decode payload
    payloadJSON, err := base64.RawURLEncoding.DecodeString(encoded)
    if err != nil {
        return nil, fmt.Errorf("decode payload: %w", err)
    }

    var payload LicensePayload
    if err := json.Unmarshal(payloadJSON, &payload); err != nil {
        return nil, fmt.Errorf("unmarshal payload: %w", err)
    }

    // Check expiry
    if payload.ValidUntil != nil && time.Now().After(*payload.ValidUntil) {
        return nil, fmt.Errorf("license expired")
    }

    return &payload, nil
}
```

### 5.3 Tier Definitions

```go
// server/internal/license/tiers.go

type TierConfig struct {
    Name                   string
    MaxSeats               int
    MaxEnvironments        int
    MaxEvaluationsPerMonth *int64 // nil = unlimited
    MaxRegions             int
    Features               []string
    MonthlyPriceUSD        float64
}

var TierConfigs = map[string]TierConfig{
    "free": {
        Name:                   "Free",
        MaxSeats:               1,
        MaxEnvironments:        2,
        MaxEvaluationsPerMonth: ptrInt64(10000),
        MaxRegions:             1,
        Features:               []string{},
        MonthlyPriceUSD:        0,
    },
    "pro": {
        Name:                   "Pro",
        MaxSeats:               10,
        MaxEnvironments:        5,
        MaxEvaluationsPerMonth: ptrInt64(1000000),
        MaxRegions:             1,
        Features:               []string{"webhooks", "scheduling", "approval_workflows"},
        MonthlyPriceUSD:        49,
    },
    "growth": {
        Name:                   "Growth",
        MaxSeats:               50,
        MaxEnvironments:        20,
        MaxEvaluationsPerMonth: ptrInt64(10000000),
        MaxRegions:             2,
        Features:               []string{"webhooks", "scheduling", "approval_workflows", "ab_testing", "audit_export"},
        MonthlyPriceUSD:        149,
    },
    "enterprise": {
        Name:                   "Enterprise",
        MaxSeats:               0,      // 0 = unlimited
        MaxEnvironments:        0,      // 0 = unlimited
        MaxEvaluationsPerMonth: nil,    // nil = unlimited
        MaxRegions:             4,
        Features:               []string{"webhooks", "scheduling", "approval_workflows", "ab_testing", "audit_export", "sso", "custom_roles", "ip_allowlist", "priority_support"},
        MonthlyPriceUSD:        0,      // Custom pricing
    },
    "onprem": {
        Name:                   "On-Premises",
        MaxSeats:               0,
        MaxEnvironments:        0,
        MaxEvaluationsPerMonth: nil,
        MaxRegions:             0,
        Features:               []string{"webhooks", "scheduling", "approval_workflows", "ab_testing", "audit_export", "sso", "custom_roles", "ip_allowlist", "priority_support", "offline_mode"},
        MonthlyPriceUSD:        0,      // Annual license fee
    },
}

func ptrInt64(v int64) *int64 { return &v }
```

---

## 6. Enforcement Mechanisms by Deployment Model

### 6.1 SaaS Enforcement (In-Process Middleware)

```go
// server/internal/license/middleware.go

type LicenseMiddleware struct {
    store   LicenseStore
    cache   LicenseCache
    logger  *slog.Logger
}

func (m *LicenseMiddleware) Handle(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Skip for public routes
        if isPublicRoute(r.URL.Path) {
            next.ServeHTTP(w, r)
            return
        }

        orgID := getOrgID(r.Context())
        if orgID == "" {
            next.ServeHTTP(w, r)
            return
        }

        license, err := m.cache.Get(r.Context(), orgID)
        if err != nil {
            // Cache miss: fallback to DB lookup
            license, err = m.store.GetLicense(r.Context(), orgID)
            if err != nil {
                if errors.Is(err, domain.ErrNotFound) {
                    httputil.Error(w, http.StatusPaymentRequired, "no active license")
                    return
                }
                m.logger.Error("license check failed", "org_id", orgID, "error", err)
                // Fail open for SaaS: allow request but log error
                next.ServeHTTP(w, r)
                return
            }
            m.cache.Set(orgID, license)
        }

        if !license.IsActive() {
            httputil.Error(w, http.StatusPaymentRequired, "license suspended or expired")
            return
        }

        // Check quotas
        if err := m.checkQuota(r.Context(), license, r); err != nil {
            httputil.Error(w, http.StatusTooManyRequests, err.Error())
            return
        }

        next.ServeHTTP(w, r)
    })
}

func (m *LicenseMiddleware) checkQuota(ctx context.Context, license *License, r *http.Request) error {
    // Check seat count
    if license.MaxSeats > 0 {
        seatCount, err := m.store.GetSeatCount(ctx, license.OrgID)
        if err != nil {
            return fmt.Errorf("check seat count: %w", err)
        }
        if seatCount > license.MaxSeats {
            return domain.NewValidationError("seats", "quota exceeded (%d/%d)", seatCount, license.MaxSeats)
        }
    }

    // Check environment count
    if license.MaxEnvironments > 0 {
        envCount, err := m.store.GetEnvironmentCount(ctx, license.OrgID)
        if err != nil {
            return fmt.Errorf("check environment count: %w", err)
        }
        if envCount > license.MaxEnvironments {
            return domain.NewValidationError("environments", "quota exceeded (%d/%d)", envCount, license.MaxEnvironments)
        }
    }

    // Check evaluation count (monthly)
    if license.MaxEvaluationsPerMonth != nil {
        evalCount, err := m.store.GetEvaluationCountThisMonth(ctx, license.OrgID)
        if err != nil {
            return fmt.Errorf("check evaluation count: %w", err)
        }
        if evalCount > *license.MaxEvaluationsPerMonth {
            return domain.NewValidationError("evaluations", "monthly quota exceeded (%d/%d)", evalCount, *license.MaxEvaluationsPerMonth)
        }
    }

    return nil
}
```

### 6.2 Dedicated VPS Enforcement (Middleware + Phone-Home)

Same middleware as SaaS, but with a phone-home agent that reports usage every 24 hours:

```go
// server/internal/license/phonehome.go

type PhoneHomeAgent struct {
    client       *http.Client
    endpoint     string
    interval     time.Duration
    orgID        string
    licenseKey   string
    localCache   *LicenseCache
    logger       *slog.Logger
    lastSuccess  time.Time
    gracePeriod  time.Duration
    metrics      MetricsReader
}

func (a *PhoneHomeAgent) Start(ctx context.Context) {
    ticker := time.NewTicker(a.interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            if err := a.report(ctx); err != nil {
                a.logger.Warn("phone-home failed", "error", err, "last_success", a.lastSuccess)
                if time.Since(a.lastSuccess) > a.gracePeriod {
                    a.localCache.SetStatus("grace_period_expired")
                    a.logger.Error("license grace period expired, entering read-only mode")
                }
            }
        }
    }
}

func (a *PhoneHomeAgent) report(ctx context.Context) error {
    // Gather usage metrics
    evalCount, err := a.metrics.GetEvaluationCount(ctx, "24h")
    if err != nil {
        return fmt.Errorf("get evaluation count: %w", err)
    }

    seatCount, err := a.metrics.GetSeatCount(ctx)
    if err != nil {
        return fmt.Errorf("get seat count: %w", err)
    }

    envCount, err := a.metrics.GetEnvironmentCount(ctx)
    if err != nil {
        return fmt.Errorf("get environment count: %w", err)
    }

    // Send to central registry
    req := PhoneHomeRequest{
        OrgID:        a.orgID,
        LicenseKey:   a.licenseKey,
        EvalCount24h: evalCount,
        SeatCount:    seatCount,
        EnvCount:     envCount,
        Timestamp:    time.Now().UTC(),
    }

    resp, err := a.client.PostJSON(ctx, a.endpoint, req)
    if err != nil {
        return fmt.Errorf("post phone-home: %w", err)
    }

    // Update local cache with response
    a.localCache.Update(resp.LicenseState)
    a.lastSuccess = time.Now().UTC()

    return nil
}
```

### 6.3 On-Prem Enforcement (Phone-Home + Offline Grace Period)

Same as Dedicated VPS, but with stricter offline behavior:

```
On-Prem Offline Behavior:
  ├── Phone-home succeeds → License validated, cache updated
  ├── Phone-home fails (< 72h) → Use cached license, log warning
  ├── Phone-home fails (> 72h) → Enter read-only mode
  │   ├── Flag evaluation continues (read-only)
  │   ├── Flag creation/update blocked
  │   ├── User management blocked
  │   └── Audit log records read-only mode entry
  └── Phone-home succeeds after grace period → Exit read-only mode
```

---

## 7. Trial → Free Degradation Flow

### 7.1 Degradation Timeline

```
Trial Created (Day 0)
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Trial Active (Days 1-14)                                     │
│ ├── All Pro + Enterprise features enabled                    │
│ ├── License middleware validates trial key                   │
│ ├── Day 7: Email notification "7 days remaining"             │
│ ├── Day 12: Email notification "2 days remaining"            │
│ ├── Day 14: Trial expires at 23:59:59 UTC                    │
│ └── Day 14: In-app banner "Upgrade to continue Pro features" │
└─────────────────────────────────────────────────────────────┘
   │
   ▼ (Day 15, 00:00:00 UTC)
┌─────────────────────────────────────────────────────────────┐
│ Automatic Degradation to Community (Free)                    │
│ 1. License status changes: trial → community                 │
│ 2. Pro/Enterprise features return 402 on next request        │
│ 3. Existing flags, projects, environments are preserved      │
│ 4. Quotas enforced: environments capped at 2, seats at 3     │
│ 5. Excess environments/seats are suspended (not deleted)     │
│ 6. Email sent: "Trial expired, account downgraded to Free"   │
│ 7. In-app banner: "Upgrade to restore Pro features"          │
└─────────────────────────────────────────────────────────────┘
   │
   ▼ (Customer Upgrades)
┌─────────────────────────────────────────────────────────────┐
│ Upgrade to Pro or Enterprise                                 │
│ 1. Payment processed (Stripe)                                │
│ 2. New license key generated and stored                      │
│ 3. Features unlocked immediately                             │
│ 4. Suspended environments/seats reactivated                  │
│ 5. Email sent: "Welcome to Pro/Enterprise"                   │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Degradation Code Implementation

```go
// server/internal/license/degradation.go

type LicenseDegradationManager struct {
    store       LicenseStore
    notifier    Notifier
    logger      *slog.Logger
}

func (m *LicenseDegradationManager) ProcessExpiredTrials(ctx context.Context) error {
    trials, err := m.store.GetExpiredTrials(ctx)
    if err != nil {
        return fmt.Errorf("get expired trials: %w", err)
    }

    for _, trial := range trials {
        if err := m.degradeToCommunity(ctx, trial); err != nil {
            m.logger.Error("failed to degrade trial", "org_id", trial.OrgID, "error", err)
            continue
        }
        m.logger.Info("trial degraded to community", "org_id", trial.OrgID)
    }

    return nil
}

func (m *LicenseDegradationManager) degradeToCommunity(ctx context.Context, license *License) error {
    // 1. Update license status
    license.Tier = "free"
    license.Status = "active"
    license.MaxEnvironments = 2
    license.MaxSeats = 3
    license.Features = []string{}
    license.ValidUntil = nil

    if err := m.store.UpdateLicense(ctx, license); err != nil {
        return fmt.Errorf("update license: %w", err)
    }

    // 2. Suspend excess environments (preserve data, block access)
    envs, err := m.store.GetEnvironments(ctx, license.OrgID)
    if err != nil {
        return fmt.Errorf("get environments: %w", err)
    }

    activeCount := 0
    for _, env := range envs {
        if env.Status == "active" {
            activeCount++
            if activeCount > 2 {
                if err := m.store.SuspendEnvironment(ctx, env.ID, "trial_expired"); err != nil {
                    m.logger.Warn("failed to suspend environment", "env_id", env.ID, "error", err)
                }
            }
        }
    }

    // 3. Suspend excess seats
    users, err := m.store.GetUsers(ctx, license.OrgID)
    if err != nil {
        return fmt.Errorf("get users: %w", err)
    }

    activeUserCount := 0
    for _, user := range users {
        if user.Status == "active" {
            activeUserCount++
            if activeUserCount > 3 {
                if err := m.store.SuspendUser(ctx, user.ID, "trial_expired"); err != nil {
                    m.logger.Warn("failed to suspend user", "user_id", user.ID, "error", err)
                }
            }
        }
    }

    // 4. Notify customer
    m.notifier.Notify(ctx, Notification{
        To:      license.OrgID,
        Subject: "Your FeatureSignals trial has expired",
        Message: "Your account has been downgraded to the Free plan. Pro features are now locked. Upgrade to restore access.",
    })

    return nil
}
```

---

## 8. Quota Tracking & Enforcement

### 8.1 Quota Types

| Quota Type | Description | Enforcement | Breach Action |
|------------|-------------|-------------|---------------|
| **Seats** | Number of active users in org | Hard limit | 429 Too Many Requests on new user creation |
| **Environments** | Number of active environments | Hard limit | 429 on new environment creation |
| **Evaluations** | Monthly flag evaluation count | Soft limit (SaaS), Hard limit (VPS/On-Prem) | 429 on evaluation API, notification sent |
| **Regions** | Number of active regions | Hard limit | 403 on cross-region API calls |
| **Features** | Enabled feature flags | Hard limit | 403 on feature access |

### 8.2 Quota Tracking Schema

```sql
-- ops DB: license_usage_snapshots
CREATE TABLE license_usage_snapshots (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    license_id      TEXT NOT NULL REFERENCES licenses(id),
    snapshot_date   DATE NOT NULL,
    seat_count      INT NOT NULL DEFAULT 0,
    environment_count INT NOT NULL DEFAULT 0,
    evaluation_count_month BIGINT NOT NULL DEFAULT 0,
    region_count    INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_license_usage_snapshots_org_date ON license_usage_snapshots(org_id, snapshot_date);
CREATE INDEX idx_license_usage_snapshots_license_date ON license_usage_snapshots(license_id, snapshot_date);

-- ops DB: license_quota_breaches
CREATE TABLE license_quota_breaches (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    license_id      TEXT NOT NULL REFERENCES licenses(id),
    quota_type      TEXT NOT NULL CHECK (quota_type IN ('seats', 'environments', 'evaluations', 'regions', 'features')),
    limit_value     BIGINT NOT NULL,
    actual_value    BIGINT NOT NULL,
    breach_at       TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    resolution      TEXT,  -- 'upgraded', 'reduced_usage', 'override_granted'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_license_quota_breaches_org ON license_quota_breaches(org_id);
CREATE INDEX idx_license_quota_breaches_license ON license_quota_breaches(license_id);
CREATE INDEX idx_license_quota_breaches_unresolved ON license_quota_breaches(org_id) WHERE resolved_at IS NULL;
```

### 8.3 Quota Override Mechanism

```go
// server/internal/license/override.go

type QuotaOverride struct {
    ID          string
    LicenseID   string
    OrgID       string
    QuotaType   string
    LimitValue  int64
    Reason      string
    GrantedBy   string  // user_id
    ValidFrom   time.Time
    ValidUntil  *time.Time  // nil = permanent
    CreatedAt   time.Time
}

type OverrideStore interface {
    CreateOverride(ctx context.Context, override *QuotaOverride) error
    GetActiveOverrides(ctx context.Context, orgID string) ([]QuotaOverride, error)
    RevokeOverride(ctx context.Context, overrideID string, reason string) error
}

// Override is checked in quota validation:
func (m *LicenseMiddleware) checkQuota(ctx context.Context, license *License, r *http.Request) error {
    // Check for active overrides
    overrides, err := m.overrideStore.GetActiveOverrides(ctx, license.OrgID)
    if err != nil {
        m.logger.Warn("failed to load overrides, using default limits", "error", err)
    }

    // Apply overrides to limits
    effectiveLimits := license.Limits
    for _, override := range overrides {
        if override.ValidUntil == nil || time.Now().Before(*override.ValidUntil) {
            switch override.QuotaType {
            case "seats":
                effectiveLimits.MaxSeats = override.LimitValue
            case "environments":
                effectiveLimits.MaxEnvironments = override.LimitValue
            case "evaluations":
                effectiveLimits.MaxEvaluationsPerMonth = &override.LimitValue
            }
        }
    }

    // Validate against effective limits
    // ...
}
```

---

## 9. Phone-Home Agent (On-Prem)

### 9.1 Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Phone-Home Agent                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Components:                                                  │
│  ├── Usage Collector (gathers metrics from local API server)  │
│  ├── HTTP Client (sends usage to central registry)            │
│  ├── License Cache (stores validated license state locally)   │
│  ├── Grace Period Manager (tracks offline duration)           │
│  └── Read-Only Mode Controller (blocks writes on expiry)      │
│                                                               │
│  Configuration:                                               │
│  ├── endpoint: https://license.featuresignals.com/v1/phone-home│
│  ├── interval: 24 hours                                       │
│  ├── grace_period: 72 hours                                   │
│  ├── retry_attempts: 3                                        │
│  ├── retry_backoff: exponential (1m, 2m, 4m)                  │
│  └── timeout: 30 seconds                                      │
│                                                               │
│  Local Cache Storage:                                         │
│  ├── File: /etc/featuresignals/license.cache (encrypted)      │
│  ├── Format: JSON + AES-256-GCM encryption                    │
│  └── Contents: License state, last validation timestamp       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Agent Implementation

```go
// server/internal/license/agent.go

type Agent struct {
    config      AgentConfig
    client      *http.Client
    collector   UsageCollector
    cache       LicenseCache
    logger      *slog.Logger
    mu          sync.RWMutex
    lastReport  time.Time
    readOnly    bool
}

type AgentConfig struct {
    Endpoint     string
    Interval     time.Duration
    GracePeriod  time.Duration
    RetryAttempts int
    RetryBackoff time.Duration
    Timeout      time.Duration
    CachePath    string
    EncryptionKey []byte
}

func (a *Agent) Start(ctx context.Context) error {
    // Load cached license on startup
    if err := a.cache.Load(a.config.CachePath, a.config.EncryptionKey); err != nil {
        a.logger.Warn("failed to load license cache, will validate on first phone-home", "error", err)
    }

    ticker := time.NewTicker(a.config.Interval)
    defer ticker.Stop()

    // Run immediately on startup
    if err := a.report(ctx); err != nil {
        a.logger.Warn("initial phone-home failed", "error", err)
    }

    for {
        select {
        case <-ctx.Done():
            return nil
        case <-ticker.C:
            if err := a.report(ctx); err != nil {
                a.logger.Warn("phone-home failed", "error", err)
                a.checkGracePeriod()
            }
        }
    }
}

func (a *Agent) report(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, a.config.Timeout)
    defer cancel()

    // Collect usage
    usage, err := a.collector.Collect(ctx)
    if err != nil {
        return fmt.Errorf("collect usage: %w", err)
    }

    // Send to central registry
    req := PhoneHomeRequest{
        OrgID:        usage.OrgID,
        LicenseKey:   usage.LicenseKey,
        EvalCount24h: usage.EvalCount,
        SeatCount:    usage.SeatCount,
        EnvCount:     usage.EnvCount,
        Timestamp:    time.Now().UTC(),
    }

    resp, err := a.sendPhoneHome(ctx, req)
    if err != nil {
        return fmt.Errorf("send phone-home: %w", err)
    }

    // Update local cache
    a.mu.Lock()
    a.cache.Update(resp.LicenseState)
    a.lastReport = time.Now().UTC()
    a.readOnly = false
    a.mu.Unlock()

    // Save cache to disk
    if err := a.cache.Save(a.config.CachePath, a.config.EncryptionKey); err != nil {
        a.logger.Warn("failed to save license cache", "error", err)
    }

    return nil
}

func (a *Agent) checkGracePeriod() {
    a.mu.RLock()
    timeSinceLastReport := time.Since(a.lastReport)
    a.mu.RUnlock()

    if timeSinceLastReport > a.config.GracePeriod {
        a.mu.Lock()
        if !a.readOnly {
            a.readOnly = true
            a.logger.Error("license grace period expired, entering read-only mode",
                "last_report", a.lastReport,
                "grace_period", a.config.GracePeriod)
        }
        a.mu.Unlock()
    }
}

func (a *Agent) IsReadOnly() bool {
    a.mu.RLock()
    defer a.mu.RUnlock()
    return a.readOnly
}
```

### 9.3 Phone-Home API Endpoint

```go
// server/internal/api/handlers/license.go

type LicenseHandler struct {
    store   LicenseStore
    logger  *slog.Logger
}

func (h *LicenseHandler) PhoneHome(w http.ResponseWriter, r *http.Request) {
    var req PhoneHomeRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        httputil.Error(w, http.StatusBadRequest, "invalid request body")
        return
    }

    // Validate license key
    license, err := h.store.GetLicense(r.Context(), req.OrgID)
    if err != nil {
        httputil.Error(w, http.StatusNotFound, "license not found")
        return
    }

    if !license.IsActive() {
        httputil.Error(w, http.StatusPaymentRequired, "license suspended or expired")
        return
    }

    // Record usage snapshot
    snapshot := LicenseUsageSnapshot{
        OrgID:                req.OrgID,
        LicenseID:            license.ID,
        SnapshotDate:         time.Now().UTC().Truncate(24 * time.Hour),
        SeatCount:            req.SeatCount,
        EnvironmentCount:     req.EnvCount,
        EvaluationCountMonth: req.EvalCount24h,
    }
    if err := h.store.RecordUsageSnapshot(r.Context(), snapshot); err != nil {
        h.logger.Warn("failed to record usage snapshot", "error", err)
    }

    // Check for quota breaches
    breaches := h.checkBreaches(license, req)
    for _, breach := range breaches {
        h.store.RecordBreach(r.Context(), breach)
        h.logger.Warn("quota breach detected",
            "org_id", req.OrgID,
            "quota_type", breach.QuotaType,
            "limit", breach.LimitValue,
            "actual", breach.ActualValue)
    }

    // Return updated license state
    httputil.JSON(w, http.StatusOK, PhoneHomeResponse{
        LicenseState: LicenseState{
            Status:     license.Status,
            ValidUntil: license.ValidUntil,
            Features:   license.Features,
            Limits:     license.Limits,
            Breaches:   breaches,
        },
    })
}
```

---

## 10. Database Schema

### 10.1 Complete License Schema

```sql
-- ops DB: licenses
CREATE TABLE licenses (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL UNIQUE,
    license_key     TEXT NOT NULL UNIQUE,
    tier            TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'growth', 'enterprise', 'onprem')),
    model           TEXT NOT NULL CHECK (model IN ('saas', 'dedicated', 'onprem')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
    max_seats       INT NOT NULL DEFAULT 1,
    max_environments INT NOT NULL DEFAULT 2,
    max_evaluations_per_month BIGINT,  -- NULL = unlimited
    max_regions     INT NOT NULL DEFAULT 1,
    features        JSONB NOT NULL DEFAULT '{}',
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_until     TIMESTAMPTZ,
    phone_home_interval INTERVAL DEFAULT '24 hours',
    offline_grace_period INTERVAL DEFAULT '72 hours',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licenses_org_id ON licenses(org_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_tier ON licenses(tier);
CREATE INDEX idx_licenses_valid_until ON licenses(valid_until) WHERE valid_until IS NOT NULL;

-- ops DB: license_usage_snapshots
CREATE TABLE license_usage_snapshots (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    license_id      TEXT NOT NULL REFERENCES licenses(id),
    snapshot_date   DATE NOT NULL,
    seat_count      INT NOT NULL DEFAULT 0,
    environment_count INT NOT NULL DEFAULT 0,
    evaluation_count_month BIGINT NOT NULL DEFAULT 0,
    region_count    INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_license_usage_snapshots_org_date ON license_usage_snapshots(org_id, snapshot_date);

-- ops DB: license_quota_breaches
CREATE TABLE license_quota_breaches (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    license_id      TEXT NOT NULL REFERENCES licenses(id),
    quota_type      TEXT NOT NULL CHECK (quota_type IN ('seats', 'environments', 'evaluations', 'regions', 'features')),
    limit_value     BIGINT NOT NULL,
    actual_value    BIGINT NOT NULL,
    breach_at       TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    resolution      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_license_quota_breaches_org ON license_quota_breaches(org_id);
CREATE INDEX idx_license_quota_breaches_unresolved ON license_quota_breaches(org_id) WHERE resolved_at IS NULL;

-- ops DB: license_overrides
CREATE TABLE license_overrides (
    id              TEXT PRIMARY KEY,
    license_id      TEXT NOT NULL REFERENCES licenses(id),
    org_id          TEXT NOT NULL,
    quota_type      TEXT NOT NULL CHECK (quota_type IN ('seats', 'environments', 'evaluations', 'regions')),
    limit_value     BIGINT NOT NULL,
    reason          TEXT NOT NULL,
    granted_by      TEXT NOT NULL REFERENCES ops_users(id),
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_until     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_license_overrides_org ON license_overrides(org_id);
CREATE INDEX idx_license_overrides_active ON license_overrides(org_id) WHERE valid_until IS NULL OR valid_until > NOW();
```

---

## 11. Code-Level Implementation

### 11.1 License Store Interface

```go
// server/internal/license/store.go

type LicenseStore interface {
    GetLicense(ctx context.Context, orgID string) (*License, error)
    CreateLicense(ctx context.Context, license *License) error
    UpdateLicense(ctx context.Context, license *License) error
    SuspendLicense(ctx context.Context, orgID string, reason string) error
    RevokeLicense(ctx context.Context, orgID string, reason string) error
    RecordUsageSnapshot(ctx context.Context, snapshot LicenseUsageSnapshot) error
    RecordBreach(ctx context.Context, breach LicenseQuotaBreach) error
    GetActiveOverrides(ctx context.Context, orgID string) ([]QuotaOverride, error)
    CreateOverride(ctx context.Context, override *QuotaOverride) error
    RevokeOverride(ctx context.Context, overrideID string, reason string) error
}
```

### 11.2 License Entity

```go
// server/internal/license/license.go

type License struct {
    ID                     string
    OrgID                  string
    LicenseKey             string
    Tier                   string
    Model                  string
    Status                 string
    MaxSeats               int
    MaxEnvironments        int
    MaxEvaluationsPerMonth *int64
    MaxRegions             int
    Features               []string
    ValidFrom              time.Time
    ValidUntil             *time.Time
    PhoneHomeInterval      time.Duration
    OfflineGracePeriod     time.Duration
    CreatedAt              time.Time
    UpdatedAt              time.Time
}

func (l *License) IsActive() bool {
    if l.Status != "active" {
        return false
    }
    if l.ValidUntil != nil && time.Now().After(*l.ValidUntil) {
        return false
    }
    return true
}

func (l *License) WithinGracePeriod(lastPhoneHome time.Time) bool {
    return time.Since(lastPhoneHome) <= l.OfflineGracePeriod
}

func (l *License) HasFeature(feature string) bool {
    for _, f := range l.Features {
        if f == feature {
            return true
        }
    }
    return false
}
```

### 11.3 License Cache

```go
// server/internal/license/cache.go

type LicenseCache struct {
    mu    sync.RWMutex
    data  map[string]*CachedLicense
    ttl   time.Duration
}

type CachedLicense struct {
    License     *License
    CachedAt    time.Time
    LastPhoneHome time.Time
    Status      string
}

func (c *LicenseCache) Get(ctx context.Context, orgID string) (*CachedLicense, error) {
    c.mu.RLock()
    defer c.mu.RUnlock()

    cached, ok := c.data[orgID]
    if !ok {
        return nil, domain.ErrNotFound
    }

    if time.Since(cached.CachedAt) > c.ttl {
        return nil, fmt.Errorf("cache expired")
    }

    return cached, nil
}

func (c *LicenseCache) Set(orgID string, license *License) {
    c.mu.Lock()
    defer c.mu.Unlock()

    c.data[orgID] = &CachedLicense{
        License:  license,
        CachedAt: time.Now().UTC(),
        Status:   license.Status,
    }
}

func (c *LicenseCache) Update(state LicenseState) {
    c.mu.Lock()
    defer c.mu.Unlock()

    for orgID, cached := range c.data {
        cached.Status = state.Status
        cached.LastPhoneHome = time.Now().UTC()
        // Update license fields from state
        cached.License.Status = state.Status
        cached.License.Features = state.Features
        cached.License.ValidUntil = state.ValidUntil
    }
}
```

---

## 12. License Lifecycle Management

### 12.1 Lifecycle States

```
                    ┌─────────────┐
                    │   created   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   active    │◀────┐
                    └──────┬──────┘     │
                           │            │
                    ┌──────▼──────┐     │
                    │  suspended  │     │
                    └──────┬──────┘     │
                           │            │
                    ┌──────▼──────┐     │
                    │   expired   │     │
                    └──────┬──────┘     │
                           │            │
                    ┌──────▼──────┐     │
                    │   revoked   │─────┘
                    └─────────────┘

Trial-specific flow:
  active (trial) → expired → auto-degrade → active (free)
```

```
                    ┌─────────────┐
                    │   created   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   active    │◀────┐
                    └──────┬──────┘     │
                           │            │
                    ┌──────▼──────┐     │
                    │  suspended  │     │
                    └──────┬──────┘     │
                           │            │
                    ┌──────▼──────┐     │
                    │   expired   │     │
                    └──────┬──────┘     │
                           │            │
                    ┌──────▼──────┐     │
                    │   revoked   │─────┘
                    └─────────────┘
```

### 12.2 Lifecycle Operations

```go
// server/internal/license/lifecycle.go

type LifecycleManager struct {
    store    LicenseStore
    notifier Notifier
    logger   *slog.Logger
}

func (m *LifecycleManager) Suspend(ctx context.Context, orgID string, reason string) error {
    license, err := m.store.GetLicense(ctx, orgID)
    if err != nil {
        return fmt.Errorf("get license: %w", err)
    }

    if license.Status == "suspended" {
        return domain.ErrConflict
    }

    if err := m.store.SuspendLicense(ctx, orgID, reason); err != nil {
        return fmt.Errorf("suspend license: %w", err)
    }

    m.notifier.Notify(ctx, Notification{
        To:      orgID,
        Subject: "License suspended",
        Message: fmt.Sprintf("Your license has been suspended. Reason: %s", reason),
    })

    m.logger.Info("license suspended", "org_id", orgID, "reason", reason)
    return nil
}

func (m *LifecycleManager) Revoke(ctx context.Context, orgID string, reason string) error {
    license, err := m.store.GetLicense(ctx, orgID)
    if err != nil {
        return fmt.Errorf("get license: %w", err)
    }

    if license.Status == "revoked" {
        return domain.ErrConflict
    }

    if err := m.store.RevokeLicense(ctx, orgID, reason); err != nil {
        return fmt.Errorf("revoke license: %w", err)
    }

    m.notifier.Notify(ctx, Notification{
        To:      orgID,
        Subject: "License revoked",
        Message: fmt.Sprintf("Your license has been revoked. Reason: %s", reason),
    })

    m.logger.Info("license revoked", "org_id", orgID, "reason", reason)
    return nil
}

func (m *LifecycleManager) Renew(ctx context.Context, orgID string, validUntil time.Time) error {
    license, err := m.store.GetLicense(ctx, orgID)
    if err != nil {
        return fmt.Errorf("get license: %w", err)
    }

    license.ValidUntil = &validUntil
    license.Status = "active"

    if err := m.store.UpdateLicense(ctx, license); err != nil {
        return fmt.Errorf("update license: %w", err)
    }

    m.logger.Info("license renewed", "org_id", orgID, "valid_until", validUntil)
    return nil
}
```

---

## 13. Compliance & Audit Trail

### 13.1 Audit Log Schema

```sql
-- ops DB: license_audit_log
CREATE TABLE license_audit_log (
    id              TEXT PRIMARY KEY,
    org_id          TEXT NOT NULL,
    license_id      TEXT NOT NULL REFERENCES licenses(id),
    action          TEXT NOT NULL,  -- 'created', 'suspended', 'revoked', 'renewed', 'override_granted', 'override_revoked', 'breach_detected', 'breach_resolved'
    details         JSONB,
    performed_by    TEXT NOT NULL REFERENCES ops_users(id),
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_license_audit_log_org ON license_audit_log(org_id);
CREATE INDEX idx_license_audit_log_license ON license_audit_log(license_id);
CREATE INDEX idx_license_audit_log_action ON license_audit_log(action);
CREATE INDEX idx_license_audit_log_created_at ON license_audit_log(created_at);
```

### 13.2 Logged Events

| Event | Details Logged | Trigger |
|-------|----------------|---------|
| `license.created` | tier, model, limits, features, valid_until | Ops portal or API |
| `license.suspended` | reason, performed_by | Ops portal |
| `license.revoked` | reason, performed_by | Ops portal |
| `license.renewed` | new_valid_until, performed_by | Ops portal or automated |
| `license.trial_expired` | org_id, previous_tier, degraded_to | Automated cron job |
| `license.degraded` | from_tier, to_tier, reason, suspended_resources | Automated degradation |
| `license.upgraded` | from_tier, to_tier, payment_id | Stripe webhook |
| `license.override_granted` | quota_type, limit_value, reason, valid_until | Ops portal |
| `license.override_revoked` | quota_type, reason | Ops portal |
| `license.breach_detected` | quota_type, limit_value, actual_value | Automated quota check |
| `license.breach_resolved` | resolution, performed_by | Ops portal or automated |
| `license.phone_home_success` | eval_count, seat_count, env_count | Phone-home agent |
| `license.phone_home_failed` | error, retry_count | Phone-home agent |
| `license.readonly_entered` | last_phone_home, grace_period | Phone-home agent |
| `license.readonly_exited` | phone_home_success_at | Phone-home agent |

| Event | Details Logged | Trigger |
|-------|----------------|---------|
| `license.created` | tier, model, limits, features, valid_until | Ops portal or API |
| `license.suspended` | reason, performed_by | Ops portal |
| `license.revoked` | reason, performed_by | Ops portal |
| `license.renewed` | new_valid_until, performed_by | Ops portal or automated |
| `license.override_granted` | quota_type, limit_value, reason, valid_until | Ops portal |
| `license.override_revoked` | quota_type, reason | Ops portal |
| `license.breach_detected` | quota_type, limit_value, actual_value | Automated quota check |
| `license.breach_resolved` | resolution, performed_by | Ops portal or automated |
| `license.phone_home_success` | eval_count, seat_count, env_count | Phone-home agent |
| `license.phone_home_failed` | error, retry_count | Phone-home agent |
| `license.readonly_entered` | last_phone_home, grace_period | Phone-home agent |
| `license.readonly_exited` | phone_home_success_at | Phone-home agent |

---

## 14. Security Considerations

### 14.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| License key forgery | HMAC-SHA256 signature verification |
| License key replay | Timestamp in payload, expiry validation |
| Phone-home interception | TLS 1.3, mutual TLS (future) |
| Cache tampering (on-prem) | AES-256-GCM encryption of local cache |
| Quota bypass | Server-side enforcement, not client-side |
| Insider abuse | Audit trail, least privilege, approval workflow for overrides |
| DDoS on license service | Rate limiting, circuit breaker, fail-open for SaaS |

### 14.2 Secret Management

```
License Signing Secret:
  ├── Generated once at system initialization
  ├── Stored in environment variable: LICENSE_SIGNING_SECRET
  ├── Never committed to Git, never logged
  ├── Rotated annually (requires re-issuing all license keys)
  └── Backed up in secure vault (SOPS + Age)

Phone-Home API Authentication:
  ├── License key sent in Authorization header
  ├── TLS enforced (HTTPS only)
  └── Rate limited: 100 requests per minute per org
```

### 14.3 Security Controls

| Control | Implementation |
|---------|----------------|
| **Signature verification** | HMAC-SHA256 on every license validation |
| **Expiry enforcement** | Checked on every API request (SaaS) or phone-home (VPS/On-Prem) |
| **Rate limiting** | Phone-home endpoint: 100 req/min per org |
| **TLS enforcement** | HTTPS only for phone-home API |
| **Cache encryption** | AES-256-GCM for on-prem local cache |
| **Audit trail** | Every license event logged with user, IP, timestamp |
| **Secret rotation** | Annual rotation of signing secret |

---

## 15. Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create license database schema (licenses, usage_snapshots, breaches, overrides)
- [ ] Implement LicenseGenerator with HMAC-SHA256 signing (Trial, Pro, Enterprise)
- [ ] Implement LicenseValidator with signature verification
- [ ] Implement tier configuration and defaults (Community, Pro, Enterprise)
- [ ] Write unit tests for key generation and validation
- [ ] Seed initial license signing secret

### Phase 2: Open Core Enforcement (Weeks 3-4)
- [ ] Implement LicenseMiddleware that bypasses Community features
- [ ] Define enterprise feature route prefixes (SSO, audit export, etc.)
- [ ] Implement 402 response for unlicensed Pro/Enterprise features
- [ ] Implement quota checking (seats, environments, evaluations)
- [ ] Implement LicenseCache with TTL
- [ ] Write integration tests for middleware (Community bypass, Pro gate, Enterprise gate)
- [ ] Implement license CRUD API endpoints
- [ ] Build license management UI in ops portal

### Phase 3: Trial & Degradation (Weeks 5-6)
- [ ] Implement 14-day trial auto-generation on signup
- [ ] Implement trial notification emails (Day 7, Day 12, Day 14)
- [ ] Implement trial auto-expiry cron job
- [ ] Implement degradeToCommunity() — data preserved, excess suspended
- [ ] Implement grace period handling for Pro (7-day) and Enterprise (30-day) payment failures
- [ ] Write integration tests for trial → Free degradation flow
- [ ] Test suspended resource reactivation on upgrade

### Phase 4: Phone-Home Agent (Weeks 7-8)
- [ ] Implement PhoneHomeAgent with retry logic
- [ ] Implement phone-home API endpoint
- [ ] Implement local cache encryption (AES-256-GCM)
- [ ] Implement grace period manager
- [ ] Implement read-only mode controller
- [ ] Write integration tests for phone-home flow
- [ ] Test offline behavior (simulate network failure)

### Phase 5: Quota Tracking & Overrides (Weeks 9-10)
- [ ] Implement quota tracking and snapshot recording
- [ ] Implement breach detection and alerting
- [ ] Implement quota override mechanism
- [ ] Build quota dashboard in ops portal
- [ ] Build breach alert UI in ops portal
- [ ] Write integration tests for quota enforcement
- [ ] Configure Slack/email notifications for breaches

### Phase 6: Lifecycle & Audit (Weeks 11-12)
- [ ] Implement license lifecycle management (suspend, revoke, renew, degrade)
- [ ] Implement license audit logging (including degradation events)
- [ ] Build audit log viewer in ops portal
- [ ] Implement license export (CSV/JSON)
- [ ] Write integration tests for lifecycle operations
- [ ] Document runbooks for license incidents
- [ ] Conduct security review

### Phase 7: Hardening & Testing (Weeks 13-14)
- [ ] Load test phone-home endpoint (1000 concurrent agents)
- [ ] Test license key rotation procedure
- [ ] Test cache corruption recovery (on-prem)
- [ ] Test grace period edge cases
- [ ] Test trial degradation with excess resources
- [ ] Conduct penetration testing on license endpoints
- [ ] Document disaster recovery procedure
- [ ] Final security audit and sign-off

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial unified license enforcement system architecture |
| 1.1.0 | 2026-01-15 | Engineering | Added Open Core enforcement model, trial → Free degradation flow, Pro/Enterprise tier matrix, Community feature bypass, updated implementation phases |

---

## Next Steps

1. **Review** this document with security team and legal
2. **Approve** tier definitions and quota limits
3. **Implement** license key generation and validation
4. **Implement** SaaS enforcement middleware
5. **Implement** phone-home agent for on-prem
6. **Test** offline behavior and grace periods
7. **Build** license management UI in ops portal
8. **Document** runbooks for license incidents and key rotation