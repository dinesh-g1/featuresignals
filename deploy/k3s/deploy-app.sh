#!/usr/bin/env bash
#
# =============================================================================
# FeatureSignals — Application Deployment Script
# =============================================================================
#
# Deploys the FeatureSignals API, Dashboard, and Edge Worker to a k3s cluster
# with a specific version tag. Called by the provisioning queue handler after
# bootstrap completes.
#
# Usage:
#   export FEATURESIGNALS_VERSION="v1.2.3"
#   sudo ./deploy-app.sh
#
# Required:
#   FEATURESIGNALS_VERSION    Image tag to deploy (e.g., "v1.2.3", "main-a1b2c3d")
#   POSTGRES_PASSWORD         PostgreSQL password (for API and Edge Worker env vars)
#   CELL_SUBDOMAIN            Cell subdomain (for Traefik ingress routing)
#
# =============================================================================

set -euo pipefail

LOGFILE="/var/log/featuresignals-deploy.log"
exec > >(tee -a "$LOGFILE") 2>&1

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

IMAGE_TAG="${FEATURESIGNALS_VERSION:?FEATURESIGNALS_VERSION is required}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
CELL_SUBDOMAIN="${CELL_SUBDOMAIN:?CELL_SUBDOMAIN is required}"
REGISTRY="ghcr.io/featuresignals"

kubectl create namespace featuresignals-saas --dry-run=client -o yaml | kubectl apply -f -

# ── API Deployment ────────────────────────────────────────────────────
log_info "Deploying API (${IMAGE_TAG})..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: featuresignals-api
  namespace: featuresignals-saas
  labels: { app: featuresignals-api }
spec:
  replicas: 2
  selector:
    matchLabels: { app: featuresignals-api }
  template:
    metadata:
      labels: { app: featuresignals-api }
    spec:
      containers:
      - name: api
        image: ${REGISTRY}/server:${IMAGE_TAG}
        ports:
        - containerPort: 8080
        env:
        - name: POSTGRES_PASSWORD
          value: "${POSTGRES_PASSWORD}"
        - name: CELL_SUBDOMAIN
          value: "${CELL_SUBDOMAIN}"
        - name: DATABASE_URL
          value: "postgres://fs:${POSTGRES_PASSWORD}@featuresignals-db-postgresql.featuresignals-system.svc.cluster.local:5432/featuresignals?sslmode=disable"
        - name: JWT_SECRET
          value: "cell-${CELL_SUBDOMAIN}-jwt"
        resources:
          requests: { memory: "256Mi", cpu: "200m" }
          limits: { memory: "512Mi", cpu: "500m" }
        readinessProbe:
          httpGet: { path: /health, port: 8080 }
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: featuresignals-api
  namespace: featuresignals-saas
  labels: { app: featuresignals-api }
spec:
  selector: { app: featuresignals-api }
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  type: ClusterIP
EOF

# ── Dashboard Deployment ──────────────────────────────────────────────
log_info "Deploying Dashboard (${IMAGE_TAG})..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: featuresignals-dashboard
  namespace: featuresignals-saas
  labels: { app: featuresignals-dashboard }
spec:
  replicas: 2
  selector:
    matchLabels: { app: featuresignals-dashboard }
  template:
    metadata:
      labels: { app: featuresignals-dashboard }
    spec:
      containers:
      - name: dashboard
        image: ${REGISTRY}/dashboard:${IMAGE_TAG}
        ports:
        - containerPort: 3000
        env:
        - name: API_URL
          value: "http://featuresignals-api.featuresignals-saas.svc.cluster.local:8080"
        resources:
          requests: { memory: "128Mi", cpu: "100m" }
          limits: { memory: "256Mi", cpu: "300m" }
---
apiVersion: v1
kind: Service
metadata:
  name: featuresignals-dashboard
  namespace: featuresignals-saas
  labels: { app: featuresignals-dashboard }
spec:
  selector: { app: featuresignals-dashboard }
  ports:
  - port: 3000
    targetPort: 3000
    name: http
  type: ClusterIP
EOF

# ── Edge Worker Deployment ────────────────────────────────────────────
log_info "Deploying Edge Worker (${IMAGE_TAG})..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-worker
  namespace: featuresignals-saas
  labels:
    app: edge-worker
    featuresignals.com/component: edge-worker
spec:
  replicas: 3
  selector:
    matchLabels: { app: edge-worker }
  template:
    metadata:
      labels: { app: edge-worker }
    spec:
      containers:
      - name: edge-worker
        image: ${REGISTRY}/edge-worker:${IMAGE_TAG}
        ports:
        - containerPort: 8081
        env:
        - name: PORT
          value: "8081"
        - name: DATABASE_URL
          value: "postgres://featuresignals:${POSTGRES_PASSWORD}@featuresignals-db-postgresql.featuresignals-system.svc.cluster.local:5432/featuresignals?sslmode=disable"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests: { cpu: 100m, memory: 128Mi }
          limits: { cpu: 500m, memory: 256Mi }
---
apiVersion: v1
kind: Service
metadata:
  name: edge-worker
  namespace: featuresignals-saas
  labels: { app: edge-worker }
spec:
  selector: { app: edge-worker }
  ports:
  - port: 8081
    targetPort: 8081
  type: ClusterIP
EOF

# ── Wait for rollouts ─────────────────────────────────────────────────
log_info "Waiting for rollouts..."
for dep in featuresignals-api featuresignals-dashboard edge-worker; do
  if kubectl rollout status deployment/$dep -n featuresignals-saas --timeout=5m 2>/dev/null; then
    log_info "$dep rolled out successfully."
  else
    log_warn "$dep rollout pending (images may not be pushed yet to ${REGISTRY})."
  fi
done

log_info "Deploy complete (version: ${IMAGE_TAG})."
