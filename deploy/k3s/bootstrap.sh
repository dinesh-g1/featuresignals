#!/usr/bin/env bash
#
# =============================================================================
# FeatureSignals — k3s Single-Node Bootstrap Script
# =============================================================================
#
# A single, idempotent bootstrap script that provisions a Hetzner VPS running
# Ubuntu 24.04 with k3s (single-node, embedded SQLite) and all required
# infrastructure components for the FeatureSignals platform.
#
# Usage:
#   export HETZNER_STORAGE_BOX_URL="https://your-storage-box.your-storagebox.de"
#   export HETZNER_STORAGE_BOX_ACCESS_KEY="your-access-key"
#   export HETZNER_STORAGE_BOX_SECRET_KEY="your-secret-key"
#   export ACME_EMAIL="admin@featuresignals.com"
#   export POSTGRES_PASSWORD="$(openssl rand -base64 32)"
#   sudo ./bootstrap.sh
#
# Required Environment Variables:
#   HETZNER_STORAGE_BOX_URL       S3-compatible endpoint URL for backups
#   HETZNER_STORAGE_BOX_ACCESS_KEY S3 access key
#   HETZNER_STORAGE_BOX_SECRET_KEY S3 secret key
#   ACME_EMAIL                     Email for Let's Encrypt certificate registration
#
# Optional Environment Variables:
#   POSTGRES_PASSWORD              PostgreSQL password (auto-generated if empty)
#   CLUSTER_CIDR                   Pod network CIDR (default: 10.42.0.0/16)
#   SERVICE_CIDR                   Service network CIDR (default: 10.43.0.0/16)
#   K3S_VERSION                    k3s version (default: latest stable)
#   SIGNOZ_ENABLED                 Install SigNoz observability stack (default: true)
#   TEMPORAL_ENABLED               Install Temporal workflow engine (default: true)
#
# This script is idempotent — safe to run multiple times. Components that are
# already installed will be skipped.
#
# Hardware Target: Hetzner CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe)
# Budget: €29.38/month (€25.49 VPS + €3.89 Storage Box)
#
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

# ---- Version Constants ------------------------------------------------------
K3S_VERSION="${K3S_VERSION:-stable}"
CERT_MANAGER_VERSION="v1.16.3"
METALLB_VERSION="v0.14.9"
POSTGRESQL_HELM_VERSION="16.4.8"
CADDY_INGRESS_VERSION="0.1.0"
SIGNOZ_HELM_CHART_VERSION="0.63.0"
TEMPORAL_HELM_CHART_VERSION="1.25.2"

# ---- Network Defaults -------------------------------------------------------
CLUSTER_CIDR="${CLUSTER_CIDR:-10.42.0.0/16}"
SERVICE_CIDR="${SERVICE_CIDR:-10.43.0.0/16}"

# ---- Feature Flags ----------------------------------------------------------
SIGNOZ_ENABLED="${SIGNOZ_ENABLED:-true}"
TEMPORAL_ENABLED="${TEMPORAL_ENABLED:-true}"

# ---- Prerequisite Check -----------------------------------------------------
prereq_check() {
    log_info "Checking prerequisites..."

    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (or with sudo)."
        exit 1
    fi

    if [[ -z "${ACME_EMAIL:-}" ]]; then
        log_error "ACME_EMAIL is not set. This is required for Let's Encrypt."
        exit 1
    fi

    # Detect architecture
    local arch
    arch="$(uname -m)"
    if [[ "$arch" != "x86_64" ]]; then
        log_error "This script supports amd64 only. Detected: $arch"
        exit 1
    fi

    # Check OS
    if ! grep -qi "ubuntu" /etc/os-release 2>/dev/null; then
        log_warn "This script is designed for Ubuntu 24.04. Proceeding anyway..."
    fi

    log_info "All prerequisites satisfied."
}

