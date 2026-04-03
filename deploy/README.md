# FeatureSignals Deployment Guide

This directory contains everything needed to deploy FeatureSignals -- Dockerfiles, reverse proxy configuration, Helm chart, Terraform modules, and operational scripts.

## Directory Structure

```
deploy/
├── docker/
│   ├── Dockerfile.server       # Go API server (multi-stage, statically linked)
│   ├── Dockerfile.dashboard    # Next.js dashboard (standalone output)
│   ├── Dockerfile.website      # Astro marketing site (one-shot builder)
│   ├── Dockerfile.docs         # Docusaurus docs site (one-shot builder)
│   └── Dockerfile.relay        # Relay proxy
├── helm/
│   └── featuresignals/         # Kubernetes Helm chart
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── pg-init/
│   └── 01-roles.sh             # DB role creation on first init (docker-entrypoint-initdb.d)
├── terraform/
│   └── aws/                    # AWS infrastructure modules
├── Caddyfile                   # Reverse proxy and HTTPS configuration
├── deploy.sh                   # Production deployment script
├── pg-backup.sh                # PostgreSQL backup with rotation
└── pg-setup-roles.sh           # Idempotent DB role provisioning (runs each deploy)
```

## Deployment Options

### 1. Docker Compose (Recommended for Most Deployments)

#### Local Development

From the repository root:

```bash
docker compose up
```

Services: PostgreSQL, migration runner, API server (`:8080`), dashboard (`:3000`).

#### Production

Production uses `docker-compose.prod.yml` with Caddy for automatic HTTPS:

```bash
# 1. Create your environment file
cp .env.production.example .env

# 2. Generate secrets
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" >> .env
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env

# 3. Start the full stack
docker compose -f docker-compose.prod.yml up -d
```

Production services:

| Service | Role | Notes |
|---------|------|-------|
| `postgres` | PostgreSQL 16 | Persistent volume, health-checked, 2GB memory limit |
| `migrate` | Schema migrations | One-shot, runs on startup |
| `server` | Go API server | 1GB memory limit |
| `dashboard` | Next.js dashboard | 512MB memory limit |
| `website-build` | Astro marketing site | One-shot, outputs to shared volume |
| `docs-build` | Docusaurus docs | One-shot, outputs to shared volume |
| `caddy` | Reverse proxy | Auto-HTTPS via Let's Encrypt, serves static sites |

### 2. Kubernetes (Helm Chart)

For Kubernetes clusters:

```bash
helm install featuresignals deploy/helm/featuresignals/ \
  --set env.DATABASE_URL="postgres://fs:secret@postgres:5432/featuresignals?sslmode=disable" \
  --set env.JWT_SECRET="your-jwt-secret" \
  --set postgresql.auth.password="your-db-password"
```

Default values (`values.yaml`):

| Parameter | Default | Description |
|-----------|---------|-------------|
| `replicaCount` | `2` | API server replicas |
| `image.repository` | `ghcr.io/featuresignals/server` | Container image |
| `service.port` | `8080` | Service port |
| `ingress.enabled` | `true` | Enable ingress |
| `resources.requests.cpu` | `250m` | CPU request |
| `resources.requests.memory` | `256Mi` | Memory request |
| `resources.limits.cpu` | `1000m` | CPU limit |
| `resources.limits.memory` | `512Mi` | Memory limit |

### 3. Single Binary

Download the Go server binary and run directly:

```bash
export DATABASE_URL="postgres://fs:password@localhost:5432/featuresignals?sslmode=disable"
export JWT_SECRET="$(openssl rand -hex 32)"
export PORT=8080

./server
```

Requirements: PostgreSQL 16+ accessible at the `DATABASE_URL`. Run migrations first with `golang-migrate`.

## Environment Variables

### Required

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `POSTGRES_PASSWORD` | Database password | `openssl rand -hex 24` |
| `JWT_SECRET` | JWT signing key | `openssl rand -hex 32` |

**Important:** Use hex encoding for `POSTGRES_PASSWORD` (not base64) to avoid URL-unsafe characters in the connection string.

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | API server listen port |
| `DATABASE_URL` | *(composed from password)* | Full PostgreSQL connection string |
| `CORS_ORIGIN` | `https://app.featuresignals.com` | Allowed CORS origin |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `NEXT_PUBLIC_API_URL` | `https://api.featuresignals.com` | Dashboard API URL (build-time) |

## Database Access (Admin & Readonly)

