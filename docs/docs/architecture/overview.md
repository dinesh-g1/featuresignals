---
sidebar_position: 1
title: Architecture Overview
---

# Architecture Overview

FeatureSignals is built as a modular, self-hosted platform with a clear separation between the API server, Flag Engine (dashboard), SDKs, and relay proxy.

## System Architecture

```
                         ┌──────────────────────────────────┐
                         │          Flag Engine               │
                         │         (Next.js, port 3000)      │
                         └──────────────┬───────────────────┘
                                        │ REST API (JWT auth)
                                        ▼
┌──────────┐  REST/SSE   ┌──────────────────────────────────┐  SQL    ┌──────────────┐
│   SDKs    │ ──────────▶│         API Server                │◀──────▶│  PostgreSQL   │
│Go/Node/  │  (API key)  │   (Go, chi, port 8080)           │        │  (port 5432)  │
│Py/Java/  │             │                                    │        └───────┬──────┘
│React     │             │  ┌────────┐ ┌──────┐ ┌─────────┐ │                │
└──────────┘             │  │Eval    │ │Cache │ │SSE      │ │          LISTEN/NOTIFY
                         │  │Engine  │ │(mem) │ │Server   │ │          (invalidation)
┌──────────┐  REST       │  └────────┘ └──────┘ └─────────┘ │
│  Relay    │ ──────────▶│  ┌────────┐ ┌──────┐ ┌─────────┐ │
│  Proxy    │  (API key)  │  │Webhook │ │Sched │ │Metrics  │ │
│(port 8090)│             │  │Dispatch│ │uler  │ │Collector│ │
└──────────┘             │  └────────┘ └──────┘ └─────────┘ │
                         └──────────────────────────────────┘
```

## Components

### API Server (Go)

The core server built with Go and the chi router. Handles:

- **REST API** — Full CRUD for projects, environments, flags, segments, webhooks, team, and approvals
- **Evaluation Engine** — Stateless flag evaluation with targeting, rollouts, prerequisites, mutual exclusion, and A/B variants
- **In-Memory Cache** — Flag rulesets cached per environment, invalidated via PostgreSQL LISTEN/NOTIFY
- **SSE Server** — Real-time flag update streaming to SDKs
- **Webhook Dispatcher** — Background worker for HTTP event delivery with retries
- **Flag Scheduler** — Background worker for scheduled enable/disable operations
- **Metrics Collector** — In-memory evaluation counters and impression tracking

### Flag Engine (Next.js)

A React/Next.js web application providing a visual interface for all management operations. Uses Zustand for state management.

### PostgreSQL

The single data store for all persistent state:
- Organizations, users, projects, environments
- Flags, flag states, segments
- API keys, webhooks, audit log, approvals
- LISTEN/NOTIFY channels for real-time cache invalidation

### SDKs

Client libraries for Go, Node.js, Python, Java, .NET/C#, Ruby, React, and Vue. All follow the same pattern:
1. Initial flag fetch via HTTP
2. Background sync via polling or SSE
3. Local evaluation from in-memory cache

### Relay Proxy

A stateless Go binary that caches flags from the upstream API and serves them locally. Designed for edge deployment and high availability.

## Data Flow

### Flag Evaluation

```
SDK → (X-API-Key) → API Server
  → Resolve environment from API key
  → Load ruleset from cache (or DB on miss)
  → Evaluate flag(s) against context
  → Return result(s)
```

### Flag Change Propagation

```
Dashboard/API → Update flag in PostgreSQL
  → PostgreSQL NOTIFY on channel
  → Cache listener receives notification
  → Cache evicts stale ruleset
  → SSE server broadcasts flag-update event
  → Webhook dispatcher enqueues event
  → SDKs receive SSE → refetch flags
```

### Scheduled Changes

```
Scheduler (every 30s) → Query pending schedules from DB
  → Apply enable/disable
  → Create audit entry
  → PostgreSQL NOTIFY triggers cache invalidation → SSE
```
