#!/usr/bin/env bash
set -euo pipefail

echo "======================================"
echo " FeatureSignals On-Premises Upgrade"
echo "======================================"

INSTALL_DIR="${INSTALL_DIR:-/opt/featuresignals}"
COMPOSE_FILE="docker-compose.onprem.yml"
cd "$INSTALL_DIR"

TARGET_VERSION="${1:-latest}"
echo "Target version: $TARGET_VERSION"
echo ""

echo "==> Pre-upgrade backup..."
bash backup.sh || echo "WARNING: Backup failed, continuing anyway"

echo "==> Pulling new images (version: $TARGET_VERSION)..."
VERSION="$TARGET_VERSION" docker compose -f "$COMPOSE_FILE" pull

echo "==> Stopping services..."
docker compose -f "$COMPOSE_FILE" down

echo "==> Starting with new version..."
VERSION="$TARGET_VERSION" docker compose -f "$COMPOSE_FILE" up -d

echo "==> Waiting for migration and health..."
sleep 15

echo "==> Service status:"
docker compose -f "$COMPOSE_FILE" ps

echo "==> Health check..."
if curl -sf --max-time 10 http://localhost:${API_PORT:-8080}/health; then
  echo ""
  echo "Upgrade complete to version: $TARGET_VERSION"
else
  echo ""
  echo "WARNING: Health check failed after upgrade."
  echo "To rollback, run: VERSION=<previous-version> docker compose -f $COMPOSE_FILE up -d"
fi

echo "==> Cleaning old images..."
docker image prune -f
