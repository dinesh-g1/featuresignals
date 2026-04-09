---
description: "How FeatureSignals supports DORA compliance for financial entities using feature flag management."
---

# DORA Compliance — Digital Operational Resilience Act

_Last updated: April 2026_

This document describes how FeatureSignals supports financial entities subject to the EU Digital Operational Resilience Act (DORA), which took effect January 17, 2025.

## Applicability

DORA applies when FeatureSignals is used by **financial entities** (banks, insurance companies, investment firms, payment institutions, crypto-asset service providers) as an ICT third-party service provider.

## Article 5 — ICT Risk Management Framework

### Risk Identification

| Requirement | Implementation |
|-------------|---------------|
| ICT asset inventory | All infrastructure components documented |
| ICT risk assessment | Risk register maintained (see ISO 27001 docs) |
| Dependency mapping | Sub-processor list with data flow documentation |
| Threat landscape monitoring | CVE monitoring, security advisories |

### Risk Protection and Prevention

| Requirement | Implementation |
|-------------|---------------|
| Access control | RBAC with four roles, per-environment permissions |
| Authentication | MFA (TOTP), SSO (SAML/OIDC), password policies |
| Encryption | TLS 1.3 in transit, AES-256 at rest |
| Vulnerability management | Automated scanning (govulncheck, npm audit, Trivy) |
| Change management | Git-based workflow, CI/CD with automated testing |

### Detection

| Requirement | Implementation |
|-------------|---------------|
| Anomaly detection | Login attempt monitoring, rate limiting alerts |
| Logging and monitoring | Structured logging (slog), audit trail, health checks |
| Integrity monitoring | SHA-256 chain hashing on audit entries |

### Response and Recovery

| Requirement | Implementation |
|-------------|---------------|
| Incident response plan | Documented with severity levels and SLAs |
| Business continuity | Graceful degradation (eval path survives failures) |
| Disaster recovery | Database backups, multi-region capability |
| Communication plan | Customer notification timelines documented |

## Article 11 — ICT-related Incident Management

### Incident Classification

| Severity | Criteria | Response Time |
|----------|----------|---------------|
| Critical | Service unavailable, data breach | Immediate |
| Major | Partial degradation, suspected breach | 30 minutes |
| Minor | Vulnerability found, policy violation | 4 hours |

### Incident Reporting

For major ICT-related incidents, FeatureSignals provides:
- Initial notification within 4 hours of classification
- Intermediate report within 72 hours
- Final report within 1 month

## Article 12 — Digital Operational Resilience Testing

### Testing Program

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| Vulnerability scanning | Every CI run | Full codebase and dependencies |
| Penetration testing | Annual | External-facing APIs and Flag Engine |
| Scenario-based testing | Semi-annual | Tabletop exercises for incident response |
| Backup recovery testing | Quarterly | Database restore verification |

### Threat-Led Penetration Testing (TLPT)

For financial entities subject to TLPT requirements:
- FeatureSignals cooperates with TLPT exercises conducted by customers
- On-premises deployment available for entities requiring full testing control
- API documentation and architecture details available under NDA

## Article 28 — ICT Third-Party Risk

### Contractual Provisions

FeatureSignals Enterprise agreements include:

| Provision | Commitment |
|-----------|------------|
| Service level descriptions | Availability targets, performance SLAs |
| Data processing locations | Sub-processor list with locations |
| Data protection | Encryption standards, access controls |
| Audit rights | Customer may audit compliance annually |
| Subcontracting controls | Sub-processor notification and approval |
| Exit strategy | Data export, transition assistance |
| Incident notification | Timelines per classification above |

### Information Register

FeatureSignals maintains an information register for DORA Article 28(3) containing:
- All contractual arrangements with ICT sub-service providers
- Types of ICT services provided
- Criticality assessment of each service

## Article 30 — Key Contractual Provisions

For customers classified as financial entities, our Enterprise agreement addresses:

1. **Clear description of all ICT services** — Feature flag management, evaluation API, Flag Engine, SDKs
2. **Locations of data processing** — Documented in sub-processor list
3. **Data security provisions** — Encryption, access control, audit logging
4. **Service availability guarantees** — Uptime SLA with monitoring
5. **Cooperation with competent authorities** — Compliance with supervisory requests
6. **Exit and transition** — Full data export capability, transition period

## Resilience by Design

FeatureSignals' architecture inherently supports operational resilience:

| Capability | Implementation |
|-----------|---------------|
| Stateless servers | Horizontal scaling, zero-downtime deployments |
| Evaluation cache | Flag evaluation continues during database outages |
| Graceful degradation | Evaluation API unaffected by webhook/metrics failures |
| Self-hosted option | Full control over infrastructure and uptime |
| No vendor lock-in | Open source, OpenFeature compatible, standard SQL database |

## Contact

For DORA compliance inquiries: compliance@featuresignals.com
