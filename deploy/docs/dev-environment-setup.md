# Dev Environment Setup Guide

Quick reference for setting up and accessing the dev environment for testing and debugging.

## What is the Dev Environment?

The dev environment is a **full-stack primary region** deployment on your Utho Bangalore VPS that includes:

- ✅ **API Server** — `api.dev.featuresignals.com`
- ✅ **Dashboard** — `app.dev.featuresignals.com`
- ✅ **Marketing Website** — `dev.featuresignals.com`
- ✅ **Documentation** — `docs.dev.featuresignals.com`
- ✅ **Dozzle Log Viewer** — Accessible via SSH tunnel on `localhost:8888`
- ✅ **ZeptoMail** — Transactional email (test/live mode as configured)
- ✅ **OpenTelemetry** — Full tracing, metrics, and logs to SigNoz (India region)

This mirrors production topology so you can test the complete user journey before promoting to prod.

---

## Initial Setup (One-Time)

### 1. DNS Configuration

Add these A records in Cloudflare pointing to your dev VPS IP:

```
api.dev.featuresignals.com      A  <your-dev-vps-ip>     Proxy: Proxied (orange cloud)
app.dev.featuresignals.com      A  <your-dev-vps-ip>     Proxy: Proxied (orange cloud)
dev.featuresignals.com          A  <your-dev-vps-ip>     Proxy: Proxied (orange cloud)
docs.dev.featuresignals.com     A  <your-dev-vps-ip>     Proxy: Proxied (orange cloud)
```

### 2. VPS Preparation

SSH into your dev VPS:

```bash
ssh -i ~/.ssh/your-dev-vps-key.pem your-user@your-dev-vps-ip
```

Create the application directory and copy the dev env template:

```bash
sudo mkdir -p /opt/featuresignals
sudo chown $USER:$USER /opt/featuresignals
cd /opt/featuresignals
```

Copy and fill in the environment file:

```bash
# From your local machine, on the project root:
scp -i ~/.ssh/your-dev-vps-key.pem deploy/.env.dev.example your-user@your-dev-vps-ip:/opt/featuresignals/.env

# Then SSH and edit:
ssh -i ~/.ssh/your-dev-vps-key.pem your-user@your-dev-vps-ip
nano /opt/featuresignals/.env
```

**Required values to fill in:**
- `POSTGRES_PASSWORD` — Generate: `openssl rand -hex 16`
- `JWT_SECRET` — Generate: `openssl rand -hex 32`
- `DB_ADMIN_PASSWORD` — Generate: `openssl rand -hex 16`
- `DB_READONLY_PASSWORD` — Generate: `openssl rand -hex 16`
- `ZEPTOMAIL_TOKEN` — Your ZeptoMail send mail token
- `STRIPE_SECRET_KEY` — Your Stripe test key
- `STRIPE_WEBHOOK_SECRET` — Your Stripe webhook secret (test mode)
- `STRIPE_PRICE_ID` — Your Stripe test price ID
- `OTEL_INGESTION_KEY` — Your SigNoz ingestion key (for observability)

### 3. Clone Repository

```bash
ssh -i ~/.ssh/your-dev-vps-key.pem your-user@your-dev-vps-ip
cd /opt/featuresignals
git clone https://github.com/dinesh-g1/featuresignals.git .
```

### 4. Deploy

```bash
ssh -i ~/.ssh/your-dev-vps-key.pem your-user@your-dev-vps-ip
cd /opt/featuresignals

# Run the deploy script (will build/start everything)
bash deploy/deploy-region.sh

# Start Dozzle for log monitoring
docker compose --env-file .env -f deploy/docker-compose.region.yml -f deploy/docker-compose.dev.yml up -d dozzle
```

---

## Accessing Dev Environment

### Direct URLs (from anywhere)

Once DNS propagates and deploy completes:

- **API**: https://api.dev.featuresignals.com/health
- **Dashboard**: https://app.dev.featuresignals.com
- **Website**: https://dev.featuresignals.com
- **Docs**: https://docs.dev.featuresignals.com

### Dozzle Log Viewer (via SSH tunnel)

Dozzle is bound to `127.0.0.1:8888` on the VPS for security. Access it via SSH tunnel:

```bash
# Foreground (keeps SSH session open)
ssh -i ~/.ssh/featuresignals-dev.pem -L 8888:localhost:8888 root@150.241.244.151

# Background (no interactive session)
ssh -i ~/.ssh/featuresignals-dev.pem -f -N -L 8888:localhost:8888 root@150.241.244.151

# Then open in browser:
open http://localhost:8888
```

**SSH flags explained:**
- `-i <key>` — use this private key for authentication
- `-L 8888:localhost:8888` — forward local port 8888 to remote port 8888
- `-f` — background after authentication
- `-N` — no remote command (port forward only)

