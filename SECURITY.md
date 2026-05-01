# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | ✅ Full support    |
| < 1.0   | ❌ Not supported   |

## Reporting a Vulnerability

**DO NOT CREATE A PUBLIC ISSUE.**

Please report security vulnerabilities privately to:

📧 **security@featuresignals.com**

We aim to:
- Acknowledge your report within **48 hours**
- Provide an initial assessment within **5 business days**
- Release a fix for critical vulnerabilities within **7 days**

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Any proof-of-concept code (if available)
- Whether you'd like public attribution

### Our Commitment

1. We will not pursue legal action against researchers who follow this policy
2. We will credit you in the release notes (unless you prefer anonymity)
3. We will keep you informed of our progress
4. We will provide a CVE if warranted

## Security Best Practices for Deploying FeatureSignals

### Configuration

- **Never commit `.env` files.** Use `.env.example` as documentation only.
- **Rotate all default secrets.** Change `JWT_SECRET`, `ENCRYPTION_MASTER_KEY`, and database passwords.
- **Use GitHub Secrets** or your CI/CD platform's secret management for all production credentials.
- **Validate your config:** The server's `config.Validate()` method detects placeholder secrets and unsafe defaults.

### Network

- Use HTTPS for all connections
- Place FeatureSignals behind a reverse proxy (nginx, Caddy) or load balancer
- Configure CORS to specific origins — never use wildcards in production
- Restrict outbound traffic from server pods to only required services (ZeptoMail API, Stripe API, etc.)

### Authentication

- Enable MFA for all admin accounts
- Rotate API keys regularly
- Use short-lived JWT tokens (default: 60 minutes)
- Store refresh tokens securely

## Security Architecture

FeatureSignals follows defense-in-depth principles:

| Layer | Mechanism |
|-------|-----------|
| **Pre-commit** | gitleaks secret scanning, go vet, tsc |
| **CI/CD** | govulncheck, npm audit, CodeQL SAST, Trivy container scanning |
| **Runtime** | JWT auth, RBAC, rate limiting, tenant isolation |
| **Infrastructure** | Kubernetes secrets, egress filtering, WAF |
| **Monitoring** | Email send anomaly detection, audit logging, OTEL traces |

## Past Incidents

We maintain transparency about security incidents. See our [Incident Response documentation](https://docs.featuresignals.com/compliance/security-overview/).

## Bug Bounty

At this time, we do not offer a paid bug bounty program. We deeply appreciate responsible disclosure and will publicly acknowledge researchers who report valid vulnerabilities.
