---
sidebar_position: 1
title: Introduction
---

# FeatureSignals Documentation

FeatureSignals is an **open-source feature flag management platform** built for modern engineering teams. Ship features safely with targeted rollouts, A/B experiments, kill switches, and real-time updates — all without vendor lock-in.

## Why FeatureSignals?

- **Self-hosted & free** — Run on your own infrastructure. No per-seat pricing. Apache-2.0 licensed.
- **Real-time updates** — Server-Sent Events push flag changes to SDKs instantly.
- **A/B experimentation** — Built-in variant assignment with consistent hashing and impression tracking.
- **Multi-environment** — Manage dev, staging, and production from a single dashboard.
- **Enterprise-ready** — RBAC, audit logging, approval workflows, webhooks, and mutual exclusion groups.
- **SDKs for every stack** — Go, Node.js, Python, Java, and React with OpenFeature support.
- **Edge-ready** — Relay proxy for low-latency flag evaluation at the edge.

## Quick Links

| What do you want to do? | Go to |
|---|---|
| Get up and running in 5 minutes | [Quickstart](/getting-started/quickstart) |
| Understand the core concepts | [Feature Flags](/core-concepts/feature-flags) |
| Integrate with your application | [SDKs](/sdks/overview) |
| Explore the REST API | [API Reference](/api-reference/overview) |
| Deploy to production | [Self-Hosting](/deployment/self-hosting) |
| Set up A/B experiments | [A/B Experimentation](/core-concepts/ab-experimentation) |

## Architecture at a Glance

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Dashboard   │────▶│   Go API Server  │◀───│  PostgreSQL   │
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

## License

FeatureSignals is licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
