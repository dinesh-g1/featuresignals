---
title: Compliance & Security
tags: [compliance, security, architecture]
domain: compliance
sources:
  - docs/docs/compliance/security-overview.md (security overview)
  - docs/docs/compliance/soc2/controls-matrix.md (SOC 2 controls mapping)
  - docs/docs/compliance/soc2/evidence-collection.md (SOC 2 evidence guide)
  - docs/docs/compliance/soc2/incident-response.md (incident response plan)
  - docs/docs/compliance/iso27001/isms-overview.md (ISO 27001 ISMS overview)
  - docs/docs/compliance/iso27701/pims-overview.md (ISO 27701 PIMS overview)
  - docs/docs/compliance/gdpr-rights.md (GDPR data subject rights)
  - docs/docs/compliance/ccpa-cpra.md (CCPA/CPRA compliance)
  - docs/docs/compliance/hipaa.md (HIPAA safeguards)
  - docs/docs/compliance/csa-star.md (CSA STAR self-assessment)
  - docs/docs/compliance/data-privacy-framework.md (EU-U.S. DPF)
  - docs/docs/compliance/dora.md (DORA compliance)
  - docs/docs/compliance/data-retention.md (data retention policy)
  - docs/docs/compliance/privacy-policy.md (privacy policy)
  - docs/docs/compliance/subprocessors.md (sub-processors)
  - docs/docs/compliance/dpa-template.md (DPA template)
  - server/internal/domain/compliance.go (compliance domain model)
  - server/internal/domain/compliance_errors.go (compliance errors)
  - CLAUDE.md (security standards)
  - ARCHITECTURE_IMPLEMENTATION.md (5-layer security architecture)
related:
  - [[Architecture]] — security layer design, cell trust model
  - [[Deployment]] — network isolation, firewall rules, CI/CD security
  - [[Development]] — coding standards, error handling, store patterns
last_updated: 2026-04-27
maintainer: llm
review_status: current
confidence: medium
---

## Overview

FeatureSignals is built as **compliance-ready infrastructure** for feature flag management. The product's security architecture, data protection controls, and operational practices are designed to map to enterprise compliance frameworks. However, FeatureSignals has **not yet completed formal certification audits** for any compliance framework. This page describes the current posture, implemented controls, and certification roadmap for each framework.

**Current posture:** Technical controls are implemented and documented against SOC 2, ISO 27001, ISO 27701, GDPR, CCPA/CPRA, HIPAA, CSA STAR, DPF, and DORA requirements. Formal certification audits are on the roadmap, sequenced as SOC 2 Type II → ISO 27001 → ISO 27701.

**Target certifications (planned, not achieved):**

| Certification | Status | Roadmap |
|---|---|---|
| SOC 2 Type II | Controls mapped, evidence collection automated | Observation period target: 2026–2027 |
| ISO 27001 | ISMS documented, Annex A controls mapped | Stage 1 audit after SOC 2 |
| ISO 27701 | PIMS mapped as ISO 27001 extension | After ISO 27001 certification |
| CSA STAR | Self-assessment (Level 1) completed | Level 2 (third-party) post-ISO 27001 |
| EU-U.S. DPF | Not certified; SCCs are primary mechanism | Evaluating participation |
| HIPAA | BAA available, technical safeguards mapped | No formal HIPAA audit planned |

---

## Data Protection

### Encryption Standards

| Layer | Algorithm / Protocol | Scope |
|---|---|---|
| **In transit** | TLS 1.3 (minimum 1.2) | All API communication, Flag Engine, SDK ↔ API |
| **At rest** | AES-256 | Database storage, backups |
| **Passwords** | bcrypt (cost factor 12) | User authentication credentials |
| **API keys** | SHA-256 one-way hash | Server SDK authentication keys |
| **Audit integrity** | SHA-256 chain hashing | Immutable audit trail, tamper detection |

Source: `docs/docs/compliance/security-overview.md` — encryption section.

### Data Retention

