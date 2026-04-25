#!/usr/bin/env bash
# =============================================================================
# FeatureSignals — Temporal Install Script
# =============================================================================
#
# Installs the Temporal workflow orchestration engine on a single-node k3s
# cluster. Uses the shared Bitnami PostgreSQL instance — no Cassandra, no
# Elasticsearch.
#
# This script:
#   1. Creates the 'temporal' namespace
#   2. Creates temporal + temporal_visibility databases in shared PostgreSQL
#   3. Adds the Temporal Helm repo if not present
#   4. Installs Temporal via Helm (shared PostgreSQL, no Cassandra, no ES)
#   5. Waits for Temporal server to be ready
#   6. Tests Temporal health endpoint (/health on port 7233)
#   7. Outputs connection info
#
# Prerequisites:
#   - k3s cluster running (kubectl works)
#   - Helm installed
#   - PostgreSQL already deployed (Bitnami, in featuresignals-system)
#
# Usage:
#   ./install.sh
#
# Optional Environment Variables:
#   KUBECONFIG            Path to kubeconfig (default: /etc/rancher/k3s/k3s.yaml)
#   TEMPORAL_NAMESPACE    Namespace for Temporal (default: temporal)
#   HELM_TIMEOUT          Helm install timeout (default: 10m)
#   POSTGRES_PASSWORD     PostgreSQL password (auto-read from secret if not set)
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

TEMPORAL_NAMESPACE="${TEMPORAL_NAMESPACE:-temporal}"
TEMPORAL_VALUES="${SCRIPTS_DIR}/values.yaml"

HELM_TIMEOUT="${HELM_TIMEOUT:-10m}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_NAMESPACE="featuresignals-system"
POSTGRES_SERVICE="postgresql.${POSTGRES_NAMESPACE}.svc.cluster.local"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
TEMPORAL_DB="temporal"
TEMPORAL_VISIBILITY_DB="temporal_visibility"

# ---- Prerequisite Checks ----------------------------------------------------

prereq_check() {
    log_step "1/6 — Checking prerequisites..."

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

    # Verify Temporal Helm repo
    if ! helm repo list -o yaml 2>/dev/null | grep -q "temporal"; then
        log_info "Adding Temporal Helm repo..."
        helm repo add temporal https://temporalio.github.io/helm-charts --force-update
        helm repo update
    fi

    # Verify values file exists
    if [[ ! -f "$TEMPORAL_VALUES" ]]; then
        log_error "Temporal values file not found: ${TEMPORAL_VALUES}"
        exit 1
    fi

    # Verify PostgreSQL is running
    log_info "Checking PostgreSQL connection..."
    local pg_pod
    pg_pod="$(kubectl get pod -n "$POSTGRES_NAMESPACE" \
        --selector=app.kubernetes.io/instance=featuresignals-db \
        --selector=role=primary \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
    if [[ -z "$pg_pod" ]]; then
        log_error "PostgreSQL pod not found in ${POSTGRES_NAMESPACE} namespace."
        log_error "Is PostgreSQL deployed? Run: make infra-deploy"
        exit 1
    fi

    if ! kubectl wait --for=condition=Ready "pod/${pg_pod}" \
        -n "$POSTGRES_NAMESPACE" --timeout=30s &>/dev/null; then
        log_error "PostgreSQL pod '${pg_pod}' is not Ready."
        exit 1
    fi
    log_success "PostgreSQL is running (pod: ${pg_pod})"

    # Get PostgreSQL password from secret if not explicitly set
    if [[ -z "$POSTGRES_PASSWORD" ]]; then
        log_info "Reading PostgreSQL password from secret 'featuresignals-db-postgresql'..."
        POSTGRES_PASSWORD="$(kubectl get secret featuresignals-db-postgresql \
            -n "$POSTGRES_NAMESPACE" \
            -o jsonpath='{.data.postgres-password}' 2>/dev/null | base64 -d || true)"
        if [[ -z "$POSTGRES_PASSWORD" ]]; then
            log_warn "Could not read from 'featuresignals-db-postgresql' secret."
            log_info "Trying 'db-credentials' secret..."
            POSTGRES_PASSWORD="$(kubectl get secret db-credentials \
                -n "$POSTGRES_NAMESPACE" \
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

# ---- Create Temporal Databases ----------------------------------------------

create_temporal_databases() {
    log_step "2/6 — Creating Temporal databases in PostgreSQL..."

    local pg_pod
    pg_pod="$(kubectl get pod -n "$POSTGRES_NAMESPACE" \
        --selector=app.kubernetes.io/instance=featuresignals-db \
        --selector=role=primary \
        -o jsonpath='{.items[0].metadata.name}')"

    # Create the temporal database if it doesn't exist
    log_info "Creating database '${TEMPORAL_DB}' (if not exists)..."
    local db_exists
    db_exists="$(kubectl exec -n "$POSTGRES_NAMESPACE" "$pg_pod" -- \
        psql -U "$POSTGRES_USER" -d postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname = '${TEMPORAL_DB}'" 2>/dev/null || true)"
    if [[ "$db_exists" == "1" ]]; then
        log_info "Database '${TEMPORAL_DB}' already exists. Skipping."
    else
        kubectl exec -n "$POSTGRES_NAMESPACE" "$pg_pod" -- \
            psql -U "$POSTGRES_USER" -d postgres -c \
            "CREATE DATABASE ${TEMPORAL_DB}"
        log_success "Database '${TEMPORAL_DB}' created."
    fi

    # Create the temporal_visibility database if it doesn't exist
    log_info "Creating database '${TEMPORAL_VISIBILITY_DB}' (if not exists)..."
    local vis_exists
    vis_exists="$(kubectl exec -n "$POSTGRES_NAMESPACE" "$pg_pod" -- \
        psql -U "$POSTGRES_USER" -d postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname = '${TEMPORAL_VISIBILITY_DB}'" 2>/dev/null || true)"
    if [[ "$vis_exists" == "1" ]]; then
        log_info "Database '${TEMPORAL_VISIBILITY_DB}' already exists. Skipping."
    else
        kubectl exec -n "$POSTGRES_NAMESPACE" "$pg_pod" -- \
            psql -U "$POSTGRES_USER" -d postgres -c \
            "CREATE DATABASE ${TEMPORAL_VISIBILITY_DB}"
        log_success "Database '${TEMPORAL_VISIBILITY_DB}' created."
    fi

    # Verify both databases exist
    log_info "Verifying databases..."
    kubectl exec -n "$POSTGRES_NAMESPACE" "$pg_pod" -- \
        psql -U "$POSTGRES_USER" -d postgres -c \
        "SELECT datname FROM pg_database WHERE datname IN ('${TEMPORAL_DB}', '${TEMPORAL_VISIBILITY_DB}') ORDER BY datname"

    log_success "Temporal databases ready."
}

