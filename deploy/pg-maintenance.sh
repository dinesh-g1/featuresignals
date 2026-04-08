#!/usr/bin/env bash
#
# PostgreSQL maintenance script for FeatureSignals.
#
# Runs VACUUM ANALYZE on high-write tables, logs table/index sizes
# for trend monitoring, and reindexes bloated indexes.
#
# Usage (weekly cron):
#   0 5 * * 0 /opt/featuresignals/deploy/pg-maintenance.sh >> /var/log/fs-pg-maintenance.log 2>&1
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/featuresignals}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.region.yml}"

DC="docker compose --project-directory $PROJECT_DIR -f $COMPOSE_FILE"
PG_CONTAINER=$($DC ps -q postgres 2>/dev/null || true)

if [ -z "$PG_CONTAINER" ]; then
  echo "[$(date)] ERROR: Postgres container not running"
  exit 1
fi

run_sql() {
  docker exec "$PG_CONTAINER" psql -U fs -d featuresignals -t -c "$1" 2>/dev/null
}

run_sql_verbose() {
  docker exec "$PG_CONTAINER" psql -U fs -d featuresignals -c "$1" 2>/dev/null
}

echo "[$(date)] === PostgreSQL Maintenance ==="

# ── VACUUM ANALYZE high-write tables ─────────────────────────────────────────
HIGH_WRITE_TABLES="status_checks audit_logs product_events evaluations refresh_tokens"
for table in $HIGH_WRITE_TABLES; do
  EXISTS=$(run_sql "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';" | tr -d ' ')
  if [ "$EXISTS" = "1" ]; then
    echo "[$(date)] VACUUM ANALYZE $table..."
    run_sql "VACUUM ANALYZE $table;" > /dev/null
    echo "[$(date)] Done: $table"
  fi
done

# ── Table size report ────────────────────────────────────────────────────────
echo ""
echo "[$(date)] === Table Sizes ==="
run_sql_verbose "
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(oid)) AS total_size,
  pg_size_pretty(pg_relation_size(oid)) AS data_size,
  pg_size_pretty(pg_total_relation_size(oid) - pg_relation_size(oid)) AS index_size
FROM pg_class
WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY pg_total_relation_size(oid) DESC
LIMIT 20;
"

# ── Index bloat check ────────────────────────────────────────────────────────
echo ""
echo "[$(date)] === Index Bloat Check ==="
BLOATED_INDEXES=$(run_sql "
SELECT indexrelname
FROM pg_stat_user_indexes sui
JOIN pg_class c ON c.oid = sui.indexrelid
WHERE pg_relation_size(sui.indexrelid) > 10 * 1024 * 1024
  AND sui.idx_scan = 0
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conindid = sui.indexrelid
  );
")

if [ -n "$BLOATED_INDEXES" ]; then
  echo "[$(date)] Reindexing unused large indexes:"
  echo "$BLOATED_INDEXES" | while read -r idx; do
    idx=$(echo "$idx" | tr -d ' ')
    if [ -n "$idx" ]; then
      echo "[$(date)]   REINDEX $idx"
      run_sql "REINDEX INDEX CONCURRENTLY $idx;" > /dev/null 2>&1 || echo "[$(date)]   REINDEX failed for $idx (non-critical)"
    fi
  done
else
  echo "[$(date)] No bloated indexes found"
fi

# ── Database size ────────────────────────────────────────────────────────────
echo ""
DB_SIZE=$(run_sql "SELECT pg_size_pretty(pg_database_size('featuresignals'));" | tr -d ' ')
echo "[$(date)] Total database size: $DB_SIZE"

echo ""
echo "[$(date)] === Maintenance complete ==="
