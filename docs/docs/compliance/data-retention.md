# Data Retention Policy

_Last updated: April 2026_

## Overview

This document describes the data retention schedules for FeatureSignals. Retention periods vary by plan tier and data type.

## Retention Schedule

| Data Type | Free | Pro | Enterprise | Notes |
|-----------|------|-----|-----------|-------|
| **User accounts** | Until deletion | Until deletion | Until deletion | 30-day soft-delete grace period |
| **Organizations** | Until deletion | Until deletion | Until deletion | 90-day inactivity warning for free tier |
| **Projects & flags** | Until deletion | Until deletion | Until deletion | Cascade-deleted with org |
| **Flag states** | Until deletion | Until deletion | Until deletion | Historical states not retained |
| **Audit logs** | 30 days | 90 days | Unlimited (configurable) | Tamper-evident integrity hashing |
| **Evaluation metrics** | 30-day window | 30-day window | Configurable | Aggregated, no PII |
| **Login attempts** | 90 days | 90 days | 90 days | For security monitoring |
| **API request logs** | 7 days | 30 days | 90 days | IP + user agent |
| **Webhook delivery logs** | 7 days | 30 days | 90 days | Response status only |
| **Backup snapshots** | 7 days | 30 days | 90 days | Encrypted at rest |

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

## HIPAA Compliance Note

Organizations requiring HIPAA compliance can configure audit log retention to 6+ years via the Enterprise plan's configurable retention setting.