# ---- k3s Installation -------------------------------------------------------
install_k3s() {
    log_info "=== Installing k3s (single-node, embedded SQLite) ==="

    if command -v k3s &>/dev/null; then
        log_info "k3s is already installed. Checking if service is active..."
        if systemctl is-active --quiet k3s; then
            log_info "k3s service is running. Skipping installation."
            return 0
        else
            log_warn "k3s binary found but service not active. Reinstalling..."
            systemctl stop k3s 2>/dev/null || true
        fi
    fi

    # Remove any existing config to ensure clean install
    rm -f /etc/k3s.env

    # Install k3s with our specific configuration
    # --disable traefik: We use Caddy as ingress
    # --disable local-storage: We use Hetzner Storage Box / PVCs
    # --disable servicelb: We use MetalLB for LoadBalancer IPs
    # --write-kubeconfig-mode 644: Allow non-root kubectl access
    # --kubelet-arg="max-pods=100": Allow more pods per node
    # --cluster-cidr / --service-cidr: Custom network ranges
    curl -sfL https://get.k3s.io | \
        INSTALL_K3S_VERSION="${K3S_VERSION}" \
        INSTALL_K3S_EXEC="server \
            --disable traefik \
            --disable local-storage \
            --disable servicelb \
            --write-kubeconfig-mode 644 \
            --kubelet-arg=\"max-pods=100\" \
            --cluster-cidr=${CLUSTER_CIDR} \
            --service-cidr=${SERVICE_CIDR}" \
        sh -

    # Wait for k3s to be ready
    log_info "Waiting for k3s to become ready..."
    local retries=30
    local count=0
    until kubectl get nodes &>/dev/null; do
        if [[ $count -ge $retries ]]; then
            log_error "k3s did not become ready within expected time."
            journalctl -u k3s --no-pager -n 50
            exit 1
        fi
        sleep 5
        count=$((count + 1))
    done

    # Wait for node to be Ready
    kubectl wait --for=condition=Ready node --all --timeout=120s

    # Create k3s environment file for other tools
    cat > /etc/k3s.env <<EOF
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
export K3S_CLUSTER_CIDR=${CLUSTER_CIDR}
export K3S_SERVICE_CIDR=${SERVICE_CIDR}
EOF

    log_info "k3s installed successfully."
    log_info "  Node:      $(kubectl get nodes -o name)"
    log_info "  Kubeconfig: /etc/rancher/k3s/k3s.yaml"
}

# ---- Helm Installation ------------------------------------------------------
install_helm() {
    log_info "=== Installing Helm ==="

    if command -v helm &>/dev/null; then
        log_info "Helm is already installed. Version: $(helm version --short)"
        return 0
    fi

    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    # Add required Helm repositories
    helm repo add jetstack https://charts.jetstack.io --force-update
    helm repo add metallb https://metallb.github.io/metallb --force-update
    helm repo add signoz https://charts.signoz.io --force-update
    helm repo add temporal https://temporalio.github.io/helm-charts --force-update
    helm repo add bitnami https://charts.bitnami.com/bitnami --force-update
    helm repo add caddy-ingress https://caddyserver.github.io/ingress --force-update
    helm repo update

    log_info "Helm installed and repositories configured."
}

# ---- Namespace Setup --------------------------------------------------------
setup_namespaces() {
    log_info "=== Setting up Namespaces ==="

    # Core infrastructure namespaces
    for ns in cert-manager metallb-system caddy-system featuresignals-system featuresignals-saas signoz temporal; do
        if kubectl get namespace "$ns" &>/dev/null; then
            log_info "Namespace '$ns' already exists. Skipping."
        else
            kubectl create namespace "$ns"
            log_info "Created namespace: $ns"
        fi
    done

    # Label the FeatureSignals namespaces
    kubectl label namespace featuresignals-system --overwrite \
        name=featuresignals-system \
        app.kubernetes.io/managed-by=helm
    kubectl label namespace featuresignals-saas --overwrite \
        name=featuresignals-saas \
        app.kubernetes.io/managed-by=helm
}

# ---- cert-manager Installation ----------------------------------------------
install_cert_manager() {
    log_info "=== Installing cert-manager ==="

    if helm ls -n cert-manager --short 2>/dev/null | grep -q "^cert-manager$"; then
        log_info "cert-manager is already installed. Skipping."
        return 0
    fi

    # Install cert-manager with CRDs
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --version "$CERT_MANAGER_VERSION" \
        --set installCRDs=true \
        --set global.leaderElection.namespace=cert-manager \
        --set webhook.resources.requests.memory=64Mi \
        --set cainjector.resources.requests.memory=64Mi \
        --set resources.requests.memory=64Mi \
        --wait \
        --timeout 5m

    log_info "cert-manager installed."

    # Create ClusterIssuers
    log_info "Creating ClusterIssuers..."

    # Production issuer
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: ${ACME_EMAIL}
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
    - http01:
        ingress:
          class: caddy
EOF

    # Staging issuer (for testing)
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    email: ${ACME_EMAIL}
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-staging-account-key
    solvers:
    - http01:
        ingress:
          class: caddy
EOF

    log_info "ClusterIssuers created: letsencrypt-prod, letsencrypt-staging"
}

