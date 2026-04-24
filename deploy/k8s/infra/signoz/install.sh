#!/usr/bin/env bash
# =============================================================================
# FeatureSignals — SigNoz + Temporal Install Script
# =============================================================================
#
# Installs and configures the observability (SigNoz) and workflow orchestration
# (Temporal) stacks on a single-node k3s cluster (Hetzner CPX42).
#
# This script:
#   1. Creates the 'temporal' database in the shared PostgreSQL instance
#   2. Installs Temporal via Helm (shared PostgreSQL, no Cassandra)
#   3. Waits for Temporal to be ready and verifies health
#   4. Installs SigNoz via Helm (budget-optimized, 10Gi ClickHouse)
#   5. Waits for SigNoz pods and verifies the OTel collector endpoint
#   6. Prints connection info for both services
#
# Prerequisites:
#   - k3s cluster running (kubectl works)
#   - Helm installed with repos: signoz, temporal, bitnami
#   - PostgreSQL already deployed (Bitnami, in featuresignals-system)
#   - Namespaces: signoz, temporal (created if not exist)
#
# Usage:
#   ./install.sh
#
# Optional Environment Variables:
#   KUBECONFIG       Path to kubeconfig (default: /etc/rancher/k3s/k3s.yaml)
#   POSTGRES_PASSWORD PostgreSQL password (auto-read from secret if not set)
#   SIGNOZ_NAMESPACE Namespace for SigNoz (default: signoz)
#   TEMPORAL_NAMESPACE Namespace for Temporal (default: temporal)
#   HELM_TIMEOUT     Helm install timeout (default: 10m)
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
PROJECT_ROOT="$(cd "${SCRIPTS_DIR}/../../../../" && pwd)"

SIGNOZ_NAMESPACE="${SIGNOZ_NAMESPACE:-signoz}"
TEMPORAL_NAMESPACE="${TEMPORAL_NAMESPACE:-temporal}"
SIGNOZ_VALUES="${SCRIPTS_DIR}/values.yaml"
TEMPORAL_VALUES="$(cd "${SCRIPTS_DIR}/../temporal" && pwd)/values.yaml"

HELM_TIMEOUT="${HELM_TIMEOUT:-10m}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_SERVICE="postgresql.featuresignals-system.svc.cluster.local"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
TEMPORAL_DB="temporal"
TEMPORAL_VISIBILITY_DB="temporal_visibility"

# ---- Prerequisite Checks ----------------------------------------------------

prereq_check() {
    log_step "1/7 — Checking prerequisites..."

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

    # Verify Helm repos
    local repos
    repos="$(helm repo list -o yaml 2>/dev/null || true)"
    local missing=""
    echo "$repos" | grep -q "signoz"     || missing="${missing} signoz"
    echo "$repos" | grep -q "temporal"   || missing="${missing} temporal"

    if [[ -n "$missing" ]]; then
        log_warn "Missing Helm repos:${missing}"
        log_info "Adding missing repos..."
        echo "$repos" | grep -q "signoz"   || helm repo add signoz   https://charts.signoz.io
        echo "$repos" | grep -q "temporal" || helm repo add temporal https://temporalio.github.io/helm-charts
        helm repo update
    fi

    # Verify values files exist
    if [[ ! -f "$SIGNOZ_VALUES" ]]; then
        log_error "SigNoz values file not found: ${SIGNOZ_VALUES}"
        exit 1
    fi
    if [[ ! -f "$TEMPORAL_VALUES" ]]; then
        log_error "Temporal values file not found: ${TEMPORAL_VALUES}"
        exit 1
    fi

    # Verify PostgreSQL is running
    log_info "Checking PostgreSQL connection..."
    local pg_pod
    pg_pod="$(kubectl get pod -n featuresignals-system \
        --selector=app.kubernetes.io/instance=featuresignals-db \
        --selector=role=primary \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
    if [[ -z "$pg_pod" ]]; then
        log_error "PostgreSQL pod not found in featuresignals-system namespace."
        log_error "Is PostgreSQL deployed? Run: make infra-deploy"
        exit 1
    fi

    if ! kubectl wait --for=condition=Ready "pod/${pg_pod}" \
        -n featuresignals-system --timeout=30s &>/dev/null; then
        log_error "PostgreSQL pod '${pg_pod}' is not Ready."
        exit 1
    fi
    log_success "PostgreSQL is running (pod: ${pg_pod})"

    # Get PostgreSQL password from secret if not explicitly set
    if [[ -z "$POSTGRES_PASSWORD" ]]; then
        log_info "Reading PostgreSQL password from secret 'featuresignals-db-postgresql'..."
        POSTGRES_PASSWORD="$(kubectl get secret featuresignals-db-postgresql \
            -n featuresignals-system \
            -o jsonpath='{.data.postgres-password}' 2>/dev/null | base64 -d || true)"
        if [[ -z "$POSTGRES_PASSWORD" ]]; then
            log_warn "Could not read from 'featuresignals-db-postgresql' secret."
            log_info "Trying 'db-credentials' secret..."
            POSTGRES_PASSWORD="$(kubectl get secret db-credentials \
                -n featuresignals-system \
                -o jsonpath='{.data.db-password}' 2>/dev/null | base64 -d || true)"
        fi
        if [[ -z "$POSTGRES_PASSWORD" ]]; then
            log_error "Could not determine PostgreSQL password."
            log_error "Set POSTGRES_PASSWORD environment variable or ensure secrets exist."
            exit 1
        fi
        log_success "PostgreSQL password retrieved from Kubernetes secret."
    fi

    log_success "All prerequisites satisfied."
}