Production Postgres is bound to `127.0.0.1:5432` on the VPS -- unreachable from the internet. Access is via SSH tunnel only.

### Roles

| Role | User | Privileges | Audience |
|------|------|------------|----------|
| App (existing) | `fs` | Superuser (used by the server) | Application only |
| Admin | `fs_admin` | Full DDL + DML on `featuresignals` | Project owner (Dinesh) |
| Readonly | `fs_readonly` | SELECT only on all tables | Future team members |

### Prerequisites

1. SSH key-based access to the VPS as `deploy`.
2. `FS_VPS_HOST` set in your environment, or `~/.featuresignals/config`:
   ```bash
   mkdir -p ~/.featuresignals
   echo "VPS_HOST=<your-server-ip>" > ~/.featuresignals/config
   ```
3. `DB_ADMIN_PASSWORD` and `DB_READONLY_PASSWORD` stored in GitHub Secrets (added to VPS `.env` by CD pipeline).

### Quick Start (from your laptop)

```bash
# Open psql as admin (full privileges)
make db-admin

# Open psql as readonly
make db-readonly

# Open tunnel only (for pgAdmin, DBeaver, etc.)
make db-tunnel
# Then connect your GUI client to: localhost:15432, database: featuresignals
```

Or use the script directly:

```bash
./scripts/db-connect.sh                      # admin psql
./scripts/db-connect.sh --role readonly      # readonly psql
./scripts/db-connect.sh --tunnel-only        # tunnel for GUI clients
./scripts/db-connect.sh --host 1.2.3.4       # override VPS host
```

### Running Role Setup Manually

If roles need to be (re)created or passwords rotated:

```bash
# Via Makefile
make db-setup-roles

# Or SSH into VPS directly
ssh deploy@<vps-ip> "cd /opt/featuresignals && bash deploy/pg-setup-roles.sh"
```

The script is idempotent and runs automatically on every deploy.

### Onboarding a Readonly Team Member

1. Share the `DB_READONLY_PASSWORD` with the team member (via a secure channel).
2. Have them set up `FS_VPS_HOST` and SSH access (if using tunnel), or connect via a bastion.
3. They connect with: `make db-readonly` or `./scripts/db-connect.sh --role readonly`.
4. **Do NOT** share the admin password or VPS SSH credentials.

### Required GitHub Secrets for Database Roles

| Secret | Description |
|--------|-------------|
| `DB_ADMIN_PASSWORD` | Password for `fs_admin` role |
| `DB_READONLY_PASSWORD` | Password for `fs_readonly` role |

Generate with: `openssl rand -hex 24`

## DNS Configuration

For a production deployment, configure these DNS records pointing to your server's IP:

| Record | Type | Target |
|--------|------|--------|
| `@` (root) | A | `<server-ip>` |
| `www` | CNAME | `yourdomain.com` |
| `api` | A | `<server-ip>` |
| `app` | A | `<server-ip>` |
| `docs` | A | `<server-ip>` |

Caddy handles TLS certificate provisioning automatically via Let's Encrypt.

## Caddy Configuration

The `Caddyfile` routes traffic to the appropriate service:

| Domain | Destination |
|--------|-------------|
| `featuresignals.com` / `www` | Static Astro site from `/srv/website` |
| `docs.featuresignals.com` | Static Docusaurus site from `/srv/docs` |
| `app.featuresignals.com` | Reverse proxy to `dashboard:3000` |
| `api.featuresignals.com` | Reverse proxy to `server:8080` |

All responses include security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection). Static assets are cached for 1 year with immutable headers.

To use your own domain, update the `Caddyfile` with your domain names and the `CORS_ORIGIN` environment variable to match.

## CI/CD Pipeline

### Continuous Integration (`.github/workflows/ci.yml`)

Triggered on every push and pull request:

1. **Server tests** -- PostgreSQL service container, migrations, `go test`, `go build`
2. **Server lint** -- `go vet`
3. **SDK tests** -- Go, Node.js, Python, Java, .NET, Ruby, React, Vue (parallel)
4. **Dashboard build** -- `npm install && npm run build`
5. **Docs build** -- `npm install && npm run build`
6. **Docker build** -- builds server and dashboard images (after tests pass)

### Continuous Deployment (`.github/workflows/cd.yml`)

Triggered automatically after successful CI on `main`, or manually via `workflow_dispatch`:

1. SSH to VPS and write `.env` from GitHub Secrets
2. Pre-deploy PostgreSQL backup
3. `git pull` and `docker compose build`
4. `docker compose up -d`
5. Health check all endpoints

