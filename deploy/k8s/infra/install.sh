#!/usr/bin/env bash
#
# =============================================================================
# FeatureSignals — Infrastructure Install Helper
# =============================================================================
#
# A convenience script that installs all infrastructure components in the
# correct order:
#   1. cert-manager + ClusterIssuers
#   2. MetalLB + IP pool
#   3. Caddy ingress controller
#   4. PostgreSQL via Helm
#   5. SigNoz (if --with-signoz or --all)
#   6. Temporal (if --with-temporal or --all)
#   7. Wait for all components to be Ready
#
# This script is called by `make infra-deploy` and is idempotent.
#
# Usage:
#   export ACME_EMAIL="admin@featuresignals.com"
#   export VPS_IP="$(curl -s https://api.ipify.org)"
#   ./install.sh                          # base infra only
#   ./install.sh --with-signoz             # base + SigNoz
#   ./install.sh --with-temporal           # base + Temporal
#   ./install.sh --all                     # everything
#
# Required Environment Variables:
#   ACME_EMAIL         Email for Let's Encrypt certificate registration
#
# Optional Environment Variables:
#   VPS_IP             VPS public IP address (auto-detected if not set)
#   POSTGRES_PASSWORD  PostgreSQL password (auto-generated if empty)
#   KUBECONFIG         Path to kubeconfig (default: /etc/rancher/k3s/k3s.yaml)
#   SIGNOZ_ENABLED     Set to "true" (default) to install SigNoz
#   TEMPORAL_ENABLED   Set to "true" (default) to install Temporal
# =============================================================================

set -euo pipefail

# ---- Color Output -----------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- Configuration ----------------------------------------------------------

KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACME_EMAIL="${ACME_EMAIL:-}"
VPS_IP="${VPS_IP:-}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

# Feature flags — these can also be set via command-line flags
INSTALL_SIGNOZ=false
INSTALL_TEMPORAL=false

# ---- Prerequisite Check -----------------------------------------------------
prereq_check() {
    log_info "Checking prerequisites..."

    if [[ ! -f "$KUBECONFIG" ]]; then
        log_error "Kubeconfig not found at ${KUBECONFIG}"
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

    if [[ -z "$ACME_EMAIL" ]]; then
        log_error "ACME_EMAIL is not set."
        log_error "Export it: export ACME_EMAIL=\"admin@featuresignals.com\""
        exit 1
    fi

    # Auto-detect VPS IP if not set
    if [[ -z "$VPS_IP" ]]; then
        log_info "VPS_IP not set. Auto-detecting..."
        VPS_IP="$(curl -s https://api.ipify.org || curl -s https://icanhazip.com)"
        if [[ -z "$VPS_IP" ]]; then
            log_error "Could not auto-detect VPS IP. Set VPS_IP manually."
            exit 1
        fi
        log_info "Auto-detected VPS IP: ${VPS_IP}"
    fi

    # Ensure Helm is installed
    if ! command -v helm &>/dev/null; then
        log_error "Helm is not installed."
        exit 1
    fi

    log_info "All prerequisites satisfied."
}

# ---- cert-manager Installation ----------------------------------------------
install_cert_manager() {
    log_info "=== Installing cert-manager ==="

    local manifest_dir="${INFRA_DIR}/cert-manager"

    if [[ ! -f "${manifest_dir}/cluster-issuer.yaml" ]]; then
        log_warn "cluster-issuer.yaml not found at ${manifest_dir}"
        log_warn "Skipping cert-manager manifest application."
        return 0
    fi

    # Check if cert-manager is already installed via Helm
    if helm ls -n cert-manager --short 2>/dev/null | grep -q "^cert-manager$"; then
        log_info "cert-manager Helm release already installed. Skipping."
    else
        log_info "Installing cert-manager via Helm..."
        helm upgrade --install cert-manager jetstack/cert-manager \
            --namespace cert-manager \
            --create-namespace \
            --set installCRDs=true \
            --set global.leaderElection.namespace=cert-manager \
            --set webhook.resources.requests.memory=64Mi \
            --set cainjector.resources.requests.memory=64Mi \
            --set resources.requests.memory=64Mi \
            --wait \
            --timeout 5m
        log_info "cert-manager installed via Helm."
    fi

    # Apply ClusterIssuers with envsubst
    log_info "Applying ClusterIssuers..."
    export ACME_EMAIL
    envsubst < "${manifest_dir}/cluster-issuer.yaml" | kubectl apply -f -

    log_info "cert-manager setup complete."
}