To stop background tunnel: `pkill -f "8888:localhost:8888"`

**What you'll see in Dozzle:**
- Real-time logs from all containers (postgres, server, dashboard, caddy, etc.)
- Filter by container name
- Search and filter logs
- View historical logs (not just current session)

---

## CI/CD Automated Deploy

After merging to `main`, the dev environment auto-deploys via GitHub Actions:

1. **Trigger**: Push to `main` or manual via GitHub Actions → "Deploy to Dev Environment"
2. **What it does**:
   - Pulls latest code
   - Rebuilds only changed services (change detection)
   - Deploys with full stack (website + docs enabled)
   - Runs smoke tests against all endpoints
   - Restarts Dozzle

### Manual Trigger (Optional)

```bash
# GitHub → Actions → "Deploy to Dev Environment" → Run workflow
# Options:
#   - image_tag: specific tag or "latest" (default)
#   - build_locally: true to build on VPS instead of pulling from GHCR
```

---

## Debugging with Dozzle

### View Server Logs (Real-Time)

1. Open http://localhost:8888 (via SSH tunnel)
2. Click on the `featuresignals-server-*` container
3. See live streaming logs with debug-level output

### Common Debugging Scenarios

**Database connection issues:**
```bash
# Via Dozzle: Click postgres container
# Or directly on VPS:
docker compose --env-file .env -f deploy/docker-compose.region.yml logs -f postgres
```

**API errors:**
```bash
# Via Dozzle: Click server container
# Check for: migration errors, DB connection, JWT issues
```

**Caddy routing/TLS:**
```bash
# Via Dozzle: Click caddy container
# Check for: certificate issuance, routing errors
```

**Dashboard not loading:**
```bash
# Via Dozzle: Click dashboard container
# Check for: NEXT_PUBLIC_API_URL mismatch, build errors
```

---

## Quick Commands

```bash
# View all container status
docker compose --env-file .env -f deploy/docker-compose.region.yml ps

# View recent logs (without Dozzle)
docker compose --env-file .env -f deploy/docker-compose.region.yml logs --tail=100 server

# Follow server logs in real-time
docker compose --env-file .env -f deploy/docker-compose.region.yml logs -f server

# Restart a specific service
docker compose --env-file .env -f deploy/docker-compose.region.yml restart server

# Full redeploy (if something is broken)
cd /opt/featuresignals
bash deploy/deploy-region.sh

# Access Dozzle (from local machine)
ssh -i ~/.ssh/featuresignals-dev.pem -L 8888:localhost:8888 root@150.241.244.151
# Open: http://localhost:8888
```

---

## Troubleshooting

### Dev environment not accessible after deploy

**Check 1: DNS resolution**
```bash
dig api.dev.featuresignals.com
dig dev.featuresignals.com
```

**Check 2: Container health**
```bash
docker compose --env-file .env -f deploy/docker-compose.region.yml ps
# All should be "healthy" or "running"
```

**Check 3: Caddy certificates**
```bash
docker compose --env-file .env -f deploy/docker-compose.region.yml logs caddy | grep -i "tls\|cert"
```

**Check 4: Is website/docs running?**
```bash
# Dev should be PRIMARY region (website + docs enabled)
docker compose --env-file .env -f deploy/docker-compose.region.yml ps website-build docs-build
```

### Dozzle not accessible

```bash
# Check if Dozzle is running
docker ps | grep dozzle

# Check port binding
docker port <dozzle-container-id>

# Restart Dozzle
docker compose --env-file .env -f deploy/docker-compose.region.yml -f deploy/docker-compose.monitoring.yml up -d dozzle
```

---

## Promoting to Production

Once verified on dev:

1. **Code is already on `main`** (dev auto-deploys from main)
2. **Production deploy** runs via `.github/workflows/deploy-prod.yml`
3. **Production uses** `deploy/.env.production` with live credentials
4. **No manual promotion needed** — dev validates, prod deploys independently

The dev environment uses test mode for payments, ZeptoMail for email, and debug-level OpenTelemetry — making it safe for testing without affecting real users or incurring costs.

---

## Accessing Production Logs via Dozzle

Dozzle is auto-deployed to all production regions (IN, US, EU) alongside the application.

### SSH into each region's VPS:

```bash
# India (primary)
ssh -i ~/.ssh/your-regional-key.pem root@<india-vps-ip> -L 8888:localhost:8888

# US region
ssh -i ~/.ssh/your-regional-key.pem root@<us-vps-ip> -L 8888:localhost:8888

# EU region
ssh -i ~/.ssh/your-regional-key.pem root@<eu-vps-ip> -L 8888:localhost:8888
```

Then open **http://localhost:8888** to view real-time logs for that region.

> **Tip:** Each region's Dozzle is independent. Open separate SSH tunnels for each region you want to monitor.