# ---- MetalLB Installation ---------------------------------------------------
install_metallb() {
    log_info "=== Installing MetalLB ==="

    if helm ls -n metallb-system --short 2>/dev/null | grep -q "^metallb$"; then
        log_info "MetalLB is already installed. Skipping."
        return 0
    fi

    # Install MetalLB with minimal resource requests
    helm upgrade --install metallb metallb/metallb \
        --namespace metallb-system \
        --version "$METALLB_VERSION" \
        --set controller.resources.requests.memory=64Mi \
        --set speaker.resources.requests.memory=64Mi \
        --wait \
        --timeout 5m

    log_info "MetalLB installed. Creating IP pool..."

    # Get the VPS IP address
    local vps_ip
    vps_ip="$(curl -s https://api.ipify.org || curl -s https://icanhazip.com)"

    if [[ -z "$vps_ip" ]]; then
        log_error "Could not determine VPS IP address."
        exit 1
    fi

    log_info "VPS IP detected: ${vps_ip}"

    # Create IP pool and L2 advertisement
    cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: vps-pool
  namespace: metallb-system
spec:
  addresses:
  - ${vps_ip}/32
  autoAssign: true
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - vps-pool
EOF

    log_info "MetalLB IP pool configured with ${vps_ip}/32"
}

# ---- Caddy Ingress Installation ---------------------------------------------
install_caddy_ingress() {
    log_info "=== Installing Caddy Ingress ==="

    if helm ls -n caddy-system --short 2>/dev/null | grep -q "^caddy-ingress$"; then
        log_info "Caddy ingress is already installed. Upgrading..."
        helm upgrade caddy-ingress caddy-ingress/caddy-ingress-controller \
            --namespace caddy-system \
            --version "$CADDY_INGRESS_VERSION" \
            --reuse-values \
            --wait \
            --timeout 5m
        return 0
    fi

    # Create the Caddy ingress configuration values
    local caddy_values="/tmp/caddy-ingress-values.yaml"

    cat > "$caddy_values" <<VALUESEOF
service:
  type: LoadBalancer
  externalTrafficPolicy: Local
config:
  email: ${ACME_EMAIL}
  onDemandTLS: false
VALUESEOF

    helm upgrade --install caddy-ingress caddy-ingress/caddy-ingress-controller \
        --namespace caddy-system \
        --version "$CADDY_INGRESS_VERSION" \
        --values "$caddy_values" \
        --wait \
        --timeout 5m

    rm -f "$caddy_values"

    log_info "Caddy ingress installed."
}

# ---- PostgreSQL Installation ------------------------------------------------
install_postgresql() {
    log_info "=== Installing PostgreSQL (Bitnami) ==="

    if helm ls -n featuresignals-system --short 2>/dev/null | grep -q "^featuresignals-db$"; then
        log_info "PostgreSQL is already installed. Upgrading..."
        return 0
    fi

    # Generate password if not provided
    local pg_password="${POSTGRES_PASSWORD:-}"
    if [[ -z "$pg_password" ]]; then
        pg_password="$(openssl rand -base64 32)"
        log_warn "POSTGRES_PASSWORD was not set. Generated: ${pg_password}"
        log_warn "Save this password! It will not be shown again."
    fi

    # Store the password for future runs
    export POSTGRES_PASSWORD="$pg_password"

    helm upgrade --install featuresignals-db bitnami/postgresql \
        --namespace featuresignals-system \
        --version "$POSTGRESQL_HELM_VERSION" \
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

    log_info "PostgreSQL installed."
}

