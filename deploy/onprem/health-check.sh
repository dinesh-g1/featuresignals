#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/featuresignals}"
COMPOSE_FILE="docker-compose.onprem.yml"
API_PORT="${API_PORT:-8080}"

cd "$INSTALL_DIR"

echo "======================================"
echo " FeatureSignals Health Check"
echo "======================================"
echo ""

echo "==> Container Status:"
docker compose -f "$COMPOSE_FILE" ps
echo ""

echo "==> API Health:"
if curl -sf --max-time 5 "http://localhost:${API_PORT}/health"; then
  echo "  [OK]"
else
  echo "  [FAIL] API not responding"
fi
echo ""

echo "==> Database Connectivity:"
if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-fs}" -d "${POSTGRES_DB:-featuresignals}" > /dev/null 2>&1; then
  echo "  [OK] PostgreSQL is ready"
else
  echo "  [FAIL] PostgreSQL not ready"
fi
echo ""

echo "==> Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" $(docker compose -f "$COMPOSE_FILE" ps -q 2>/dev/null) 2>/dev/null || echo "  Unable to get stats"
echo ""

echo "==> Disk Usage:"
echo "  Docker volumes:"
docker system df -v 2>/dev/null | grep -A 20 "VOLUME NAME" | head -10 || echo "  Unable to get disk info"
echo ""

BACKUP_DIR="${BACKUP_DIR:-$INSTALL_DIR/backups}"
if [ -d "$BACKUP_DIR" ]; then
  LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/featuresignals_*.sql.gz 2>/dev/null | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    echo "==> Latest Backup:"
    echo "  File: $(basename "$LATEST_BACKUP")"
    echo "  Size: $(du -h "$LATEST_BACKUP" | cut -f1)"
    echo "  Age:  $(stat -c %y "$LATEST_BACKUP" 2>/dev/null || stat -f %Sm "$LATEST_BACKUP" 2>/dev/null)"
  else
    echo "==> No backups found in $BACKUP_DIR"
  fi
fi