### One-Time VPS Setup (`.github/workflows/setup-vps.yml`)

Provisions a fresh Ubuntu VPS via `workflow_dispatch`:

- Installs Docker, Docker Compose, UFW, fail2ban
- Creates a `deploy` user with SSH key authentication
- Clones the repository to `/opt/featuresignals`
- Writes `.env` from GitHub Secrets
- Sets up daily backup cron
- Runs initial deployment
- Hardens SSH (disables root login and password auth)

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Server IP address |
| `VPS_USER` | SSH user (e.g. `deploy`) |
| `VPS_SSH_KEY` | SSH private key |
| `POSTGRES_PASSWORD` | Database password (app user `fs`) |
| `JWT_SECRET` | JWT signing key |
| `DB_ADMIN_PASSWORD` | Admin DB role password (`fs_admin`) |
| `DB_READONLY_PASSWORD` | Readonly DB role password (`fs_readonly`) |

## Backup Strategy

The `pg-backup.sh` script provides automated PostgreSQL backups:

```bash
# Manual backup
bash deploy/pg-backup.sh

# Automated via cron (set up by the setup-vps workflow)
# Runs daily at 3:00 AM
0 3 * * * /opt/featuresignals/deploy/pg-backup.sh >> /var/log/fs-backup.log 2>&1
```

- **Daily backups:** kept for 7 days, stored in `/opt/featuresignals/backups/daily/`
- **Weekly backups:** copied on Sundays, kept for 4 weeks, stored in `backups/weekly/`
- **Format:** `pg_dump` piped through `gzip`

### Restoring from Backup

```bash
gunzip -c backups/daily/featuresignals_20260401_030000.sql.gz | \
  docker exec -i $(docker compose -f docker-compose.prod.yml ps -q postgres) \
  psql -U fs featuresignals
```

## Deployment Script

The `deploy.sh` script automates the production deployment process:

```bash
bash deploy/deploy.sh
```

It performs:
1. Verify `.env` exists
2. `git pull origin main`
3. `docker compose build --parallel`
4. Remove old static site volumes (forces rebuild)
5. `docker compose up -d`
6. Wait for one-shot builders to finish
7. Prune dangling Docker images
8. Print service status

## Security Checklist

- [ ] SSH key-only authentication (password auth disabled)
- [ ] Dedicated deploy user (root login disabled)
- [ ] UFW firewall: ports 22, 80, 443 only
- [ ] fail2ban for SSH brute-force protection
- [ ] PostgreSQL bound to `127.0.0.1` only (SSH tunnel required for access)
- [ ] Database roles: `fs_admin` (owner only), `fs_readonly` (team members)
- [ ] Team members never given VPS SSH credentials or admin DB password
- [ ] CORS locked to exact production domain
- [ ] Auto-HTTPS via Let's Encrypt (Caddy)
- [ ] Strong generated passwords for database, JWT, and DB roles
- [ ] Regular OS updates (`apt update && apt upgrade`)

## Architecture Overview

```
Internet → DNS → Server IP
                    │
        ┌───────────┴───────────┐
        │   Caddy (80, 443)     │  ← Auto-HTTPS
        │   Reverse Proxy       │
        ├───────────────────────┤
        │                       │
        │  ┌─────────────────┐  │
        │  │ Static: website │  │  featuresignals.com
        │  │ Static: docs    │  │  docs.featuresignals.com
        │  └─────────────────┘  │
        │                       │
        │  ┌─────────────────┐  │
        │  │ dashboard:3000  │  │  app.featuresignals.com
        │  └─────────────────┘  │
        │                       │
        │  ┌─────────────────┐  │
        │  │ server:8080     │  │  api.featuresignals.com
        │  └────────┬────────┘  │
        │           │           │
        │  ┌────────┴────────┐  │
        │  │ PostgreSQL 16   │  │  Internal only
        │  │ (pgdata volume) │  │
        │  └─────────────────┘  │
        └───────────────────────┘
```

## Scaling Path

1. **Single VPS** (current) -- all services on one machine behind Caddy
2. **Vertical scaling** -- upgrade to a larger VPS instance
3. **Separate database** -- move PostgreSQL to a dedicated VPS or managed service
4. **Horizontal scaling** -- multiple API server instances behind a load balancer
5. **Static site CDN** -- move website and docs to Cloudflare Pages (free)
6. **Kubernetes** -- use the Helm chart for full orchestration
