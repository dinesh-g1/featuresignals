#!/usr/bin/env bash
#
# =============================================================================
# FeatureSignals — k3s Single-Node Bootstrap Script (Infra Only)
# =============================================================================
#
# Idempotent bootstrap script that provisions a VPS with:
# - k3s (single-node Kubernetes)
# - PostgreSQL (Bitnami Helm chart)
# - cert-manager + Let's Encrypt ClusterIssuers
# - Traefik ingress
# - node-exporter for metrics
#
# The FeatureSignals application (API, Dashboard, Edge Worker) is deployed
# separately via `deploy-app.sh` with a specific version tag from CI/CD.
#
# This script is idempotent — safe to run multiple times. Components that are
# already installed will be skipped or upgraded in-place.
#
# Usage:
#   export POSTGRES_PASSWORD="your-secure-password"
#   sudo ./bootstrap.sh
#
# Required Environment Variables:
#   POSTGRES_PASSWORD          Password for the PostgreSQL superuser
#
# Optional Environment Variables:
#   CLUSTER_CIDR               Pod network CIDR (default: 10.42.0.0/16)
#   SERVICE_CIDR               Service network CIDR (default: 10.43.0.0/16)
#   K3S_VERSION                k3s version (default: v1.30.0+k3s1)
#   ACME_EMAIL                 Email for Let's Encrypt (default: admin@featuresignals.com)
#
# =============================================================================

set -euo pipefail

# ---- Logging ----------------------------------------------------------------
LOGFILE="/var/log/featuresignals-bootstrap.log"
exec > >(tee -a "$LOGFILE") 2>&1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- Defaults & Constants ---------------------------------------------------
K3S_VERSION="${K3S_VERSION:-v1.30.0+k3s1}"
CLUSTER_CIDR="${CLUSTER_CIDR:-10.42.0.0/16}"
SERVICE_CIDR="${SERVICE_CIDR:-10.43.0.0/16}"
ACME_EMAIL="${ACME_EMAIL:-admin@featuresignals.com}"
# FEATURESIGNALS_VERSION is set in deploy-app.sh for app deployments.

CERT_MANAGER_VERSION="v1.16.3"
# POSTGRESQL_HELM_VERSION removed — using latest chart

# ---- Prerequisite Check -----------------------------------------------------
prereq_check() {
    log_info "Checking prerequisites..."

    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (or with sudo)."
        exit 1
    fi

    if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
        log_warn "POSTGRES_PASSWORD not set — generating random password."
        POSTGRES_PASSWORD="$(openssl rand -base64 32)"
        log_info "Generated POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}"
    fi

    local arch
    arch="$(uname -m)"
    if [[ "$arch" != "x86_64" ]]; then
        log_error "This script supports amd64 only. Detected: $arch"
        exit 1
    fi

    if ! grep -qi "ubuntu" /etc/os-release 2>/dev/null; then
        log_warn "This script is designed for Ubuntu 24.04. Proceeding anyway..."
    fi

    log_info "All prerequisites satisfied."
}

# ---- k3s Installation (idempotent) ------------------------------------------
install_k3s() {
    log_info "=== Installing k3s ==="

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

    curl -sfL https://get.k3s.io | \
        INSTALL_K3S_VERSION="${K3S_VERSION}" \
        INSTALL_K3S_EXEC="server \
            --write-kubeconfig-mode 644 \
            --cluster-cidr=${CLUSTER_CIDR} \
            --service-cidr=${SERVICE_CIDR}" \
        sh -

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

    kubectl wait --for=condition=Ready node --all --timeout=120s

    # Create k3s environment file
    cat > /etc/k3s.env <<EOF
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
export K3S_CLUSTER_CIDR=${CLUSTER_CIDR}
export K3S_SERVICE_CIDR=${SERVICE_CIDR}
EOF

    log_info "k3s installed successfully."
    log_info "  Node:      $(kubectl get nodes -o name)"
    log_info "  Kubeconfig: /etc/rancher/k3s/k3s.yaml"
}

