#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/featuresignals}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.region.yml}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"

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
COMPOSE_FILE="$COMPOSE_FILE" bash "$PROJECT_DIR/deploy/pg-setup-roles.sh" || echo "WARNING: Role setup skipped"

echo "==> Health check (retrying up to ${HEALTH_RETRIES} times, ${HEALTH_INTERVAL}s interval)..."
healthy=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -sf "http://localhost:8080/health" > /dev/null 2>&1; then
    echo "  API server: HEALTHY (attempt $i)"
    healthy=true
    break
  fi
  echo "  Attempt $i/$HEALTH_RETRIES: not ready, waiting ${HEALTH_INTERVAL}s..."
  sleep "$HEALTH_INTERVAL"
done

if [ "$healthy" = false ]; then
  echo "  API server: UNHEALTHY after ${HEALTH_RETRIES} attempts"
  echo "  Recent logs:"
  docker compose -f "$COMPOSE_FILE" logs --tail=20 server 2>&1 || true
fi

echo "==> Cleaning up dangling images..."
docker image prune -f

echo "==> Service status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "Deploy complete: region=${REGION} at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
