#!/usr/bin/env bash
#
# PostgreSQL daily backup script for FeatureSignals.
#
# Usage:
#   crontab -e
#   0 3 * * * /opt/featuresignals/deploy/pg-backup.sh >> /var/log/fs-backup.log 2>&1
#
# All paths are configurable via environment variables.
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/featuresignals}"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_DIR}/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-${PROJECT_DIR}/docker-compose.prod.yml}"
DB_NAME="${POSTGRES_DB:-featuresignals}"
DB_USER="${POSTGRES_USER:-fs}"
DAILY_KEEP="${DAILY_KEEP:-7}"
WEEKLY_KEEP="${WEEKLY_KEEP:-4}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q postgres)
if [ -z "$CONTAINER" ]; then
  echo "[$(date)] ERROR: postgres container not running"
  exit 1
fi

DAILY_FILE="$BACKUP_DIR/daily/${DB_NAME}_${TIMESTAMP}.sql.gz"
echo "[$(date)] Starting daily backup -> $DAILY_FILE"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$DAILY_FILE"
echo "[$(date)] Daily backup complete ($(du -h "$DAILY_FILE" | cut -f1))"

if [ "$DAY_OF_WEEK" -eq 7 ]; then
  WEEKLY_FILE="$BACKUP_DIR/weekly/${DB_NAME}_${TIMESTAMP}.sql.gz"
  cp "$DAILY_FILE" "$WEEKLY_FILE"
  echo "[$(date)] Weekly backup copied -> $WEEKLY_FILE"
fi

echo "[$(date)] Rotating old backups..."
ls -t "$BACKUP_DIR/daily/"*.sql.gz 2>/dev/null | tail -n +$((DAILY_KEEP + 1)) | xargs -r rm -f
ls -t "$BACKUP_DIR/weekly/"*.sql.gz 2>/dev/null | tail -n +$((WEEKLY_KEEP + 1)) | xargs -r rm -f

echo "[$(date)] Backup rotation complete"
