#!/usr/bin/env bash
#
# Automated data retention and cleanup for FeatureSignals.
#
# Handles:
#   - Database: expired tokens, old audit logs, product events, demo sessions, stale status checks
#   - Docker: unused images, build cache, orphaned volumes, exited containers
#   - Filesystem: old backups, journal logs, Go/npm cache, /tmp artifacts
#   - Deploy log rotation
#
# Usage (weekly cron):
#   0 4 * * 0 /opt/featuresignals/deploy/cleanup-cron.sh >> /var/log/fs-cleanup.log 2>&1
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/featuresignals}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.region.yml}"
AUDIT_RETENTION_DAYS="${AUDIT_RETENTION_DAYS:-90}"
EVENT_RETENTION_DAYS="${EVENT_RETENTION_DAYS:-180}"
STATUS_RETENTION_DAYS="${STATUS_RETENTION_DAYS:-30}"
DEPLOY_LOG_KEEP="${DEPLOY_LOG_KEEP:-500}"
BACKUP_DIR="${BACKUP_DIR:-/mnt/data/backups}"

DC="docker compose --project-directory $PROJECT_DIR -f $COMPOSE_FILE"
PG_CONTAINER=$($DC ps -q postgres 2>/dev/null || true)

run_sql() {
  if [ -n "$PG_CONTAINER" ]; then
    docker exec "$PG_CONTAINER" psql -U fs -d featuresignals -t -c "$1" 2>/dev/null
  fi
}

echo "[$(date)] === FeatureSignals Weekly Cleanup ==="

# ── Database retention ────────────────────────────────────────────────────────
if [ -n "$PG_CONTAINER" ]; then
  echo "[$(date)] Database retention..."

  run_sql "DELETE FROM refresh_tokens WHERE expires_at < NOW();" > /dev/null 2>&1 || true
  echo "[$(date)]   Expired refresh tokens purged"

  run_sql "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '${AUDIT_RETENTION_DAYS} days';" > /dev/null 2>&1 || true
  echo "[$(date)]   Audit logs pruned (retention: ${AUDIT_RETENTION_DAYS} days)"

  run_sql "DELETE FROM product_events WHERE created_at < NOW() - INTERVAL '${EVENT_RETENTION_DAYS} days';" > /dev/null 2>&1 || true
  echo "[$(date)]   Product events pruned (retention: ${EVENT_RETENTION_DAYS} days)"

  run_sql "DELETE FROM demo_sessions WHERE created_at < NOW() - INTERVAL '7 days';" > /dev/null 2>&1 || true
  echo "[$(date)]   Demo sessions pruned (retention: 7 days)"

  run_sql "DELETE FROM status_checks WHERE checked_at < NOW() - INTERVAL '${STATUS_RETENTION_DAYS} days';" > /dev/null 2>&1 || true
  echo "[$(date)]   Old status checks pruned (retention: ${STATUS_RETENTION_DAYS} days)"
else
  echo "[$(date)] WARNING: Postgres container not running, skipping DB cleanup"
fi

# ── Docker deep cleanup ──────────────────────────────────────────────────────
echo "[$(date)] Docker deep cleanup..."

docker container prune -f --filter "until=24h" 2>/dev/null || true
echo "[$(date)]   Exited containers pruned"

docker image prune -a -f --filter "until=336h" 2>/dev/null || true
echo "[$(date)]   Unused images (>14 days) pruned"

docker builder prune -f --filter "until=168h" 2>/dev/null || true
echo "[$(date)]   Build cache (>7 days) pruned"

docker volume prune -f 2>/dev/null || true
echo "[$(date)]   Orphaned volumes pruned"

# ── Backup rotation ──────────────────────────────────────────────────────────
if [ -d "$BACKUP_DIR/daily" ]; then
  OLD_DAILY=$(find "$BACKUP_DIR/daily" -name "*.sql.gz*" -mtime +7 2>/dev/null | wc -l)
  find "$BACKUP_DIR/daily" -name "*.sql.gz*" -mtime +7 -delete 2>/dev/null || true
  echo "[$(date)]   Daily backups rotated ($OLD_DAILY files removed, keeping 7 days)"
fi

if [ -d "$BACKUP_DIR/remote" ]; then
  OLD_REMOTE=$(find "$BACKUP_DIR/remote" -name "*.sql.gz*" -mtime +14 2>/dev/null | wc -l)
  find "$BACKUP_DIR/remote" -name "*.sql.gz*" -mtime +14 -delete 2>/dev/null || true
  echo "[$(date)]   Remote backups rotated ($OLD_REMOTE files removed, keeping 14 days)"
fi

# ── Filesystem cleanup ───────────────────────────────────────────────────────
echo "[$(date)] Filesystem cleanup..."

if command -v journalctl &> /dev/null; then
  sudo journalctl --vacuum-time=14d 2>/dev/null || true
  echo "[$(date)]   Journal logs rotated (keeping 14 days)"
fi

find /tmp -type f -mtime +3 -user "$(whoami)" -delete 2>/dev/null || true
echo "[$(date)]   Old /tmp files cleaned"

if [ -d "/root/go/pkg/mod/cache" ]; then
  rm -rf /root/go/pkg/mod/cache 2>/dev/null || true
  echo "[$(date)]   Go module cache (root) cleared"
fi
if [ -d "/home/deploy/go/pkg/mod/cache" ]; then
  rm -rf /home/deploy/go/pkg/mod/cache 2>/dev/null || true
  echo "[$(date)]   Go module cache (deploy) cleared"
fi

npm cache clean --force 2>/dev/null || true

# ── Deploy log rotation ──────────────────────────────────────────────────────
DEPLOY_LOG="/mnt/data/deploy-history.log"
if [ -f "$DEPLOY_LOG" ]; then
  LINE_COUNT=$(wc -l < "$DEPLOY_LOG")
  if [ "$LINE_COUNT" -gt "$DEPLOY_LOG_KEEP" ]; then
    tail -n "$DEPLOY_LOG_KEEP" "$DEPLOY_LOG" > "${DEPLOY_LOG}.tmp"
    mv "${DEPLOY_LOG}.tmp" "$DEPLOY_LOG"
    echo "[$(date)]   Deploy log rotated ($LINE_COUNT -> $DEPLOY_LOG_KEEP lines)"
  fi
fi

# ── Disk usage report ────────────────────────────────────────────────────────
echo "[$(date)] Post-cleanup disk report:"
df -h /mnt/data / 2>/dev/null || df -h /
echo "[$(date)]   Docker disk usage:"
docker system df 2>/dev/null || true

echo "[$(date)] === Cleanup complete ==="
