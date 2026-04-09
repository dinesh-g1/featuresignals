---
sidebar_position: 4
title: Multi-Region Architecture
description: "How FeatureSignals routes traffic across geographic regions with GeoDNS, per-region stacks, and Caddy edge proxies."
---

# Multi-Region Architecture

FeatureSignals runs independent stacks in each data region (India, US, EU). Each region has its own PostgreSQL database, Go API server, Next.js dashboard, and Caddy edge proxy. Traffic is steered to the nearest region using Cloudflare GeoDNS (proximity-based load balancing), eliminating cross-region proxy hops and providing sub-10ms DNS resolution worldwide.

## Architecture Diagram

```
                          ┌──────────────────────────────────────┐
                          │       Cloudflare GeoDNS              │
                          │  api.featuresignals.com              │
                          │  app.featuresignals.com              │
                          │  (proximity / latency steering)      │
                          └──────┬──────────┬──────────┬─────────┘
                                 │          │          │
                  nearest=IN     │          │          │  nearest=EU
                 ┌───────────────┘          │          └──────────────────┐
                 │                nearest=US│                             │
                 ▼                          ▼                             ▼
  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
  │    India Region       │  │    US Region          │  │    EU Region          │
  │                       │  │                       │  │                       │
  │  ┌─────────────────┐  │  │  ┌─────────────────┐  │  │  ┌─────────────────┐  │
  │  │  Caddy (edge)    │  │  │  │  Caddy (edge)    │  │  │  │  Caddy (edge)    │  │
  │  │  CORS, TLS,      │  │  │  │  CORS, TLS,      │  │  │  │  CORS, TLS,      │  │
  │  │  security headers,│  │  │  │  security headers,│  │  │  │  security headers,│  │
  │  │  rate limiting    │  │  │  │  rate limiting    │  │  │  │  rate limiting    │  │
  │  └────────┬──────────┘  │  │  └────────┬──────────┘  │  │  └────────┬──────────┘  │
  │           │              │  │           │              │  │           │              │
  │  ┌────────▼──────────┐  │  │  ┌────────▼──────────┐  │  │  ┌────────▼──────────┐  │
  │  │  Go API Server    │  │  │  │  Go API Server    │  │  │  │  Go API Server    │  │
  │  │  (business logic) │  │  │  │  (business logic) │  │  │  │  (business logic) │  │
  │  └────────┬──────────┘  │  │  └────────┬──────────┘  │  │  └────────┬──────────┘  │
  │           │              │  │           │              │  │           │              │
  │  ┌────────▼──────────┐  │  │  ┌────────▼──────────┐  │  │  ┌────────▼──────────┐  │
  │  │  PostgreSQL 16    │  │  │  │  PostgreSQL 16    │  │  │  │  PostgreSQL 16    │  │
  │  └───────────────────┘  │  │  └───────────────────┘  │  │  └───────────────────┘  │
  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

## Design Principles

### Each Region is Self-Contained

Every region runs a complete, independent stack. The Go server has zero knowledge of other regions — no proxy code, no cross-region HTTP calls, no shared state. This means:

- **No single point of failure.** If India goes down, US and EU continue serving.
- **No proxy latency.** A US user's API call never touches an India server.
- **Simpler code.** The server handles only local requests, with no routing/proxying logic.

### Caddy Handles Edge Concerns

Security headers, CORS, TLS termination, and IP-based rate limiting live in Caddy — not in Go application code. The Go server focuses purely on business logic. This follows the standard cloud-native pattern of separating edge concerns from application concerns.

### GeoDNS Steers Traffic

Cloudflare Load Balancing with proximity steering resolves `api.featuresignals.com` and `app.featuresignals.com` to the nearest healthy region. Health checks on `/health` automatically fail over to the next-nearest region if one goes down.

SDKs can also use direct regional URLs (`api.us.featuresignals.com`) for deterministic routing to a specific region.

## Traffic Flow

### Dashboard (Management API)

1. User visits `app.featuresignals.com`
2. Cloudflare GeoDNS resolves to the nearest regional Caddy
3. Caddy serves the Next.js dashboard (pre-built with the co-located API URL)
4. Dashboard makes API calls to the co-located `api.featuresignals.com` (same region via GeoDNS)
5. Go server handles the request using its local PostgreSQL

### SDK Evaluation (Hot Path)

1. SDK is configured with `api.us.featuresignals.com` (region-specific) or `api.featuresignals.com` (GeoDNS)
2. Request hits the regional Caddy directly
3. Go server evaluates flags from the in-memory cache (no DB call on the hot path)
4. Response returned in < 1ms (p99, excluding network)

### Signup (Cross-Region)

1. User visits `app.featuresignals.com/register` (lands on nearest region)
2. User selects their preferred data region (e.g., US)
3. If the selected region differs from the current one, the browser redirects to `app.us.featuresignals.com/register`
4. Signup proceeds locally on the target region's stack

## Domain Structure

| Domain | Routing | Purpose |
|--------|---------|---------|
| `api.featuresignals.com` | Cloudflare GeoDNS | Management API + evaluation (nearest region) |
| `app.featuresignals.com` | Cloudflare GeoDNS | Dashboard (nearest region) |
| `api.us.featuresignals.com` | Direct A record | US region API (direct access for SDKs) |
| `api.eu.featuresignals.com` | Direct A record | EU region API (direct access for SDKs) |
| `app.us.featuresignals.com` | Direct A record | US region dashboard |
| `app.eu.featuresignals.com` | Direct A record | EU region dashboard |
| `featuresignals.com` | Cloudflare CDN | Marketing website (static) |
| `docs.featuresignals.com` | Cloudflare CDN | Documentation (static) |

## JWT and Authentication

All regions share the same `JWT_SECRET`. A token issued by any region is valid everywhere. The JWT payload includes a `data_region` claim that records which region holds the user's data — this is used for telemetry and audit logging, not for routing.

## Failure Modes

| Scenario | Behavior |
|----------|----------|
| One region goes down | Cloudflare health check fails; traffic steers to next-nearest region. Users whose data lives in the failed region see login errors until it recovers. |
| Cloudflare outage | Direct regional URLs (`api.us.*`) still work. SDKs using direct URLs are unaffected. |
| Database failure in one region | That region's API returns 503. Caddy health check fails, GeoDNS steers away. Other regions are unaffected. |