# ---- MetalLB Installation ---------------------------------------------------
install_metallb() {
    log_info "=== Installing MetalLB ==="

    local manifest_dir="${INFRA_DIR}/metallb"

    if [[ ! -f "${manifest_dir}/ip-pool.yaml" ]]; then
        log_warn "ip-pool.yaml not found at ${manifest_dir}"
        log_warn "Skipping MetalLB manifest application."
        return 0
    fi

    # Check if MetalLB is already installed via Helm
    if helm ls -n metallb-system --short 2>/dev/null | grep -q "^metallb$"; then
        log_info "MetalLB Helm release already installed. Skipping."
    else
        log_info "Installing MetalLB via Helm..."
        helm upgrade --install metallb metallb/metallb \
            --namespace metallb-system \
            --create-namespace \
            --set controller.resources.requests.memory=64Mi \
            --set speaker.resources.requests.memory=64Mi \
            --wait \
            --timeout 5m
        log_info "MetalLB installed via Helm."
    fi

    # Apply IP pool with envsubst
    log_info "Applying MetalLB IP pool..."
    export VPS_IP
    envsubst < "${manifest_dir}/ip-pool.yaml" | kubectl apply -f -

    log_info "MetalLB setup complete."
}

# ---- Caddy Ingress Installation ---------------------------------------------
install_caddy_ingress() {
    log_info "=== Installing Caddy Ingress ==="

    local values_file="${INFRA_DIR}/caddy/values.yaml"
    local deployment_file="${INFRA_DIR}/caddy/caddy-deployment.yaml"

    # Prefer Helm chart, fall back to raw deployment manifest
    if helm repo list 2>/dev/null | grep -q "caddy-ingress"; then
        if [[ -f "$values_file" ]]; then
            log_info "Installing Caddy ingress via Helm..."
            helm upgrade --install caddy-ingress caddy-ingress/caddy-ingress-controller \
                --namespace caddy-system \
                --create-namespace \
                --values "$values_file" \
                --set config.email="$ACME_EMAIL" \
                --wait \
                --timeout 5m
            log_info "Caddy ingress installed via Helm."
        else
            log_warn "Caddy Helm values not found at ${values_file}"
            log_warn "Skipping Helm-based installation."
        fi
    else
        log_warn "caddy-ingress Helm repo not found. Attempting Helm repo add..."
        helm repo add caddy-ingress https://caddyserver.github.io/ingress --force-update
        helm repo update
        log_info "Retrying Caddy ingress installation via Helm..."
        if [[ -f "$values_file" ]]; then
            helm upgrade --install caddy-ingress caddy-ingress/caddy-ingress-controller \
                --namespace caddy-system \
                --create-namespace \
                --values "$values_file" \
                --set config.email="$ACME_EMAIL" \
                --wait \
                --timeout 5m
            log_info "Caddy ingress installed via Helm."
        fi
    fi

    # Additionally apply the raw deployment manifest for full Caddyfile control
    if [[ -f "$deployment_file" ]]; then
        log_info "Applying Caddy deployment manifest..."
        export ACME_EMAIL
        envsubst < "$deployment_file" | kubectl apply -f -
        log_info "Caddy deployment manifest applied."
    fi

    log_info "Caddy ingress setup complete."
}