Retention periods are defined per data type and plan tier. A daily scheduled job purges expired data:

| Data Type | Free / Pro | Enterprise |
|---|---|---|
| User accounts | Account lifetime + 30-day grace period | Same |
| Organizations | Until deletion (90-day inactivity warning for free) | Same |
| Projects, flags, segments | Until deletion (cascade with org) | Same |
| Audit logs | Free: 30 days / Pro: 90 days | Configurable (unlimited) |
| Evaluation metrics | 30-day rolling window (aggregated, no PII) | Same |
| Login attempts | 90 days | Same |

**Deletion process:**
1. Account soft-deleted immediately (login blocked)
2. 30-day grace period allows recovery
3. Hard-deletion after grace period
4. Audit log entries anonymized — actor replaced with `"deleted-user-xxx"`
5. Evaluation context data is **never stored** — processed in-memory only, no deletion needed

Source: `docs/docs/compliance/data-retention.md` — retention schedule and automated purge.

### Sub-processors

FeatureSignals uses a minimal sub-processor model. Customers are notified at least 30 days before any new sub-processor is engaged.

| Sub-processor | Purpose | Data Processed | Location |
|---|---|---|---|
| Cloud hosting provider | Application hosting, database | All service data | Per deployment configuration |
| Email service provider | Transactional emails (OTP, notifications) | Email address, name | Provider's infrastructure |

For on-premises deployments, FeatureSignals does **not** act as a sub-processor — all data processing occurs within the customer's infrastructure.

Source: `docs/docs/compliance/subprocessors.md` — current sub-processor list.

---

## Security Standards

### Authentication Methods

| Method | Use Case | Implementation |
|---|---|---|
| **JWT (access token)** | Management API, Flag Engine | 1-hour TTL, refresh token rotation (7 days), server-side revocation via `jti` claim |
| **API key** | Server SDKs, Evaluation API | SHA-256 hashed; raw key shown once at creation; revocable |
| **SSO (SAML 2.0)** | Enterprise identity provider | Okta, Azure AD, OneLogin, etc. |
| **SSO (OIDC)** | Enterprise identity provider | Any OIDC-compliant IdP |
| **MFA (TOTP)** | Second factor authentication | RFC 6238 TOTP, Google Authenticator / Authy compatible |

### Authorization (RBAC)

Four built-in roles. Permissions escalate from Viewer → Developer → Admin → Owner:

| Permission | Viewer | Developer | Admin | Owner |
|---|---|---|---|---|
| Read flags, projects, segments | Yes | Yes | Yes | Yes |
| Create / edit flags | No | Yes | Yes | Yes |
| Toggle flags (production) | No | Per-environment | Yes | Yes |
| Manage team members | No | No | Yes | Yes |
| Billing, API keys, SSO | No | No | No | Yes |

**Per-environment permissions:** Granular `can_toggle` and `can_edit_rules` controls allow restricting flag changes to specific environments.

### API Key Hashing

- API keys stored as SHA-256 one-way hashes in the database
- Raw key shown **once** at creation time; never accessible again
- Server-side revocation invalidates keys immediately
- Key format: `fs_sk_{base64url(payload)}.{HMAC-SHA256 signature}` (used for cell routing)

### CORS Configuration

Strict origin allowlist enforced at the middleware level:

```go
var allowedOrigins = map[string]bool{
    "https://app.featuresignals.com":  true,
    "https://featuresignals.com":      true,
    "https://docs.featuresignals.com": true,
    "http://localhost:3000":           true,
    "http://localhost:3001":           true,
    "http://127.0.0.1:3000":          true,
}
```

No wildcard origins in production. Source: `ARCHITECTURE_IMPLEMENTATION.md` — CORS section.

### Rate Limiting

| Endpoint Type | Limit | Middleware |
|---|---|---|
| Authentication (login, register) | 20 requests / minute | `middleware.RateLimit` |
| Management API (mutations) | 100 requests / minute | `middleware.RateLimit` |
| Evaluation API | 1,000 requests / minute | `middleware.RateLimit` |

