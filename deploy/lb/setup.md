# Global Router & DNS Setup

This document describes the DNS and global router configuration for FeatureSignals.
The global router (`deploy/global-router/`) runs with `hostNetwork: true` on the K3s node
and handles all edge responsibilities: TLS termination, WAF, rate limiting, and
host-based routing to upstream services.

---

## DNS Records

All DNS records are managed at Cloudflare (DNS only — no edge proxying, no CDN).
All records point to the K3s node IP. The global router routes by domain name to the
correct upstream service.

| Record | Type | Value | Proxy | Purpose |
|--------|------|-------|-------|--------|
| `featuresignals.com` | A | `<K3s Node IP>` | DNS only | Marketing website (static files) |
| `www.featuresignals.com` | CNAME | `featuresignals.com` | DNS only | WWW redirect |
| `docs.featuresignals.com` | A | `<K3s Node IP>` | DNS only | Documentation site (static files) |
| `api.featuresignals.com` | A | `<K3s Node IP>` | DNS only | FeatureSignals API (Go server, port 8080) |
| `app.featuresignals.com` | A | `<K3s Node IP>` | DNS only | Dashboard (Next.js SSR, port 3000) |
| `signoz.featuresignals.com` | A | `<K3s Node IP>` | DNS only | SigNoz UI (port 3301) |

**Why DNS-only?** Cloudflare is used exclusively for DNS hosting. All edge security
(TLS, WAF, rate limiting) is handled by the global router on the K3s node. This
simplifies the architecture and eliminates Cloudflare as a traffic dependency.

---

## Global Router

The global router is deployed as a Kubernetes Deployment with `hostNetwork: true`
in the `featuresignals` namespace. It binds directly to ports 80 and 443 on the host.

### Responsibilities

| Function | Detail |
|----------|--------|
| TLS termination | Let's Encrypt via autocert (built into Go router). HTTP-01 challenge on port 80 |
| WAF | Built-in regex patterns for SQLi, XSS, path traversal |
| Rate limiting | Per-IP sliding window. Static assets bypass limits |
| Security headers | HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Host-based routing | Routes by domain to upstream services |
| Health check | `/ops/health` returns JSON with upstream status |

### Upstream Routing

| Domain | Upstream Service | Port |
|--------|-----------------|------|
| `featuresignals.com` | Static file server | Built-in |
| `docs.featuresignals.com` | Static file server | Built-in |
| `api.featuresignals.com` | Go API server | 8080 |
| `app.featuresignals.com` | Next.js dashboard | 3000 |
| `signoz.featuresignals.com` | SigNoz frontend | 3301 |

### Bootstrap & Deploy

```bash
# The global router is deployed as part of the main app deployment:
./deploy/k3s/deploy-app.sh
```

See `deploy/k3s/global-router.yaml` for the Deployment manifest.

---

## TLS / Certificates

| Aspect | Detail |
|--------|--------|
| Provider | Let's Encrypt |
| Mechanism | autocert — built into the Go global router (`golang.org/x/crypto/acme/autocert`) |
| Challenge type | HTTP-01 (port 80) |
| Cache | Persistent volume `/mnt/data/cert/` — survives pod restarts |
| TLS versions | 1.2 and 1.3 (1.0 and 1.1 disabled) |
| Config domains | All 5 public domains |

No external ACME client, no cert-manager, no Caddy. The global router handles all
certificate lifecycle automatically.

---

## Static Content (Website & Docs)

Website (`featuresignals.com`) and docs (`docs.featuresignals.com`) are served as
static files by the global router. Content lives on a persistent volume
(`/mnt/data/www/`) and is updated via CI/CD.

```bash
# Deploy website
dagger call deploy-website --source=. --env=production

# Deploy docs
dagger call deploy-docs --source=. --env=production
```

The Dagger functions build the static sites and copy output to the K3s persistent
volume. The global router serves them directly — no external CDN needed.

---

## Firewall Rules (Hetzner Cloud Firewall)

The Hetzner Cloud firewall is configured to allow only essential traffic:

| Direction | Protocol | Source | Port | Purpose |
|-----------|----------|--------|------|--------|
| Inbound | TCP | 0.0.0.0/0 | 80 | HTTP (Let's Encrypt HTTP-01 challenge) |
| Inbound | TCP | 0.0.0.0/0 | 443 | HTTPS (all production traffic) |
| Inbound | TCP | (Hetzner robot IPs) | 22 | SSH (emergency break-glass only) |
| Outbound | All | — | All | Allow all outbound |

---

## Verifying DNS Propagation

```bash
dig +short featuresignals.com
dig +short api.featuresignals.com
dig +short app.featuresignals.com
```

Expected output: the K3s node public IP address.

---

## Updating DNS Records

1. Update records at Cloudflare DNS dashboard
2. Wait for TTL expiration (default 300s)
3. Verify with `dig +short`
4. No certificate renewal needed — autocert handles automatically

---

## Migration History

**April 2026:** Architecture migrated from multi-component edge (Hetzner LB +
Traefik + cert-manager + Caddy + Cloudflare WAF/CDN) to single global router
(Go binary, hostNetwork, autocert). Cloudflare downgraded from proxied (WAF/CDN)
to DNS-only. All edge security now handled by the global router.