# ---- Hetzner Storage Box Setup ----------------------------------------------
setup_storage_box() {
    log_info "=== Setting up Hetzner Storage Box (S3-compatible) ==="

    if [[ -z "${HETZNER_STORAGE_BOX_URL:-}" ]]; then
        log_warn "HETZNER_STORAGE_BOX_URL not set. Skipping Storage Box setup."
        log_warn "Backup functionality will not work without it."
        return 0
    fi

    if [[ -z "${HETZNER_STORAGE_BOX_ACCESS_KEY:-}" ]] || [[ -z "${HETZNER_STORAGE_BOX_SECRET_KEY:-}" ]]; then
        log_warn "HETZNER_STORAGE_BOX_ACCESS_KEY or HETZNER_STORAGE_BOX_SECRET_KEY not set."
        log_warn "Skipping Storage Box setup."
        return 0
    fi

    # Create secret for S3-compatible storage
    if kubectl get secret hetzner-storage-box -n featuresignals-system &>/dev/null; then
        log_info "Storage Box secret already exists. Updating..."
        kubectl delete secret hetzner-storage-box -n featuresignals-system
    fi

    kubectl create secret generic hetzner-storage-box \
        --namespace featuresignals-system \
        --from-literal=endpoint="${HETZNER_STORAGE_BOX_URL}" \
        --from-literal=access-key="${HETZNER_STORAGE_BOX_ACCESS_KEY}" \
        --from-literal=secret-key="${HETZNER_STORAGE_BOX_SECRET_KEY}"

    log_info "Hetzner Storage Box credentials stored as Kubernetes secret."

    # Create a ConfigMap with the backup configuration
    if kubectl get configmap storage-box-config -n featuresignals-system &>/dev/null; then
        kubectl delete configmap storage-box-config -n featuresignals-system
    fi

    kubectl create configmap storage-box-config \
        --namespace featuresignals-system \
        --from-literal=backup-bucket="featuresignals-backups" \
        --from-literal=backup-region="eu-central-1" \
        --from-literal=backup-schedule="0 */6 * * *" \
        --from-literal=retention-days="30"

    log_info "Storage Box configuration created."
}

# ---- SigNoz Installation ----------------------------------------------------
install_signoz() {
    if [[ "${SIGNOZ_ENABLED}" != "true" ]]; then
        log_info "SigNoz installation skipped (SIGNOZ_ENABLED=false)."
        return 0
    fi

    log_info "=== Installing SigNoz (Observability Stack) ==="

    # Check if already installed
    if helm ls -n signoz --short 2>/dev/null | grep -q "^signoz$"; then
        log_info "SigNoz is already installed. Skipping."
        return 0
    fi

    local signoz_script="$(cd "$(dirname "${BASH_SOURCE[0]}")/../k8s/infra/signoz" && pwd)/install.sh"
    if [[ -f "$signoz_script" ]]; then
        log_info "Running SigNoz install script: ${signoz_script}"
        bash "$signoz_script"
        log_info "SigNoz installation complete."
    else
        log_warn "SigNoz install script not found at ${signoz_script}. Skipping."
    fi
}

# ---- Temporal Installation --------------------------------------------------
install_temporal() {
    if [[ "${TEMPORAL_ENABLED}" != "true" ]]; then
        log_info "Temporal installation skipped (TEMPORAL_ENABLED=false)."
        return 0
    fi

    log_info "=== Installing Temporal (Workflow Engine) ==="

    # Check if already installed
    if helm ls -n temporal --short 2>/dev/null | grep -q "^temporal$"; then
        log_info "Temporal is already installed. Skipping."
        return 0
    fi

    local temporal_script="$(cd "$(dirname "${BASH_SOURCE[0]}")/../k8s/infra/temporal" && pwd)/install.sh"
    if [[ -f "$temporal_script" ]]; then
        log_info "Running Temporal install script: ${temporal_script}"
        bash "$temporal_script"
        log_info "Temporal installation complete."
    else
        log_warn "Temporal install script not found at ${temporal_script}. Skipping."
    fi
}