Rate limits are applied at two layers: the global router (edge-level, per-IP sliding window with path awareness — static assets bypass limits) and the API server (application-level, per-route control). The global router handles first-pass filtering; application-level limits provide finer-grained enforcement.

### Input Validation

- `DisallowUnknownFields()` on all JSON decoders — prevents mass-assignment attacks
- Request body size limited to **1 MB** via `middleware.MaxBodySize`
- SQL queries use **parameterized statements** exclusively — never interpolate user input
- User endpoints validated against defined schemas before reaching store layer

### Security Headers

Every HTTP response includes:

| Header | Value |
|---|---|
| `Content-Security-Policy` | Tightly scoped per resource |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Restricted camera, microphone, geolocation, payment |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Cross-Origin-Embedder-Policy` | `require-corp` |

Source: `docs/docs/compliance/security-overview.md` — security headers section, confirmed in `ARCHITECTURE_IMPLEMENTATION.md`.

---

## Compliance Frameworks

### SOC 2

**Status:** Controls mapping complete. Formal Type II audit is **planned, not achieved.**

The SOC 2 controls matrix maps all five Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy) to FeatureSignals' technical controls. Evidence collection is automated through CI/CD pipeline logs, audit log exports, and vulnerability scanning reports.

| TSC Category | Coverage |
|---|---|
| CC1 — Control Environment | Code of conduct, RBAC, security training |
| CC2 — Communication | Structured logging, privacy policy, DPA |
| CC3 — Risk Assessment | Risk register, vulnerability scanning, change impact |
| CC5 — Control Activities | CI/CD pipeline, Infrastructure as Code |
| CC6 — Logical & Physical Access | JWT, API keys, MFA, SSO, IP allowlisting, TLS 1.3, AES-256 |
| CC7 — System Operations | Monitoring, anomaly detection, incident response |
| CC8 — Change Management | Git-based workflow, PR reviews, staging environment |
| CC9 — Risk Mitigation | Circuit breakers, graceful degradation, vendor management |

**Roadmap:**
1. ✅ Controls documented and implemented
2. ✅ Evidence collection automated (audit logs, scan reports, CI records)
3. 🔄 Gap assessment and remediation (in progress)
4. ⏳ Observation period (minimum 3–6 months)
5. ⏳ Auditor engagement and Type II examination

Sources: `docs/docs/compliance/soc2/controls-matrix.md`, `docs/docs/compliance/soc2/evidence-collection.md`, `docs/docs/compliance/soc2/incident-response.md`.

---

### ISO 27001

**Status:** Information Security Management System (ISMS) documented. **Not certified.**

| ISMS Element | Status |
|---|---|
| Information security policy | Implemented and documented |
| Risk assessment framework | 5×5 matrix (Likelihood × Impact), risk register maintained |
| Statement of Applicability (Annex A) | 25+ controls mapped across A.5–A.8 |
| Roles and responsibilities | Security Lead, Engineering Lead, Operations Lead |
| Internal audit process | Defined; quarterly management reviews |
| Continual improvement | Annual risk review, policy review, security training |

**Annex A coverage highlights:**
- **A.5 (Organizational):** Policies, segregation of duties (RBAC), threat intelligence (CVE monitoring)
- **A.6 (People):** Screening, security awareness, termination procedures
- **A.7 (Physical):** Shared responsibility model with cloud provider
- **A.8 (Technological):** Privileged access, secure authentication, malware protection, vulnerability management, cryptography, secure development

**Risk register summary (top risks):**

| Risk | L | I | Score | Mitigation |
|---|---|---|---|---|
| Unauthorized access to customer data | 2 | 5 | 10 | RBAC, MFA, audit logging |
| Dependency vulnerability | 3 | 3 | 9 | Automated scanning, patching |
| DDoS attack | 3 | 3 | 9 | Rate limiting, CDN, cloud scaling |
| License key compromise | 2 | 3 | 6 | Key rotation, monitoring |

**Roadmap:**
1. ✅ ISMS documentation
2. ✅ Annex A controls mapped
3. 🔄 Continued control maturation
4. ⏳ Stage 1 audit (document review) — sequenced after SOC 2 Type II

Source: `docs/docs/compliance/iso27001/isms-overview.md`.

---

### ISO 27701

**Status:** Privacy Information Management System (PIMS) mapped as ISO 27001 extension. **Not certified.**

ISO 27701 extends ISO 27001 with privacy-specific controls. FeatureSignals operates as both:

- **PII Controller** — for customer account data (name, email, billing)
- **PII Processor** — for evaluation context data (passed by customers, processed in-memory only)

**Key controls implemented:**

| ISO 27701 Clause | Implementation |
|---|---|
| 7.2.5 — Privacy impact assessment | Completed for evaluation engine, audit system, SSO |
| 7.3.6 — Access to PII | Data export API (`GET /v1/users/me/data`) |
| 7.3.9 — De-identification and deletion | Account deletion with anonymized audit logs |
| 7.4.5 — End-of-processing deletion | Data retention policy with automated purge |
| 7.5.1 — International transfer | SCCs (not DPF-certified; see DPF section) |
| 8.5.1 — Breach notification | 72-hour notification commitment in DPA |

**ROPA (Record of Processing Activities):**

| Activity | Data Categories | Retention | Legal Basis |
|---|---|---|---|
| Account management | Name, email | Account lifetime + 30 days | Contract |
| Authentication | Email, password hash, MFA seed | Account lifetime | Contract |
| Billing | Billing contact, plan | 7 years (tax) | Contract |
| Audit logging | User ID, IP, action | See retention above | Legitimate interest |
| Flag evaluation | Targeting attributes | Not stored (in-memory) | Contract (processor) |

**Gap:** ISO 27701 certification is gated behind ISO 27001 certification.

Source: `docs/docs/compliance/iso27701/pims-overview.md`.

---

### GDPR

**Status:** Compliance practices implemented. Data subject rights are operational.

FeatureSignals acts as a **data controller** for customer account data and a **data processor** for evaluation context data.

**Data subject rights (all operational):**

| Right (GDPR Article) | Implementation |
|---|---|
| Right of Access (Art. 15) | `GET /v1/users/me/data` returns JSON export; email to privacy@featuresignals.com |
| Right to Rectification (Art. 16) | UI profile editing; email for non-editable data |
| Right to Erasure (Art. 17) | `DELETE /v1/users/me` with 30-day grace period; audit logs anonymized |
| Right to Data Portability (Art. 20) | Organization data export; email request |
| Right to Restrict Processing (Art. 18) | Contact privacy@featuresignals.com |
| Right to Object (Art. 21) | Contact privacy@featuresignals.com |
| Right to Withdraw Consent (Art. 7) | Unsubscribe link in marketing emails |

**Data Protection Officer:** dpo@featuresignals.com

**International transfers:** EU Standard Contractual Clauses (SCCs) 2021 version included in DPA. FeatureSignals is **not** EU-U.S. DPF certified (see DPF section).

**Breach notification:** Within 72 hours of becoming aware of a personal data breach.

Sources: `docs/docs/compliance/gdpr-rights.md`, `docs/docs/compliance/dpa-template.md`.

---

### CCPA / CPRA

**Status:** Compliance practices implemented for California residents.

FeatureSignals is a **service provider** (processor) under CCPA when handling customer data.

| Right | Implementation |
|---|---|
| Right to Know (§1798.100) | Data export via Flag Engine or privacy@featuresignals.com |
| Right to Delete (§1798.105) | `DELETE /v1/users/me` with 30-day grace period |
| Right to Correct (§1798.106) | Profile editing; email for non-editable data |
| Right to Opt-Out (§1798.120) | FeatureSignals **does not sell or share** personal information |
| Right to Limit Sensitive PI (§1798.121) | Not applicable — FeatureSignals does not collect sensitive PI |
| Right to Non-Discrimination (§1798.125) | Exercising rights will not affect service |

**Categories of personal information collected:**

| Category | Examples |
|---|---|
| Identifiers | Name, email, IP address |
| Commercial | Subscription plan, billing contact |
| Internet activity | API usage, flag evaluations |
| Professional | Organization name, role |

**Response timelines:** 10 business days acknowledgment, 45 calendar days fulfillment (extendable to 90).

Source: `docs/docs/compliance/ccpa-cpra.md`.

---

### HIPAA

**Status:** Technical safeguards mapped. **No formal HIPAA audit performed.** BAA available for Enterprise customers.

FeatureSignals acts as a **Business Associate** when used in connection with PHI-containing systems.

**Business Associate Agreement (BAA):**

| Term | Commitment |
|---|---|
| Permitted uses | Only as necessary to provide the FeatureSignals service |
| Safeguards | Administrative, physical, technical per Security Rule |
| Breach notification | Within 60 days of discovery |
| Subcontractors | Same obligations flow to sub-processors |
| Return / destruction of PHI | Upon agreement termination |
| Audit rights | Customer may audit compliance |

**Technical Safeguards (§164.312):**

| HIPAA Requirement | FeatureSignals Implementation |
|---|---|
| Access control (§164.312(a)) | UUID-based user IDs, RBAC, JWT+MFA, AES-256 + TLS 1.3 |
| Audit controls (§164.312(b)) | Comprehensive audit trail with SHA-256 chain hashing |
| Integrity (§164.312(c)) | Parameterized SQL, transaction isolation, input validation |
| Authentication (§164.312(d)) | Password + TOTP MFA, SSO, account lockout |
| Transmission security (§164.312(e)) | TLS 1.3, HSTS, HTTPS enforced |

**Recommended PHI-safe architecture:**
1. Do not include PHI in evaluation context — use opaque identifiers (user ID, session ID)
2. Deploy on-premises for maximum data control
3. Enable audit logging and MFA
4. Configure IP allowlisting for management API

Source: `docs/docs/compliance/hipaa.md`.

---

### CSA STAR

**Status:** Self-assessment (Level 1) completed. **Level 2 (third-party attestation) not achieved.**

FeatureSignals has mapped controls to the CSA Cloud Controls Matrix (CCM) v4 across 11 domains:

| Domain | Key Controls |
|---|---|
| AIS — Application & Interface Security | Hexagonal architecture, CI/CD security testing, ISP |
| BCR — Business Continuity | DR runbook, quarterly backup restore tests |
| DSP — Data Security & Privacy | Privacy policy, data classification, SCCs, retention policies |
| IAM — Identity & Access Management | RBAC, MFA, SSO, quarterly access reviews |
| IVS — Infrastructure & Virtualization | TLS, firewall rules, separate eval/management APIs |
| LOG — Logging & Monitoring | Structured logging, audit trail, chain hashing |
| SEF — Security Incident Management | Incident response plan, severity-based procedures |
| TVM — Threat & Vulnerability Management | govulncheck, npm audit, Trivy, CVE monitoring |

**Roadmap:**
- Level 1: Self-assessment ✅ (this page)
- Level 2: Third-party audit — planned post-ISO 27001
- Level 3: Continuous monitoring — future

Source: `docs/docs/compliance/csa-star.md`.

---

### EU-U.S. Data Privacy Framework (DPF)

**Status:** FeatureSignals is **not certified or listed** under the EU-U.S. DPF. Transfer safeguards rely on EU Standard Contractual Clauses (SCCs) and self-hosted deployment options.

| Transfer Mechanism | Status |
|---|---|
| EU SCCs (2021) | Included in DPA — Modules 2 and 3 |
| UK IDTA | Available as addendum to SCCs |
| DPF self-certification | **Not claimed** — evaluating participation |
| Self-hosted deployment | Available — eliminates international transfer concerns |

**Transfer Impact Assessment:** Low risk — business contact and authentication data, limited PII, strong safeguards (TLS 1.3, AES-256, access controls, audit logging).

Source: `docs/docs/compliance/data-privacy-framework.md`.

---

### DORA (Digital Operational Resilience Act)

**Status:** FeatureSignals' architecture and operations are designed to support financial entities' DORA compliance as an ICT third-party service provider. **FeatureSignals does not hold a DORA-specific certification.**

**DORA Article mapping:**

| Article | Coverage |
|---|---|
| Art. 5 — ICT Risk Management | Asset inventory, risk register, dependency mapping, vulnerability monitoring |
| Art. 11 — Incident Management | Incident classification (4 severities), response SLAs, notification timelines |
| Art. 12 — Resilience Testing | Vulnerability scanning (per CI run), pen testing (annual), tabletop exercises (semi-annual), backup recovery (quarterly) |
| Art. 28 — Third-Party Risk | Enterprise agreements include service descriptions, data processing locations, encryption standards, audit rights, subcontracting controls, exit strategy |
| Art. 30 — Key Contractual Provisions | Service descriptions, data locations, security provisions, SLA, cooperation, exit and transition |

**Inherent resilience:**

| Capability | Detail |
|---|---|
| Stateless servers | Horizontal scaling, zero-downtime deployments |
| Evaluation cache | Flag evaluation continues during database outages |
| Graceful degradation | Evaluation API unaffected by webhook / metrics failures |
| Self-hosted option | Full control over infrastructure and uptime |
| No vendor lock-in | Open source, OpenFeature compatible, standard SQL |

Source: `docs/docs/compliance/dora.md`.

---

## Privacy

### Privacy Policy

FeatureSignals' privacy policy (published at `featuresignals.com/privacy-policy`) covers:

- **Data collected:** Account data (email, name, password hash), usage data (audit logs, API metadata), evaluation context (customer-controlled, not stored)
- **Legal bases (GDPR):** Contract performance, legitimate interest, consent (opt-in marketing)
- **Data retention:** See retention schedule above
- **Data subject rights:** Operational via API and email (see GDPR and CCPA sections above)
- **International transfers:** SCCs; DPF certification **not claimed**
- **Policy changes:** 30-day notice for material changes

Source: `docs/docs/compliance/privacy-policy.md`.

### Data Processing Agreement (DPA)

A DPA template is available. Key terms:

| Clause | Term |
|---|---|
| Scope | FeatureSignals as processor for account data, audit data, evaluation context |
| Security measures | TLS 1.3, AES-256, bcrypt, SHA-256, RBAC, MFA, SSO, IP allowlisting, rate limiting |
| Sub-processors | Listed in public sub-processor page; 30-day change notification |
| Data subject rights | Self-service API (`GET /v1/users/me/data`, `DELETE /v1/users/me`) |
| Breach notification | Without undue delay, within 72 hours |
| Data deletion | Within 30 days of termination |
| International transfers | EU SCCs (2021), UK IDTA addendum |
| Audit rights | Security documentation access; on-site audit with 30-day notice (Enterprise) |

Source: `docs/docs/compliance/dpa-template.md`.

### Data Subject Rights

Data subjects can exercise their rights through:

| Method | Available for |
|---|---|
| `GET /v1/users/me/data` | Right of Access (GDPR), Right to Know (CCPA) — instant |
| `DELETE /v1/users/me` | Right to Erasure (GDPR), Right to Delete (CCPA) — 30-day grace period |
| Flag Engine settings | Right to Rectification (GDPR), Right to Correct (CCPA) |
| `privacy@featuresignals.com` | All rights — response within 30 days (GDPR) or 45 days (CCPA) |
| `dpo@featuresignals.com` | DPO contact for GDPR inquiries |

Data requests are verified through email confirmation and account authentication.

### Sub-processors

See [Sub-processors](#sub-processors) in Data Protection section above. Full list maintained at `docs/docs/compliance/subprocessors.md`.

---

## Security Architecture — Four-Layer Defense

FeatureSignals implements a **four-layer defense-in-depth** model. Each layer validates independently — no trust is placed between layers. Cloudflare is used for DNS only (no edge proxying, no WAF, no CDN). All edge security is handled by the global router on the K3s node.

```
 Layer 1:  Global Router (TLS, WAF, rate limiting, security headers — hostNetwork on K3s node)
 Layer 2:  API Server (auth, validation, rate limiting, RBAC)
 Layer 3:  Cell/Cluster Internal (k3s cluster isolation, firewall, secrets)
 Layer 4:  CI/CD Pipeline (build → scan → deploy)
