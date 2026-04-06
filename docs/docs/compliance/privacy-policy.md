# Privacy Policy

_Last updated: April 2026_

## Overview

FeatureSignals ("we", "us", "our") is a feature flag management platform. This privacy policy explains how we collect, use, and protect your personal data in compliance with the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA/CPRA), and other applicable data protection laws.

## Data Controller

FeatureSignals is the data controller for the personal data described in this policy.

## What Data We Collect

### Account Data
- **Email address** — used for authentication, notifications, and communication
- **Name** — displayed in the dashboard and audit logs
- **Password** — stored as a bcrypt hash; we never store plaintext passwords
- **Organization name** — used to identify your tenant

### Usage Data
- **Audit logs** — records of actions taken in the dashboard (who, what, when)
- **API request metadata** — IP addresses, user agents (for security and rate limiting)
- **Evaluation metrics** — aggregated flag evaluation counts (no PII)

### Evaluation Context (Customer-Controlled)
When your application evaluates feature flags, you may pass an **evaluation context** containing a targeting key and attributes. FeatureSignals processes this data in memory for evaluation only — it is **not stored** in our database. You control what data you include in the evaluation context.

## How We Use Your Data

| Purpose | Legal Basis (GDPR) |
|---------|-------------------|
| Providing the service | Contract performance |
| Authentication and security | Legitimate interest |
| Audit logging | Legitimate interest / Legal obligation |
| Billing and invoicing | Contract performance |
| Service improvement | Legitimate interest |
| Email notifications | Consent (opt-in) |

## Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Account data | Until account deletion + 30-day grace period |
| Audit logs (Free) | 30 days |
| Audit logs (Pro) | 90 days |
| Audit logs (Enterprise) | Unlimited (configurable) |
| Evaluation metrics | 30-day rolling window |
| Login attempt logs | 90 days |

## Your Rights

### Under GDPR (EU/EEA Residents)
- **Right of access** — request a copy of your personal data
- **Right to rectification** — correct inaccurate data
- **Right to erasure** — request deletion of your data
- **Right to data portability** — receive your data in a structured format
- **Right to restrict processing** — limit how we use your data
- **Right to object** — object to processing based on legitimate interest
- **Right to withdraw consent** — for consent-based processing

### Under CCPA/CPRA (California Residents)
- **Right to know** — what personal information we collect
- **Right to delete** — request deletion of personal information
- **Right to opt-out** — of sale/sharing of personal information (we do not sell data)
- **Right to non-discrimination** — exercising rights will not affect your service

### How to Exercise Your Rights

- **Self-service**: Use the dashboard Settings > Privacy page
- **API**: `GET /v1/users/me/data` (data export), `DELETE /v1/users/me` (account deletion)
- **Email**: privacy@featuresignals.com

We will respond to all requests within 30 days (GDPR) or 45 days (CCPA).

## Data Security

- All data is encrypted in transit (TLS 1.3)
- Data at rest is encrypted via platform-level encryption (AES-256)
- Passwords are hashed with bcrypt
- API keys are hashed with SHA-256
- Access controls enforce tenant isolation at the database query level

## Sub-processors

| Sub-processor | Purpose | Location |
|---------------|---------|----------|
| Cloud hosting provider | Infrastructure | Configured per deployment |
| Email service provider | Transactional emails | As configured |

## International Data Transfers

For deployments where data crosses borders, we rely on:
- EU Standard Contractual Clauses (SCCs)
- Data Privacy Framework (DPF) self-certification (when applicable)
- Customer-controlled data residency (on-premises deployment option)

## Changes to This Policy

We will notify you of material changes via email and dashboard notification at least 30 days before they take effect.

## Contact

For privacy inquiries: privacy@featuresignals.com
