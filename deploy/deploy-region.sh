#!/usr/bin/env bash
#
# Regional deployment script for FeatureSignals.
#
# Features:
#   - Deployment locking (flock) to prevent concurrent deploys
#   - Change-aware selective rebuild: only pull/build/restart services whose
#     source files changed between the running commit and the target commit
#   - Pre-built image pull from GHCR (falls back to local build)
#   - Automatic rollback on health check failure
#   - Deploy history logging
#   - Targeted rollback via ROLLBACK_COMMIT env var
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/featuresignals}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.region.yml}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"
DEPLOY_LOG="${DEPLOY_LOG:-/mnt/data/deploy-history.log}"
LOCKFILE="/tmp/fs-deploy.lock"
IMAGE_TAG="${IMAGE_TAG:-latest}"
USE_REGISTRY="${USE_REGISTRY:-true}"

cd "$PROJECT_DIR"

DC="docker compose --project-directory $PROJECT_DIR --env-file $PROJECT_DIR/.env -f $COMPOSE_FILE"

# ── Deployment lock ──────────────────────────────────────────────────────────
exec 200>"$LOCKFILE"
if ! flock -n 200; then
  # Check if the locking process is still alive (stale lock detection)
  if [ -f "$LOCKFILE" ]; then
    LOCK_PID=$(cat "$LOCKFILE" 2>/dev/null || true)
    if [ -n "$LOCK_PID" ] && ! kill -0 "$LOCK_PID" 2>/dev/null; then
      echo "WARNING: Stale lock detected (PID $LOCK_PID no longer running). Removing and retrying..."
      flock -u 200 2>/dev/null || true
      rm -f "$LOCKFILE"
      exec 200>"$LOCKFILE"
      if ! flock -n 200; then
        echo "ERROR: Could not acquire deploy lock after cleanup attempt"
        exit 1
      fi
    else
      echo "ERROR: Another deploy is already in progress (lock: $LOCKFILE${LOCK_PID:+, PID: $LOCK_PID})"
      exit 1
    fi
  else
    echo "ERROR: Could not acquire deploy lock"
    exit 1
  fi
fi
echo $$ > "$LOCKFILE"
trap 'flock -u 200 2>/dev/null; rm -f "$LOCKFILE"' EXIT

if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found. Create from deploy/.env.region.example"
  exit 1
fi

REGION=$(grep '^REGION=' .env | cut -d'=' -f2)
DOMAIN_MAIN=$(grep '^DOMAIN_MAIN=' .env | cut -d'=' -f2 || true)
PREV_COMMIT=$(git rev-parse HEAD)
echo "==> Deploying region: ${REGION:-unknown}"
echo "==> Current commit: $PREV_COMMIT"

# Primary regions serve website + docs; satellite regions serve API + Dashboard only.
IS_PRIMARY=false
if [ -n "${DOMAIN_MAIN:-}" ]; then
  IS_PRIMARY=true
  cp deploy/Caddyfile.region deploy/Caddyfile.active
  DC="$DC --profile full"
  echo "==> Mode: PRIMARY (website + docs enabled)"
else
  cp deploy/Caddyfile.satellite deploy/Caddyfile.active
  echo "==> Mode: SATELLITE (API + Dashboard only)"
fi

# ── Targeted rollback ────────────────────────────────────────────────────────
if [ -n "${ROLLBACK_COMMIT:-}" ]; then
  echo "==> ROLLBACK requested to $ROLLBACK_COMMIT"
  git fetch origin
  git checkout "$ROLLBACK_COMMIT"
  echo "==> Checked out rollback target"
fi

# ── Pull latest code ─────────────────────────────────────────────────────────
if [ -z "${ROLLBACK_COMMIT:-}" ]; then
  echo "==> Pulling latest code..."
  git fetch origin main
  git reset --hard origin/main
fi

NEW_COMMIT=$(git rev-parse HEAD)
echo "==> Target commit: $NEW_COMMIT"

# ── Detect what changed ──────────────────────────────────────────────────────
CHANGED_FILES=$(git diff --name-only "$PREV_COMMIT" "$NEW_COMMIT" 2>/dev/null || echo "FULL")

