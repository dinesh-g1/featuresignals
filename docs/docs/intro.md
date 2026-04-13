---
sidebar_position: 1
title: Introduction
description: "FeatureSignals documentation — AI-powered feature flag management with targeted rollouts, A/B experiments, and real-time updates."
---

# FeatureSignals Documentation

FeatureSignals is an **open-source, AI-powered feature flag management platform** built for modern engineering teams. Ship features safely with targeted rollouts, run data-driven A/B experiments, clean stale flags automatically with AI, and recover from incidents in seconds — all without vendor lock-in or surprise bills.

## Why FeatureSignals?

- **AI-Powered Lifecycle Management** — AI scans your codebase, identifies stale flags, analyzes usage patterns, and generates cleanup pull requests. Human reviews, AI does the grunt work.
- **Self-hosted & free** — Run on your own infrastructure. No per-seat pricing. Apache-2.0 licensed.
- **Real-time updates** — Server-Sent Events push flag changes to SDKs instantly.
- **A/B experimentation** — Built-in variant assignment with consistent hashing and impression tracking.
- **Toggle categories** — Classify flags as release, experiment, ops, or permission for lifecycle-aware management.
- **Multi-environment** — Manage dev, staging, and production from a single Flag Engine.
- **Enterprise-ready** — RBAC, audit logging, approval workflows, SSO (SAML/OIDC), SCIM, IP allowlists.
- **Compliance-first** — SOC 2 controls, GDPR, HIPAA, ISO 27001, CCPA/CPRA, DORA, and CSA STAR readiness.
- **SDKs for every stack** — Go, Node.js, Python, Java, .NET, Ruby, React, and Vue with OpenFeature support.
- **Edge-ready** — Relay proxy for low-latency flag evaluation at the edge.

## Quick Links

| What do you want to do? | Go to |
|---|---|
| Get up and running in 5 minutes | [Quickstart](/getting-started/quickstart) |
| Understand the core concepts | [Feature Flags](/core-concepts/feature-flags) |
| Learn about AI capabilities | [AI Flag Cleanup](https://featuresignals.com/features/ai) |
| Integrate with your application | [SDKs](/sdks/overview) |
| Explore the REST API | [API Reference](/api-reference/overview) |
| Deploy to production | [Self-Hosting](/deployment/self-hosting) |
| Set up A/B experiments | [A/B Experimentation](/core-concepts/ab-experimentation) |
| Review security & compliance | [Security Overview](/compliance/security-overview) |
| See how we compare | [vs LaunchDarkly](https://featuresignals.com/pricing#comparison) |

## Architecture at a Glance

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Flag Engine  │────▶│   Go API Server  │◀───│  PostgreSQL   │
│  (Next.js)   │     │   (chi router)   │     │  (data store) │
└─────────────┘     └────────┬────────┘     └──────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         ┌────▼───┐   ┌─────▼────┐   ┌────▼────┐
         │  SDKs   │   │  Relay    │   │  SSE     │
         │Go/Node/ │   │  Proxy    │   │ Stream   │
         │Py/Java/ │   │  (edge)   │   │(real-time)│
         │React    │   └──────────┘   └─────────┘
         └─────────┘
```

## AI Strategy

FeatureSignals uses AI **where it solves real problems** — not as a gimmick:

1. **AI Flag Cleanup** (Critical) — Scan codebase, identify stale flags, analyze usage, generate cleanup PR. Human reviews and approves.
2. **AI Anomaly Detection** (High) — Monitor evaluation patterns, detect anomalies, alert with root cause analysis. Human investigates.
3. **AI Incident Response** (High) — Correlate changes with errors, suggest rollback. Human approves.

**Human-in-the-loop for AI**: AI suggests, human approves. Never autonomous production changes.

## License

FeatureSignals is licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
