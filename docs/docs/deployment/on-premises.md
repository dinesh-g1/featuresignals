# On-Premises Deployment Guide

This guide covers deploying FeatureSignals on your own infrastructure with a commercial license.

## Prerequisites

- Docker 24+ and Docker Compose v2
- PostgreSQL 16+
- A valid FeatureSignals license key (Pro or Enterprise)
- The license public key file (`license-public.pem`)

## License Setup

### Obtaining a License

Contact [sales@featuresignals.com](mailto:sales@featuresignals.com) to obtain a license key for your organization. You will receive:

1. **License key** — a base64-encoded signed string
2. **Public key** — `license-public.pem` for signature verification

### License Key Format

The license key encodes:

| Field | Description |
|-------|-------------|
| `license_id` | Unique license identifier |
| `customer_name` | Your organization name |
| `plan` | `pro` or `enterprise` |
| `max_seats` | Maximum team members |
| `max_projects` | Maximum projects |
| `features` | Enabled feature list |
| `expires_at` | License expiration date |

### Configuring the License

Set the following environment variables:

```bash
# The license key string (single line, no whitespace)
LICENSE_KEY=eyJsaWNlbnNlX2lkIj...

# Path to the public key PEM file inside the container
LICENSE_PUBLIC_KEY_PATH=/etc/featuresignals/license-public.pem
```

## Docker Compose Deployment

### 1. Create project directory

```bash
mkdir featuresignals && cd featuresignals
```

### 2. Create `.env` file

```bash
# Database
POSTGRES_USER=fs
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=featuresignals
DATABASE_URL=postgres://fs:<password>@db:5432/featuresignals?sslmode=require

# Server
JWT_SECRET=<random-64-char-string>
PORT=8080
LOG_LEVEL=info
CORS_ORIGIN=https://flags.yourcompany.com

# License
LICENSE_KEY=<your-license-key>
LICENSE_PUBLIC_KEY_PATH=/etc/featuresignals/license-public.pem

# Dashboard
NEXT_PUBLIC_API_URL=https://api.flags.yourcompany.com
```

### 3. Create `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  server:
    image: ghcr.io/featuresignals/server:latest
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      PORT: "8080"
      LOG_LEVEL: ${LOG_LEVEL}
      CORS_ORIGIN: ${CORS_ORIGIN}
      LICENSE_KEY: ${LICENSE_KEY}
      LICENSE_PUBLIC_KEY_PATH: /etc/featuresignals/license-public.pem
    volumes:
      - ./license-public.pem:/etc/featuresignals/license-public.pem:ro
    ports:
      - "8080:8080"

  dashboard:
    image: ghcr.io/featuresignals/dashboard:latest
    restart: unless-stopped
    depends_on:
      - server
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    ports:
      - "3000:3000"

volumes:
  pgdata:
```

### 4. Place the license public key

```bash
cp /path/to/license-public.pem ./license-public.pem
```

### 5. Start the stack

```bash
docker compose up -d
```

### 6. Run migrations

```bash
docker compose exec server /app/migrate up
```

## Kubernetes (Helm) Deployment

### 1. Create namespace

```bash
kubectl create namespace featuresignals
```

### 2. Create secrets

```bash
# License key
kubectl create secret generic fs-license \
  --from-literal=key="<your-license-key>" \
  --from-file=public-key=license-public.pem \
  -n featuresignals

# Database credentials
kubectl create secret generic fs-db \
  --from-literal=url="postgres://fs:<password>@postgres:5432/featuresignals?sslmode=require" \
  -n featuresignals

# JWT secret
kubectl create secret generic fs-jwt \
  --from-literal=secret="<random-64-char-string>" \
  -n featuresignals
```

### 3. Install with Helm

```bash
helm install featuresignals ./deploy/helm/featuresignals \
  --namespace featuresignals \
  --set server.replicas=3 \
  --set server.license.secretName=fs-license \
  --set database.secretName=fs-db \
  --set jwt.secretName=fs-jwt
```

## Security Considerations

### Network

- Deploy behind a reverse proxy (Caddy, nginx, Traefik) with TLS termination
- Restrict database access to the server container only
- Use private networks for inter-container communication

### Secrets

- Never commit `.env`, license keys, or PEM files to version control
- Use a secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager) in production
- Rotate the JWT secret periodically and re-issue tokens

### Backups

- Configure automated PostgreSQL backups (pg_dump or WAL archiving)
- Test restore procedures quarterly
- Store backups encrypted in a separate location

### Updates

- Subscribe to release notifications at [github.com/dinesh-g1/featuresignals/releases](https://github.com/dinesh-g1/featuresignals/releases)
- Test updates in a staging environment before production
- Database migrations are forwards-compatible; run migrations before updating the server

## License Management

### Checking License Status

The server logs license status on startup:

```
{"level":"INFO","msg":"license validated","license_id":"lic-001","plan":"enterprise","seats":50,"expires":"2027-04-06","days_left":365}
```

### License Renewal

Contact [sales@featuresignals.com](mailto:sales@featuresignals.com) for renewal. Update the `LICENSE_KEY` environment variable and restart the server.

### License Expiry Behavior

| Days Before Expiry | Behavior |
|---------------------|----------|
| 30 days | Warning logged on each startup |
| 0 days | Server starts in free-tier mode (gated features disabled) |

The evaluation API continues to function even with an expired license — only management features are gated.

## Troubleshooting

### License validation failed

- Verify `LICENSE_KEY` is a single unbroken string (no newlines)
- Verify `license-public.pem` is the correct public key for your license
- Check server logs for specific error messages

### Database connection issues

- Verify `DATABASE_URL` uses the correct hostname for your deployment
- Ensure PostgreSQL allows connections from the server (check `pg_hba.conf`)
- For Docker: use service names as hostnames (`db`, `postgres`)

### Health checks

- `GET /health` returns 200 when the server is alive
- Check database connectivity via the health endpoint