# ---- Create Temporal Databases ---------------------------------------------

create_temporal_databases() {
    log_step "2/7 — Creating Temporal databases in PostgreSQL..."

    local pg_pod
    pg_pod="$(kubectl get pod -n featuresignals-system \
        --selector=app.kubernetes.io/instance=featuresignals-db \
        --selector=role=primary \
        -o jsonpath='{.items[0].metadata.name}')"

    # Create the temporal database if it doesn't exist
    log_info "Creating database '${TEMPORAL_DB}' (if not exists)..."
    kubectl exec -n featuresignals-system "$pg_pod" -- \
        psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT 1 FROM pg_database WHERE datname = '${TEMPORAL_DB}'" | grep -q 1 \
        && log_info "Database '${TEMPORAL_DB}' already exists." \
        || {
            kubectl exec -n featuresignals-system "$pg_pod" -- \
                psql -U "$POSTGRES_USER" -d postgres -c \
                "CREATE DATABASE ${TEMPORAL_DB}"
            log_success "Database '${TEMPORAL_DB}' created."
        }

    # Create the temporal_visibility database if it doesn't exist
    log_info "Creating database '${TEMPORAL_VISIBILITY_DB}' (if not exists)..."
    kubectl exec -n featuresignals-system "$pg_pod" -- \
        psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT 1 FROM pg_database WHERE datname = '${TEMPORAL_VISIBILITY_DB}'" | grep -q 1 \
        && log_info "Database '${TEMPORAL_VISIBILITY_DB}' already exists." \
        || {
            kubectl exec -n featuresignals-system "$pg_pod" -- \
                psql -U "$POSTGRES_USER" -d postgres -c \
                "CREATE DATABASE ${TEMPORAL_VISIBILITY_DB}"
            log_success "Database '${TEMPORAL_VISIBILITY_DB}' created."
        }

    # Verify both databases exist
    log_info "Verifying databases..."
    kubectl exec -n featuresignals-system "$pg_pod" -- \
        psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT datname FROM pg_database WHERE datname IN ('${TEMPORAL_DB}', '${TEMPORAL_VISIBILITY_DB}') ORDER BY datname"

    log_success "Temporal databases ready."
}

# ---- Install Temporal -------------------------------------------------------

install_temporal() {
    log_step "3/7 — Installing Temporal via Helm..."

    # Create namespace
    kubectl get namespace "$TEMPORAL_NAMESPACE" &>/dev/null || {
        kubectl create namespace "$TEMPORAL_NAMESPACE"
        log_info "Created namespace: ${TEMPORAL_NAMESPACE}"
    }

    # Check if Temporal is already installed
    if helm ls -n "$TEMPORAL_NAMESPACE" --short 2>/dev/null | grep -q "^temporal$"; then
        log_info "Temporal Helm release already exists. Upgrading..."
        helm upgrade temporal temporal/temporal \
            --namespace "$TEMPORAL_NAMESPACE" \
            --values "$TEMPORAL_VALUES" \
            --reuse-values \
            --wait \
            --timeout "$HELM_TIMEOUT" \
            --atomic
        log_success "Temporal upgraded."
    else
        log_info "Installing Temporal for the first time..."
        # First install: run schema setup job
        helm upgrade --install temporal temporal/temporal \
            --namespace "$TEMPORAL_NAMESPACE" \
            --create-namespace \
            --values "$TEMPORAL_VALUES" \
            --set schema.setup.enabled=true \
            --set schema.update.enabled=true \
            --wait \
            --timeout "$HELM_TIMEOUT" \
            --atomic
        log_success "Temporal installed with schema setup."
    fi
}