# ---- Wait for Node Ready ----------------------------------------------------
wait_for_node() {
    log_info "=== Waiting for node to be Ready ==="

    # Wait for the k3s API server to become available first
    local api_retries=0
    local api_max=30
    until kubectl cluster-info &>/dev/null; do
        api_retries=$((api_retries + 1))
        if [ "$api_retries" -ge "$api_max" ]; then
            log_error "k3s API server not ready after ${api_max}s"
            kubectl cluster-info 2>&1 || true
            return 1
        fi
        sleep 2
    done
    log_info "k3s API server is ready."

    # Now wait for the node to be Ready
    if ! kubectl wait --for=condition=Ready node --all --timeout=120s 2>&1; then
        log_warn "kubectl wait timed out. Checking node status..."
        kubectl get nodes -o wide
        kubectl describe node 2>&1 | head -20
        return 1
    fi

    log_info "Node is Ready."
}

# ---- Helm Installation (idempotent) -----------------------------------------
install_helm() {
    log_info "=== Installing Helm ==="

    if command -v helm &>/dev/null; then
        log_info "Helm is already installed. Version: $(helm version --short)"
        return 0
    fi

    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

    # Add required Helm repositories
    helm repo add jetstack https://charts.jetstack.io --force-update
    helm repo add bitnami https://charts.bitnami.com/bitnami --force-update
    helm repo update

    log_info "Helm installed and repositories configured."
}

# ---- cert-manager Installation (idempotent) ---------------------------------
install_cert_manager() {
    log_info "=== Installing cert-manager ==="

    if helm ls -n cert-manager --short 2>/dev/null | grep -q "^cert-manager$"; then
        log_info "cert-manager is already installed. Skipping."
        return 0
    fi

    kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -

    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --version "$CERT_MANAGER_VERSION" \
        --set installCRDs=true \
        --set global.leaderElection.namespace=cert-manager \
        --wait \
        --timeout 5m

    log_info "cert-manager installed."

    # Create ClusterIssuers (idempotent)
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
          class: traefik
EOF

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
          class: traefik
EOF

    log_info "ClusterIssuers created: letsencrypt-prod, letsencrypt-staging"
}

# ---- PostgreSQL via Bitnami Helm (idempotent) --------------------------------
install_postgresql() {
    log_info "=== Installing PostgreSQL (Bitnami) ==="

    if helm ls -n featuresignals-system --short 2>/dev/null | grep -q "^featuresignals-db$"; then
        log_info "PostgreSQL is already installed. Skipping."
        return 0
    fi

    kubectl create namespace featuresignals-system --dry-run=client -o yaml | kubectl apply -f -

    helm upgrade --install featuresignals-db bitnami/postgresql \
        --namespace featuresignals-system \
        --set auth.postgresPassword="$POSTGRES_PASSWORD" \
        --set auth.database=featuresignals \
        --set auth.username=fs \
        --set auth.password="$POSTGRES_PASSWORD" \
        --set persistence.size=30Gi \
        --set primary.resources.requests.memory=512Mi \
        --set primary.resources.requests.cpu=250m \
        --set primary.resources.limits.memory=1Gi \
        --set primary.resources.limits.cpu=1000m \
        --set metrics.enabled=true \
        --wait \
        --timeout 10m

    log_info "PostgreSQL installed in namespace featuresignals-system."
}

# ---- Re-enable Traefik for Ingress ------------------------------------------
configure_traefik() {
    log_info "=== Verifying Traefik ==="

    # k3s includes Traefik by default.
    # No IngressRoute is created — cells have no public DNS.
    # Customer traffic goes through the Central API → Cell Router proxy.
    if kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik --field-selector=status.phase=Running 2>/dev/null | grep -q traefik; then
        log_info "Traefik is running."
    else
        log_warn "Traefik not found in kube-system."
    fi
}

# ---- Deploy node-exporter DaemonSet (idempotent) ----------------------------
deploy_node_exporter() {
    log_info "=== Deploying node-exporter DaemonSet ==="

    if kubectl get daemonset node-exporter -n kube-system &>/dev/null; then
        log_info "node-exporter is already deployed. Skipping."
        return 0
    fi

    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: kube-system
  labels:
    app: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        ports:
        - containerPort: 9100
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host/root
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
EOF

    log_info "node-exporter DaemonSet deployed."
}


