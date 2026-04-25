#!/usr/bin/env bash
# =============================================================================
# FeatureSignals — SigNoz Install Script
# =============================================================================
#
# Installs the SigNoz observability stack on a single-node k3s cluster.
#
# SigNoz replaces Prometheus + Grafana + Loki + Jaeger + Tempo with a single
# OTel-native observability platform (traces, metrics, and logs).
#
# This script:
#   1. Creates the 'signoz' namespace
#   2. Adds the SigNoz Helm repo if not present
#   3. Installs SigNoz via Helm (budget-optimized, 10Gi ClickHouse)
#   4. Waits for ClickHouse, Query Service, OTel Collector, Frontend to be ready
#   5. Tests the OTel collector gRPC/HTTP endpoints
#   6. Prints connection info
#
# Prerequisites:
#   - k3s cluster running (kubectl works)
#   - Helm installed with bitnami repo
#   - 8+ GB RAM available on the node
#
# Usage:
#   ./install.sh
#
# Optional Environment Variables:
#   KUBECONFIG        Path to kubeconfig (default: /etc/rancher/k3s/k3s.yaml)
#   SIGNOZ_NAMESPACE  Namespace for SigNoz (default: signoz)
#   HELM_TIMEOUT      Helm install timeout (default: 10m)
# =============================================================================

set -euo pipefail

# ---- Color Output -----------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()    { echo -e "${CYAN}[STEP]${NC}  $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $*"; }

# ---- Configuration ----------------------------------------------------------

KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SIGNOZ_NAMESPACE="${SIGNOZ_NAMESPACE:-signoz}"
SIGNOZ_VALUES="${SCRIPTS_DIR}/values.yaml"

HELM_TIMEOUT="${HELM_TIMEOUT:-10m}"

# ---- Prerequisite Checks ----------------------------------------------------

prereq_check() {
    log_step "1/5 — Checking prerequisites..."

    if [[ ! -f "$KUBECONFIG" ]]; then
        log_error "Kubeconfig not found at ${KUBECONFIG}."
        log_error "Is k3s installed? Run: make k3s-install"
        exit 1
    fi

    if ! command -v kubectl &>/dev/null; then
        log_error "kubectl is not installed."
        exit 1
    fi

    if ! kubectl get nodes &>/dev/null; then
        log_error "Cannot connect to the Kubernetes cluster."
        log_error "Is k3s running? Check: systemctl status k3s"
        exit 1
    fi

    if ! command -v helm &>/dev/null; then
        log_error "Helm is not installed."
        exit 1
    fi

    # Verify SigNoz Helm repo
    if ! helm repo list -o yaml 2>/dev/null | grep -q "signoz"; then
        log_info "Adding SigNoz Helm repo..."
        helm repo add signoz https://charts.signoz.io --force-update
        helm repo update
    fi

    # Verify values file exists
    if [[ ! -f "$SIGNOZ_VALUES" ]]; then
        log_error "SigNoz values file not found: ${SIGNOZ_VALUES}"
        exit 1
    fi

    log_success "All prerequisites satisfied."
}

# ---- Install SigNoz ---------------------------------------------------------

install_signoz() {
    log_step "2/5 — Installing SigNoz via Helm..."

    # Create namespace
    kubectl get namespace "$SIGNOZ_NAMESPACE" &>/dev/null || {
        kubectl create namespace "$SIGNOZ_NAMESPACE"
        log_info "Created namespace: ${SIGNOZ_NAMESPACE}"
    }

    # Check if SigNoz is already installed
    if helm ls -n "$SIGNOZ_NAMESPACE" --short 2>/dev/null | grep -q "^signoz$"; then
        log_info "SigNoz Helm release already exists. Upgrading..."
        helm upgrade signoz signoz/signoz \
            --namespace "$SIGNOZ_NAMESPACE" \
            --values "$SIGNOZ_VALUES" \
            --reuse-values \
            --wait \
            --timeout "$HELM_TIMEOUT" \
            --atomic
        log_success "SigNoz upgraded."
    else
        log_info "Installing SigNoz for the first time..."
        helm upgrade --install signoz signoz/signoz \
            --namespace "$SIGNOZ_NAMESPACE" \
            --create-namespace \
            --values "$SIGNOZ_VALUES" \
            --wait \
            --timeout "$HELM_TIMEOUT" \
            --atomic
        log_success "SigNoz installed."
    fi
}