# ---- Wait for Ready ---------------------------------------------------------
wait_for_ready() {
    log_info "=== Waiting for all components to be Ready ==="

    log_info "Waiting for all pods in cert-manager namespace..."
    kubectl wait --for=condition=Ready pods --all \
        -n cert-manager --timeout=180s 2>/dev/null || \
        log_warn "Some cert-manager pods not ready yet. Continuing..."

    log_info "Waiting for all pods in metallb-system namespace..."
    kubectl wait --for=condition=Ready pods --all \
        -n metallb-system --timeout=180s 2>/dev/null || \
        log_warn "Some MetalLB pods not ready yet. Continuing..."

    log_info "Waiting for all pods in caddy-system namespace..."
    kubectl wait --for=condition=Ready pods --all \
        -n caddy-system --timeout=180s 2>/dev/null || \
        log_warn "Some Caddy pods not ready yet. Continuing..."

    log_info "Waiting for all pods in featuresignals-system namespace..."
    kubectl wait --for=condition=Ready pods --all \
        -n featuresignals-system --timeout=300s 2>/dev/null || \
        log_warn "Some FeatureSignals pods not ready yet. Continuing..."

    if [[ "${SIGNOZ_ENABLED}" == "true" ]]; then
        log_info "Waiting for all pods in signoz namespace..."
        kubectl wait --for=condition=Ready pods --all \
            -n signoz --timeout=600s 2>/dev/null || \
            log_warn "Some SigNoz pods not ready yet. Continuing..."
    fi

    if [[ "${TEMPORAL_ENABLED}" == "true" ]]; then
        log_info "Waiting for all pods in temporal namespace..."
        kubectl wait --for=condition=Ready pods --all \
            -n temporal --timeout=300s 2>/dev/null || \
            log_warn "Some Temporal pods not ready yet. Continuing..."
    fi

    log_info "=== Cluster Status ==="
    echo ""
    echo "Nodes:"
    kubectl get nodes -o wide
    echo ""
    echo "Namespaces:"
    kubectl get namespaces
    echo ""
    echo "Pods (all namespaces):"
    kubectl get pods --all-namespaces
    echo ""
    echo "Services:"
    kubectl get services --all-namespaces
}

# ---- Output Connection Info -------------------------------------------------
output_connection_info() {
    log_info "=== Connection Information ==="
    echo ""
    echo "================================================================"
    echo "  FeatureSignals — Cluster Bootstrap Complete"
    echo "================================================================"
    echo ""

    # Get the Caddy ingress service IP
    local caddy_ip
    caddy_ip=$(kubectl get svc -n caddy-system -l app.kubernetes.io/name=caddy-ingress-controller \
        -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

    echo "  k3s Node:        $(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')"
    echo "  Kubeconfig:      /etc/rancher/k3s/k3s.yaml"
    echo ""
    echo "  Caddy Ingress:   ${caddy_ip}"
    echo ""
    echo "  cert-manager:    Installed (ClusterIssuers: letsencrypt-prod, letsencrypt-staging)"
    echo "  MetalLB:         Installed"
    echo "  Caddy Ingress:   Installed"
    echo "  PostgreSQL:      Installed"
    echo "  SigNoz:          $([[ "${SIGNOZ_ENABLED}" == "true" ]] && echo "Installed" || echo "Disabled")"
    echo "  Temporal:        $([[ "${TEMPORAL_ENABLED}" == "true" ]] && echo "Installed" || echo "Disabled")"
    echo ""
    echo "  Namespaces:"
    echo "    - cert-manager"
    echo "    - metallb-system"
    echo "    - caddy-system"
    echo "    - featuresignals-system"
    echo "    - featuresignals-saas"
    echo "    - signoz"
    echo "    - temporal"
    echo ""
    echo "  Storage Box:     $([ -n "${HETZNER_STORAGE_BOX_URL:-}" ] && echo "Configured" || echo "Not configured")"
    echo ""
    echo "  DNS Records (set these in your DNS provider):"
    echo "    A   api.featuresignals.com       → ${caddy_ip}"
    echo "    A   app.featuresignals.com        → ${caddy_ip}"
    echo "    A   *.preview.featuresignals.com  → ${caddy_ip}"
    echo ""
    echo "  To verify cluster health:"
    echo "    kubectl get nodes"
    echo "    kubectl get pods --all-namespaces"
    echo ""
    echo "  To port-forward SigNoz dashboard:"
    echo "    kubectl port-forward -n signoz svc/signoz-frontend 3301:3301"
    echo "    # Open http://localhost:3301 (default admin/signoz)"
    echo ""
    echo "  To deploy the application:"
    echo "    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
    echo "    cd deploy/k8s && make app-deploy"
    echo ""
    echo "================================================================"
}

# ---- Main -------------------------------------------------------------------
main() {
    echo ""
    echo "================================================================"
    echo "  FeatureSignals — k3s Bootstrap"
    echo "================================================================"
    echo "  Target: Hetzner CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe)"
    echo "  OS:     Ubuntu 24.04 (amd64)"
    echo "  Budget: €29.38/month"
    echo "================================================================"
    echo ""

    prereq_check

    install_k3s
    install_helm
    setup_namespaces
    install_cert_manager
    install_metallb
    install_caddy_ingress
    install_postgresql
    setup_storage_box
    install_signoz
    install_temporal
    wait_for_ready
    output_connection_info

    log_info "Bootstrap complete!"
}

main "$@"