# ---- Wait for Temporal & Verify Health --------------------------------------

wait_for_temporal() {
    log_step "4/7 — Waiting for Temporal to be ready..."

    # Wait for the Temporal server deployment
    log_info "Waiting for temporal-server deployment..."
    kubectl wait --for=condition=Available deployment/temporal \
        -n "$TEMPORAL_NAMESPACE" --timeout=5m

    # Wait for all pods to be ready
    log_info "Waiting for all Temporal pods..."
    kubectl wait --for=condition=Ready pods \
        --all -n "$TEMPORAL_NAMESPACE" --timeout=5m

    log_success "Temporal pods are ready."

    # Verify Temporal health endpoint
    log_info "Testing Temporal health endpoint..."
    local temporal_pod
    temporal_pod="$(kubectl get pod -n "$TEMPORAL_NAMESPACE" \
        --selector=app.kubernetes.io/name=temporal \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"

    if [[ -z "$temporal_pod" ]]; then
        log_warn "Could not find Temporal pod for health check."
    else
        # Port-forward to check health
        local health_status
        health_status="$(kubectl exec -n "$TEMPORAL_NAMESPACE" "$temporal_pod" -- \
            wget -q -O- http://localhost:7233/health 2>/dev/null || true)"
        if echo "$health_status" | grep -q "SERVING"; then
            log_success "Temporal health check PASSED (status: SERVING)"
        else
            log_warn "Temporal health check returned: ${health_status:-no response}"
            log_warn "This may be normal if the pod just started. Continuing..."
        fi
    fi
}

# ---- Install SigNoz ---------------------------------------------------------

install_signoz() {
    log_step "5/7 — Installing SigNoz via Helm..."

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
    log_step "6/7 — Waiting for SigNoz to be ready..."

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

    # Verify OTel collector endpoint
    log_info "Testing OTel collector gRPC endpoint..."
    local otel_pod
    otel_pod="$(kubectl get pod -n "$SIGNOZ_NAMESPACE" \
        --selector=app.kubernetes.io/component=otel-collector \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"

    if [[ -n "$otel_pod" ]]; then
        # Check if the OTel collector is listening on port 4317
        local grpc_status
        grpc_status="$(kubectl exec -n "$SIGNOZ_NAMESPACE" "$otel_pod" -- \
            sh -c 'nc -zv localhost 4317 2>&1' 2>/dev/null || true)"
        if echo "$grpc_status" | grep -qi "succeeded\|open\|Connected"; then
            log_success "OTel collector gRPC endpoint (4317) is listening."
        else
            log_warn "OTel collector gRPC port check: ${grpc_status:-no response}"
        fi

        # Check HTTP endpoint
        local http_status
        http_status="$(kubectl exec -n "$SIGNOZ_NAMESPACE" "$otel_pod" -- \
            sh -c 'nc -zv localhost 4318 2>&1' 2>/dev/null || true)"
        if echo "$http_status" | grep -qi "succeeded\|open\|Connected"; then
            log_success "OTel collector HTTP endpoint (4318) is listening."
        else
            log_warn "OTel collector HTTP port check: ${http_status:-no response}"
        fi
    else
        log_warn "Could not find OTel collector pod for endpoint verification."
    fi

    # List all pods in the namespace
    log_info "SigNoz pods status:"
    kubectl get pods -n "$SIGNOZ_NAMESPACE"

    log_success "SigNoz verification complete."
}

# ---- Print Connection Info --------------------------------------------------