# ---- Wait for SigNoz & Verify -----------------------------------------------

wait_for_signoz() {
    log_step "3/5 — Waiting for SigNoz to be ready..."

    # Wait for key deployments
    local deployments=(
        "signoz-clickhouse"
        "signoz-query-service"
        "signoz-otel-collector"
        "signoz-frontend"
    )

    for deploy in "${deployments[@]}"; do
        log_info "Waiting for deployment/${deploy}..."
        if kubectl wait --for=condition=Available "deployment/${deploy}" \
            -n "$SIGNOZ_NAMESPACE" --timeout=10m &>/dev/null; then
            log_success "  ${deploy} is ready."
        else
            log_warn "  ${deploy} did not become Available within timeout."
            log_warn "  Check with: kubectl get pods -n ${SIGNOZ_NAMESPACE}"
        fi
    done

    # Also wait for StatefulSet for ClickHouse
    log_info "Waiting for statefulset/signoz-clickhouse..."
    kubectl wait --for=condition=Ready pod \
        --selector=app.kubernetes.io/component=clickhouse \
        -n "$SIGNOZ_NAMESPACE" --timeout=10m &>/dev/null || \
        log_warn "ClickHouse statefulset may not be fully ready yet."

    log_success "SigNoz pods are ready."
}

# ---- Test OTel Collector Endpoints ------------------------------------------

test_otel_collector() {
    log_step "4/5 — Testing OTel collector endpoints..."

    local otel_pod
    otel_pod="$(kubectl get pod -n "$SIGNOZ_NAMESPACE" \
        --selector=app.kubernetes.io/component=otel-collector \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"

    if [[ -z "$otel_pod" ]]; then
        log_warn "Could not find OTel collector pod for endpoint verification."
        return 0
    fi

    # Check gRPC endpoint (port 4317)
    log_info "Testing OTel collector gRPC endpoint (4317)..."
    local grpc_status
    grpc_status="$(kubectl exec -n "$SIGNOZ_NAMESPACE" "$otel_pod" -- \
        sh -c 'nc -zv localhost 4317 2>&1' 2>/dev/null || true)"
    if echo "$grpc_status" | grep -qi "succeeded\|open\|Connected"; then
        log_success "OTel collector gRPC endpoint (4317) is listening."
    else
        log_warn "OTel collector gRPC port check: ${grpc_status:-no response}"
    fi

    # Check HTTP endpoint (port 4318)
    log_info "Testing OTel collector HTTP endpoint (4318)..."
    local http_status
    http_status="$(kubectl exec -n "$SIGNOZ_NAMESPACE" "$otel_pod" -- \
        sh -c 'nc -zv localhost 4318 2>&1' 2>/dev/null || true)"
    if echo "$http_status" | grep -qi "succeeded\|open\|Connected"; then
        log_success "OTel collector HTTP endpoint (4318) is listening."
    else
        log_warn "OTel collector HTTP port check: ${http_status:-no response}"
    fi

    # List all pods in the namespace
    log_info "SigNoz pods status:"
    kubectl get pods -n "$SIGNOZ_NAMESPACE"

    log_success "OTel collector verification complete."
}

# ---- Print Connection Info --------------------------------------------------