has_changes() { echo "$CHANGED_FILES" | grep -qE "$1" && return 0 || return 1; }

SERVER_CHANGED=false;    has_changes '^server/' && SERVER_CHANGED=true
DASH_CHANGED=false;      has_changes '^dashboard/' && DASH_CHANGED=true
WEBSITE_CHANGED=false;   has_changes '^website/' && WEBSITE_CHANGED=true
DOCS_CHANGED=false;      has_changes '^docs/' && DOCS_CHANGED=true
CADDY_CHANGED=false;     has_changes '^deploy/(Caddyfile|docker/Dockerfile\.caddy)' && CADDY_CHANGED=true
MIGRATION_CHANGED=false; has_changes '^server/migrations/' && MIGRATION_CHANGED=true

if [ "$CHANGED_FILES" = "FULL" ] || [ -n "${ROLLBACK_COMMIT:-}" ] || [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
  SERVER_CHANGED=true; DASH_CHANGED=true; WEBSITE_CHANGED=true
  DOCS_CHANGED=true; CADDY_CHANGED=true; MIGRATION_CHANGED=true
fi

# Satellite regions never build website or docs — those are served from primary only.
if [ "$IS_PRIMARY" = false ]; then
  WEBSITE_CHANGED=false
  DOCS_CHANGED=false
fi

echo "==> Change detection:"
echo "    server=$SERVER_CHANGED dashboard=$DASH_CHANGED website=$WEBSITE_CHANGED"
echo "    docs=$DOCS_CHANGED caddy=$CADDY_CHANGED migrations=$MIGRATION_CHANGED"

# ── Build or pull images ─────────────────────────────────────────────────────
if [ "$USE_REGISTRY" = "true" ]; then
  PULL_TARGETS=""
  [ "$SERVER_CHANGED" = true ] && PULL_TARGETS="$PULL_TARGETS server"
  [ "$DASH_CHANGED" = true ] && PULL_TARGETS="$PULL_TARGETS dashboard"
  [ "$WEBSITE_CHANGED" = true ] && PULL_TARGETS="$PULL_TARGETS website-build"
  [ "$DOCS_CHANGED" = true ] && PULL_TARGETS="$PULL_TARGETS docs-build"

  if [ -n "$PULL_TARGETS" ]; then
    echo "==> Pulling pre-built images from registry (tag: $IMAGE_TAG):$PULL_TARGETS"
    IMAGE_TAG="$IMAGE_TAG" $DC pull $PULL_TARGETS || {
      echo "ERROR: Failed to pull images from registry."
      echo "  - Ensure the 'Test, Lint, Build & Publish Images' workflow has run successfully"
      echo "  - Or set USE_REGISTRY=false to build locally"
      exit 1
    }
  else
    echo "==> No application images changed, skipping registry pull"
  fi

  BUILD_AUX=""
  [ "$CADDY_CHANGED" = true ] && BUILD_AUX="$BUILD_AUX caddy"
  [ "$MIGRATION_CHANGED" = true ] && BUILD_AUX="$BUILD_AUX migrate"

  if [ -n "$BUILD_AUX" ]; then
    echo "==> Building changed auxiliary services:$BUILD_AUX"
    $DC build --parallel $BUILD_AUX 2>/dev/null || true
  else
    echo "==> No auxiliary services changed, skipping build"
  fi
else
  echo "==> Building all images locally (USE_REGISTRY=false)..."
  $DC build --parallel
fi

# ── Stop one-shot containers from previous deploy ────────────────────────────
REMOVE_TARGETS=""
[ "$WEBSITE_CHANGED" = true ] && REMOVE_TARGETS="$REMOVE_TARGETS website-build"
[ "$DOCS_CHANGED" = true ] && REMOVE_TARGETS="$REMOVE_TARGETS docs-build"
[ "$MIGRATION_CHANGED" = true ] || [ "$SERVER_CHANGED" = true ] && REMOVE_TARGETS="$REMOVE_TARGETS migrate"

if [ -n "$REMOVE_TARGETS" ]; then
  echo "==> Stopping changed one-shot containers:$REMOVE_TARGETS"
  $DC rm -fsv $REMOVE_TARGETS 2>/dev/null || true
fi

if [ "$WEBSITE_CHANGED" = true ]; then
  echo "==> Removing old website volume..."
  docker volume rm -f featuresignals_website-dist 2>/dev/null || true
fi
if [ "$DOCS_CHANGED" = true ]; then
  echo "==> Removing old docs volume..."
  docker volume rm -f featuresignals_docs-dist 2>/dev/null || true
fi

# ── Start services ───────────────────────────────────────────────────────────
echo "==> Starting services..."
if ! $DC up -d 2>&1; then
  echo "==> Deploy failed. Showing logs..."
  $DC logs --tail=50 migrate postgres server 2>&1 || true
  $DC ps -a 2>&1 || true
  exit 1
fi

if [ "$IS_PRIMARY" = true ] && { [ "$WEBSITE_CHANGED" = true ] || [ "$DOCS_CHANGED" = true ]; }; then
  echo "==> Waiting for builders..."
  $DC wait website-build docs-build 2>/dev/null || sleep 30
fi

echo "==> Setting up database roles..."
COMPOSE_FILE="$COMPOSE_FILE" bash "$PROJECT_DIR/deploy/pg-setup-roles.sh" || echo "WARNING: Role setup skipped"

# ── Health check ─────────────────────────────────────────────────────────────
echo "==> Health check (retrying up to ${HEALTH_RETRIES} times, ${HEALTH_INTERVAL}s interval)..."
healthy=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -sf "http://localhost:8080/health" > /dev/null 2>&1; then
    echo "  API server: HEALTHY (attempt $i)"
    healthy=true
    break
  fi
  echo "  Attempt $i/$HEALTH_RETRIES: not ready, waiting ${HEALTH_INTERVAL}s..."
  sleep "$HEALTH_INTERVAL"
done

# ── Rollback on failure ──────────────────────────────────────────────────────
if [ "$healthy" = false ]; then
  echo "  API server: UNHEALTHY after ${HEALTH_RETRIES} attempts"
  echo "  Recent logs:"
  $DC logs --tail=20 server 2>&1 || true

  if [ "$PREV_COMMIT" != "$NEW_COMMIT" ] && [ -z "${ROLLBACK_COMMIT:-}" ]; then
    echo "==> AUTO-ROLLBACK: reverting to $PREV_COMMIT"
    git checkout "$PREV_COMMIT"
    $DC build --parallel 2>/dev/null || true
    $DC up -d 2>&1 || true
    sleep 10

    if curl -sf "http://localhost:8080/health" > /dev/null 2>&1; then
      echo "==> Rollback successful — server healthy on $PREV_COMMIT"
      echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') ROLLBACK $PREV_COMMIT region=$REGION reason=health_check_failed" >> "$DEPLOY_LOG"
    else
      echo "==> Rollback FAILED — manual intervention required"
      echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') ROLLBACK_FAILED $PREV_COMMIT region=$REGION" >> "$DEPLOY_LOG"
    fi
    exit 1
  fi
  exit 1
fi

# ── Post-deploy cleanup ──────────────────────────────────────────────────────
echo "==> Post-deploy cleanup..."
docker container prune -f 2>/dev/null || true
docker image prune -a -f --filter "until=48h" 2>/dev/null || true
docker builder prune -f --filter "until=48h" 2>/dev/null || true
if [ -d "/root/go/pkg/mod/cache" ]; then
  rm -rf /root/go/pkg/mod/cache 2>/dev/null || true
fi
if [ -d "/home/deploy/go/pkg/mod/cache" ]; then
  rm -rf /home/deploy/go/pkg/mod/cache 2>/dev/null || true
fi

echo "==> Service status:"
$DC ps

# ── Record deploy ────────────────────────────────────────────────────────────
mkdir -p "$(dirname "$DEPLOY_LOG")"
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') DEPLOY $NEW_COMMIT region=$REGION tag=$IMAGE_TAG" >> "$DEPLOY_LOG"

echo ""
echo "Deploy complete: region=${REGION} commit=${NEW_COMMIT} at $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
