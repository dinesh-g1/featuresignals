#!/usr/bin/env bash
#
# PostgreSQL daily backup script for FeatureSignals.
#
# Usage:
#   crontab -e
#   0 3 * * * /opt/featuresignals/deploy/pg-backup.sh >> /var/log/fs-backup.log 2>&1
#
set -euo pipefail

BACKUP_DIR="/opt/featuresignals/backups"
COMPOSE_FILE="/opt/featuresignals/docker-compose.prod.yml"
DAILY_KEEP=7
WEEKLY_KEEP=4
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q postgres)
if [ -z "$CONTAINER" ]; then
  echo "[$(date)] ERROR: postgres container not running"
  exit 1
fi

DAILY_FILE="$BACKUP_DIR/daily/featuresignals_${TIMESTAMP}.sql.gz"
echo "[$(date)] Starting daily backup -> $DAILY_FILE"
docker exec "$CONTAINER" pg_dump -U fs featuresignals | gzip > "$DAILY_FILE"
echo "[$(date)] Daily backup complete ($(du -h "$DAILY_FILE" | cut -f1))"

if [ "$DAY_OF_WEEK" -eq 7 ]; then
  WEEKLY_FILE="$BACKUP_DIR/weekly/featuresignals_${TIMESTAMP}.sql.gz"
  cp "$DAILY_FILE" "$WEEKLY_FILE"
  echo "[$(date)] Weekly backup copied -> $WEEKLY_FILE"
fi

echo "[$(date)] Rotating old backups..."
ls -t "$BACKUP_DIR/daily/"*.sql.gz 2>/dev/null | tail -n +$((DAILY_KEEP + 1)) | xargs -r rm -f
ls -t "$BACKUP_DIR/weekly/"*.sql.gz 2>/dev/null | tail -n +$((WEEKLY_KEEP + 1)) | xargs -r rm -f

echo "[$(date)] Backup rotation complete"
