# Security Overview

_Last updated: April 2026_

FeatureSignals is designed as critical infrastructure for your applications. This document provides a comprehensive overview of our security architecture and controls.

## Architecture Security

### Hexagonal Architecture

FeatureSignals uses a hexagonal (ports & adapters) architecture that enforces strict separation of concerns:

- **Domain layer**: Pure business logic with zero infrastructure dependencies
- **Handlers**: HTTP adapter — validates input, delegates to domain
- **Store**: Database adapter — implements persistence contracts
- **Evaluator**: Stateless flag evaluation engine

This architecture prevents common vulnerability classes:
- SQL injection is impossible in domain/handler code (no SQL there)
- Business logic cannot be bypassed via infrastructure shortcuts
- Each layer can be independently tested and audited

### Multi-Tenancy Isolation

| Mechanism | Description |
|-----------|-------------|
| Middleware enforcement | Organization ID extracted from JWT, injected into context, checked on every request |
| Query scoping | All database queries include `org_id` in WHERE clause |
| 404 for cross-org access | Returns "not found" (not "forbidden") to prevent entity existence leakage |

## Authentication & Authorization

### Authentication Methods

| Method | Use Case | Implementation |
|--------|----------|---------------|
| JWT (access token) | Dashboard / Management API | 1-hour TTL, refresh token rotation (7 days) |
| API Key | Server SDKs / Evaluation API | SHA-256 hashed, shown once at creation |
| SSO (SAML 2.0) | Enterprise identity provider | Okta, Azure AD, OneLogin, etc. |
| SSO (OIDC) | Enterprise identity provider | Any OIDC-compliant IdP |
| MFA (TOTP) | Second factor | RFC 6238 TOTP, compatible with Google Authenticator, Authy |

### Authorization Model

Four built-in roles with escalating privileges:

| Permission | Viewer | Developer | Admin | Owner |
|-----------|--------|-----------|-------|-------|
| Read flags, projects, segments | Yes | Yes | Yes | Yes |
| Create/edit flags | No | Yes | Yes | Yes |
| Toggle flags (production) | No | Per-env | Yes | Yes |
| Manage team members | No | No | Yes | Yes |
| Billing, API keys, SSO | No | No | No | Yes |

Per-environment permissions allow granular control:
- `can_toggle`: Allow/deny flag state changes in specific environments
- `can_edit_rules`: Allow/deny targeting rule modifications in specific environments

## Data Protection

### Encryption

| Layer | Standard |
|-------|----------|
| In transit | TLS 1.3 (minimum TLS 1.2) |
| At rest | AES-256 (database, backups) |
| Passwords | bcrypt (cost factor 12) |
| API keys | SHA-256 one-way hash |
| Audit integrity | SHA-256 chain hashing |

### Input Validation

- All JSON decoders use `DisallowUnknownFields()` to prevent mass-assignment
- Request body limited to 1 MB
- SQL queries use parameterized statements exclusively
- User input never interpolated into queries

### Security Headers

All responses include:
- `Content-Security-Policy`
- `Strict-Transport-Security` (HSTS, max-age 1 year, includeSubDomains)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (restricted camera, microphone, geolocation, payment)
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

### Token Revocation

Server-side token revocation ensures that logged-out sessions are immediately invalidated:
- Every JWT includes a unique `jti` (JWT ID) claim
- On logout, the `jti` is added to a revocation store
- Every authenticated request checks the revocation store
- Expired revocation entries are cleaned up hourly by the scheduler

## Network Security

### Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication (login, register) | 20 requests/minute |
| Management API | 100 requests/minute |
| Evaluation API | 1,000 requests/minute |

### IP Allowlisting (Enterprise)

Restrict management API access to specific IP ranges (CIDR notation). The evaluation API is not restricted to ensure SDK connectivity.

## Audit & Monitoring

### Audit Trail

Every mutating operation is recorded with:
- Timestamp (UTC, RFC 3339)
- Actor identity (user ID, email)
- Action name and resource type/ID
- Before/after state for modifications
- Client IP address and user agent
- SHA-256 integrity hash (chain-linked to previous entry)

Audit logs are exportable in JSON and CSV formats.

### Structured Logging

- JSON-formatted logs to stdout (12-factor compliant)
- Request ID correlation across all log entries
- Organization/tenant scoping on all log entries
- No secrets, tokens, or PII in log output

## Vulnerability Management

### Automated Scanning

| Tool | Target | Frequency |
|------|--------|-----------|
| `govulncheck` | Go dependencies | Every CI run |
| `npm audit` | Node.js dependencies | Every CI run |
| Trivy | Container images | Every build |

### Dependency Management

- Explicit dependency declaration (`go.mod`, `package.json`)
- Automated vulnerability scanning in CI pipeline
- No transitive dependency with known critical CVEs

## Incident Response

We maintain a documented incident response plan with:
- Defined severity levels (Sev 1–4)
- Response time SLAs per severity
- Escalation procedures
- Customer notification timelines
- Post-mortem process

Full incident response plan available under NDA for Enterprise customers.

## Self-Hosted Security

For organizations requiring complete data sovereignty:

- Deploy on your own infrastructure (Docker, Kubernetes, bare metal)
- No data ever leaves your network
- Full control over encryption keys, backup procedures, network policies
- Same security features as cloud-hosted version

## Responsible Disclosure

Report vulnerabilities to [security@featuresignals.com](mailto:security@featuresignals.com). We respond within 48 hours and coordinate disclosure timelines with reporters.
