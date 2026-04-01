---
sidebar_position: 2
title: Installation
---

# Installation

FeatureSignals can be installed via Docker Compose (recommended), standalone Docker, or built from source.

## Docker Compose (Recommended)

The fastest way to run the full stack locally:

```bash
git clone https://github.com/dinesh-g1/featuresignals.git
cd featuresignals
docker compose up -d
```

This starts all services:

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Data store |
| API Server | 8080 | REST API + SSE |
| Dashboard | 3000 | Web UI (Next.js) |

Migrations run automatically via the `migrate` service.

## Standalone Docker

### API Server

```bash
docker build -f deploy/docker/Dockerfile.server -t featuresignals-server ./server

docker run -d \
  -p 8080:8080 \
  -e DATABASE_URL="postgres://user:pass@host:5432/featuresignals?sslmode=disable" \
  -e JWT_SECRET="your-secret-here" \
  -e CORS_ORIGIN="http://localhost:3000" \
  featuresignals-server
```

### Dashboard

```bash
docker build -f deploy/docker/Dockerfile.dashboard -t featuresignals-dashboard ./dashboard

docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:8080" \
  featuresignals-dashboard
```

### Relay Proxy

```bash
docker build -f deploy/docker/Dockerfile.relay -t featuresignals-relay .

docker run -d \
  -p 8090:8090 \
  -e FS_API_KEY="your-api-key" \
  -e FS_ENV_KEY="production" \
  -e FS_UPSTREAM="http://your-server:8080" \
  featuresignals-relay
```

## Build from Source

### Prerequisites

- Go 1.22+
- Node.js 18+ and npm
- PostgreSQL 14+

### API Server

```bash
cd server
go build -o featuresignals-server ./cmd/server
./featuresignals-server
```

### Dashboard

```bash
cd dashboard
npm install
npm run build
npm start
```

### Database Setup

Create the database and run migrations:

```bash
createdb featuresignals

# Using golang-migrate
migrate -path server/migrations \
  -database "postgres://user:pass@localhost:5432/featuresignals?sslmode=disable" \
  up
```

## Verifying the Installation

After starting, verify the API is healthy:

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{"status": "ok", "service": "featuresignals"}
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Next Steps

- [Quickstart](/getting-started/quickstart) — create your first flag
- [Configuration Reference](/deployment/configuration) — environment variables
- [Self-Hosting Guide](/deployment/self-hosting) — production deployment