# ---- Install Temporal -------------------------------------------------------

install_temporal() {
    log_step "3/6 — Installing Temporal via Helm..."

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
        return 0
    fi

    log_info "Installing Temporal for the first time..."
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
}

# ---- Wait for Temporal & Verify Health --------------------------------------

wait_for_temporal() {
    log_step "4/6 — Waiting for Temporal to be ready..."

    # Wait for the Temporal server deployment
    log_info "Waiting for deployment/temporal..."
    kubectl wait --for=condition=Available deployment/temporal \
        -n "$TEMPORAL_NAMESPACE" --timeout=5m

    # Wait for all pods to be ready
    log_info "Waiting for all Temporal pods..."
    kubectl wait --for=condition=Ready pods \
        --all -n "$TEMPORAL_NAMESPACE" --timeout=5m

    log_success "Temporal pods are ready."
}

# ---- Test Temporal Health ---------------------------------------------------

test_temporal_health() {
    log_step "5/6 — Testing Temporal health endpoint..."

    local temporal_pod
    temporal_pod="$(kubectl get pod -n "$TEMPORAL_NAMESPACE" \
        --selector=app.kubernetes.io/name=temporal \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"

    if [[ -z "$temporal_pod" ]]; then
        log_warn "Could not find Temporal pod for health check."
        return 0
    fi

    log_info "Checking health on pod ${temporal_pod}..."
    local health_status
    health_status="$(kubectl exec -n "$TEMPORAL_NAMESPACE" "$temporal_pod" -- \
        wget -q -O- http://localhost:7233/health 2>/dev/null || true)"

    if echo "$health_status" | grep -q "SERVING"; then
        log_success "Temporal health check PASSED (status: SERVING)"
    else
        log_warn "Temporal health check returned: ${health_status:-no response}"
        log_warn "The pod may still be starting. Continuing..."
    fi

    # Also test via service DNS (more realistic)
    log_info "Testing Temporal via service DNS..."
    local svc_health
    svc_health="$(kubectl run -n "$TEMPORAL_NAMESPACE" \
        --image=curlimages/curl:8.12.1 \
        --restart=Never \
        temporal-health-check \
        -- curl -s --max-time 5 \
        "http://temporal.${TEMPORAL_NAMESPACE}.svc.cluster.local:7233/health" \
        2>/dev/null || true)"
    # Clean up the test pod
    kubectl delete pod temporal-health-check \
        -n "$TEMPORAL_NAMESPACE" --ignore-not-found --timeout=10s 2>/dev/null || true

    if echo "$svc_health" | grep -q "SERVING"; then
        log_success "Temporal service DNS health check PASSED (status: SERVING)"
    else
        log_warn "Temporal service DNS health check: ${svc_health:-no response}"
        log_warn "DNS resolution might not be available yet. Continuing..."
    fi
}

# ---- Print Connection Info --------------------------------------------------

