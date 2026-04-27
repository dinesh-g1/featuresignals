# Load Balancer & DNS Setup

This document describes the DNS and load balancer configuration for FeatureSignals
infrastructure cells and the observability stack.

---

## DNS Records

All infrastructure DNS records point to the load balancer (LB) public IP.
The LB then routes traffic to the appropriate services running on the cells.

### Cell Subdomains

Each provisioned cell gets a subdomain under the root domain:

| Record | Type | Value | Description |
|--------|------|-------|-------------|
| `*.featuresignals.com` | A | `46.225.34.240` | Wildcard for cell subdomains |
| `cell-01.featuresignals.com` | A | `46.225.34.240` | Individual cell (if not using wildcard) |

### Observability (SigNoz)

SigNoz provides metrics, traces, and log aggregation for all cell services.

| Record | Type | Value | Description |
|--------|------|-------|-------------|
| `signoz.featuresignals.com` | A | `46.225.34.240` | SigNoz UI access (query service) |

When the observability stack is deployed via `deploy-observability.sh`, an
Ingress is created for `signoz.<CELL_SUBDOMAIN>`. If you use the wildcard DNS
record above, SigNoz will be accessible at `signoz.cell-01.featuresignals.com`
(for example) automatically.

### Application Services

| Record | Type | Value | Description |
|--------|------|-------|-------------|
| `api.featuresignals.com` | A | `46.225.34.240` | FeatureSignals API |
| `app.featuresignals.com` | A | `46.225.34.240` | FeatureSignals Dashboard |
| `edge.featuresignals.com` | A | `46.225.34.240` | Edge Worker |

---

## TLS / Certificates

- All public-facing ingress is secured with Let's Encrypt via cert-manager.
- The `letsencrypt-prod` ClusterIssuer is installed by the bootstrap script.
- Annotations on each Ingress resource trigger certificate issuance:

```yaml
annotations:
  cert-manager.io/cluster-issuer: letsencrypt-prod
  traefik.ingress.kubernetes.io/router.entrypoints: websecure
```

---

## SigNoz Auth Proxy (Recommended)

SigNoz does not include built-in authentication. To protect the SigNoz UI and
API from public access, deploy an auth proxy in front of the SigNoz Ingress.

### Option 1: Basic Auth with Traefik Middleware

Create a basic auth middleware and attach it to the SigNoz Ingress:

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: signoz-auth
  namespace: signoz
spec:
  basicAuth:
    secret: signoz-auth-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: signoz-auth-secret
  namespace: signoz
type: kubernetes.io/basic-auth
stringData:
  username: admin
  password: <generated-password>
```

Then update the SigNoz Ingress to reference the middleware:

```yaml
metadata:
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: signoz-signoz-auth@kubernetescrd
```

### Option 2: OAuth2 Proxy

For integration with your identity provider (Google, GitHub, Okta, etc.):

1. Deploy [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/) in the
   `signoz` namespace.
2. Configure it to authenticate against your OIDC provider.
3. Set the SigNoz Ingress to route through the OAuth2 proxy.

### Option 3: Network Policy Restriction

If SigNoz only needs to be accessed from within the cluster or from admin VPN:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: signoz-restrict-access
  namespace: signoz
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/instance: signoz
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: featuresignals-saas
    - ipBlock:
        cidr: <ADMIN_VPN_CIDR>
```

---

## Load Balancer Configuration

The load balancer sits in front of the k3s cluster and routes traffic to the
Traefik ingress controller (NodePort / LoadBalancer service).

### Recommended LB Settings

| Setting | Value |
|---------|-------|
| Mode | TCP (L4) — TLS termination handled by cert-manager/Traefik |
| Ports | 80 → NodePort 30080, 443 → NodePort 30443 |
| Health Check | HTTP GET /health on port 8080 (API) or TCP on 30080/30443 |
| Session Affinity | None (stateless services) |
| Idle Timeout | 60s |
| Proxy Protocol | v2 (if needed for client IP preservation) |

### Firewall Rules (LB → Cell)

Ensure the load balancer can reach the cell on:

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH (key-based admin access only) |
| 6443 | TCP | k3s API server |
| 30080 | TCP | HTTP (Traefik NodePort) |
| 30443 | TCP | HTTPS (Traefik NodePort) |
| 3301 | TCP | SigNoz query service (if LB directs to service directly) |
| 9100 | TCP | node-exporter metrics |

---

## Verifying DNS Propagation

After adding DNS records, verify propagation:

```bash
dig +short signoz.featuresignals.com
dig +short api.featuresignals.com
```

Expected output: the load balancer public IP address.

---

## Updating Existing Deployments

If DNS records change:

1. Update the DNS A/AAAA records at your DNS provider.
2. Update the load balancer configuration if needed.
3. Verify ingress is routing correctly:
   ```bash
   curl -H "Host: signoz.featuresignals.com" http://<LB_IP>/api/v1/health
   curl -H "Host: api.featuresignals.com" http://<LB_IP>/health
   ```
4. Certificate renewal may take a few minutes via cert-manager.
---

## Website Deployment (Cloudflare Pages)

The marketing website at `featuresignals.com` is deployed via Cloudflare Pages.

### Git Integration (auto-deploy on push)

1. Go to **Cloudflare Dashboard → Workers & Pages → Pages → Create → Connect to Git**
2. Select the `featuresignals` repository
3. Configure:
   - **Build command:** `cd website && npm ci && npm run build`
   - **Build output directory:** `out`
4. Save — auto-deploys on every push to `main`

### Manual/Wrangler deploy

```bash
npx wrangler pages deploy out --project-name=featuresignals-website
```

Requires `CLOUDFLARE_API_TOKEN` with **Cloudflare Pages: Write** permission.

### CI/CD (future)

When `website/` directory changes are pushed, the Dagger CI pipeline will
auto-deploy to Cloudflare Pages via Wrangler.

| Record | Type | Value | Proxy | Description |
|--------|------|-------|-------|-------------|
| `featuresignals.com` | CNAME | `featuresignals.pages.dev` | Proxied ☁️ | Marketing website |
