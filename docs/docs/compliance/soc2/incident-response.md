# Incident Response Plan

_Last updated: April 2026_

## 1. Purpose

This plan establishes procedures for identifying, responding to, and recovering from security incidents affecting FeatureSignals and its customers.

## 2. Definitions

| Term | Definition |
|------|------------|
| **Security Incident** | Any event that compromises the confidentiality, integrity, or availability of FeatureSignals systems or customer data |
| **Data Breach** | Unauthorized access to or disclosure of customer personal data |
| **Severity 1 (Critical)** | Data breach, complete service outage, active exploitation |
| **Severity 2 (High)** | Partial service degradation, suspected breach, vulnerable system |
| **Severity 3 (Medium)** | Minor vulnerability, policy violation, anomalous activity |
| **Severity 4 (Low)** | Informational, proactive detection, no immediate impact |

## 3. Incident Response Team

| Role | Responsibility |
|------|---------------|
| **Incident Commander** | Overall coordination, stakeholder communication |
| **Technical Lead** | Investigation, containment, remediation |
| **Communications Lead** | Customer notification, public statements |
| **Legal/Compliance** | Regulatory notification, legal obligations |
| **Executive Sponsor** | Escalation, resource allocation |

## 4. Response Phases

### Phase 1: Detection and Identification (0–15 minutes)

1. Alert received via monitoring, audit log analysis, or report
2. On-call engineer performs initial triage
3. Severity level assigned
4. Incident Commander notified for Sev 1/2

**Detection sources**:
- Automated monitoring and alerting
- Audit log anomaly detection (failed login spikes, unauthorized access attempts)
- Rate limiting triggers
- Customer reports
- Vulnerability scan findings

### Phase 2: Containment (15 minutes – 1 hour for Sev 1)

**Immediate containment**:
- Revoke compromised credentials (API keys, tokens)
- Enable IP allowlist restrictions
- Isolate affected systems
- Preserve evidence (logs, snapshots)

**Short-term containment**:
- Deploy targeted patches
- Increase monitoring
- Restrict access to affected areas

### Phase 3: Eradication (1–24 hours for Sev 1)

1. Identify root cause
2. Remove threat vectors
3. Patch vulnerabilities
4. Verify all indicators of compromise addressed

### Phase 4: Recovery (24–72 hours for Sev 1)

1. Restore from clean backups if needed
2. Gradual service restoration with increased monitoring
3. Verify system integrity
4. Confirm no persistent threat

### Phase 5: Post-Incident Review (within 5 business days)

1. Timeline reconstruction
2. Root cause analysis
3. Lessons learned documentation
4. Control improvements identified
5. Post-mortem report published internally

## 5. Communication Protocol

### Internal Communication

| Severity | Notification Timeline | Audience |
|----------|----------------------|----------|
| Sev 1 | Immediate | Full incident team, executive team |
| Sev 2 | Within 30 minutes | Incident team, engineering leadership |
| Sev 3 | Within 4 hours | Engineering team |
| Sev 4 | Next business day | Relevant team members |

### Customer Notification

| Event | Timeline | Method |
|-------|----------|--------|
| Data breach confirmed | Within 72 hours (GDPR) | Email + dashboard banner |
| Service disruption | Within 1 hour | Status page |
| Vulnerability disclosure | After patch deployed | Security advisory email |

### Regulatory Notification

| Regulation | Requirement |
|------------|-------------|
| GDPR | Notify supervisory authority within 72 hours of breach awareness |
| CCPA | Notify affected California residents "in the most expedient time possible" |
| HIPAA (if applicable) | Notify HHS within 60 days; affected individuals without unreasonable delay |

## 6. Evidence Preservation

During any incident:
- Do not modify or delete audit logs
- Export relevant logs immediately: `GET /v1/organizations/{orgID}/audit/export`
- Take database snapshots before any remediation changes
- Document all actions taken with timestamps

## 7. Testing

This plan is tested annually via tabletop exercises and periodic red team engagements.

| Exercise | Frequency | Participants |
|----------|-----------|-------------|
| Tabletop exercise | Semi-annual | Full incident team |
| Red team assessment | Annual | External security firm |
| Backup restore test | Quarterly | Engineering team |
| Communication drill | Annual | Full incident team + exec |