# ---- PostgreSQL Installation -------------------------------------------------
install_postgresql() {
    log_info "=== Installing PostgreSQL (Bitnami) ==="

    if helm ls -n featuresignals-system --short 2>/dev/null | grep -q "^featuresignals-db$"; then
        log_info "PostgreSQL Helm release already installed. Checking status..."
        local pg_pod
        pg_pod="$(kubectl get pod -n featuresignals-system \
            --selector=app.kubernetes.io/instance=featuresignals-db \
            --selector=role=primary \
            -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
        if [[ -n "$pg_pod" ]] && kubectl wait --for=condition=Ready "pod/${pg_pod}" \
            -n featuresignals-system --timeout=30s &>/dev/null; then
            log_info "PostgreSQL is running. Skipping installation."
            return 0
        else
            log_warn "PostgreSQL pod not ready. Reinstalling..."
            helm uninstall featuresignals-db --namespace featuresignals-system 2>/dev/null || true
        fi
    fi

    # Helm repo should already be added, but ensure it
    helm repo add bitnami https://charts.bitnami.com/bitnami --force-update 2>/dev/null || true
    helm repo update 2>/dev/null || true

    # Generate password if not provided
    local pg_password="$POSTGRES_PASSWORD"
    if [[ -z "$pg_password" ]]; then
        pg_password="$(openssl rand -base64 32)"
        log_warn "POSTGRES_PASSWORD was not set. Generated: ${pg_password}"
        log_warn "Save this password! It will not be shown again."
    fi

    log_info "Installing PostgreSQL..."
    helm upgrade --install featuresignals-db bitnami/postgresql \
        --namespace featuresignals-system \
        --create-namespace \
        --set auth.postgresPassword="$pg_password" \
        --set auth.database=featuresignals \
        --set auth.username=fs \
        --set auth.password="$pg_password" \
        --set persistence.size=30Gi \
        --set primary.resources.requests.memory=512Mi \
        --set primary.resources.requests.cpu=250m \
        --set primary.resources.limits.memory=1Gi \
        --set primary.resources.limits.cpu=1000m \
        --set metrics.enabled=true \
        --set metrics.serviceMonitor.enabled=true \
        --wait \
        --timeout 10m

    log_info "PostgreSQL installation complete."
}

# ---- SigNoz Installation ----------------------------------------------------
install_signoz() {
    log_info "=== Installing SigNoz (Observability Stack) ==="

    local signoz_script="${INFRA_DIR}/signoz/install.sh"
    if [[ ! -f "$signoz_script" ]]; then
        log_warn "SigNoz install script not found at ${signoz_script}. Skipping."
        return 0
    fi

    # Check if already installed
    if helm ls -n signoz --short 2>/dev/null | grep -q "^signoz$"; then
        log_info "SigNoz is already installed. Skipping."
        return 0
    fi

    log_info "Running SigNoz install script..."
    bash "$signoz_script"
    log_info "SigNoz installation complete."
}

# ---- Temporal Installation --------------------------------------------------
install_temporal() {
    log_info "=== Installing Temporal (Workflow Engine) ==="

    local temporal_script="${INFRA_DIR}/temporal/install.sh"
    if [[ ! -f "$temporal_script" ]]; then
        log_warn "Temporal install script not found at ${temporal_script}. Skipping."
        return 0
    fi

    # Check if already installed
    if helm ls -n temporal --short 2>/dev/null | grep -q "^temporal$"; then
        log_info "Temporal is already installed. Skipping."
        return 0
    fi

    log_info "Running Temporal install script..."
    bash "$temporal_script"
    log_info "Temporal installation complete."
}

# ---- Wait for Components to Be Ready ----------------------------------------
wait_for_ready() {
    log_info "=== Waiting for all components to be Ready ==="

    local components=(
        "cert-manager:cert-manager"
        "metallb-system:metallb-system"
        "caddy-system:caddy-system"
        "featuresignals-system:featuresignals-system"
    )

    for component in "${components[@]}"; do
        local namespace="${component#*:}"
        local label="${component%:*}"

        log_info "Waiting for pods in namespace '${namespace}'..."
        kubectl wait --for=condition=Ready pods --all \
            --namespace="${namespace}" --timeout=180s 2>/dev/null || \
            log_warn "Some pods in '${namespace}' are not ready yet."
    done

    if [[ "$INSTALL_SIGNOZ" == true ]]; then
        log_info "Waiting for pods in signoz namespace..."
        kubectl wait --for=condition=Ready pods --all \
            --namespace=signoz --timeout=600s 2>/dev/null || \
            log_warn "Some SigNoz pods are not ready yet."
    fi

    if [[ "$INSTALL_TEMPORAL" == true ]]; then
        log_info "Waiting for pods in temporal namespace..."
        kubectl wait --for=condition=Ready pods --all \
            --namespace=temporal --timeout=300s 2>/dev/null || \
            log_warn "Some Temporal pods are not ready yet."
    fi

    log_info "=== Cluster Status ==="
    echo ""
    echo "Nodes:"
    kubectl get nodes -o wide
    echo ""
    echo "Pods (all namespaces):"
    kubectl get pods --all-namespaces
    echo ""
    echo "Services (LoadBalancer):"
    kubectl get svc --all-namespaces | grep -E "LoadBalancer|NAMESPACE"
}

