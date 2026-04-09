---
description: "FeatureSignals SOC 2 evidence collection guide for continuous audit readiness."
---

# SOC 2 Evidence Collection Guide

_Last updated: April 2026_

:::info
FeatureSignals has **not** completed a SOC 2 Type II examination. This guide describes how we organize evidence to support **readiness** and a **future** audit; it is not an auditor's report or opinion.
:::

This document describes how FeatureSignals collects and organizes evidence in preparation for SOC 2 Type II audits.

## Continuous Evidence Sources

### 1. Audit Logs (CC5, CC7)

**Source**: `audit_logs` table

**Evidence**: Every mutating operation is recorded with:
- Timestamp (UTC)
- Actor identity (user ID, email)
- Action performed
- Resource type and ID
- Before/after state for updates
- IP address and user agent
- SHA-256 integrity hash (chain-linked)

**Export**: `GET /v1/organizations/{orgID}/audit/export?format=json&from=...&to=...`

### 2. Access Control Records (CC6)

**Source**: `org_members`, `env_permissions`, `api_keys` tables

**Evidence**:
- Current team membership and roles
- Per-environment permission grants
- API key creation, rotation, and revocation history
- SSO configuration and enforcement status

### 3. Authentication Events (CC6.5)

**Source**: `login_attempts` table

**Evidence**:
- Successful and failed login attempts
- IP addresses and timestamps
- MFA verification events
- Account lockouts due to brute-force

### 4. Change Management (CC8)

**Source**: GitHub repository

**Evidence**:
- Pull request history with code reviews
- CI/CD pipeline execution logs
- Deployment history
- Migration execution records

### 5. Infrastructure Security (CC6.7, CC7)

**Source**: Container and dependency scanning

**Evidence**:
- `govulncheck` reports (Go vulnerabilities)
- `npm audit` reports (Node.js vulnerabilities)
- Container image scan reports (Trivy)
- TLS certificate renewal records

### 6. Availability and Incident Response (CC7.4, CC7.5)

**Source**: Monitoring and alerting systems

**Evidence**:
- Health check endpoint logs (`/health`)
- Uptime monitoring records
- Incident response documentation
- Post-mortem reports

## Evidence Collection Schedule

| Evidence Type | Collection Frequency | Retention |
|---|---|---|
| Audit logs | Continuous | Enterprise: 2 years, Pro: 1 year |
| Access reviews | Quarterly | 3 years |
| Vulnerability scans | Weekly (CI), daily (containers) | 1 year |
| Penetration test reports | Annual | 3 years |
| Policy reviews | Annual | Current + 2 prior versions |
| Incident reports | Per-incident | 3 years |
| Training records | Annual | Duration of employment + 1 year |

## Automated Controls

### CI Pipeline Checks (run on every PR)

```
go test ./... -race -coverprofile=coverage.out    # Unit + integration tests
go vet ./...                                       # Static analysis
govulncheck ./...                                  # Known vulnerability scan
npm run test:coverage                              # Flag Engine (web app) tests
npm run build                                      # Build verification
```

### Deployment Pipeline

1. All tests pass
2. Code review approved (minimum 1 reviewer)
3. No critical/high vulnerabilities
4. Container image scanned
5. Deployment recorded in audit log

## Preparation for Type II Audit

### Readiness Checklist

- [ ] All controls documented with responsible owners
- [ ] Evidence collection automated where possible
- [ ] Gap assessment completed
- [ ] Remediation plan for identified gaps
- [ ] Auditor selected and engagement letter signed
- [ ] Observation period defined (minimum 3 months, typically 6-12)

### During Observation Period

- Maintain all controls consistently
- Collect evidence per schedule
- Document any exceptions or deviations
- Track and resolve all identified issues

### Audit Deliverable

**After** a completed SOC 2 Type II examination, a typical report contains:
1. Management assertion
2. Independent auditor's report
3. System description
4. Trust service criteria and controls
5. Tests of controls and results
