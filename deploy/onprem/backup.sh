#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/featuresignals}"
BACKUP_DIR="${BACKUP_DIR:-$INSTALL_DIR/backups}"
COMPOSE_FILE="docker-compose.onprem.yml"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

cd "$INSTALL_DIR"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/featuresignals_${TIMESTAMP}.sql.gz"

echo "==> Creating database backup: $BACKUP_FILE"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-fs}" -d "${POSTGRES_DB:-featuresignals}" --clean --if-exists \
  | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  Backup size: $BACKUP_SIZE"

echo "==> Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "featuresignals_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "featuresignals_*.sql.gz" | wc -l | tr -d ' ')
echo "  Retained backups: $BACKUP_COUNT"
echo "  Backup complete: $BACKUP_FILE"
