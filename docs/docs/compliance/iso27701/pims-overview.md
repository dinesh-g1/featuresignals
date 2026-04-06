# ISO 27701 — Privacy Information Management System

_Last updated: April 2026_

ISO 27701 extends ISO 27001 with privacy-specific controls to establish a Privacy Information Management System (PIMS). This document describes FeatureSignals' alignment with ISO 27701 requirements.

## Scope

FeatureSignals operates as both:
- **PII Controller** (for customer account data, billing data)
- **PII Processor** (for evaluation context data passed by customers)

## Key Controls Mapping

### Clause 6 — PIMS-specific Requirements related to ISO 27001

| Sub-clause | Requirement | Implementation |
|---|---|---|
| 6.2 | Privacy risk assessment | Included in risk register; privacy impact assessed for all new features |
| 6.3 | Internal audit | Quarterly privacy controls review |
| 6.4 | Management review | Privacy metrics in quarterly security review |

### Clause 7 — Additional ISO 27002 Guidance for PII Controllers

| Control | Description | Implementation |
|---|---|---|
| 7.2.1 | Purpose identification | Documented in privacy policy; limited to service delivery |
| 7.2.2 | Lawful basis | Legitimate interest and contract performance identified |
| 7.2.5 | Privacy impact assessment | Completed for evaluation engine, audit system, SSO |
| 7.2.6 | Contracts with PII processors | DPA template available; signed with all sub-processors |
| 7.2.8 | Records of PII processing | Maintained in audit logs with integrity hashing |
| 7.3.1 | PII Controller obligations to PII principals | Rights documented in GDPR rights guide and CCPA notice |
| 7.3.2 | Determining information for PII principals | Privacy policy publicly available |
| 7.3.6 | Access to PII | Data export API (`GET /v1/users/me/data`) |
| 7.3.9 | PII de-identification and deletion | Account deletion with anonymization of audit logs |
| 7.4.5 | PII de-identification and deletion at end of processing | Data retention policy enforced; automated purge |
| 7.5.1 | International transfer | EU Standard Contractual Clauses, Data Privacy Framework |

### Clause 8 — Additional ISO 27002 Guidance for PII Processors

| Control | Description | Implementation |
|---|---|---|
| 8.2.1 | Customer agreement | DPA template covers processor obligations |
| 8.2.2 | Organization's purposes | Processing only per customer instructions |
| 8.2.4 | Instruction documentation | Audit log records all data processing activities |
| 8.2.6 | Temporary files | No temporary files containing PII; all processing in-memory or database |
| 8.3.1 | Obligations to PII principals | Redirect to customer (controller) for rights requests |
| 8.4.1 | Transfer to third parties | Sub-processor list maintained; customer notified of changes |
| 8.5.1 | Notification of breach | 72-hour notification commitment in DPA |
| 8.5.2 | Breach response | Incident response plan with privacy breach procedures |

## Privacy by Design

FeatureSignals incorporates privacy by design principles:

1. **Data minimization**: Evaluation context is processed in-memory; only flag configurations are stored
2. **Purpose limitation**: Personal data used only for stated purposes
3. **Storage limitation**: Configurable data retention with automated purge
4. **Integrity and confidentiality**: Encryption in transit and at rest
5. **Accountability**: Comprehensive audit trail with integrity hashing

## Records of Processing Activities (ROPA)

| Activity | Data Categories | Legal Basis | Retention | Recipients |
|----------|----------------|-------------|-----------|------------|
| Account management | Name, email | Contract | Account lifetime + 30 days | Internal |
| Authentication | Email, password hash, MFA seed | Contract | Account lifetime | Internal |
| Billing | Billing contact, plan | Contract | 7 years (tax) | Payment processor |
| Audit logging | User ID, IP, action | Legitimate interest | Per plan (90d–2yr) | Internal, customer export |
| Flag evaluation | Targeting attributes | Contract (processor) | Not stored (in-memory) | None |
| Support | Email, issue description | Contract | 3 years | Support tools |

## Gap Analysis and Roadmap

| Area | Status | Target |
|------|--------|--------|
| Privacy policy | Implemented | Ongoing review |
| DPA template | Implemented | Legal review quarterly |
| Data subject rights | Implemented (GDPR + CCPA) | Extend as needed |
| Privacy impact assessment | Process defined | Per-feature assessment |
| Sub-processor management | List published | Notification workflow |
| International transfer | SCCs + DPF documented | Update per regulatory changes |
| ISO 27701 certification | Controls mapped | Audit when ISO 27001 certified |
