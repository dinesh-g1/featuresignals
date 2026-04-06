# SOC 2 Trust Service Criteria — Controls Matrix

_Last updated: April 2026_

This document maps SOC 2 Trust Service Criteria to FeatureSignals technical controls.

## CC1 — Control Environment

| Criteria | Control | Implementation |
|----------|---------|----------------|
| CC1.1 | Organizational commitment to integrity | Code of conduct, security policy |
| CC1.2 | Board oversight | Quarterly security reviews |
| CC1.3 | Management accountability | Role-based access control (RBAC) |
| CC1.4 | Competence requirement | Security training program |
| CC1.5 | Accountability for controls | Audit logging with tamper-evident hashing |

## CC2 — Communication and Information

| Criteria | Control | Implementation |
|----------|---------|----------------|
| CC2.1 | Internal communication | Structured logging (slog), audit trail |
| CC2.2 | External communication | Privacy policy, DPA, trust page |
| CC2.3 | Communication about security | Incident response plan, responsible disclosure |

## CC3 — Risk Assessment

| Criteria | Control | Implementation |
|----------|---------|----------------|
| CC3.1 | Risk objectives | Risk register (docs/compliance/iso27001/) |
| CC3.2 | Risk identification | Vulnerability scanning (govulncheck, npm audit, Trivy) |
| CC3.3 | Fraud risk | Login anomaly detection, brute-force protection |
| CC3.4 | Change impact | Change management process, PR reviews |

## CC5 — Control Activities

| Criteria | Control | Implementation |
|----------|---------|----------------|
| CC5.1 | Control activities | Automated CI/CD pipeline with testing |
| CC5.2 | Technology controls | Rate limiting, input validation, CSP headers |
| CC5.3 | Policy deployment | Infrastructure as Code (Helm, Terraform) |

## CC6 — Logical and Physical Access

| Criteria | Control | Implementation |
|----------|---------|----------------|
| CC6.1 | Logical access | JWT authentication, API key authentication |
| CC6.2 | Access provisioning | RBAC (owner/admin/developer/viewer), SSO/SCIM |
| CC6.3 | Access removal | Team member removal, API key revocation |
| CC6.4 | Access restrictions | Per-environment permissions, feature gates |
| CC6.5 | Authentication | MFA (TOTP), SSO (SAML/OIDC), password policies |
| CC6.6 | Access controls | IP allowlisting, rate limiting |
| CC6.7 | Information protection | TLS 1.3, AES-256 at rest, bcrypt passwords |
| CC6.8 | Malicious software | Container scanning, dependency vulnerability checks |

## CC7 — System Operations

| Criteria | Control | Implementation |
|----------|---------|----------------|
| CC7.1 | Monitoring | Structured logging, metrics collection, health checks |
| CC7.2 | Anomaly detection | Login attempt tracking, rate limit monitoring |
| CC7.3 | Security events | Audit log with IP/user agent, integrity hashing |
| CC7.4 | Incident response | Incident response plan, on-call procedures |
| CC7.5 | Recovery | Backup procedures, disaster recovery runbook |

## CC8 — Change Management

| Criteria | Control | Implementation |
|----------|---------|----------------|
| CC8.1 | Change management | Git-based workflow, PR reviews, CI/CD |
| CC8.2 | Change testing | Automated test suite (80%+ coverage), staging environment |
| CC8.3 | Change approval | Required code reviews, protected branches |

## CC9 — Risk Mitigation

| Criteria | Control | Implementation |
|----------|---------|----------------|
| CC9.1 | Risk mitigation | Circuit breakers, graceful degradation, retry with backoff |
| CC9.2 | Vendor management | Sub-processor list, vendor security assessments |
