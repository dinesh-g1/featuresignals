# HIPAA Compliance

_Last updated: April 2026_

:::info
This document describes the technical controls FeatureSignals implements that map to HIPAA requirements. FeatureSignals has not undergone a formal HIPAA audit. Organizations requiring HIPAA compliance should evaluate these controls against their specific requirements and consult with their compliance team.
:::

This document describes how FeatureSignals supports healthcare organizations subject to the Health Insurance Portability and Accountability Act (HIPAA).

## Applicability

HIPAA applies when FeatureSignals is used by **Covered Entities** (healthcare providers, health plans, healthcare clearinghouses) or their **Business Associates** to manage feature flags in systems that process Protected Health Information (PHI).

FeatureSignals acts as a **Business Associate** when its service is used in connection with PHI-containing systems.

## Business Associate Agreement (BAA)

Enterprise customers requiring HIPAA compliance must execute a BAA with FeatureSignals before processing PHI.

### BAA Key Terms

| Term | Commitment |
|------|------------|
| Permitted uses | Only as necessary to provide the FeatureSignals service |
| Safeguards | Administrative, physical, and technical safeguards per the Security Rule |
| Breach notification | Within 60 days of discovery |
| Subcontractors | Same obligations flow to sub-processors |
| Return/destruction of PHI | Upon termination of agreement |
| Audit rights | Customer may audit compliance |

Contact [sales@featuresignals.com](mailto:sales@featuresignals.com) to request a BAA.

## Technical Safeguards (§164.312)

### Access Control (§164.312(a))

| Requirement | Implementation |
|-------------|---------------|
| Unique user identification | UUID-based user IDs, email authentication |
| Emergency access procedure | Owner role can bypass environment permissions |
| Automatic logoff | JWT token expiration (1 hour) |
| Encryption and decryption | AES-256 at rest, TLS 1.3 in transit |

### Audit Controls (§164.312(b))

| Requirement | Implementation |
|-------------|---------------|
| Audit trail | Every action logged with actor, IP, timestamp |
| Integrity verification | SHA-256 chain hashing on audit entries |
| Access monitoring | Login attempt tracking, anomaly detection |
| Audit export | JSON/CSV export for compliance review |

### Integrity (§164.312(c))

| Requirement | Implementation |
|-------------|---------------|
| Data integrity | Parameterized SQL, transaction isolation |
| Tamper detection | Audit log integrity hashing |
| Input validation | Request body validation, size limits |

### Person or Entity Authentication (§164.312(d))

| Requirement | Implementation |
|-------------|---------------|
| Authentication methods | Password + MFA (TOTP), SSO (SAML/OIDC) |
| Password requirements | Configurable password policies (length, complexity, rotation) |
| Brute-force protection | Account lockout after failed attempts |

### Transmission Security (§164.312(e))

| Requirement | Implementation |
|-------------|---------------|
| Integrity controls | TLS 1.3 for all API communication |
| Encryption | HTTPS enforced, HSTS headers |

## Administrative Safeguards (§164.308)

| Requirement | Implementation |
|-------------|---------------|
| Security management process | Risk assessment, incident response plan |
| Assigned security responsibility | Designated security lead |
| Workforce security | Background checks, security training |
| Information access management | RBAC, per-environment permissions |
| Security awareness and training | Annual security training program |
| Security incident procedures | Documented incident response plan |
| Contingency plan | Backups, disaster recovery procedures |
| Evaluation | Annual HIPAA compliance review |

## Physical Safeguards (§164.310)

For cloud-hosted deployments, physical safeguards are provided by the cloud infrastructure provider under their own HIPAA compliance programs.

For on-premises deployments, the customer is responsible for physical safeguards.

## PHI in FeatureSignals

### Recommended Architecture

FeatureSignals evaluates feature flags based on targeting context. For HIPAA-compliant deployments:

1. **Do not include PHI in evaluation context** — Use opaque identifiers (user ID, session ID) for targeting, not names, SSNs, or medical record numbers.
2. **Deploy on-premises** for maximum control — Eliminates BAA complexity with third-party cloud.
3. **Enable audit logging** — Required for HIPAA audit trail.
4. **Enforce MFA** — Required for access to ePHI systems.
5. **Configure IP allowlisting** — Restrict management API access.

### Minimum Viable HIPAA Configuration

```bash
# Required environment variables for HIPAA-compliant deployment

# Strong authentication
JWT_SECRET=<strong-64-char-secret>

# Enable all security features
LICENSE_KEY=<enterprise-license>
LICENSE_PUBLIC_KEY_PATH=/etc/featuresignals/license-public.pem

# Strict CORS
CORS_ORIGIN=https://flags.hospital.example.com
```

Dashboard settings:
- Enable MFA for all team members
- Configure IP allowlist for management API
- Set password policy to HIPAA-compliant minimums
- Enable audit log export

## Breach Notification

In the event of a breach involving PHI:

1. **Discovery**: Incident detected via monitoring or report
2. **Investigation**: Determine if PHI was compromised (within 24 hours)
3. **Notification to Customer**: Within 60 days of discovery
4. **Customer's Responsibilities**: Customer notifies HHS and affected individuals per HIPAA Breach Notification Rule

## Contact

For HIPAA compliance inquiries: compliance@featuresignals.com
