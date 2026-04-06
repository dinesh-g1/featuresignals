#!/usr/bin/env bash
set -euo pipefail

echo "======================================"
echo " FeatureSignals On-Premises Setup"
echo "======================================"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required. Install from https://docs.docker.com/get-docker/"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "ERROR: Docker Compose v2 is required."; exit 1; }

INSTALL_DIR="${INSTALL_DIR:-/opt/featuresignals}"
COMPOSE_FILE="docker-compose.onprem.yml"

echo "Install directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ ! -f ".env" ]; then
  if [ -f ".env.onprem.example" ]; then
    cp .env.onprem.example .env
    echo "Created .env from template. Please edit it with your settings."
    echo ""
    echo "Required: Set JWT_SECRET and POSTGRES_PASSWORD"
    echo "  openssl rand -hex 32  (for JWT_SECRET)"
    echo "  openssl rand -hex 24  (for POSTGRES_PASSWORD)"
    echo ""
    echo "Run this script again after editing .env"
    exit 0
  else
    echo "ERROR: No .env file found. Create from .env.onprem.example"
    exit 1
  fi
fi

echo "==> Pulling images..."
docker compose -f "$COMPOSE_FILE" pull 2>/dev/null || echo "Pull skipped (building locally)"

echo "==> Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Waiting for health checks..."
sleep 10

echo "==> Service status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "==> Testing API health..."
if curl -sf --max-time 10 http://localhost:${API_PORT:-8080}/health; then
  echo ""
  echo "FeatureSignals is running!"
  echo "  API:       http://localhost:${API_PORT:-8080}"
  echo "  Dashboard: http://localhost:${DASHBOARD_PORT:-3000}"
else
  echo ""
  echo "WARNING: API health check failed. Check logs with:"
  echo "  docker compose -f $COMPOSE_FILE logs server"
fi
