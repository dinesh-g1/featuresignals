# CCPA / CPRA Compliance

_Last updated: April 2026_

This document describes how FeatureSignals complies with the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA).

## Applicability

CCPA/CPRA applies when FeatureSignals processes personal information of California residents. As a B2B service provider, FeatureSignals primarily acts as a **service provider** (processor) under CCPA when handling customer data.

## Consumer Rights

### Right to Know (§1798.100, §1798.110)

California consumers can request:
- Categories of personal information collected
- Specific pieces of personal information collected
- Categories of sources
- Business or commercial purpose for collection
- Categories of third parties with whom information is shared

**How to exercise**: Email privacy@featuresignals.com or use the dashboard data export.

### Right to Delete (§1798.105)

Consumers can request deletion of personal information.

**Implementation**:
- Account deletion via API (`DELETE /v1/users/me`) or by contacting privacy@featuresignals.com
- 30-day grace period before permanent deletion
- Audit logs anonymized; evaluation data purged

### Right to Correct (§1798.106 — CPRA)

Consumers can request correction of inaccurate personal information.

**Implementation**: Profile editing in dashboard; email privacy@featuresignals.com for data not editable in the UI.

### Right to Opt-Out of Sale/Sharing (§1798.120, §1798.121)

FeatureSignals **does not sell or share** personal information as defined by CCPA/CPRA. We do not:
- Sell personal data to third parties
- Share personal data for cross-context behavioral advertising
- Use personal data for purposes beyond the service contract

### Right to Limit Use of Sensitive Personal Information (§1798.121)

FeatureSignals does not collect sensitive personal information as defined by CPRA (SSN, driver's license, financial account numbers, precise geolocation, racial/ethnic origin, etc.).

### Right to Non-Discrimination (§1798.125)

FeatureSignals will not discriminate against consumers who exercise their privacy rights.

## Data Processing

### Categories of Personal Information Collected

| Category | Examples | Purpose |
|----------|----------|---------|
| Identifiers | Name, email, IP address | Account management, authentication |
| Commercial information | Subscription plan, billing contact | Service delivery, billing |
| Internet activity | API usage, feature flag evaluations | Service operation, analytics |
| Professional information | Organization name, role | Multi-tenancy, access control |

### Categories of Sources

- Directly from the consumer (registration, profile updates)
- Automatically from the consumer's device (IP address, user agent)
- From the consumer's organization admin (team invitations)

### Business Purpose

All personal information is collected and processed solely for:
- Providing the FeatureSignals service
- Maintaining and improving the service
- Security and fraud prevention
- Compliance with legal obligations

### Service Providers

We share personal information only with service providers under written contracts that:
- Specify the business purpose for processing
- Prohibit selling or sharing the data
- Require the same level of privacy protection
- Allow us to monitor compliance

See our [Sub-processors list](./subprocessors.md) for current service providers.

## Verification Process

Before fulfilling consumer requests, we verify identity through:
1. Email verification (sending a confirmation to the account email)
2. Account authentication (must be logged in)
3. For sensitive requests: additional verification may be required

## Response Timelines

| Request Type | Acknowledgment | Fulfillment |
|---|---|---|
| Right to Know | 10 business days | 45 calendar days (extendable to 90) |
| Right to Delete | 10 business days | 45 calendar days (extendable to 90) |
| Right to Correct | 10 business days | 45 calendar days (extendable to 90) |

## Contact

For CCPA/CPRA requests: privacy@featuresignals.com

Requests can also be submitted via mail to:
Vivekananda Technology Labs
Flat no 308, L5-Block, LIG, Chitrapuri Colony
Manikonda, Hyderabad, Telangana - 500089, India
