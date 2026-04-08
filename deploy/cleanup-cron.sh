#!/usr/bin/env bash
#
# Automated data retention and cleanup for FeatureSignals.
#
# Handles:
#   - Expired refresh tokens
#   - Old audit log entries beyond retention period
#   - Docker system cleanup (dangling images, stopped containers)
#   - Stale deploy logs
#
# Usage (weekly cron):
#   0 4 * * 0 /opt/featuresignals/deploy/cleanup-cron.sh >> /var/log/fs-cleanup.log 2>&1
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/featuresignals}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.region.yml}"
AUDIT_RETENTION_DAYS="${AUDIT_RETENTION_DAYS:-90}"
DEPLOY_LOG_KEEP="${DEPLOY_LOG_KEEP:-500}"

DC="docker compose --project-directory $PROJECT_DIR -f $COMPOSE_FILE"
PG_CONTAINER=$($DC ps -q postgres 2>/dev/null || true)

run_sql() {
  if [ -n "$PG_CONTAINER" ]; then
    docker exec "$PG_CONTAINER" psql -U fs -d featuresignals -t -c "$1" 2>/dev/null
  fi
}

echo "[$(date)] === FeatureSignals Cleanup ==="

# ── Expired refresh tokens ───────────────────────────────────────────────────
if [ -n "$PG_CONTAINER" ]; then
  DELETED=$(run_sql "DELETE FROM refresh_tokens WHERE expires_at < NOW(); SELECT count(*) FROM refresh_tokens WHERE expires_at < NOW();" | tr -d ' ')
  echo "[$(date)] Expired tokens cleaned up"
fi

# ── Old audit logs ───────────────────────────────────────────────────────────
if [ -n "$PG_CONTAINER" ]; then
  run_sql "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '${AUDIT_RETENTION_DAYS} days';" > /dev/null 2>&1 || true
  echo "[$(date)] Audit logs pruned (retention: ${AUDIT_RETENTION_DAYS} days)"
fi

# ── Old product events ──────────────────────────────────────────────────────
if [ -n "$PG_CONTAINER" ]; then
  run_sql "DELETE FROM product_events WHERE created_at < NOW() - INTERVAL '180 days';" > /dev/null 2>&1 || true
  echo "[$(date)] Product events pruned (retention: 180 days)"
fi

# ── Docker cleanup ───────────────────────────────────────────────────────────
echo "[$(date)] Docker cleanup..."
docker system prune -f --filter "until=168h" 2>/dev/null || true
echo "[$(date)] Docker cleanup complete"

# ── Deploy log rotation ──────────────────────────────────────────────────────
DEPLOY_LOG="/mnt/data/deploy-history.log"
if [ -f "$DEPLOY_LOG" ]; then
  LINE_COUNT=$(wc -l < "$DEPLOY_LOG")
  if [ "$LINE_COUNT" -gt "$DEPLOY_LOG_KEEP" ]; then
    tail -n "$DEPLOY_LOG_KEEP" "$DEPLOY_LOG" > "${DEPLOY_LOG}.tmp"
    mv "${DEPLOY_LOG}.tmp" "$DEPLOY_LOG"
    echo "[$(date)] Deploy log rotated ($LINE_COUNT -> $DEPLOY_LOG_KEEP lines)"
  fi
fi

echo "[$(date)] === Cleanup complete ==="
