---
sidebar_position: 3
title: Configuration
---

# Configuration Reference

All configuration is done via environment variables.

## API Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DATABASE_URL` | `postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=require` | PostgreSQL connection string |
| `JWT_SECRET` | `dev-secret-change-in-production` | Secret for JWT token signing. Must not be left at the default in non-debug environments — the server will refuse to start. |
| `TOKEN_TTL_MINUTES` | `60` | Access token lifetime (minutes) |
| `REFRESH_TTL_HOURS` | `168` | Refresh token lifetime (hours, default 7 days) |
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

### Example

```bash
export DATABASE_URL="postgres://fs:strongpass@db.example.com:5432/featuresignals?sslmode=require"
export JWT_SECRET="$(openssl rand -hex 32)"
export CORS_ORIGIN="https://flags.example.com"
export PORT=8080
export LOG_LEVEL=info
export TOKEN_TTL_MINUTES=30
export REFRESH_TTL_HOURS=168
```

## Dashboard

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | API server URL (used by browser) |

:::caution
`NEXT_PUBLIC_API_URL` must be accessible from the user's browser, not just the server. In production, use the public API URL (e.g., `https://api.example.com`).
:::

## Relay Proxy

| Flag | Environment Variable | Default | Description |
|------|---------------------|---------|-------------|
| `-api-key` | `FS_API_KEY` | (required) | Server API key |
| `-env-key` | `FS_ENV_KEY` | (required) | Environment slug |
| `-upstream` | `FS_UPSTREAM` | `https://api.featuresignals.com` | Upstream API URL |
| `-port` | `FS_PORT` | `8090` | Local listening port |
| `-poll` | `FS_POLL` | `30s` | Polling interval |
| `-sse` | `FS_SSE` | `true` | Use SSE for real-time sync |

## PostgreSQL Requirements

- **Version**: 14 or later (16 recommended)
- **Extensions**: None required (standard PostgreSQL)
- **Connection pool**: The server uses `pgxpool` with default settings

### Recommended PostgreSQL Settings

For production workloads:

```ini
# postgresql.conf
max_connections = 100
shared_buffers = 256MB
work_mem = 4MB
maintenance_work_mem = 64MB
```

## Docker Environment

When using Docker Compose, environment variables are set in `docker-compose.yml` or via a `.env` file:

```bash
# .env
DATABASE_URL=postgres://fs:strongpass@postgres:5432/featuresignals?sslmode=disable
JWT_SECRET=my-production-secret
CORS_ORIGIN=https://flags.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
```
