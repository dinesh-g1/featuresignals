# Ops Portal — Setup & Deployment Guide

> **Recommendation:** Deploy on a dedicated VPS, NOT alongside other services.

---

## Table of Contents

1. [Architecture Recommendation](#1-architecture-recommendation)
2. [Local Development Setup](#2-local-development-setup)
3. [Docker Compose Setup](#3-docker-compose-setup)
4. [Dedicated VPS Deployment](#4-dedicated-vps-deployment)
5. [Caddy Configuration](#5-caddy-configuration)
6. [Environment Variables](#6-environment-variables)
7. [First-Time Setup Checklist](#7-first-time-setup-checklist)
8. [Backup & Recovery](#8-backup--recovery)

---

## 1. Architecture Recommendation

### Why a Dedicated VPS?

| Factor | Shared with Other Services | Dedicated VPS |
|--------|---------------------------|---------------|
| **Security** | Ops portal shares attack surface with customer-facing services | Isolated — only internal users access |
| **Access Control** | Harder to restrict network-level access | Can lock down to office IPs only |
| **Resource Isolation** | Customer traffic could impact ops performance | Dedicated resources for internal ops |
| **Audit Compliance** | Logs mix with customer service logs | Clean separation for compliance |
| **Cost** | "Free" (shared) | ~€4.51/mo (cx22) — negligible |
| **Recommendation** | ❌ Not recommended | ✅ **Recommended** |

### Recommended Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Hetzner Cloud (EU)                         │
│                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────┐  │
│  │  Shared SaaS Cluster         │  │  Ops Portal VPS      │  │
│  │  (customer-facing)           │  │  (cx22, €4.51/mo)    │  │
│  │                              │  │                      │  │
│  │  API Server :8080            │  │  Next.js :3001       │  │
│  │  Dashboard  :3000            │  │  → Only access from  │  │
│  │  PostgreSQL :5432            │  │    office IPs        │  │
│  └──────────────┬───────────────┘  └──────────┬───────────┘  │
│                 │                              │              │
│                 └──────────┬───────────────────┘              │
│                            │                                  │
│                    API calls to                               │
│                    api.featuresignals.com                     │
│                    /api/v1/ops/*                              │
└──────────────────────────────────────────────────────────────┘
```

The ops portal is a **pure frontend** — it talks to the existing Go API backend at `api.featuresignals.com`. The only thing that needs deploying is the Next.js app itself.

---

## 2. Local Development Setup

### Prerequisites
- Node.js 22+
- FeatureSignals API server running locally (port 8080)

### Quick Start

```bash
# 1. Install dependencies
cd ops && npm install

# 2. Create .env.local
cp .env.example .env.local
# Edit .env.local if your API is not on localhost:8080

# 3. Start dev server
npm run dev
# → http://localhost:3001

# Or via Makefile from project root:
make dev-ops
```

### Using Docker Compose (with all services)

```bash
# From project root
make local-up
# This starts: postgres + server + dashboard + ops

# Access:
# API:        http://localhost:8080
# Dashboard:  http://localhost:3000
# Ops Portal: http://localhost:3001
```

---

## 3. Docker Compose Setup

The ops portal is already configured in `docker-compose.yml`:

```yaml
ops:
  build:
    context: ./ops
    dockerfile: ../deploy/docker/Dockerfile.ops
  depends_on:
    server:
      condition: service_healthy
  ports:
    - "3001:3001"
  environment:
    HOSTNAME: "0.0.0.0"
    NEXT_PUBLIC_API_URL: http://localhost:8080
```

To run ops alongside other services:

```bash
docker compose up -d ops    # Just ops portal
docker compose up -d        # Everything including ops
```

---

## 4. Dedicated VPS Deployment

### Step 1: Provision the VPS

```bash
# Via Hetzner Console or Terraform
# Recommended: cx22 (2 vCPU, 4GB RAM, 40GB SSD) — €4.51/mo
# Region: fsn1 (Falkenstein, EU)

# Via Terraform (if you have the infra module set up):
cd infra/terraform/modules/vps
terraform apply \
  -var="customer_name=ops-portal" \
  -var="org_id=internal" \
  -var="vps_type=cx22" \
  -var="region=fsn1"
```

### Step 2: SSH to the VPS

```bash
ssh root@<vps-ip>
```

### Step 3: Install Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### Step 4: Set Up the Application

```bash
# Create app directory
mkdir -p /opt/ops-portal
cd /opt/ops-portal

# Clone the repo
git clone https://github.com/featuresignals/featuresignals.git .
git checkout main

# Build the ops portal image
docker build -f deploy/docker/Dockerfile.ops -t featuresignals-ops:latest .
```

### Step 5: Create Docker Compose File

```bash
cat > docker-compose.yml << 'EOF'
services:
  ops:
    image: featuresignals-ops:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3001"  # Only listen on localhost (Caddy handles HTTPS)
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api.featuresignals.com
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3001/login"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF
```

### Step 6: Configure Caddy

```bash
cat > Caddyfile << 'EOF'
ops.featuresignals.com {
    reverse_proxy localhost:3001

    log {
        output stdout
        format json
    }

    tls {
        protocols tls1.2 tls1.3
    }
}
EOF
```

### Step 7: Start Services

```bash
# Start the ops portal
docker compose up -d

# Start Caddy (if not already running)
docker run -d --name caddy-ops \
  --restart unless-stopped \
  -p 80:80 -p 443:443 \
  -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy:2-alpine

# Verify
curl -f https://ops.featuresignals.com/health
```

### Step 8: Restrict Access to Office IPs

Add to your Caddyfile or firewall:

```bash
# Via UFW firewall (on the VPS)
ufw allow from <office-ip-1> to any port 22
ufw allow from <office-ip-2> to any port 22
ufw allow 80   # Caddy needs these for Let's Encrypt
ufw allow 443
ufw enable
```

Or add IP restriction in Caddy:

```
ops.featuresignals.com {
    @allowed remote_ip <office-ip-1>/32 <office-ip-2>/32
    handle @allowed {
        reverse_proxy localhost:3001
    }
    respond 403
}
```

---

## 5. Caddy Configuration

If you're adding ops to the existing Caddyfile (not a separate VPS):

```
# Add to your existing deploy/Caddyfile or deploy/Caddyfile.region:

ops.featuresignals.com {
    reverse_proxy ops:3001

    log {
        output stdout
        format json
    }
}
```

And add to your docker-compose.prod.yml:

```yaml
services:
  caddy:
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
  ops:
    build:
      context: ./ops
      dockerfile: ../deploy/docker/Dockerfile.ops
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api.featuresignals.com
    restart: unless-stopped
```

---

## 6. Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.featuresignals.com` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `HOSTNAME` | Server hostname | `0.0.0.0` |
| `PORT` | Server port | `3001` |

### Production `.env` File

Create `/opt/ops-portal/.env`:

```bash
# Ops Portal Production Config
NEXT_PUBLIC_API_URL=https://api.featuresignals.com
NODE_ENV=production
```

Set permissions: `chmod 600 /opt/ops-portal/.env`

---

## 7. First-Time Setup Checklist

After deploying the ops portal:

### Database Migrations
```bash
# From the server directory (migrations include ops tables)
make migrate-up
```

This creates:
- `customer_environments` — environment registry
- `licenses` — unified license management
- `ops_users` — portal access control
- `ops_audit_log` — full audit trail
- `org_cost_daily` — cost attribution
- `sandbox_environments` — internal sandboxes

### Add Founders as Ops Users
```bash
# You'll need to add yourself and Shashi manually via psql:
psql $DATABASE_URL << 'EOF'
INSERT INTO ops_users (user_id, ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
SELECT id, 'founder', '{shared,isolated,onprem}', '{in,us,eu}', -1, true
FROM users
WHERE email IN ('you@featuresignals.com', 'shashi@featuresignals.com');
EOF
```

### Add Other Team Members
```bash
# Via psql:
INSERT INTO ops_users (user_id, ops_role, allowed_env_types, allowed_regions, max_sandbox_envs, is_active)
VALUES (
  '<user-id-from-users-table>',
  'engineer',  -- or 'customer_success', 'demo_team', 'finance'
  '{shared,isolated,onprem}',
  '{in,us,eu}',
  2,  -- max sandboxes
  true
);
```

Or use the Ops Portal UI: **Ops Users** → **Add User**

### Verify Access
1. Navigate to `ops.featuresignals.com`
2. Log in with your `@featuresignals.com` credentials
3. You should see the dashboard
4. Try accessing each section to verify permissions

### Set Up Monitoring
- Add the VPS to your existing monitoring (SigNoz/Prometheus)
- Set up alerts for: service down, high CPU/memory, disk space
- Configure log shipping to your central Loki instance

---

## 8. Backup & Recovery

### What to Back Up
The ops portal is **stateless** — all data is in the main PostgreSQL database. The only things that need backup are:

1. **PostgreSQL database** — already backed up by your existing backup process
2. **Caddy TLS certificates** — auto-renewed by Let's Encrypt

### No Separate Backup Needed
Since the ops portal:
- Uses the same API backend as the dashboard
- Stores no local state (auth tokens are in browser localStorage)
- Has no dedicated database

Your existing backup strategy covers everything.

### Recovery
If the ops VPS goes down:
1. Provision a new cx22 VPS
2. Deploy the Docker image
3. Point DNS to the new IP
4. Done — no data migration needed

---

## CI/CD Pipeline

Add a deployment workflow:

```yaml
# .github/workflows/deploy-ops.yml
name: Deploy Ops Portal

on:
  push:
    branches: [main]
    paths:
      - 'ops/**'
      - 'deploy/docker/Dockerfile.ops'
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -f deploy/docker/Dockerfile.ops -t featuresignals-ops:latest .

      - name: Push to VPS
        run: |
          docker save featuresignals-ops:latest | ssh root@<ops-vps-ip> "docker load"

      - name: Restart services
        run: |
          ssh root@<ops-vps-ip> "cd /opt/ops-portal && docker compose up -d"
```

---

**Last Updated:** April 14, 2026
