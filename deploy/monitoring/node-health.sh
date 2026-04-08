#!/usr/bin/env bash
#
# VPS resource monitoring script for FeatureSignals.
#
# Outputs structured JSON to stdout for ingestion by the Docker
# logging driver -> SigNoz pipeline. Logs at ERROR level when
# thresholds are breached, enabling SigNoz alerting.
#
# Usage (cron, every minute):
#   * * * * * /opt/featuresignals/deploy/monitoring/node-health.sh 2>&1 | logger -t fs-health
#
set -euo pipefail

DISK_WARN_PCT="${DISK_WARN_PCT:-85}"
MEMORY_WARN_PCT="${MEMORY_WARN_PCT:-90}"
CPU_WARN_LOAD="${CPU_WARN_LOAD:-0}"
PG_CONN_WARN_PCT="${PG_CONN_WARN_PCT:-80}"
CERT_WARN_DAYS="${CERT_WARN_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/featuresignals/deploy/docker-compose.region.yml}"
PROJECT_DIR="${PROJECT_DIR:-/opt/featuresignals}"

NOW=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
HOSTNAME=$(hostname)
REGION=$(grep '^REGION=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2 || echo "unknown")

log_json() {
  local level=$1 component=$2 message=$3
  shift 3
  local extra=""
  while [ $# -gt 0 ]; do
    extra="${extra},\"$1\":\"$2\""
    shift 2
  done
  echo "{\"time\":\"$NOW\",\"level\":\"$level\",\"component\":\"$component\",\"host\":\"$HOSTNAME\",\"region\":\"$REGION\",\"msg\":\"$message\"$extra}"
}

# ── Disk usage ───────────────────────────────────────────────────────────────
DATA_DISK_PCT=$(df /mnt/data 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%' || echo "0")
ROOT_DISK_PCT=$(df / | awk 'NR==2{print $5}' | tr -d '%')

if [ "$DATA_DISK_PCT" -gt "$DISK_WARN_PCT" ]; then
  log_json "ERROR" "disk" "data disk usage critical" "usage_pct" "$DATA_DISK_PCT" "threshold" "$DISK_WARN_PCT" "mount" "/mnt/data"
elif [ "$ROOT_DISK_PCT" -gt "$DISK_WARN_PCT" ]; then
  log_json "ERROR" "disk" "root disk usage critical" "usage_pct" "$ROOT_DISK_PCT" "threshold" "$DISK_WARN_PCT" "mount" "/"
else
  log_json "INFO" "disk" "disk usage normal" "data_pct" "$DATA_DISK_PCT" "root_pct" "$ROOT_DISK_PCT"
fi

# ── Inode usage ──────────────────────────────────────────────────────────────
ROOT_INODE_PCT=$(df -i / | awk 'NR==2{print $5}' | tr -d '%' || echo "0")
if [ "$ROOT_INODE_PCT" -gt "$DISK_WARN_PCT" ]; then
  log_json "ERROR" "disk" "inode usage critical" "inode_pct" "$ROOT_INODE_PCT" "threshold" "$DISK_WARN_PCT" "mount" "/"
fi

# ── Memory usage ─────────────────────────────────────────────────────────────
MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
MEM_USED=$(free -m | awk '/^Mem:/{print $3}')
MEM_PCT=$((MEM_USED * 100 / MEM_TOTAL))

if [ "$MEM_PCT" -gt "$MEMORY_WARN_PCT" ]; then
  log_json "ERROR" "memory" "memory usage critical" "usage_pct" "$MEM_PCT" "used_mb" "$MEM_USED" "total_mb" "$MEM_TOTAL"
else
  log_json "INFO" "memory" "memory usage normal" "usage_pct" "$MEM_PCT" "used_mb" "$MEM_USED" "total_mb" "$MEM_TOTAL"
fi

# ── Swap usage ───────────────────────────────────────────────────────────────
SWAP_TOTAL=$(free -m | awk '/^Swap:/{print $2}')
SWAP_USED=$(free -m | awk '/^Swap:/{print $3}')
if [ "$SWAP_TOTAL" -gt 0 ]; then
  SWAP_PCT=$((SWAP_USED * 100 / SWAP_TOTAL))
  if [ "$SWAP_PCT" -gt 50 ]; then
    log_json "WARN" "memory" "swap usage high" "swap_pct" "$SWAP_PCT" "swap_used_mb" "$SWAP_USED" "swap_total_mb" "$SWAP_TOTAL"
  fi
fi

# ── CPU load ─────────────────────────────────────────────────────────────────
LOAD_1M=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
CPU_COUNT=$(nproc)

CPU_THRESHOLD="$CPU_WARN_LOAD"
if [ "$CPU_THRESHOLD" = "0" ]; then
  CPU_THRESHOLD="$CPU_COUNT"
fi

LOAD_INT=${LOAD_1M%.*}
THRESHOLD_INT=${CPU_THRESHOLD%.*}

if [ "${LOAD_INT:-0}" -gt "${THRESHOLD_INT:-999}" ]; then
  log_json "ERROR" "cpu" "cpu load critical" "load_1m" "$LOAD_1M" "threshold" "$CPU_THRESHOLD" "cpu_count" "$CPU_COUNT"
else
  log_json "INFO" "cpu" "cpu load normal" "load_1m" "$LOAD_1M" "cpu_count" "$CPU_COUNT"
fi

# ── Container health ─────────────────────────────────────────────────────────
DC="docker compose --project-directory $PROJECT_DIR -f $COMPOSE_FILE"
CRITICAL_SERVICES="server dashboard postgres caddy"

for svc in $CRITICAL_SERVICES; do
  STATUS=$($DC ps --format json "$svc" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('State','unknown'))" 2>/dev/null || echo "missing")
  if [ "$STATUS" != "running" ]; then
    log_json "ERROR" "container" "critical container not running" "service" "$svc" "state" "$STATUS"
  fi
done

RUNNING_COUNT=$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')
log_json "INFO" "container" "container status" "running_count" "$RUNNING_COUNT"

# ── Postgres connections ─────────────────────────────────────────────────────
PG_CONTAINER=$($DC ps -q postgres 2>/dev/null || true)
if [ -n "$PG_CONTAINER" ]; then
  PG_CONNS=$(docker exec "$PG_CONTAINER" psql -U fs -d featuresignals -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ' || echo "0")
  PG_MAX=$(docker exec "$PG_CONTAINER" psql -U fs -d featuresignals -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ' || echo "100")
  PG_PCT=$((PG_CONNS * 100 / PG_MAX))

  if [ "$PG_PCT" -gt "$PG_CONN_WARN_PCT" ]; then
    log_json "ERROR" "postgres" "connection count high" "connections" "$PG_CONNS" "max" "$PG_MAX" "usage_pct" "$PG_PCT"
  else
    log_json "INFO" "postgres" "connections normal" "connections" "$PG_CONNS" "max" "$PG_MAX" "usage_pct" "$PG_PCT"
  fi
fi

# ── TLS certificate expiry ───────────────────────────────────────────────────
DOMAIN_API=$(grep '^DOMAIN_API=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2 || true)
if [ -n "$DOMAIN_API" ] && command -v openssl &> /dev/null; then
  CERT_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN_API" -connect "$DOMAIN_API:443" 2>/dev/null | \
    openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)

  if [ -n "$CERT_EXPIRY" ]; then
    EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -lt "$CERT_WARN_DAYS" ]; then
      log_json "ERROR" "tls" "certificate expiring soon" "domain" "$DOMAIN_API" "days_left" "$DAYS_LEFT" "expires" "$CERT_EXPIRY"
    else
      log_json "INFO" "tls" "certificate valid" "domain" "$DOMAIN_API" "days_left" "$DAYS_LEFT"
    fi
  fi
fi