```

### Layer 1: Global Router (hostNetwork)

The global router runs with `hostNetwork: true` on the K3s node, binding directly to ports 80 and 443. It handles all edge security:

| Control | Detail |
|---|---|
| TLS termination | Let's Encrypt via autocert (built into Go global router). TLS 1.2+ with modern cipher suites. |
| WAF | Built-in regex patterns for SQLi, XSS, path traversal, directory traversal. Blocks matching requests before they reach upstream services. |
| Rate limiting | Per-IP sliding window. Static assets bypass rate limits. API routes: 20/min auth, 100/min mutations, 1000/min eval. |
| Security headers | HSTS (max-age=31536000, includeSubDomains), CSP, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy. |
| Connection limiting | Max 100 concurrent connections per IP. |
| Host-based routing | Routes by domain: api.* → Go server (8080), app.* → Next.js (3000), signoz.* → SigNoz UI (3301), * → static files. |
| Health monitoring | `/ops/health` endpoint with upstream service health checks. |

> **Migration note (April 2026):** Cloudflare edge services (WAF, DDoS, bot management, CDN) have been removed. Cloudflare is DNS-only. The global router handles all edge security. This simplifies the architecture and eliminates Cloudflare as a dependency for production traffic.

### Layer 2: API Server

| Control | Detail |
|---|---|
| JWT auth | 1-hour TTL access token + 7-day refresh token rotation |
| API key auth | SHA-256 hashed; raw key shown once at creation |
| RBAC | Owner, admin, developer, viewer — enforced per-route via `middleware.RequireRole` |
| Input validation | `DisallowUnknownFields()` on JSON decoders — blocks mass-assignment |
| Body size limit | 1 MB max via `middleware.MaxBodySize` |
| Rate limiting | Per-route: 20/min auth, 100/min mutations, 1000/min eval |
| CORS | Strict origin allowlist — no wildcards |
| Tenant isolation | All queries scoped by `org_id`; cross-tenant access returns 404 |
| Audit logging | All mutating operations logged with user, action, target, IP |
| Log scrubbing | Middleware redacts `password`, `token`, `secret`, `key` from logs |

### Layer 3: Cluster Internal (k3s)

| Control | Detail |
|---|---|
| Network isolation | No public ports except SSH (ops-team only); app ports are ClusterIP |
| SSH access | Key-based only; root login via SSH key; passwords disabled |
| Firewall | Allow SSH from ops-team IPs; allow internal traffic; deny everything else |
| iptables | DROP default policy; allow loopback, established connections, k3s networks |
| PostgreSQL | Listen on ClusterIP only; strong password; no default users |
| k3s hardening | `--disable-cloud-controller`, `--kubelet-arg=protect-kernel-defaults=true` |
| Secrets | k3s Secrets mounted as files (not env vars) |
| Rate-limited SSH | iptables: 4 new SSH connections per 60 seconds per IP |

### Layer 4: CI/CD Pipeline

| Control | Detail |
|---|---|
| Selective builds | Only build containers whose source files changed |
| Trivy scanning | Critical/high CVEs → fail the build |
| Dependency scanning | `govulncheck` (Go), `npm audit` (JS) — fail on critical vulns |
| Secret scanning | `trufflehog` / `git secrets` — fail if secrets detected |
| Supply chain | Base images pinned by digest, not tag |
| SBOM generation | SPDX SBOM per image, attached to GitHub release |

Source: `ARCHITECTURE_IMPLEMENTATION.md` — Security Architecture section; `product/wiki/public/ARCHITECTURE.md` — Security Architecture section.

---

## Cross-References

- [[Architecture]] — 4-layer defense with full implementation detail in the Security Architecture section; global router edge security; CORS middleware configuration
- [[Deployment]] — network isolation, Hetzner firewall rules, k3s hardening flags, CI/CD pipeline security controls (Trivy, secret scanning, SBOM)
- [[Development]] — coding standards for error handling (sentinel errors), store patterns (parameterized queries), handler guidelines (input validation, body limits)

### Related Compliance Documents (not wiki pages)

- `docs/docs/compliance/subprocessors.md` — living sub-processor list
- `docs/docs/compliance/dpa-template.md` — DPA template for execution
- `server/internal/domain/compliance.go` — domain model for LLM compliance modes (`disabled`, `approved`, `byo`, `strict`), approved providers, redaction rules, and audit records
- `server/internal/domain/compliance_errors.go` — sentinel errors: `ErrLLMDisabled`, `ErrNoApprovedProvider`, `ErrDataRegionMismatch`, `ErrBudgetExceeded`, `ErrContentTooLarge`, `ErrProviderUnreachable`

---

## Sources

- `docs/docs/compliance/security-overview.md` — encryption, authentication, authorization, rate limiting, security headers, vulnerability management, incident response
- `docs/docs/compliance/soc2/controls-matrix.md` — SOC 2 Trust Service Criteria to control mapping (CC1–CC9)
- `docs/docs/compliance/soc2/evidence-collection.md` — continuous evidence sources, collection schedule, audit readiness checklist
- `docs/docs/compliance/soc2/incident-response.md` — incident response plan with 5 phases, severity definitions, communication protocol, evidence preservation
- `docs/docs/compliance/iso27001/isms-overview.md` — ISMS scope, risk assessment framework (5×5 matrix), Annex A Statement of Applicability, certification roadmap
- `docs/docs/compliance/iso27701/pims-overview.md` — PIMS scope (controller + processor), Clause 7/8 control mapping, ROPA, gap analysis
- `docs/docs/compliance/gdpr-rights.md` — 7 data subject rights with API endpoints and response timelines
- `docs/docs/compliance/ccpa-cpra.md` — CCPA/CPRA rights, data categories, verification process, response timelines
- `docs/docs/compliance/hipaa.md` — HIPAA technical/administrative/physical safeguards, BAA terms, recommended architecture
- `docs/docs/compliance/csa-star.md` — CCM v4 mapping across 11 domains, self-assessment status, Level 2/3 roadmap
- `docs/docs/compliance/data-privacy-framework.md` — DPF status (not certified), SCCs as primary mechanism, transfer impact assessment
- `docs/docs/compliance/dora.md` — DORA Article 5/11/12/28/30 mapping, resilience capabilities
- `docs/docs/compliance/data-retention.md` — retention schedules by data type and plan tier, automated purge, account deletion flow
- `docs/docs/compliance/privacy-policy.md` — full privacy policy: data collected, legal bases, retention, rights, international transfers
- `docs/docs/compliance/subprocessors.md` — current sub-processor list with purpose, data processed, and location
- `docs/docs/compliance/dpa-template.md` — DPA template with 10 clauses: scope, security measures, sub-processors, breach notification, deletion, international transfers, audit rights
- `server/internal/domain/compliance.go` — domain types: `LLMComplianceMode`, `ApprovedLLMProvider`, `RedactionRule`, `LLMInteractionRecord`, `LLMCompliancePolicy`
- `server/internal/domain/compliance_errors.go` — sentinel errors for LLM compliance enforcement
- `CLAUDE.md` — security standards (Sections 7.1–7.3): authentication, authorization, data protection, operational security
- `ARCHITECTURE_IMPLEMENTATION.md` — 4-layer defense-in-depth security architecture with implementation details for each layer