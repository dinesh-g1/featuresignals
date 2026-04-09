---
description: "FeatureSignals Data Processing Agreement template for GDPR-compliant data processing relationships."
---

# Data Processing Agreement (DPA)

_Template — Last updated: April 2026_

This Data Processing Agreement ("DPA") supplements the Terms of Service between FeatureSignals and the Customer.

## 1. Definitions

- **Controller**: The Customer, who determines the purposes and means of processing personal data.
- **Processor**: FeatureSignals, who processes personal data on behalf of the Controller.
- **Personal Data**: Any information relating to an identified or identifiable natural person.
- **Processing**: Any operation performed on personal data.

## 2. Scope of Processing

FeatureSignals processes the following categories of personal data:

| Category | Data Elements | Purpose |
|----------|--------------|---------|
| Account data | Email, name | Service authentication and authorization |
| Audit data | User ID, IP address, user agent | Security monitoring and compliance |
| Evaluation context | As provided by Customer | Feature flag evaluation (in-memory only, not stored) |

## 3. Processing Instructions

FeatureSignals will process personal data only in accordance with the Customer's documented instructions, which are defined by:
- The service configuration chosen by the Customer
- The API calls made by the Customer's applications
- The evaluation context provided by the Customer's SDKs

## 4. Security Measures

FeatureSignals implements the following technical and organizational measures:

- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256 platform-level)
- Password hashing (bcrypt)
- API key hashing (SHA-256)
- Role-based access control (RBAC)
- Per-environment permissions
- Audit logging with tamper-evident integrity hashing
- Multi-factor authentication (MFA)
- Single Sign-On (SSO) with SAML 2.0 / OIDC
- IP allowlisting
- Rate limiting
- Automated vulnerability scanning

## 5. Sub-processors

FeatureSignals uses the sub-processors listed at: `docs/compliance/subprocessors.md`

The Customer will be notified at least 30 days before any new sub-processor is engaged.

## 6. Data Subject Rights

FeatureSignals will assist the Customer in fulfilling data subject requests through:
- Self-service data export API (`GET /v1/users/me/data`)
- Self-service account deletion (`DELETE /v1/users/me`)
- Organization data export (`POST /v1/organizations/{orgID}/data-export`)

## 7. Data Breach Notification

FeatureSignals will notify the Customer of any personal data breach without undue delay and in any event within 72 hours of becoming aware of it.

## 8. Data Deletion

Upon termination of the agreement, FeatureSignals will delete all Customer personal data within 30 days, unless retention is required by law.

## 9. International Transfers

Where personal data is transferred outside the EEA, FeatureSignals relies on:
- EU Standard Contractual Clauses (SCCs)
- Additional transfer mechanisms as described in our privacy and compliance documentation (we are **not** currently listed under the EU-U.S. Data Privacy Framework)
- Customer-controlled data residency (on-premises option)

## 10. Audit Rights

The Customer may audit FeatureSignals' compliance with this DPA by:
- Requesting security documentation we make available (for example, responses to a security questionnaire, control summaries, and **a SOC 2 Type II report when we have completed an applicable examination**)
- Conducting an on-site audit with 30 days' prior written notice (Enterprise plan)