print_summary() {
    log_step "7/7 — Deployment Summary"

    echo ""
    echo "================================================================"
    echo "  FeatureSignals — Observability & Workflows Deployed"
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

    # Temporal connection info
    TEMPORAL_SVC="temporal.${TEMPORAL_NAMESPACE}.svc.cluster.local"
    echo "  ├─ Temporal (Workflow Engine)"
    echo "  │"
    echo "  │   Namespace:       ${TEMPORAL_NAMESPACE}"
    echo "  │   gRPC endpoint:  ${TEMPORAL_SVC}:7233"
    echo "  │   Database:       PostgreSQL (shared with app)"
    echo "  │   DB name:        ${TEMPORAL_DB}"
    echo "  │   ES:             Disabled (PostgreSQL visibility)"
    echo "  │"
    echo "  │   Test connection:"
    echo "  │     kubectl run -it --rm temporal-cli --image=temporalio/admin-tools:1.25 \\"
    echo "  │       -n ${TEMPORAL_NAMESPACE} --restart=Never -- \\"
    echo "  │       tctl --address ${TEMPORAL_SVC}:7233 --namespace default \\"
    echo "  │       cluster health"
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
    echo "  ── Pod Status ─────────────────────────────────────────────────"
    echo ""
    echo "  SigNoz:"
    kubectl get pods -n "$SIGNOZ_NAMESPACE" -o wide 2>/dev/null || \
        echo "    (no pods found)"
    echo ""
    echo "  Temporal:"
    kubectl get pods -n "$TEMPORAL_NAMESPACE" -o wide 2>/dev/null || \
        echo "    (no pods found)"
    echo ""

    # Resource budget summary
    echo "  ── Resource Budget ─────────────────────────────────────────────"
    echo ""
    echo "  Component              vCPU Req  Mem Req    vCPU Lim  Mem Lim"
    echo "  ───────────────────────────────────────────────────────────────"
    echo "  SigNoz ClickHouse      200m      512Mi      500m      1Gi"
    echo "  SigNoz Query Service   100m      256Mi      300m      512Mi"
    echo "  SigNoz OTel Collector  100m      256Mi      300m      512Mi"
    echo "  SigNoz Frontend         50m      128Mi      200m      256Mi"
    echo "  Temporal Server        100m      256Mi      300m      512Mi"
    echo "  ───────────────────────────────────────────────────────────────"
    echo "  Total                  550m      ~1.4 GiB   1.6 CPU   ~2.8 GiB"
    echo "  Available on CPX42     8 vCPU    16 GiB     8 vCPU    16 GiB"
    echo "  Headroom              ~7.5 vCPU  ~14.6 GiB  ~6.4 CPU  ~13.2 GiB"
    echo ""
    echo "================================================================"
}

# ---- Uninstall Function (for cleanup) ---------------------------------------

uninstall_all() {
    log_warn "=== Uninstalling SigNoz and Temporal ==="
    log_warn "This will remove ALL data including ClickHouse storage."
    log_warn "Type 'yes' to confirm:"
    read -r confirmation
    if [[ "$confirmation" != "yes" ]]; then
        log_info "Aborted."
        exit 0
    fi

    log_info "Uninstalling SigNoz..."
    helm uninstall signoz --namespace "$SIGNOZ_NAMESPACE" 2>/dev/null || true

    log_info "Uninstalling Temporal..."
    helm uninstall temporal --namespace "$TEMPORAL_NAMESPACE" 2>/dev/null || true

    log_info "Deleting namespaces..."
    kubectl delete namespace "$SIGNOZ_NAMESPACE" 2>/dev/null || true
    kubectl delete namespace "$TEMPORAL_NAMESPACE" 2>/dev/null || true

    log_success "Cleanup complete."
}

# ---- Main -------------------------------------------------------------------

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  FeatureSignals — SigNoz & Temporal Installer               ║"
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
                echo "  --uninstall    Remove SigNoz, Temporal, and their namespaces"
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
    create_temporal_databases
    install_temporal
    wait_for_temporal
    install_signoz
    wait_for_signoz
    print_summary

    log_success "Installation complete!"
    echo ""
    log_info "SigNoz dashboard:  kubectl port-forward -n ${SIGNOZ_NAMESPACE} svc/signoz-frontend 3301:3301"
    log_info "Temporal CLI:      kubectl run -it --rm temporal-cli --image=temporalio/admin-tools:1.25 -n ${TEMPORAL_NAMESPACE} --restart=Never -- tctl --address temporal.${TEMPORAL_NAMESPACE}:7233 --namespace default cluster health"
    echo ""
}

main "$@"
