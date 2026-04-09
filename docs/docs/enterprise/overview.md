---
sidebar_position: 1
title: Enterprise Overview
description: "Enterprise features in FeatureSignals including SSO, SCIM, IP allowlists, custom roles, and dedicated support."
---

# FeatureSignals for Enterprise

FeatureSignals is built to scale with your organization — from a single team to hundreds of developers across multiple regions. This section covers enterprise-specific features, deployment options, and compliance capabilities.

## Enterprise Features

| Feature | Description |
|---------|-------------|
| **SSO / SAML** | Integrate with Okta, Azure AD, Google Workspace, or any SAML 2.0 provider |
| **RBAC** | Owner, admin, developer, viewer roles with per-environment permissions |
| **Custom Roles** | Define granular permissions beyond the built-in role set |
| **Approval Workflows** | Require peer review before production flag changes |
| **Audit Logging** | Tamper-evident logs with before/after diffs for compliance |
| **IP Allowlisting** | Restrict management API access to specific CIDR ranges |
| **MFA** | TOTP-based multi-factor authentication |
| **Data Regions** | Choose US, EU, or IN data residency |
| **Self-Hosted** | Deploy on your own infrastructure with full control |

## Deployment Options

### Cloud (Managed)
FeatureSignals manages infrastructure, scaling, backups, and updates. Available in US, EU, and IN regions. [Contact sales →](https://featuresignals.com/contact)

### Self-Hosted
Run FeatureSignals on your own infrastructure using Docker, Kubernetes, or bare metal. Ideal for regulated industries (healthcare, finance, government) where data must stay within your perimeter.

- **Docker Compose** — Single-command setup for small teams
- **Kubernetes / Helm** — Production-grade deployment with horizontal scaling
- **On-Premises** — Air-gapped environments supported

See the [self-hosting guide](/deployment/self-hosting) for detailed instructions.

### Hybrid
Use FeatureSignals Cloud for management while running a [relay proxy](/advanced/relay-proxy) at the edge within your network. Flag data stays in your infrastructure; only configuration changes sync from the cloud.

## Compliance

FeatureSignals is built with compliance-minded controls and documentation. **We do not currently hold SOC 2, ISO 27001, ISO 27701, CSA STAR, or similar third-party certifications**; where we reference those frameworks, we describe how our controls map to them or our **roadmap** toward formal assessments—not completed attestations.

- **SOC 2 Type II** — Controls mapped to the Trust Services Criteria; a formal Type II examination is **on our roadmap**
- **GDPR** — Data processing agreements, right to erasure, data portability, and related processes (see compliance docs)
- **HIPAA** — Technical controls that map to HIPAA requirements; a BAA may be available for qualified Enterprise use cases—see [HIPAA compliance](/compliance/hipaa) (we have not undergone a formal HIPAA audit)
- **ISO 27001** — Security practices aligned with ISO/IEC 27001 themes; **certification is planned**, not completed
- **DORA** — Documentation for financial entities using ICT third-party services (see [DORA](/compliance/dora))

See the [compliance documentation](/compliance/security-overview) for details, including our subprocessor list, DPA template, and evidence collection guides.

## Getting Started

1. [Contact sales](https://featuresignals.com/contact) to discuss your requirements
2. Start a proof-of-concept with our [quickstart guide](/getting-started/quickstart)
3. Review the [architecture overview](/architecture/overview) for integration planning
4. Set up [SSO](/api-reference/sso) and [RBAC](/advanced/rbac) for your team
