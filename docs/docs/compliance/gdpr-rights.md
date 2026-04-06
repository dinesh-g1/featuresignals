# GDPR Data Subject Rights Guide

_Last updated: April 2026_

This document explains how data subjects can exercise their rights under the General Data Protection Regulation (GDPR).

## How to Exercise Your Rights

### 1. Right of Access (Article 15)

**What**: Obtain a copy of all personal data we hold about you.

**How**:
- **API**: `GET /v1/users/me/data` (authenticated — returns JSON export of your personal data)
- **Email**: privacy@featuresignals.com

**Response time**: Instant via API, or within 30 days via email.

### 2. Right to Rectification (Article 16)

**What**: Correct inaccurate personal data.

**How**:
- **Dashboard**: Settings > General (update name, email)
- **Email**: privacy@featuresignals.com for data not editable in the dashboard

### 3. Right to Erasure / Right to Be Forgotten (Article 17)

**What**: Request deletion of your personal data.

**How**:
- **API**: `DELETE /v1/users/me` (authenticated — initiates account deletion with 30-day grace period)
- **Email**: privacy@featuresignals.com

**Process**:
1. Account is soft-deleted immediately (cannot log in)
2. 30-day grace period allows recovery by contacting support
3. After 30 days, all personal data is permanently deleted
4. Audit log entries are anonymized (actor replaced with "deleted-user-xxx")

**Note**: If you are the sole owner of an organization, you must transfer ownership or delete the organization first.

### 4. Right to Data Portability (Article 20)

**What**: Receive your data in a structured, machine-readable format.

**How**:
- **Email**: privacy@featuresignals.com

We will provide an export of your data including: projects, flags, environments, segments, team members, audit logs, API key metadata, webhooks, and subscription data.

### 5. Right to Restrict Processing (Article 18)

**What**: Limit the processing of your personal data.

**How**: Contact privacy@featuresignals.com with your specific request.

### 6. Right to Object (Article 21)

**What**: Object to processing based on legitimate interest.

**How**: Contact privacy@featuresignals.com. We will cease processing unless we demonstrate compelling legitimate grounds.

### 7. Right to Withdraw Consent (Article 7)

**What**: Withdraw consent for consent-based processing (e.g., marketing emails).

**How**:
- **Email**: Unsubscribe link in any marketing email, or contact privacy@featuresignals.com

## Data Protection Officer

For GDPR inquiries: dpo@featuresignals.com

## Supervisory Authority

You have the right to lodge a complaint with your local data protection supervisory authority.
