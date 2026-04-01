#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/featuresignals"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$PROJECT_DIR"

if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found. CD pipeline should create it from GitHub secrets."
  exit 1
fi

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building images..."
docker compose -f "$COMPOSE_FILE" build --parallel

echo "==> Stopping one-shot build containers (if running from previous deploy)..."
docker compose -f "$COMPOSE_FILE" rm -fsv website-build docs-build migrate 2>/dev/null || true

echo "==> Removing old static site volumes (forces rebuild)..."
docker volume rm -f featuresignals_website-dist featuresignals_docs-dist 2>/dev/null || true

echo "==> Starting services..."
if ! docker compose -f "$COMPOSE_FILE" up -d 2>&1; then
  echo ""
  echo "==> Deploy failed. Showing logs for failed services..."
  echo "--- migrate logs ---"
  docker compose -f "$COMPOSE_FILE" logs migrate 2>&1 || true
  echo "--- postgres logs ---"
  docker compose -f "$COMPOSE_FILE" logs postgres 2>&1 || true
  echo "--- all service status ---"
  docker compose -f "$COMPOSE_FILE" ps -a 2>&1 || true
  exit 1
fi

echo "==> Waiting for one-shot builders to finish..."
docker compose -f "$COMPOSE_FILE" wait website-build docs-build 2>/dev/null || sleep 30

echo "==> Cleaning up dangling images..."
docker image prune -f

echo "==> Service status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "Deploy complete at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