print_summary() {
    log_step "6/6 — Deployment Summary"

    echo ""
    echo "================================================================"
    echo "  FeatureSignals — Temporal Workflow Engine Deployed"
    echo "================================================================"
    echo ""

    local temporal_svc="temporal.${TEMPORAL_NAMESPACE}.svc.cluster.local"

    echo "  ┌─ Temporal (Workflow Engine)"
    echo "  │"
    echo "  │   Namespace:       ${TEMPORAL_NAMESPACE}"
    echo "  │   gRPC endpoint:  ${temporal_svc}:7233"
    echo "  │   Database:       PostgreSQL (shared Bitnami instance)"
    echo "  │   Main DB:        ${TEMPORAL_DB}"
    echo "  │   Visibility DB:  ${TEMPORAL_VISIBILITY_DB}"
    echo "  │   Cassandra:      Disabled"
    echo "  │   Elasticsearch:  Disabled (PostgreSQL visibility)"
    echo "  │"
    echo "  │   Test connection:"
    echo "  │     kubectl run -it --rm temporal-cli --image=temporalio/admin-tools:1.25 \\"
    echo "  │       -n ${TEMPORAL_NAMESPACE} --restart=Never -- \\"
    echo "  │       tctl --address ${temporal_svc}:7233 --namespace default \\"
    echo "  │       cluster health"
    echo "  │"
    echo "  │   Register a new namespace:"
    echo "  │     kubectl run -it --rm temporal-cli --image=temporalio/admin-tools:1.25 \\"
    echo "  │       -n ${TEMPORAL_NAMESPACE} --restart=Never -- \\"
    echo "  │       tctl --address ${temporal_svc}:7233 namespace register \\"
    echo "  │       --retention 7 default"
    echo "  │"

    # Application configuration
    echo "  └─ Application Configuration"
    echo "      "
    echo "      Add to your Helm values.yaml or env vars:"
    echo "      ───────────────────────────────────────────────"
    echo "      TEMPORAL_ADDRESS: ${temporal_svc}:7233"
    echo "      TEMPORAL_NAMESPACE: default"
    echo "      TEMPORAL_TLS_ENABLED: false"
    echo "      ───────────────────────────────────────────────"
    echo ""

    # Pod status summary
    echo "  ── Pod Status ────────────────────────────────────────────────"
    echo ""
    echo "  Temporal:"
    kubectl get pods -n "$TEMPORAL_NAMESPACE" -o wide 2>/dev/null || \
        echo "    (no pods found)"
    echo ""

    # Resource budget summary
    echo "  ── Resource Budget ───────────────────────────────────────────"
    echo ""
    echo "  Component              vCPU Req  Mem Req    vCPU Lim  Mem Lim"
    echo "  ───────────────────────────────────────────────────────────────"
    echo "  Temporal Server         100m      256Mi      300m      512Mi"
    echo "  ───────────────────────────────────────────────────────────────"
    echo "  Total                   100m      256Mi      300m      512Mi"
    echo "  Available on CPX42      8 vCPU    16 GiB     8 vCPU    16 GiB"
    echo "  Headroom               ~7.9 vCPU  ~15.7 GiB  ~7.7 CPU  ~15.5 GiB"
    echo ""
    echo "================================================================"
}

# ---- Uninstall Feature (for cleanup) ---------------------------------------

uninstall_all() {
    log_warn "=== Uninstalling Temporal ==="
    log_warn "This will remove Temporal and its data."
    log_warn "Type 'yes' to confirm:"
    read -r confirmation
    if [[ "$confirmation" != "yes" ]]; then
        log_info "Aborted."
        exit 0
    fi

    log_info "Uninstalling Temporal Helm release..."
    helm uninstall temporal --namespace "$TEMPORAL_NAMESPACE" 2>/dev/null || true

    log_info "Deleting namespace..."
    kubectl delete namespace "$TEMPORAL_NAMESPACE" 2>/dev/null || true

    log_info "Note: Temporal databases (${TEMPORAL_DB}, ${TEMPORAL_VISIBILITY_DB})"
    log_info "in PostgreSQL were NOT deleted. To remove them manually:"
    log_info "  kubectl exec -n ${POSTGRES_NAMESPACE} <pg-pod> -- \\"
    log_info "    psql -U postgres -d postgres -c \"DROP DATABASE IF EXISTS ${TEMPORAL_DB};\""
    log_info "  kubectl exec -n ${POSTGRES_NAMESPACE} <pg-pod> -- \\"
    log_info "    psql -U postgres -d postgres -c \"DROP DATABASE IF EXISTS ${TEMPORAL_VISIBILITY_DB};\""

    log_success "Temporal cleanup complete."
}

# ---- Main -------------------------------------------------------------------

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  FeatureSignals — Temporal Workflow Installer               ║"
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
                echo "  --uninstall    Remove Temporal, its namespace, and data"
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
    test_temporal_health
    print_summary

    log_success "Temporal installation complete!"
    echo ""
    log_info "Temporal gRPC:  temporal.${TEMPORAL_NAMESPACE}:7233"
    log_info "Health check:   kubectl exec -n ${TEMPORAL_NAMESPACE} deploy/temporal -- wget -q -O- http://localhost:7233/health"
    log_info "CLI test:       kubectl run -it --rm temporal-cli --image=temporalio/admin-tools:1.25 -n ${TEMPORAL_NAMESPACE} --restart=Never -- tctl --address temporal.${TEMPORAL_NAMESPACE}:7233 --namespace default cluster health"
    echo ""
}

main "$@"
