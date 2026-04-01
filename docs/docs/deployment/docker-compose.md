---
sidebar_position: 1
title: Docker Compose
---

# Docker Compose Deployment

The quickest way to run FeatureSignals is with Docker Compose.

## Quick Start

```bash
git clone https://github.com/featuresignals/featuresignals.git
cd featuresignals
docker compose up -d
```

## Services

The `docker-compose.yml` defines these services:

### PostgreSQL

```yaml
postgres:
  image: postgres:16-alpine
  ports:
    - "5432:5432"
  environment:
    POSTGRES_DB: featuresignals
    POSTGRES_USER: fs
    POSTGRES_PASSWORD: fsdev
  volumes:
    - pgdata:/var/lib/postgresql/data
```

Data is persisted to a Docker volume.

### Migrate

```yaml
migrate:
  image: migrate/migrate:v4.17.0
  depends_on:
    - postgres
  volumes:
    - ./server/migrations:/migrations
  command:
    ["-path", "/migrations", "-database", "postgres://fs:fsdev@postgres:5432/featuresignals?sslmode=disable", "up"]
```

Runs database migrations on startup.

### API Server

```yaml
server:
  build:
    context: ./server
    dockerfile: ../deploy/docker/Dockerfile.server
  ports:
    - "8080:8080"
  depends_on:
    - postgres
    - migrate
  environment:
    DATABASE_URL: postgres://fs:fsdev@postgres:5432/featuresignals?sslmode=disable
    JWT_SECRET: dev-secret-change-in-production
    PORT: "8080"
    CORS_ORIGIN: http://localhost:3000
```

### Dashboard

```yaml
dashboard:
  build:
    context: ./dashboard
    dockerfile: ../deploy/docker/Dockerfile.dashboard
  ports:
    - "3000:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://localhost:8080
```

## Accessing Services

| Service | URL |
|---------|-----|
| Dashboard | [http://localhost:3000](http://localhost:3000) |
| API Server | [http://localhost:8080](http://localhost:8080) |
| Health Check | [http://localhost:8080/health](http://localhost:8080/health) |

## Stopping

```bash
docker compose down
```

To also remove data:

```bash
docker compose down -v
```

## Adding the Relay Proxy

Add the relay proxy to your `docker-compose.yml`:

```yaml
relay:
  build:
    context: .
    dockerfile: deploy/docker/Dockerfile.relay
  ports:
    - "8090:8090"
  depends_on:
    - server
  environment:
    FS_API_KEY: "your-api-key-here"
    FS_ENV_KEY: "production"
    FS_UPSTREAM: "http://server:8080"
```
