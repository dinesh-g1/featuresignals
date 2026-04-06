# ISO 27001 — Information Security Management System

_Last updated: April 2026_

This document describes FeatureSignals' Information Security Management System (ISMS) aligned with ISO/IEC 27001:2022.

## ISMS Scope

The ISMS covers the design, development, deployment, and operation of the FeatureSignals feature flag management platform, including:

- Cloud-hosted SaaS application
- On-premises deployment packages
- SDKs and client libraries
- Supporting infrastructure and processes

## Leadership and Commitment

### Information Security Policy

FeatureSignals is committed to:
- Protecting the confidentiality, integrity, and availability of information assets
- Meeting applicable legal, regulatory, and contractual requirements
- Continually improving the ISMS
- Providing resources for information security

### Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| Security Lead | ISMS ownership, risk management, policy maintenance |
| Engineering Lead | Secure development practices, vulnerability remediation |
| Operations Lead | Infrastructure security, incident response, monitoring |
| All Staff | Adhering to security policies, reporting incidents |

## Risk Assessment Framework

### Risk Identification

Risks are identified through:
- Threat modeling for new features
- Vulnerability scanning (automated and manual)
- Incident analysis and post-mortems
- Industry threat intelligence

### Risk Assessment Criteria

| Likelihood | Description |
|-----------|-------------|
| Rare (1) | Less than once per year |
| Unlikely (2) | Once per year |
| Possible (3) | Once per quarter |
| Likely (4) | Once per month |
| Almost Certain (5) | Weekly or more |

| Impact | Description |
|--------|-------------|
| Insignificant (1) | No customer impact, internal only |
| Minor (2) | Minor service degradation, no data loss |
| Moderate (3) | Partial service outage or limited data exposure |
| Major (4) | Extended outage or significant data breach |
| Catastrophic (5) | Complete service loss or large-scale data breach |

**Risk Score** = Likelihood × Impact

| Risk Level | Score Range | Treatment |
|-----------|-------------|-----------|
| Low | 1–5 | Accept and monitor |
| Medium | 6–12 | Mitigate within quarter |
| High | 13–19 | Mitigate within month |
| Critical | 20–25 | Immediate action required |

### Risk Register (Summary)

| Risk | L | I | Score | Treatment | Control |
|------|---|---|-------|-----------|---------|
| Unauthorized access to customer data | 2 | 5 | 10 | Mitigate | RBAC, MFA, audit logging |
| SQL injection | 1 | 5 | 5 | Mitigate | Parameterized queries, input validation |
| Dependency vulnerability | 3 | 3 | 9 | Mitigate | Automated scanning, patching |
| DDoS attack | 3 | 3 | 9 | Mitigate | Rate limiting, CDN, cloud scaling |
| Insider threat | 1 | 4 | 4 | Accept | Access reviews, audit logging |
| Data loss | 1 | 5 | 5 | Mitigate | Backups, replication |
| License key compromise | 2 | 3 | 6 | Mitigate | Key rotation, monitoring |

## Annex A Controls — Statement of Applicability

### A.5 — Organizational Controls

| Control | Applicable | Implementation |
|---------|-----------|----------------|
| A.5.1 Policies for information security | Yes | Security policy documented |
| A.5.2 Information security roles | Yes | Roles defined above |
| A.5.3 Segregation of duties | Yes | RBAC in product and development |
| A.5.7 Threat intelligence | Yes | CVE monitoring, security advisories |
| A.5.8 Information security in project management | Yes | Security review in PR process |
| A.5.23 Information security for cloud services | Yes | 12-factor architecture, encryption |
| A.5.29 Information security during disruption | Yes | DR plan, graceful degradation |
| A.5.30 ICT readiness for business continuity | Yes | Multi-region capability, backups |

### A.6 — People Controls

| Control | Applicable | Implementation |
|---------|-----------|----------------|
| A.6.1 Screening | Yes | Background checks for team members |
| A.6.3 Information security awareness | Yes | Security training program |
| A.6.4 Disciplinary process | Yes | Policy violation procedures |
| A.6.5 Responsibilities after termination | Yes | Access revocation procedure |

### A.7 — Physical Controls

| Control | Applicable | Implementation |
|---------|-----------|----------------|
| A.7.1 Physical security perimeters | Partial | Cloud provider responsibility (shared model) |
| A.7.9 Security of assets off-premises | Yes | Endpoint encryption, VPN |
| A.7.10 Storage media | Yes | Encrypted storage, secure disposal |

### A.8 — Technological Controls

| Control | Applicable | Implementation |
|---------|-----------|----------------|
| A.8.1 User endpoint devices | Yes | Managed devices with encryption |
| A.8.2 Privileged access rights | Yes | Separate admin accounts, MFA |
| A.8.3 Information access restriction | Yes | RBAC, per-environment permissions |
| A.8.5 Secure authentication | Yes | JWT, API keys, MFA, SSO |
| A.8.7 Protection against malware | Yes | Container scanning, dependency scanning |
| A.8.8 Management of technical vulnerabilities | Yes | govulncheck, npm audit, Trivy |
| A.8.9 Configuration management | Yes | Infrastructure as Code (Helm, Terraform) |
| A.8.12 Data leakage prevention | Yes | Secrets scanning, no PII in logs |
| A.8.15 Logging | Yes | Structured logging, audit trail |
| A.8.16 Monitoring activities | Yes | Health checks, alerting |
| A.8.20 Networks security | Yes | TLS, firewall rules, private networks |
| A.8.24 Use of cryptography | Yes | TLS 1.3, AES-256, bcrypt, SHA-256 |
| A.8.25 Secure development lifecycle | Yes | Code review, CI/CD, testing |
| A.8.26 Application security requirements | Yes | OWASP-aligned, input validation |
| A.8.28 Secure coding | Yes | Parameterized SQL, type safety |

## Continual Improvement

| Activity | Frequency |
|----------|-----------|
| Risk assessment review | Annual (or after significant changes) |
| Internal audit | Annual |
| Management review | Quarterly |
| Security awareness training | Annual |
| Incident response drill | Semi-annual |
| Policy review | Annual |

## Certification Roadmap

1. **Current**: Controls implemented, documentation maintained
2. **Stage 1 Audit**: Document review (planned)
3. **Stage 2 Audit**: Implementation verification (planned)
4. **Surveillance Audits**: Annual post-certification