# ---- Verify All Pods Running ------------------------------------------------
verify_pods() {
    log_info "=== Verifying all pods are Running ==="

    local namespaces=("cert-manager" "featuresignals-system" "kube-system")
    local all_ready=true

    for ns in "${namespaces[@]}"; do
        if ! kubectl get namespace "$ns" &>/dev/null; then
            continue
        fi
        local pods
        pods=$(kubectl get pods -n "$ns" --no-headers 2>/dev/null | wc -l)
        if [[ "$pods" -eq 0 ]]; then
            continue
        fi
        local not_ready
        not_ready=$(kubectl get pods -n "$ns" --no-headers 2>/dev/null | awk '{print $3}' | grep -v "Running\|Completed" | wc -l)
        if [[ "$not_ready" -gt 0 ]]; then
            log_warn "Namespace '$ns' has $not_ready pods not in Running/Completed state."
            all_ready=false
        else
            log_info "Namespace '$ns': all $pods pods are Running."
        fi
    done

    if [[ "$all_ready" == "true" ]]; then
        log_info "All pods are Running."
    else
        log_warn "Some pods are not yet Running. Check with: kubectl get pods --all-namespaces"
    fi
}

# ---- Firewall Hardening -----------------------------------------------------
apply_firewall() {
    log_info "=== Applying firewall rules ==="

    # Default policy: DROP all inbound, ALLOW established/internal
    cat > /etc/featuresignals-firewall.rules <<'FWRULES'
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

# Allow established connections
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
-A INPUT -i lo -j ACCEPT

# Allow SSH from anywhere (key-based auth only)
-A INPUT -p tcp --dport 22 -j ACCEPT

# Allow k3s internal traffic
-A INPUT -s 10.42.0.0/16 -j ACCEPT
-A INPUT -s 10.43.0.0/16 -j ACCEPT

# Allow node-exporter metrics
-A INPUT -p tcp --dport 9100 -j ACCEPT

# Log dropped packets (rate limited)
-A INPUT -m limit --limit 5/min -j LOG --log-prefix "FW-DROP: "

COMMIT
FWRULES

    iptables-restore < /etc/featuresignals-firewall.rules 2>/dev/null || {
        log_warn "iptables-restore failed (may need root or iptables not available). Skipping firewall."
        return 0
    }

    # Persist rules (survive reboot)
    if command -v iptables-save &>/dev/null; then
        mkdir -p /etc/iptables/
        iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
    fi

    log_info "Firewall rules applied. Default: DROP all inbound."
}

# ---- Cleanup Temp Files ----------------------------------------------------
cleanup_temp_files() {
    log_info "=== Cleaning up temporary files ==="
    rm -f /tmp/bootstrap.sh /tmp/k3s-install.sh /tmp/helm-install.sh 2>/dev/null
    rm -rf /tmp/helm-* 2>/dev/null
    log_info "Temporary files cleaned."
}

# ---- Output Connection Info -------------------------------------------------
output_connection_info() {
    log_info "=== Connection Information ==="

    local traefik_svc_ip=""
    traefik_svc_ip=$(kubectl get svc -n kube-system traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

    echo ""
    echo "================================================================"
    echo "  FeatureSignals — Bootstrap Complete"
    echo "================================================================"
    echo ""
    echo "  k3s Node:        $(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')"
    echo "  Kubeconfig:      /etc/rancher/k3s/k3s.yaml"
    echo "  Traefik IP:      ${traefik_svc_ip}"
    echo ""
    echo "  (No public DNS — cells are internal. Traffic routed via Central API.)"
    echo ""
    echo "  To verify:"
    echo "    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
    echo "    kubectl get nodes"
    echo "    kubectl get pods --all-namespaces"
    echo ""
    echo "  Log file:        ${LOGFILE}"
    echo "================================================================"
}

# ---- Main -------------------------------------------------------------------
main() {
    echo ""
    echo "================================================================"
    echo "  FeatureSignals — k3s Bootstrap"
    echo "================================================================"
    echo "  Cell IP:        $(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
    echo "  Log file:       ${LOGFILE}"
    echo "================================================================"
    echo ""

    prereq_check
    install_k3s
    wait_for_node
    install_helm
    install_cert_manager
    install_postgresql
    configure_traefik
    deploy_node_exporter
    apply_firewall
    verify_pods
    cleanup_temp_files
    output_connection_info

    log_info "Bootstrap complete!"
}

main "$@"
