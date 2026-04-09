---
title: Self-Hosting Guide
sidebar_position: 1
description: "Complete self-hosting setup guide for FeatureSignals including Docker Compose, reverse proxy, backup, and monitoring."
---

# Enterprise self-hosting onboarding

This guide is for teams deploying **FeatureSignals** on their own infrastructure using the official on-premises bundle (`deploy/onprem/`). It covers prerequisites, first boot, configuration, sizing, TLS fronting, upgrades, backups, monitoring, and common failures.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Docker** | 24 or newer (Engine + CLI). |
| **Docker Compose** | v2 (`docker compose`, not legacy `docker-compose`). |
| **Host memory** | At least **4 GB RAM** available to containers for the default Compose limits (see [Sizing guide](#sizing-guide)). |
| **Database** | **PostgreSQL-compatible**: the stack ships **PostgreSQL 16** in Compose. You may use an external Postgres 14+ if you adapt `DATABASE_URL` and remove or replace the `postgres` service (not covered by the default compose file). |
| **Network ports** | **8080** (API), **3000** (Flag Engine), and **5432** (database, bound to `127.0.0.1:5432` by default). Ensure these are free or override `API_PORT`, `DASHBOARD_PORT`, and `DB_PORT` in `.env`. |
| **Shell utilities** | `bash`, `curl`, and `gzip` for bundled scripts. |

Optional: a reverse proxy (Nginx, Caddy, or your platform ingress) terminating TLS in front of the API and Flag Engine.

## Quick start (about five minutes)

1. **Copy the on-premises bundle** from the FeatureSignals repository to a directory on the server (example: `/opt/featuresignals`):

   ```bash
   sudo mkdir -p /opt/featuresignals
   sudo cp -r /path/to/featuresignals/deploy/onprem/* /opt/featuresignals/
   ```

2. **Copy SQL migrations** next to the compose file (the `migrate` service mounts `./migrations` read-only):

   ```bash
   sudo cp -r /path/to/featuresignals/server/migrations /opt/featuresignals/migrations
   ```

3. **Create environment file**:

   ```bash
   cd /opt/featuresignals
   cp .env.onprem.example .env
   ```

4. **Set secrets** in `.env` (required):

   ```bash
   openssl rand -hex 32   # use for JWT_SECRET
   openssl rand -hex 24   # use for POSTGRES_PASSWORD
   ```

5. **Start the stack**:

   ```bash
   docker compose -f docker-compose.onprem.yml up -d
   ```

6. **Verify**:

   - API: `http://<host>:8080/health` (or your `API_PORT`)
   - Flag Engine: `http://<host>:3000` (or your `DASHBOARD_PORT`)

Alternatively, after step 3, run `./setup.sh` from the install directory; it checks Docker, pulls images, runs `docker compose up -d`, and probes `/health`.

## Configuration reference

Variables below are defined in `deploy/onprem/.env.onprem.example`. Values shown are typical defaults unless noted.

### Required

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Signing key for management API JWTs. **Required.** Use a long random value (e.g. `openssl rand -hex 32`). Do not reuse across environments. |
| `POSTGRES_PASSWORD` | Password for the `POSTGRES_USER` database role. **Required.** |

### URLs and CORS

| Variable | Description |
|----------|-------------|
| `APP_BASE_URL` | Public base URL of the **API** as seen by clients (e.g. `https://api.flags.example.com`). Used by the server for links and callbacks. |
| `DASHBOARD_URL` | Public URL of the **Flag Engine** (e.g. `https://flags.example.com`). |
| `CORS_ORIGIN` | Allowed browser origin for the management API. Must match the scheme/host/port your users use to open the Flag Engine (comma-separated list if multiple). |
| `NEXT_PUBLIC_API_URL` | Flag Engine build-time/public API base URL; set to the same origin users use to reach the API (often your HTTPS API URL). |

### Ports

| Variable | Description |
|----------|-------------|
| `API_PORT` | Host port mapped to the API container (`8080` inside the container). |
| `DASHBOARD_PORT` | Host port mapped to the Flag Engine. |
| `DB_PORT` | Host bind for Postgres (default `127.0.0.1:5432` so the DB is not exposed on all interfaces). |

### Database

| Variable | Description |
|----------|-------------|
| `POSTGRES_DB` | Database name (default `featuresignals`). |
| `POSTGRES_USER` | Database user (default `fs`). |

### Operations

| Variable | Description |
|----------|-------------|
| `LOG_LEVEL` | Server log verbosity (e.g. `info`, `debug`). |
| `AUDIT_RETENTION_DAYS` | How long the server retains audit data before pruning (default `90`). |
| `VERSION` | Image tag for server and Flag Engine (e.g. `latest` or a release tag). Used by Compose and `upgrade.sh`. |
| `REGISTRY` | Container registry prefix for images (default `ghcr.io/dinesh-g1`). |

### Resource limits (Compose `deploy.resources.limits.memory`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_MEMORY_LIMIT` | `2G` | Cap for the PostgreSQL container. |
| `API_MEMORY_LIMIT` | `1G` | Cap for the API server container. |
| `DASHBOARD_MEMORY_LIMIT` | `512M` | Cap for the Flag Engine container. |

### Enterprise license

| Variable | Description |
|----------|-------------|
| `LICENSE_KEY` | Optional. Enterprise license string when provided by FeatureSignals. |

### OpenTelemetry (optional)

| Variable | Description |
|----------|-------------|
| `OTEL_ENABLED` | `true` / `false` — master switch for telemetry export. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP gRPC/HTTP endpoint for your collector (e.g. `otel-collector:4317`). |
| `OTEL_INGESTION_KEY` | Optional header/ingestion key if your backend requires it. |
| `OTEL_SERVICE_NAME` | Logical service name (default in compose: `featuresignals-onprem`). |
| `OTEL_SERVICE_REGION` | Region or site label (default `onprem`). |
| `OTEL_TRACES_ENABLED` | Export traces when `true`. |
| `OTEL_METRICS_ENABLED` | Export metrics when `true`. |

The API server also supports additional OTEL tuning via environment (for example trace sampling and log export); see `server/internal/config/config.go` for the full set when you need fine-grained control.

### Script helpers (environment only, not in `.env.onprem.example`)

| Variable | Description |
|----------|-------------|
| `INSTALL_DIR` | Directory containing `docker-compose.onprem.yml` (default `/opt/featuresignals` in `setup.sh`, `upgrade.sh`, `backup.sh`, `health-check.sh`). |
| `BACKUP_DIR` | Where `backup.sh` writes dumps (default `$INSTALL_DIR/backups`). |
| `BACKUP_RETENTION_DAYS` | How long to keep `featuresignals_*.sql.gz` files (default `7`). |

Ensure `API_PORT` is exported in your shell when running `upgrade.sh` or `health-check.sh` if you use a non-default API port (scripts default to `8080`).

## Sizing guide

Default Compose memory limits total roughly **3.5 GB** (`2G` + `1G` + `512M`) **before** OS and Docker overhead. Treat **4 GB RAM** as the practical minimum for the bundle as shipped.

### Small (up to ~10 users)

- **RAM**: 4 GB host minimum; keep default limits or slightly lower `DB_MEMORY_LIMIT` only if the database is lightly used.
- **vCPU**: 2 cores.
- **Disk**: 20 GB+ SSD for images, volumes, and logs.
- **Use case**: pilots, single team, low evaluation traffic.

### Medium (up to ~50 users)

- **RAM**: 8 GB recommended (`DB_MEMORY_LIMIT=3G`, `API_MEMORY_LIMIT=2G`, `DASHBOARD_MEMORY_LIMIT=512M` is a reasonable starting point).
- **vCPU**: 4 cores.
- **Disk**: 50 GB+ SSD; monitor PostgreSQL volume growth.
- **Use case**: several teams, moderate Flag Engine and API load.

### Large (100+ users or heavy evaluation volume)

- **RAM**: 16 GB+ on the application host; **run PostgreSQL on dedicated hardware or a managed service** with appropriate `max_connections`, IOPS, and backups.
- **vCPU**: 8+ cores for the API tier; consider **multiple API instances** behind a load balancer (requires splitting the default single-compose topology).
- **Disk**: Sized for retention, audit volume, and backup storage.
- **Use case**: organization-wide adoption, strict isolation, or high request rates.

Scale evaluation traffic separately: the hot path is designed for low latency; if you outgrow a single node, plan for horizontal API replicas and a shared Postgres with connection pooling.

## Reverse proxy setup

Place TLS termination in front of the host ports (`API_PORT` / `DASHBOARD_PORT`). Update `.env` so `APP_BASE_URL`, `DASHBOARD_URL`, `CORS_ORIGIN`, and `NEXT_PUBLIC_API_URL` use **HTTPS** and the public hostnames.

### Nginx (example)

```nginx
# API
server {
    listen 443 ssl http2;
    server_name api.flags.example.com;

    ssl_certificate     /etc/ssl/certs/flags.example.com.crt;
    ssl_certificate_key /etc/ssl/private/flags.example.com.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Flag Engine
server {
    listen 443 ssl http2;
    server_name flags.example.com;

    ssl_certificate     /etc/ssl/certs/flags.example.com.crt;
    ssl_certificate_key /etc/ssl/private/flags.example.com.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy (example)

```caddy
api.flags.example.com {
    reverse_proxy 127.0.0.1:8080
}

flags.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

After changing URLs, **restart** the Flag Engine and API containers so configuration and the Flag Engine’s `NEXT_PUBLIC_API_URL` match what browsers use.

## Upgrade procedure

The repository includes `deploy/onprem/upgrade.sh`.

1. **Install directory** should contain `docker-compose.onprem.yml`, `.env`, and `migrations/`.
2. **Run the upgrade** (from the install directory or with `INSTALL_DIR` set):

   ```bash
   cd /opt/featuresignals
   export API_PORT=8080   # if not using default
   ./upgrade.sh v1.2.3    # or: ./upgrade.sh latest
   ```

What the script does:

- Runs `backup.sh` (continues with a warning if backup fails).
- `docker compose pull` with `VERSION` set to the target tag.
- `docker compose down`, then `up -d` with the new images.
- Waits briefly, prints `docker compose ps`, and curls `http://localhost:${API_PORT}/health`.

### Rollback

1. Identify the previous working image tag (`VERSION`).
2. Bring the stack up with that tag:

   ```bash
   cd /opt/featuresignals
   VERSION=<previous-tag> docker compose -f docker-compose.onprem.yml pull
   VERSION=<previous-tag> docker compose -f docker-compose.onprem.yml up -d
   ```

3. If the database migrated forward and is incompatible with the old binary, restore from backup (see below) or contact support for migration guidance—**always take backups before upgrading production**.

## Backup and restore

### Backup (`backup.sh`)

From the install directory:

```bash
cd /opt/featuresignals
./backup.sh
```

Produces a gzipped **plain SQL** dump: `backups/featuresignals_YYYYMMDD_HHMMSS.sql.gz` (via `pg_dump --clean --if-exists`). Old files are pruned according to `BACKUP_RETENTION_DAYS` (default 7 days).

Schedule with cron (example daily at 02:30 UTC):

```cron
30 2 * * * INSTALL_DIR=/opt/featuresignals /opt/featuresignals/backup.sh >> /var/log/featuresignals-backup.log 2>&1
```

### Restore (from `backup.sh` output)

The bundled backups are **SQL text**, not the custom/binary format. Restore with **`psql`**, not `pg_restore`:

1. Stop traffic to the stack (maintenance window).
2. Stop application containers (keep Postgres running, or start only Postgres):

   ```bash
   cd /opt/featuresignals
   docker compose -f docker-compose.onprem.yml stop server dashboard
   ```

3. Restore (replace the file name with your backup):

   ```bash
   gunzip -c backups/featuresignals_20260115_020000.sql.gz | \
     docker compose -f docker-compose.onprem.yml exec -T postgres \
     psql -U "${POSTGRES_USER:-fs}" -d "${POSTGRES_DB:-featuresignals}"
   ```

4. Start the stack:

   ```bash
   docker compose -f docker-compose.onprem.yml up -d
   ```

5. Verify `/health` and a Flag Engine login.

**`pg_restore`** is used for **custom-format** archives (`pg_dump -Fc`). If you take custom-format dumps separately, restore with:

```bash
pg_restore --clean --if-exists -h <host> -U <user> -d <database> backup.dump
```

Adapt host/user/database to your deployment; for Docker, use `docker compose exec` with `pg_restore` inside the image if available.

## Monitoring

### Health script (`health-check.sh`)

```bash
cd /opt/featuresignals
export API_PORT=8080   # match .env if customized
./health-check.sh
```

The script prints:

- `docker compose ps`
- HTTP check against `http://localhost:${API_PORT}/health`
- `pg_isready` inside the Postgres container
- `docker stats` for running compose containers
- Docker volume disk summary (when available)
- Latest backup file in `BACKUP_DIR`, if present

### OpenTelemetry

Set `OTEL_ENABLED=true` and point `OTEL_EXPORTER_OTLP_ENDPOINT` at your collector. Enable `OTEL_TRACES_ENABLED` / `OTEL_METRICS_ENABLED` as needed. Use resource attributes (`OTEL_SERVICE_NAME`, `OTEL_SERVICE_REGION`) to separate environments in your observability backend.

## Troubleshooting

### Container will not start

- Run `docker compose -f docker-compose.onprem.yml logs server migrate dashboard postgres` and look for the first error.
- Confirm `.env` defines **`JWT_SECRET`** and **`POSTGRES_PASSWORD`** (Compose treats missing required variables as fatal).
- Confirm the **`migrations`** directory exists beside the compose file and is readable.

### Migration fails

- Ensure Postgres is healthy (`docker compose ps`, postgres healthcheck).
- Check migrate logs: `docker compose -f docker-compose.onprem.yml logs migrate`.
- Do not delete partial migration state without guidance; restore from backup if the database is in a bad state.

### Cannot connect to the database

- From the host: `docker compose -f docker-compose.onprem.yml exec postgres pg_isready -U fs -d featuresignals`.
- Verify `DATABASE_URL` components match `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.
- If using a custom `DB_PORT`, confirm nothing else is bound to that address.

### CORS errors in the browser

- `CORS_ORIGIN` must **exactly** match the Flag Engine origin (scheme + host + port), e.g. `https://flags.example.com` with no trailing slash mismatch.
- The API must trust the same URL you put in `NEXT_PUBLIC_API_URL` for the Flag Engine build/runtime.

### Flag Engine blank page or endless loading

- Open dev tools → **Network**: failed calls to the wrong host indicate **`NEXT_PUBLIC_API_URL`** not updated for your public API URL; rebuild/restart the `dashboard` container after changing it.
- Confirm the API is reachable from the browser (same network, firewall, and TLS certificates valid).
- Check Flag Engine logs: `docker compose -f docker-compose.onprem.yml logs dashboard`.

---

For licensing, support escalation, and architecture review for large deployments, use your enterprise support channel or sales contact.
