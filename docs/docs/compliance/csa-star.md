# CSA STAR Self-Assessment

_Last updated: April 2026_

This document provides FeatureSignals' self-assessment against the Cloud Security Alliance (CSA) Cloud Controls Matrix (CCM) v4.

## Overview

The CSA Security, Trust, Assurance, and Risk (STAR) program provides a framework for cloud service providers to demonstrate their security posture. This self-assessment maps FeatureSignals' controls to CCM v4 domains.

## AIS — Application & Interface Security

| Control | Description | Status |
|---------|-------------|--------|
| AIS-01 | Application security policy | Implemented — CLAUDE.md standards |
| AIS-02 | Application security baseline | Implemented — CI/CD with testing |
| AIS-03 | Application security metrics | Implemented — test coverage, vuln scanning |
| AIS-04 | Secure application design | Implemented — hexagonal architecture, ISP |
| AIS-06 | Automated app security testing | Implemented — go test -race, govulncheck |
| AIS-07 | Application vulnerability remediation | Implemented — CI blocks on critical vulns |

## BCR — Business Continuity and Operational Resilience

| Control | Description | Status |
|---------|-------------|--------|
| BCR-01 | Business continuity plan | Documented |
| BCR-02 | Risk assessment | Implemented — risk register |
| BCR-03 | Business continuity testing | Quarterly backup restore tests |
| BCR-04 | Documentation | Incident response plan documented |
| BCR-06 | Backup | Database backups configured |
| BCR-08 | Disaster recovery | DR runbook documented |

## CCC — Change Control and Configuration Management

| Control | Description | Status |
|---------|-------------|--------|
| CCC-01 | Change management policy | Implemented — Git PR workflow |
| CCC-02 | Quality testing | Implemented — CI/CD pipeline |
| CCC-03 | Change management technology | Git + CI/CD |
| CCC-05 | Change agreements | PR reviews required |
| CCC-09 | Change restoration | Git revert, migration rollback |

## DSP — Data Security and Privacy

| Control | Description | Status |
|---------|-------------|--------|
| DSP-01 | Security and privacy policy | Privacy policy published |
| DSP-02 | Secure disposal | Account deletion with anonymization |
| DSP-03 | Data inventory | Data categories documented in ROPA |
| DSP-04 | Data classification | PII, business data, public data |
| DSP-05 | Data flow documentation | Sub-processor data flows documented |
| DSP-07 | Data protection by design | Privacy by design principles applied |
| DSP-10 | Sensitive data transfer | TLS 1.3, SCCs for international transfers |
| DSP-17 | Data retention and deletion | Configurable retention, automated purge |

## GRC — Governance, Risk, and Compliance

| Control | Description | Status |
|---------|-------------|--------|
| GRC-01 | Governance program | Security policies and procedures |
| GRC-02 | Risk management program | Risk assessment framework |
| GRC-03 | Organizational policy | CLAUDE.md standards enforced |
| GRC-04 | Policy review | Annual policy review cycle |

## HRS — Human Resources

| Control | Description | Status |
|---------|-------------|--------|
| HRS-02 | Acceptable use | Acceptable use policy |
| HRS-04 | Employment termination | Access revocation procedure |
| HRS-06 | Employment agreements | Security obligations in agreements |
| HRS-10 | Security awareness training | Annual training program |

## IAM — Identity & Access Management

| Control | Description | Status |
|---------|-------------|--------|
| IAM-01 | Identity and access management policy | RBAC documented |
| IAM-02 | Strong password policy | Configurable password policies |
| IAM-03 | Identity inventory | Team member management |
| IAM-04 | Segregation of duties | Four roles with distinct permissions |
| IAM-06 | User access provisioning | Invitation-based with role assignment |
| IAM-07 | User access de-provisioning | Member removal with audit logging |
| IAM-08 | User access review | Quarterly access review process |
| IAM-09 | Segregation of privileged access | Owner role for sensitive operations |
| IAM-12 | User ID credentials | Email + password, API keys (hashed) |
| IAM-13 | Multi-factor authentication | TOTP MFA available |

## IVS — Infrastructure & Virtualization Security

| Control | Description | Status |
|---------|-------------|--------|
| IVS-01 | Infrastructure security policy | Infrastructure as Code |
| IVS-03 | Network security | TLS, firewall rules, private networks |
| IVS-04 | Segmentation | Separate evaluation and management APIs |
| IVS-09 | Network architecture documentation | Architecture docs published |

## LOG — Logging and Monitoring

| Control | Description | Status |
|---------|-------------|--------|
| LOG-01 | Logging and monitoring policy | Structured logging implemented |
| LOG-02 | Audit logging | Comprehensive audit trail |
| LOG-03 | Security monitoring and alerting | Health checks, rate limit monitoring |
| LOG-05 | Audit log monitoring | Integrity hashing, export capability |
| LOG-09 | Log protection | Append-only audit logs with chain hashing |
| LOG-13 | Access audit logging | Login attempts tracked |

## SEF — Security Incident Management

| Control | Description | Status |
|---------|-------------|--------|
| SEF-01 | Security incident management policy | Incident response plan documented |
| SEF-02 | Service management policy | SLA commitments documented |
| SEF-03 | Incident response plans | Severity-based response procedures |
| SEF-04 | Incident response testing | Semi-annual tabletop exercises |
| SEF-05 | Incident response metrics | Post-mortem process |

## TVM — Threat and Vulnerability Management

| Control | Description | Status |
|---------|-------------|--------|
| TVM-01 | Threat and vulnerability management policy | Automated scanning |
| TVM-02 | Vulnerability prioritization | Severity-based remediation SLAs |
| TVM-03 | Vulnerability remediation | CI blocks critical/high vulnerabilities |
| TVM-04 | Detection updates | Daily CVE database updates |
| TVM-07 | Penetration testing | Annual (planned) |
| TVM-09 | Vulnerability management reporting | Scan reports retained |

## Next Steps

1. **Level 1 — Self-Assessment**: This document (current)
2. **Level 2 — Third-Party Audit**: CSA STAR Certification (planned post-ISO 27001)
3. **Level 3 — Continuous Monitoring**: CSA STAR Continuous (future)
