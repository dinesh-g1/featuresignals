#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/featuresignals"
COMPOSE_FILE="deploy/docker-compose.region.yml"

cd "$PROJECT_DIR"

if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found. Create from deploy/.env.region.example"
  exit 1
fi

REGION=$(grep '^REGION=' .env | cut -d'=' -f2)
echo "==> Deploying region: ${REGION:-unknown}"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building images..."
docker compose -f "$COMPOSE_FILE" build --parallel

echo "==> Stopping one-shot containers from previous deploy..."
docker compose -f "$COMPOSE_FILE" rm -fsv website-build docs-build migrate 2>/dev/null || true

echo "==> Removing old static site volumes..."
docker volume rm -f featuresignals_website-dist featuresignals_docs-dist 2>/dev/null || true

echo "==> Starting services..."
if ! docker compose -f "$COMPOSE_FILE" up -d 2>&1; then
  echo "==> Deploy failed. Showing logs..."
  docker compose -f "$COMPOSE_FILE" logs --tail=50 migrate postgres server 2>&1 || true
  docker compose -f "$COMPOSE_FILE" ps -a 2>&1 || true
  exit 1
fi

echo "==> Waiting for builders..."
docker compose -f "$COMPOSE_FILE" wait website-build docs-build 2>/dev/null || sleep 30

echo "==> Setting up database roles..."
bash "$PROJECT_DIR/deploy/pg-setup-roles.sh" || echo "WARNING: Role setup skipped"

echo "==> Health check..."
sleep 5
DOMAIN_API=$(grep '^DOMAIN_API=' .env | cut -d'=' -f2)
if curl -sf "http://localhost:8080/health" > /dev/null 2>&1; then
  echo "  API server: HEALTHY"
else
  echo "  API server: UNHEALTHY (may still be starting)"
fi

echo "==> Cleaning up dangling images..."
docker image prune -f

echo "==> Service status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "Deploy complete: region=${REGION} at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