# ---- Summary ----------------------------------------------------------------
print_summary() {
    log_info "=== Infrastructure Deployment Summary ==="
    echo ""
    echo "================================================================"
    echo "  FeatureSignals — Infrastructure Deployed"
    echo "================================================================"
    echo ""

    # Get Caddy ingress service IP
    local caddy_ip=""
    caddy_ip="$(kubectl get svc -n caddy-system -l app.kubernetes.io/name=caddy-ingress-controller \
        -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
    if [[ -z "$caddy_ip" ]]; then
        caddy_ip="$(kubectl get svc -n caddy-system caddy \
            -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")"
    fi

    echo "  Component          Status"
    echo "  -----------------------------------------"
    echo "  cert-manager       $(kubectl get deployment -n cert-manager -o jsonpath='{.items[*].status.readyReplicas}' 2>/dev/null || echo '?')/$(kubectl get deployment -n cert-manager -o jsonpath='{.items[*].spec.replicas}' 2>/dev/null || echo '?') replicas ready"
    echo "  MetalLB            $(kubectl get pods -n metallb-system --field-selector=status.phase=Running -o name 2>/dev/null | wc -l | xargs) pods running"
    echo "  Caddy Ingress      IP: ${caddy_ip}"
    echo "  PostgreSQL         $(kubectl get pods -n featuresignals-system --selector=app.kubernetes.io/instance=featuresignals-db --field-selector=status.phase=Running -o name 2>/dev/null | wc -l | xargs) pods running"
    if [[ "$INSTALL_SIGNOZ" == true ]]; then
        echo "  SigNoz             $(kubectl get pods -n signoz --field-selector=status.phase=Running -o name 2>/dev/null | wc -l | xargs) pods running"
    fi
    if [[ "$INSTALL_TEMPORAL" == true ]]; then
        echo "  Temporal           $(kubectl get pods -n temporal --field-selector=status.phase=Running -o name 2>/dev/null | wc -l | xargs) pods running"
    fi
    echo ""
    echo "  ACME Email:        ${ACME_EMAIL}"
    echo "  VPS IP:            ${VPS_IP}"
    echo ""

    if [[ "$INSTALL_SIGNOZ" == true ]]; then
        echo "  SigNoz Dashboard:  kubectl port-forward -n signoz svc/signoz-frontend 3301:3301"
        echo "                     (Open http://localhost:3301, default admin/signoz)"
    fi
    if [[ "$INSTALL_TEMPORAL" == true ]]; then
        echo "  Temporal gRPC:     temporal.temporal.svc.cluster.local:7233"
    fi
    echo ""
    echo "  To deploy the application:"
    echo "    make app-deploy"
    echo "  Or:"
    echo "    helm upgrade --install featuresignals ../helm/featuresignals \\"
    echo "      --namespace featuresignals-system \\"
    echo "      --create-namespace \\"
    echo "      --wait"
    echo ""
    echo "================================================================"
}

# ---- Usage ------------------------------------------------------------------
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --with-signoz     Install SigNoz observability stack"
    echo "  --with-temporal   Install Temporal workflow engine"
    echo "  --all             Install all components (cert-manager, MetalLB, Caddy,"
    echo "                    PostgreSQL, SigNoz, Temporal)"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  ACME_EMAIL        Required. Email for Let's Encrypt."
    echo "  POSTGRES_PASSWORD Optional. Auto-generated if not set."
    echo "  VPS_IP            Optional. Auto-detected if not set."
    echo "  KUBECONFIG        Optional. Default: /etc/rancher/k3s/k3s.yaml"
}

# ---- Main -------------------------------------------------------------------
main() {
    echo ""
    echo "================================================================"
    echo "  FeatureSignals — Infrastructure Install"
    echo "================================================================"
    echo ""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --with-signoz)
                INSTALL_SIGNOZ=true
                shift
                ;;
            --with-temporal)
                INSTALL_TEMPORAL=true
                shift
                ;;
            --all)
                INSTALL_SIGNOZ=true
                INSTALL_TEMPORAL=true
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    prereq_check

    # Ensure Helm repositories are available
    log_info "Updating Helm repositories..."
    helm repo update 2>/dev/null || log_warn "Helm repo update had issues. Continuing..."

    install_cert_manager
    install_metallb
    install_caddy_ingress
    install_postgresql

    if [[ "$INSTALL_SIGNOZ" == true ]]; then
        install_signoz
    fi

    if [[ "$INSTALL_TEMPORAL" == true ]]; then
        install_temporal
    fi

    wait_for_ready
    print_summary

    log_info "Infrastructure installation complete!"
}

main "$@"
