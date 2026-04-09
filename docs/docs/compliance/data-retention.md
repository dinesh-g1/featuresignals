---
description: "FeatureSignals data retention policy with schedules by plan tier and data type."
---

# Data Retention Policy

_Last updated: April 2026_

## Overview

This document describes the data retention schedules for FeatureSignals. Retention periods vary by plan tier and data type.

## Retention Schedule

| Data Type | All Plans | Notes |
|-----------|-----------|-------|
| **User accounts** | Until deletion | 30-day soft-delete grace period |
| **Organizations** | Until deletion | 90-day inactivity warning for free tier |
| **Projects & flags** | Until deletion | Cascade-deleted with org |
| **Flag states** | Until deletion | Historical states not retained |
| **Audit logs** | 90 days | Tamper-evident integrity hashing. Per-tier configurable retention on our roadmap. |
| **Evaluation metrics** | 30-day window | Aggregated, no PII |
| **Login attempts** | 90 days | For security monitoring |

## Automated Purge

A scheduled job runs daily to purge data beyond its retention period:
- Audit log entries older than the org's retention limit
- Expired login attempts
- Used one-time tokens
- Soft-deleted organizations past the hard-delete grace period

## Data Subject Deletion

When a user requests account deletion:
1. Account is soft-deleted immediately (login blocked)
2. 30-day grace period allows recovery
3. After grace period, personal data is hard-deleted
4. Audit log entries are anonymized (actor replaced with "deleted-user-xxx")
5. Evaluation context data is not stored and requires no deletion

## Extended Retention (Roadmap)

Per-tier configurable audit log retention is on our roadmap. Enterprise customers requiring extended retention (e.g., 6+ years for HIPAA) should contact support@featuresignals.com to discuss requirements.
