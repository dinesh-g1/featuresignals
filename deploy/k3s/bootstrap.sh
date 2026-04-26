#!/usr/bin/env bash
#
# =============================================================================
# FeatureSignals — k3s Single-Node Bootstrap Script
# =============================================================================
#
# Idempotent bootstrap script that provisions a VPS running Ubuntu 24.04 with
# k3s (single-node, embedded SQLite) and all required components for the
# FeatureSignals platform: PostgreSQL, the FeatureSignals API and Dashboard,
# Traefik ingress, node-exporter, and cert-manager.
#
# This script is idempotent — safe to run multiple times. Components that are
# already installed will be skipped or upgraded in-place.
#
# Usage:
#   export POSTGRES_PASSWORD="your-secure-password"
#   export CELL_SUBDOMAIN="cell-name.featuresignals.com"
#   export FEATURESIGNALS_VERSION="latest"
#   sudo ./bootstrap.sh
#
# Required Environment Variables:
#   POSTGRES_PASSWORD          Password for the PostgreSQL superuser
#   CELL_SUBDOMAIN             The subdomain for this cell (e.g., cell-01.featuresignals.com)
#
# Optional Environment Variables:
#   FEATURESIGNALS_VERSION     FeatureSignals image tag (default: "latest")
#   CLUSTER_CIDR               Pod network CIDR (default: 10.42.0.0/16)
#   SERVICE_CIDR               Service network CIDR (default: 10.43.0.0/16)
#   K3S_VERSION                k3s version (default: stable)
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
K3S_VERSION="${K3S_VERSION:-stable}"
CLUSTER_CIDR="${CLUSTER_CIDR:-10.42.0.0/16}"
SERVICE_CIDR="${SERVICE_CIDR:-10.43.0.0/16}"
ACME_EMAIL="${ACME_EMAIL:-admin@featuresignals.com}"
FEATURESIGNALS_VERSION="${FEATURESIGNALS_VERSION:-latest}"

CERT_MANAGER_VERSION="v1.16.3"
POSTGRESQL_HELM_VERSION="16.4.8"

