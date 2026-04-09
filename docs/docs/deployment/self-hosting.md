---
sidebar_position: 2
title: Self-Hosting
description: "Self-host FeatureSignals on your own infrastructure with full control over data and configuration."
---

# Self-Hosting Guide

Run FeatureSignals on your own infrastructure for full control over your data and deployment.

## Infrastructure Requirements

### Minimum (Development/Small Teams)

- **1 VPS** (2 CPU, 4GB RAM) — runs all services
- **PostgreSQL 14+** — can run on the same server or separately
- Cost: ~$10-20/month on Hetzner, OVH, Vultr, DigitalOcean, or Linode

### Recommended (Production)

- **API Server**: 2+ instances behind a load balancer
- **Flag Engine**: 1 instance (or static hosting)
- **PostgreSQL**: Managed or self-hosted with backups
- **Relay Proxy**: 1+ per region (optional)

## Deployment Options

### Option 1: Single VPS with Docker Compose

The simplest production setup. Suitable for small to medium teams.

```bash
# On your VPS
git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals

# Create production environment file
cat > .env.production << 'EOF'
DATABASE_URL=postgres://fs:strong-password@localhost:5432/featuresignals?sslmode=disable
JWT_SECRET=generate-a-strong-random-secret-here
CORS_ORIGIN=https://flags.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
EOF

docker compose -f docker-compose.yml up -d
```

### Option 2: Reverse Proxy with Caddy

Use [Caddy](https://caddyserver.com/) for automatic HTTPS:

```
# Caddyfile
api.yourdomain.com {
    reverse_proxy localhost:8080
}

flags.yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Option 3: Kubernetes

Deploy using standard Kubernetes manifests or Helm charts. Each component runs as a separate Deployment:

- `featuresignals-server` — API server (2+ replicas)
- `featuresignals-dashboard` — Flag Engine (1 replica)
- `featuresignals-relay` — Relay proxy (per region)
- PostgreSQL via operator or managed service

## Database Setup

### Self-Hosted PostgreSQL

```bash
sudo apt install postgresql-16

sudo -u postgres psql << 'EOF'
CREATE USER fs WITH PASSWORD 'strong-password-here';
CREATE DATABASE featuresignals OWNER fs;
EOF
```

### Run Migrations

```bash
# Using the migrate Docker image
docker run --rm -v $(pwd)/server/migrations:/migrations \
  migrate/migrate:v4.17.0 \
  -path /migrations \
  -database "postgres://fs:password@host:5432/featuresignals?sslmode=disable" \
  up
```

## Backups

### PostgreSQL Backups

```bash
# Daily backup to Backblaze B2 or Cloudflare R2
pg_dump -h localhost -U fs featuresignals | gzip > backup-$(date +%Y%m%d).sql.gz
```

Automate with a cron job:

```bash
0 2 * * * pg_dump -h localhost -U fs featuresignals | gzip > /backups/fs-$(date +\%Y\%m\%d).sql.gz
```

## Monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

Set up monitoring with:
- **Prometheus + Grafana** — for metrics visualization
- **Upptime** — for uptime monitoring
- **Loki** — for log aggregation

### Recommended Alerts

- API server health check fails
- PostgreSQL connection errors
- Evaluation latency > 100ms
- Memory usage > 80%

## Security Checklist

- [ ] Set a strong `JWT_SECRET` (not the default)
- [ ] Use strong PostgreSQL passwords
- [ ] Enable SSL/TLS (via Caddy or your reverse proxy)
- [ ] Restrict `CORS_ORIGIN` to your Flag Engine domain
- [ ] Keep API keys secure — rotate regularly
- [ ] Enable PostgreSQL SSL (`sslmode=require`)
- [ ] Set up database backups
- [ ] Use environment variables for secrets (never commit them)
