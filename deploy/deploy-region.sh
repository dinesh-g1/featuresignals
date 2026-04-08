#!/usr/bin/env bash
#
# Regional deployment script for FeatureSignals.
#
# Features:
#   - Deployment locking (flock) to prevent concurrent deploys
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
  echo "ERROR: Another deploy is already in progress (lock: $LOCKFILE)"
  exit 1
fi
trap 'rm -f "$LOCKFILE"' EXIT

if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found. Create from deploy/.env.region.example"
  exit 1
fi

REGION=$(grep '^REGION=' .env | cut -d'=' -f2)
PREV_COMMIT=$(git rev-parse HEAD)
echo "==> Deploying region: ${REGION:-unknown}"
echo "==> Current commit: $PREV_COMMIT"

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
  git pull origin main
fi

NEW_COMMIT=$(git rev-parse HEAD)
echo "==> Target commit: $NEW_COMMIT"

# ── Build or pull images ─────────────────────────────────────────────────────
if [ "$USE_REGISTRY" = "true" ]; then
  echo "==> Pulling pre-built images from registry (tag: $IMAGE_TAG)..."
  IMAGE_TAG="$IMAGE_TAG" $DC pull server dashboard || {
    echo "ERROR: Failed to pull images from registry."
    echo "  - Ensure the 'Test, Lint, Build & Publish Images' workflow has run successfully"
    echo "  - Or set USE_REGISTRY=false to build locally"
    exit 1
  }
  echo "==> Building auxiliary services (caddy, migrate, website, docs)..."
  $DC build --parallel caddy migrate website-build docs-build 2>/dev/null || true
else
  echo "==> Building all images locally (USE_REGISTRY=false)..."
  $DC build --parallel
fi

# ── Stop one-shot containers from previous deploy ────────────────────────────
echo "==> Stopping one-shot containers from previous deploy..."
$DC rm -fsv website-build docs-build migrate 2>/dev/null || true

echo "==> Removing old static site volumes..."
docker volume rm -f featuresignals_website-dist featuresignals_docs-dist 2>/dev/null || true

# ── Start services ───────────────────────────────────────────────────────────
echo "==> Starting services..."
if ! $DC up -d 2>&1; then
  echo "==> Deploy failed. Showing logs..."
  $DC logs --tail=50 migrate postgres server 2>&1 || true
  $DC ps -a 2>&1 || true
  exit 1
fi

echo "==> Waiting for builders..."
$DC wait website-build docs-build 2>/dev/null || sleep 30

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
docker volume prune -f 2>/dev/null || true
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
