#!/usr/bin/env bash
#
# Connect to the production FeatureSignals database from your laptop.
#
# Usage:
#   ./scripts/db-connect.sh                    # admin psql session (default)
#   ./scripts/db-connect.sh --role readonly    # readonly psql session
#   ./scripts/db-connect.sh --tunnel-only      # just open the tunnel (for GUI clients)
#
# Configuration (in order of precedence):
#   1. FS_VPS_HOST env var
#   2. ~/.featuresignals/config file (VPS_HOST=...)
#   3. --host flag
#
# The tunnel maps local port 15432 -> VPS 127.0.0.1:5432 (Postgres).
# For GUI clients (pgAdmin, DBeaver): use --tunnel-only, then connect to
#   Host: localhost  Port: 15432  Database: featuresignals
#
set -euo pipefail

LOCAL_PORT="${FS_LOCAL_DB_PORT:-15432}"
REMOTE_PORT="5432"
SSH_USER="${FS_VPS_USER:-deploy}"
DB_NAME="featuresignals"
ROLE="admin"
TUNNEL_ONLY=false
VPS_HOST=""

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --role admin|readonly   Database role to connect as (default: admin)
  --tunnel-only           Open SSH tunnel without starting psql
  --host HOST             VPS hostname or IP
  --port PORT             Local port for tunnel (default: 15432)
  --ssh-user USER         SSH user (default: deploy)
  -h, --help              Show this help

Environment variables:
  FS_VPS_HOST         VPS hostname or IP
  FS_VPS_USER         SSH user (default: deploy)
  FS_LOCAL_DB_PORT    Local tunnel port (default: 15432)
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role)       ROLE="$2"; shift 2 ;;
    --tunnel-only) TUNNEL_ONLY=true; shift ;;
    --host)       VPS_HOST="$2"; shift 2 ;;
    --port)       LOCAL_PORT="$2"; shift 2 ;;
    --ssh-user)   SSH_USER="$2"; shift 2 ;;
    -h|--help)    usage ;;
    *)            echo "Unknown option: $1"; usage ;;
  esac
done

if [ -z "$VPS_HOST" ]; then
  VPS_HOST="${FS_VPS_HOST:-}"
fi

if [ -z "$VPS_HOST" ] && [ -f "$HOME/.featuresignals/config" ]; then
  VPS_HOST=$(grep -E '^VPS_HOST=' "$HOME/.featuresignals/config" | cut -d= -f2 | tr -d '[:space:]"'"'" || true)
fi

if [ -z "$VPS_HOST" ]; then
  echo "ERROR: VPS host not configured."
  echo ""
  echo "Set it using one of:"
  echo "  export FS_VPS_HOST=your-server-ip"
  echo "  echo 'VPS_HOST=your-server-ip' > ~/.featuresignals/config"
  echo "  $(basename "$0") --host your-server-ip"
  exit 1
fi

case "$ROLE" in
  admin)    DB_USER="fs_admin" ;;
  readonly) DB_USER="fs_readonly" ;;
  *)        echo "ERROR: --role must be 'admin' or 'readonly'"; exit 1 ;;
esac

cleanup() {
  if [ -n "${TUNNEL_PID:-}" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
    echo "SSH tunnel closed."
  fi
}
trap cleanup EXIT

if lsof -i :"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $LOCAL_PORT is already in use. Another tunnel may be running."
  echo "Kill it with: lsof -ti :$LOCAL_PORT | xargs kill"
  exit 1
fi

echo "Opening SSH tunnel: localhost:${LOCAL_PORT} -> ${VPS_HOST}:${REMOTE_PORT}"
ssh -f -N -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" "${SSH_USER}@${VPS_HOST}"
TUNNEL_PID=$(lsof -ti :"$LOCAL_PORT" -sTCP:LISTEN 2>/dev/null || true)

sleep 1

if ! lsof -i :"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: SSH tunnel failed to start."
  exit 1
fi

echo "SSH tunnel established (PID: ${TUNNEL_PID:-unknown})."

if [ "$TUNNEL_ONLY" = true ]; then
  echo ""
  echo "Tunnel is running in the background."
  echo "Connect your client to:"
  echo "  Host: localhost"
  echo "  Port: ${LOCAL_PORT}"
  echo "  Database: ${DB_NAME}"
  echo "  User: ${DB_USER}"
  echo ""
  echo "Press Ctrl+C to close the tunnel."
  trap cleanup INT
  wait "$TUNNEL_PID" 2>/dev/null || sleep infinity
else
  echo "Connecting as ${DB_USER}..."
  echo ""
  psql "postgresql://${DB_USER}@localhost:${LOCAL_PORT}/${DB_NAME}"
fi
