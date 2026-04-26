#!/usr/bin/env bash
#
# =============================================================================
# FeatureSignals — SigNoz Observability Stack Deployment
# =============================================================================
#
# Deploys SigNoz observability stack (metrics, traces, logs) on the cell.
# Called automatically after bootstrap completes, either by bootstrap.sh or
# independently by CI/CD.
#
# Usage:
#   export SIGNOZ_ENABLED=true
#   export CELL_SUBDOMAIN="cell-01.featuresignals.com"
#   sudo ./deploy-observability.sh
#
# Required Environment Variables:
#   CELL_SUBDOMAIN         Subdomain for ingress routing (e.g., "cell-01.featuresignals.com")
#
# Optional Environment Variables:
#   SIGNOZ_ENABLED         Set to "true" to deploy (default: false)
#   STORAGE_SIZE           ClickHouse persistent volume size (default: 10Gi)
#
# =============================================================================

set -euo pipefail

LOGFILE="/var/log/featuresignals-observability.log"
exec > >(tee -a "$LOGFILE") 2>&1

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- Configuration ----------------------------------------------------------
SIGNOZ_ENABLED="${SIGNOZ_ENABLED:-false}"
STORAGE_SIZE="${STORAGE_SIZE:-10Gi}"
CELL_SUBDOMAIN="${CELL_SUBDOMAIN:-}"

if [[ "$SIGNOZ_ENABLED" != "true" ]]; then
    log_info "SigNoz disabled. Set SIGNOZ_ENABLED=true to deploy."
    exit 0
fi

if [[ -z "$CELL_SUBDOMAIN" ]]; then
    log_warn "CELL_SUBDOMAIN not set. Ingress will use default host."
fi

log_info "=== Deploying SigNoz Observability Stack ==="
log_info "  Storage size: ${STORAGE_SIZE}"
log_info "  Ingress:      signoz.${CELL_SUBDOMAIN:-<unknown>}"

# ---- Add SigNoz Helm Repository --------------------------------------------
log_info "Adding SigNoz Helm repository..."
helm repo add signoz https://charts.signoz.io --force-update
helm repo update

# ---- Create Namespace -------------------------------------------------------
log_info "Creating signoz namespace..."
kubectl create namespace signoz --dry-run=client -o yaml | kubectl apply -f -

# ---- Deploy SigNoz via Helm -------------------------------------------------
log_info "Installing/upgrading SigNoz Helm chart..."
helm upgrade --install signoz signoz/signoz \
  --namespace signoz \
  --set otelCollector.enabled=true \
  --set clickhouse.persistence.size="${STORAGE_SIZE}" \
  --set queryService.resources.requests.memory=256Mi \
  --timeout 15m \
  --wait

log_info "SigNoz Helm chart deployed."

# ---- Create Ingress for Web Access ------------------------------------------
log_info "Creating Ingress for SigNoz query service..."
INGRESS_HOST="signoz.${CELL_SUBDOMAIN}"
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: signoz-ingress
  namespace: signoz
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
spec:
  rules:
  - host: ${INGRESS_HOST}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: signoz-query-service
            port:
              number: 3301
EOF

log_info "Ingress created for ${INGRESS_HOST}."

# ---- Verify Pods Are Running ------------------------------------------------
log_info "Verifying SigNoz pods are running..."
if kubectl wait --for=condition=Ready pods --all -n signoz --timeout=5m 2>/dev/null; then
    log_info "All SigNoz pods are ready."
else
    log_warn "Some SigNoz pods not ready within timeout. Check with: kubectl get pods -n signoz"
fi

# ---- Output Connection Info -------------------------------------------------
echo ""
echo "================================================================"
echo "  SigNoz Observability — Deploy Complete"
echo "================================================================"
echo ""
echo "  Access URL:    http://${INGRESS_HOST}:3301"
echo "  Namespace:     signoz"
echo "  Storage:       ${STORAGE_SIZE}"
echo ""
echo "  To verify:"
echo "    kubectl get pods -n signoz"
echo "    kubectl get ingress -n signoz"
echo ""
echo "  OTLP Endpoint: signoz-otel-collector.signoz.svc.cluster.local:4318"
echo ""
echo "  Log file:      ${LOGFILE}"
echo "================================================================"

log_info "SigNoz observability stack deployed successfully."
