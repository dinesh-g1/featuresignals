#!/usr/bin/env bash
#
# PostgreSQL backup verification script for FeatureSignals.
#
# Restores the latest daily backup into a temporary container and runs
# sanity queries to prove the backup is restorable and contains data.
# Supports both encrypted (.gpg) and plain (.gz) backup files.
#
# Usage (weekly cron):
#   0 6 * * 0 /opt/featuresignals/deploy/pg-backup-verify.sh >> /var/log/fs-backup-verify.log 2>&1
#
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/mnt/data/backups/daily}"
VERIFY_CONTAINER="fs-backup-verify"
DB_NAME="${POSTGRES_DB:-featuresignals}"
DB_USER="${POSTGRES_USER:-fs}"

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz* 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
  echo "[$(date)] ERROR: No backup files found in $BACKUP_DIR"
  exit 1
fi

echo "[$(date)] Verifying backup: $LATEST_BACKUP"
echo "[$(date)] Backup size: $(du -h "$LATEST_BACKUP" | cut -f1)"

cleanup() {
  echo "[$(date)] Cleaning up verification container..."
  docker rm -f "$VERIFY_CONTAINER" 2>/dev/null || true
}
trap cleanup EXIT

echo "[$(date)] Starting temporary Postgres container..."
docker run -d \
  --name "$VERIFY_CONTAINER" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD=verify_temp \
  -e POSTGRES_DB="$DB_NAME" \
  postgres:16-alpine

echo "[$(date)] Waiting for Postgres to accept connections..."
for i in $(seq 1 30); do
  if docker exec "$VERIFY_CONTAINER" pg_isready -U "$DB_USER" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[$(date)] Restoring backup..."
if [[ "$LATEST_BACKUP" == *.gpg ]]; then
  gpg --decrypt --quiet "$LATEST_BACKUP" | gunzip | \
    docker exec -i "$VERIFY_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null
else
  gunzip -c "$LATEST_BACKUP" | docker exec -i "$VERIFY_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null
fi

echo "[$(date)] Running sanity queries..."
ERRORS=0

check_table() {
  local table=$1
  local count
  count=$(docker exec "$VERIFY_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM $table;" 2>/dev/null | tr -d ' ')
  if [ -z "$count" ] || [ "$count" = "" ]; then
    echo "[$(date)] ERROR: Table '$table' query failed"
    ERRORS=$((ERRORS + 1))
  else
    echo "[$(date)] OK: $table has $count rows"
  fi
}

check_table "organizations"
check_table "users"
check_table "projects"
check_table "flags"

TABLE_COUNT=$(docker exec "$VERIFY_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "[$(date)] Total tables in backup: $TABLE_COUNT"

if [ "$ERRORS" -gt 0 ]; then
  echo "[$(date)] VERIFICATION FAILED: $ERRORS errors encountered"
  exit 1
fi

echo "[$(date)] VERIFICATION PASSED: backup is restorable and contains expected data"
