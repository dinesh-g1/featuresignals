---
description: "FeatureSignals approach to EU-U.S. Data Privacy Framework and international data transfer safeguards."
---

# EU-U.S. Data Privacy Framework

_Last updated: April 2026_

This document describes FeatureSignals' approach to lawful international data transfers between the EU/EEA/UK and other jurisdictions.

## Overview

The EU-U.S. Data Privacy Framework (DPF) is one mechanism U.S. organizations can use to receive personal data from the EU when they are **listed** under the framework. FeatureSignals **is not currently certified or listed** under the EU-U.S. DPF program. For our managed service, we rely primarily on **Standard Contractual Clauses** and other contractual safeguards described below; self-hosted deployment remains available when you need to avoid specific transfers entirely.

## Transfer Mechanisms

### 1. Standard Contractual Clauses (SCCs) — primary for FeatureSignals cloud

For international transfers, including to the United States where applicable:
- EU Commission-approved SCCs (2021 version) included in our DPA
- Module 2 (Controller to Processor) for customer data
- Module 3 (Processor to Sub-processor) for sub-processor transfers
- Transfer impact assessments as appropriate for the deployment

### 2. Data Privacy Framework (DPF) — context

Where a sub-processor or counterparty is DPF-listed, their certification may support onward transfers in line with EU guidance. **FeatureSignals itself does not currently rely on DPF self-certification**; participation in the EU-U.S. DPF may be evaluated for the future.

### 3. UK International Data Transfer Agreement (IDTA)

For UK-specific transfers:
- UK IDTA Addendum attached to SCCs where required
- Aligned with UK ICO guidance

### 4. Self-Hosted Deployment

For organizations requiring complete data sovereignty:
- Deploy FeatureSignals on-premises or in your own cloud region
- No data leaves your infrastructure
- Eliminates international transfer concerns entirely

## Privacy practices

The practices below reflect how we handle personal data under our DPA and privacy policy. They are **not** a representation that FeatureSignals is certified or listed under the EU-U.S. Data Privacy Framework.

### Notice

We inform individuals about data collection and processing through our privacy policy, available at [featuresignals.com/privacy-policy](https://featuresignals.com/privacy-policy).

### Choice

Individuals can opt out of:
- Marketing communications (unsubscribe link)
- Non-essential cookies (browser settings)
- Data processing beyond the service contract

### Accountability for Onward Transfer

We transfer personal data only to sub-processors that:
- Are bound by contractual obligations
- Provide at least the same level of protection
- Are listed on our public sub-processor page

### Security

We maintain security measures appropriate to the data processed:
- TLS 1.3 for data in transit
- AES-256 encryption at rest
- Access controls and audit logging
- Regular vulnerability scanning

### Data Integrity and Purpose Limitation

We process personal data only for purposes compatible with the stated collection purpose.

### Access

Individuals can access their personal data through:
- Flag Engine data export
- API endpoint (`GET /v1/users/me/data`)
- Email request to privacy@featuresignals.com

### Recourse, Enforcement, and Liability

- Complaints can be directed to privacy@featuresignals.com
- Independent dispute resolution available
- We are subject to the investigatory and enforcement powers of the relevant data protection authorities

## Transfer Impact Assessment Summary

| Factor | Assessment |
|--------|------------|
| Nature of data | Business contact info, authentication data, service usage data |
| Volume | Moderate (B2B SaaS, limited PII per user) |
| Sensitivity | Low (no special categories of data) |
| Transfer destination | Sub-processors in US, EU (see sub-processor list) |
| Legal framework at destination | SCCs and supplementary measures; individual sub-processors may use DPF or other approved mechanisms where applicable |
| Supplementary measures | Encryption in transit and at rest, access controls, audit logging |
| Risk assessment | Low risk — business data, limited PII, strong safeguards |

## Sub-Processor Data Flows

See our [Sub-processors list](./subprocessors.md) for current sub-processors and their locations.

## Contact

For questions about international data transfers: privacy@featuresignals.com