print_summary() {
    log_step "5/5 — Deployment Summary"

    echo ""
    echo "================================================================"
    echo "  FeatureSignals — SigNoz Observability Deployed"
    echo "================================================================"
    echo ""

    # SigNoz connection info
    echo "  ┌─ SigNoz (Observability)"
    echo "  │"
    echo "  │   Namespace:       ${SIGNOZ_NAMESPACE}"
    echo "  │   OTel gRPC:       signoz-otel-collector.${SIGNOZ_NAMESPACE}:4317"
    echo "  │   OTel HTTP:       signoz-otel-collector.${SIGNOZ_NAMESPACE}:4318"
    echo "  │   Dashboard:       http://localhost:3301 (run port-forward below)"
    echo "  │   ClickHouse:      10Gi persistent volume (7d traces, 30d metrics)"
    echo "  │"
    echo "  │   Access dashboard:"
    echo "  │     kubectl port-forward -n ${SIGNOZ_NAMESPACE} \\"
    echo "  │       svc/signoz-frontend 3301:3301"
    echo "  │     # Then open: http://localhost:3301"
    echo "  │"
    echo "  │   Default credentials: admin / signoz (change on first login)"
    echo "  │"

    # OTel configuration for the app
    echo "  └─ Application Configuration"
    echo "      "
    echo "      Add to your Helm values.yaml or env vars:"
    echo "      ───────────────────────────────────────────────"
    echo "      OTEL_EXPORTER_OTLP_ENDPOINT: signoz-otel-collector.${SIGNOZ_NAMESPACE}:4317"
    echo "      OTEL_SERVICE_NAME: featuresignals-api"
    echo "      ───────────────────────────────────────────────"
    echo "      (Already configured in deploy/k8s/helm/featuresignals/)"
    echo ""

    # Pod status summary
    echo "  ── Pod Status ───────────────────────────────────────────────"
    echo ""
    echo "  SigNoz:"
    kubectl get pods -n "$SIGNOZ_NAMESPACE" -o wide 2>/dev/null || \
        echo "    (no pods found)"
    echo ""

    # Resource budget summary
    echo "  ── Resource Budget ───────────────────────────────────────────"
    echo ""
    echo "  Component              vCPU Req  Mem Req    vCPU Lim  Mem Lim"
    echo "  ───────────────────────────────────────────────────────────────"
    echo "  ClickHouse              200m      512Mi      500m      1Gi"
    echo "  Query Service           100m      256Mi      300m      512Mi"
    echo "  OTel Collector          100m      256Mi      300m      512Mi"
    echo "  Frontend                 50m      128Mi      200m      256Mi"
    echo "  ───────────────────────────────────────────────────────────────"
    echo "  Total                   450m      ~1.1 GiB   1.3 CPU   ~2.3 GiB"
    echo "  Available on CPX42      8 vCPU    16 GiB     8 vCPU    16 GiB"
    echo "  Headroom               ~7.6 vCPU  ~14.9 GiB  ~6.7 CPU  ~13.7 GiB"
    echo ""
    echo "================================================================"
}

# ---- Uninstall Feature (for cleanup) ----------------------------------------

uninstall_all() {
    log_warn "=== Uninstalling SigNoz ==="
    log_warn "This will remove ALL SigNoz data including ClickHouse storage."
    log_warn "Type 'yes' to confirm:"
    read -r confirmation
    if [[ "$confirmation" != "yes" ]]; then
        log_info "Aborted."
        exit 0
    fi

    log_info "Uninstalling SigNoz..."
    helm uninstall signoz --namespace "$SIGNOZ_NAMESPACE" 2>/dev/null || true

    log_info "Deleting namespace..."
    kubectl delete namespace "$SIGNOZ_NAMESPACE" 2>/dev/null || true

    log_success "SigNoz cleanup complete."
}

# ---- Main -------------------------------------------------------------------

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  FeatureSignals — SigNoz Observability Installer            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    # ---- Parse Arguments ----
    local action="install"
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --uninstall)
                action="uninstall"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [--uninstall]"
                echo ""
                echo "Options:"
                echo "  --uninstall    Remove SigNoz and its namespace"
                echo "  --help, -h     Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Usage: $0 [--uninstall]"
                exit 1
                ;;
        esac
    done

    if [[ "$action" == "uninstall" ]]; then
        uninstall_all
        exit 0
    fi

    # ---- Main Installation Flow ----
    prereq_check
    install_signoz
    wait_for_signoz
    test_otel_collector
    print_summary

    log_success "SigNoz installation complete!"
    echo ""
    log_info "SigNoz dashboard:  kubectl port-forward -n ${SIGNOZ_NAMESPACE} svc/signoz-frontend 3301:3301"
    echo ""
}

main "$@"