# ---- Prerequisite Check -----------------------------------------------------
prereq_check() {
    log_info "Checking prerequisites..."

    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (or with sudo)."
        exit 1
    fi

    if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
        log_error "POSTGRES_PASSWORD is not set. This is required."
        exit 1
    fi

    if [[ -z "${CELL_SUBDOMAIN:-}" ]]; then
        log_error "CELL_SUBDOMAIN is not set. This is required."
        exit 1
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
            --kubelet-arg=\"max-pods=100\" \
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
    kubectl wait --for=condition=Ready node --all --timeout=60s
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
        --version "$POSTGRESQL_HELM_VERSION" \
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

# ---- Deploy FeatureSignals API (idempotent) ----------------------------------
deploy_featuresignals_api() {
    log_info "=== Deploying FeatureSignals API ==="

    kubectl create namespace featuresignals-saas --dry-run=client -o yaml | kubectl apply -f -

    # Generate or update the API deployment manifest
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: featuresignals-api
  namespace: featuresignals-saas
  labels:
    app: featuresignals-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: featuresignals-api
  template:
    metadata:
      labels:
        app: featuresignals-api
    spec:
      containers:
      - name: api
        image: featuresignals/api:${FEATURESIGNALS_VERSION}
        ports:
        - containerPort: 8080
        env:
        - name: POSTGRES_PASSWORD
          value: "${POSTGRES_PASSWORD}"
        - name: CELL_SUBDOMAIN
          value: "${CELL_SUBDOMAIN}"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: featuresignals-api
  namespace: featuresignals-saas
  labels:
    app: featuresignals-api
spec:
  selector:
    app: featuresignals-api
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  type: ClusterIP
EOF

    log_info "FeatureSignals API deployment applied."
}

# ---- Deploy FeatureSignals Dashboard (idempotent) ---------------------------
deploy_featuresignals_dashboard() {
    log_info "=== Deploying FeatureSignals Dashboard ==="

    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: featuresignals-dashboard
  namespace: featuresignals-saas
  labels:
    app: featuresignals-dashboard
spec:
  replicas: 2
  selector:
    matchLabels:
      app: featuresignals-dashboard
  template:
    metadata:
      labels:
        app: featuresignals-dashboard
    spec:
      containers:
      - name: dashboard
        image: featuresignals/dashboard:${FEATURESIGNALS_VERSION}
        ports:
        - containerPort: 3000
        env:
        - name: API_URL
          value: "http://featuresignals-api.featuresignals-saas.svc.cluster.local:8080"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "300m"
---
apiVersion: v1
kind: Service
metadata:
  name: featuresignals-dashboard
  namespace: featuresignals-saas
  labels:
    app: featuresignals-dashboard
spec:
  selector:
    app: featuresignals-dashboard
  ports:
  - port: 3000
    targetPort: 3000
    name: http
  type: ClusterIP
EOF

    log_info "FeatureSignals Dashboard deployment applied."
}

# ---- Re-enable Traefik for Ingress ------------------------------------------
configure_traefik() {
    log_info "=== Configuring Traefik Ingress ==="

    # k3s includes Traefik by default but disables it with --disable traefik.
    # Since we start k3s with Traefik enabled, it's already running.
    # Verify Traefik is up.
    if kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik --field-selector=status.phase=Running 2>/dev/null | grep -q traefik; then
        log_info "Traefik is already running."
    else
        log_warn "Traefik not found in kube-system. It should be included with k3s by default."
    fi

    # Create an IngressRoute for the FeatureSignals API
    cat <<EOF | kubectl apply -f -
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: featuresignals-api-ingress
  namespace: featuresignals-saas
spec:
  entryPoints:
    - web
    - websecure
  routes:
  - match: Host(\`api.${CELL_SUBDOMAIN}\`)
    kind: Rule
    services:
    - name: featuresignals-api
      port: 8080
  - match: Host(\`${CELL_SUBDOMAIN}\`)
    kind: Rule
    services:
    - name: featuresignals-dashboard
      port: 3000
  tls:
    certResolver: letsencrypt
EOF

    log_info "Traefik IngressRoute configured for api.${CELL_SUBDOMAIN} and ${CELL_SUBDOMAIN}."
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

# ─── Edge Worker Deployment ──────────────────────────────────────
deploy_edge_worker() {
    log_info "=== Deploying Edge Worker ==="

    cat <<'EOF' | kubectl apply -f -
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
    matchLabels:
      app: edge-worker
  template:
    metadata:
      labels:
        app: edge-worker
    spec:
      containers:
      - name: edge-worker
        image: featuresignals/edge-worker:${FEATURESIGNALS_VERSION:-latest}
        ports:
        - containerPort: 8081
        env:
        - name: PORT
          value: "8081"
        - name: DATABASE_URL
          value: "postgres://featuresignals:${POSTGRES_PASSWORD}@localhost:5432/featuresignals?sslmode=disable"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: edge-worker
  namespace: featuresignals-saas
spec:
  selector:
    app: edge-worker
  ports:
  - port: 8081
    targetPort: 8081
  type: ClusterIP
EOF

    log_info "Edge Worker deployed (3 replicas)"
}

# ---- Verify All Pods Running ------------------------------------------------
verify_pods() {
    log_info "=== Verifying all pods are Running ==="

    local namespaces=("cert-manager" "featuresignals-system" "featuresignals-saas" "kube-system")
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
    echo "  DNS Records (set these in your DNS provider):"
    echo "    A   api.${CELL_SUBDOMAIN}    → ${traefik_svc_ip}"
    echo "    A   ${CELL_SUBDOMAIN}        → ${traefik_svc_ip}"
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
    echo "  Cell Subdomain: ${CELL_SUBDOMAIN}"
    echo "  Log file:       ${LOGFILE}"
    echo "================================================================"
    echo ""

    prereq_check
    install_k3s
    wait_for_node
    install_helm
    install_cert_manager
    install_postgresql
    deploy_featuresignals_api
    deploy_featuresignals_dashboard
    configure_traefik
    deploy_node_exporter
    deploy_edge_worker
    verify_pods
    output_connection_info

    log_info "Bootstrap complete!"
}

main "$@"
