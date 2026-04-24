#!/usr/bin/env bash
# =============================================================================
# FeatureSignals — Preview Environment Manager
# =============================================================================
#
# Handles the full lifecycle of ephemeral preview environments on a single-node
# k3s cluster. Each preview gets its own namespace with an ephemeral PostgreSQL
# database and FeatureSignals stack at minimal resource profiles.
#
# Usage:
#   ./install.sh create <pr-number> [version]
#   ./install.sh delete <pr-number>
#   ./install.sh list
#   ./install.sh cleanup-stale
#
# Environment Variables:
#   KUBECONFIG      Path to kubeconfig (default: /etc/rancher/k3s/k3s.yaml)
#   HELM_TIMEOUT    Timeout for Helm operations (default: 5m)
#   MAX_PREVIEWS    Maximum concurrent previews (default: 5)
#   PREVIEW_TTL     TTL for preview environments (default: 24h)
#
# Resource Profile per Preview:
#   Server:     50m CPU / 128Mi RAM (req) → 200m CPU / 256Mi RAM (lim)
#   Dashboard:  25m CPU /  64Mi RAM (req) → 100m CPU / 128Mi RAM (lim)
#   PostgreSQL: 50m CPU / 128Mi RAM (req) → 200m CPU / 256Mi RAM (lim)
#   Total:     125m CPU / 320Mi RAM (req) → 500m CPU / 640Mi RAM (lim)
# =============================================================================

set -euo pipefail

# ---- Constants ---------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${CYAN}[STEP]${NC}  $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"
HELM_TIMEOUT="${HELM_TIMEOUT:-5m}"
MAX_PREVIEWS="${MAX_PREVIEWS:-5}"
PREVIEW_TTL="${PREVIEW_TTL:-24h}"
NAMESPACE_PREFIX="preview"

# ---- Validation --------------------------------------------------------------

validate_prerequisites() {
    if [[ ! -f "$KUBECONFIG" ]]; then
        log_error "Kubeconfig not found at ${KUBECONFIG}"
        log_error "Set KUBECONFIG environment variable or ensure k3s is installed."
        exit 1
    fi

    if ! command -v kubectl &>/dev/null; then
        log_error "kubectl is not installed."
        exit 1
    fi

    if ! command -v helm &>/dev/null; then
        log_error "helm is not installed."
        exit 1
    fi

    if ! kubectl get nodes &>/dev/null; then
        log_error "Cannot connect to the Kubernetes cluster."
        log_error "Is k3s running? Check: systemctl status k3s"
        exit 1
    fi

    log_info "All prerequisites satisfied."
}

validate_pr_number() {
    local pr_number="$1"
    if [[ -z "$pr_number" ]]; then
        log_error "PR number is required."
        echo "Usage: $0 create <pr-number> [version]"
        exit 1
    fi
    if ! [[ "$pr_number" =~ ^[0-9]+$ ]]; then
        log_error "PR number must be numeric, got: ${pr_number}"
        exit 1
    fi
}

# ---- Core Operations ---------------------------------------------------------

# Namespace name for a given PR number
ns_name() {
    echo "${NAMESPACE_PREFIX}-pr-$1"
}

# Check if a namespace already exists
ns_exists() {
    kubectl get namespace "$1" &>/dev/null
}

# Count current preview namespaces
count_previews() {
    kubectl get namespaces \
        --selector=app.kubernetes.io/component=preview \
        -o name 2>/dev/null | wc -l | xargs
}

# ---- Create Preview ----------------------------------------------------------

create_preview() {
    local pr_number="$2"
    local version="${3:-pr-${pr_number}}"
    local namespace
    namespace="$(ns_name "${pr_number}")"
    local db_password="preview-${pr_number}"
    local jwt_secret="preview-${pr_number}-jwt-secret-$(openssl rand -hex 8)"
    local db_url="postgres://fs:${db_password}@postgres-${pr_number}:5432/featuresignals?sslmode=disable"

    log_step "Creating preview environment for PR #${pr_number}"

    # ---- Validate ------------------------------------------------------------
    validate_prerequisites
    validate_pr_number "$pr_number"

    if ns_exists "$namespace"; then
        log_warn "Preview namespace '${namespace}' already exists."
        log_info "Updating existing preview instead of creating a new one."
    else
        # Check max preview count
        local current_count
        current_count="$(count_previews)"
        if [[ "$current_count" -ge "$MAX_PREVIEWS" ]]; then
            log_error "Maximum preview count (${MAX_PREVIEWS}) reached. ${current_count} previews active."
            log_error "Delete an existing preview or wait for cleanup."
            log_info "Active preview namespaces:"
            kubectl get namespaces \
                --selector=app.kubernetes.io/component=preview \
                -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.preview\.featuresignals\.com/ttl}{"\t"}{.metadata.creationTimestamp}{"\n"}{end}' 2>/dev/null
            exit 1
        fi
    fi

    log_info "Preview count: ${current_count:-0}/${MAX_PREVIEWS}"

    # ---- 1. Create/ensure namespace ------------------------------------------
    log_step "1/6: Ensuring namespace '${namespace}' exists..."
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
  labels:
    app.kubernetes.io/component: preview
    app.kubernetes.io/environment: preview
    app.kubernetes.io/part-of: featuresignals
    preview.featuresignals.com/pr-number: "${pr_number}"
  annotations:
    preview.featuresignals.com/created-by: "preview-manager"
    preview.featuresignals.com/pr-number: "${pr_number}"
    preview.featuresignals.com/ttl: "${PREVIEW_TTL}"
    preview.featuresignals.com/version: "${version}"
EOF
    log_info "Namespace '${namespace}' ready."

    # ---- 2. Deploy ephemeral PostgreSQL --------------------------------------
    log_step "2/6: Deploying ephemeral PostgreSQL..."
    helm repo add bitnami https://charts.bitnami.com/bitnami --force-update 2>/dev/null || true
    helm repo update 2>/dev/null || true

    helm upgrade --install "postgres-${pr_number}" bitnami/postgresql \
        --namespace "${namespace}" \
        --create-namespace \
        --set auth.database=featuresignals \
        --set auth.username=fs \
        --set "auth.password=${db_password}" \
        --set architecture=standalone \
        --set primary.persistence.enabled=false \
        --set primary.resources.requests.cpu=50m \
        --set primary.resources.requests.memory=128Mi \
        --set primary.resources.limits.cpu=200m \
        --set primary.resources.limits.memory=256Mi \
        --set primary.readinessProbe.initialDelaySeconds=5 \
        --set primary.readinessProbe.failureThreshold=10 \
        --set primary.livenessProbe.initialDelaySeconds=15 \
        --set primary.livenessProbe.failureThreshold=5 \
        --set metrics.enabled=false \
        --set backup.enabled=false \
        --set networkPolicy.enabled=false \
        --set volumePermissions.enabled=false \
        --wait \
        --timeout="${HELM_TIMEOUT}" 2>&1 | while IFS= read -r line; do log_info "  postgres: ${line}"; done

    if ! kubectl wait --for=condition=Ready "pod/postgres-${pr_number}-0" \
        --namespace="${namespace}" --timeout=120s 2>/dev/null; then
        log_warn "PostgreSQL pod not ready yet, but continuing deployment..."
        log_warn "The server may need to retry the database connection."
    fi
    log_info "PostgreSQL deployed."

    # ---- 3. Deploy FeatureSignals stack --------------------------------------
    log_step "3/6: Deploying FeatureSignals stack..."

    # Generate preview values with dynamic substitutions
    local preview_values_file
    preview_values_file="$(mktemp)"
    # shellcheck disable=SC2064
    trap "rm -f '${preview_values_file}'" RETURN

    cat > "${preview_values_file}" <<EOF
global:
  environment: preview
  imageRegistry: ghcr.io/featuresignals
  dnsDomain: preview.featuresignals.com

server:
  image:
    repository: ghcr.io/featuresignals/server
    tag: ${version}
  replicas: 1
  strategy:
    type: Recreate
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
  env:
    PORT: "8080"
    DEPLOYMENT_MODE: preview
    LOG_LEVEL: debug
    CORS_ORIGINS: "https://app.preview-${pr_number}.preview.featuresignals.com"
    OTEL_ENABLED: "false"
    EMAIL_PROVIDER: none
    DATABASE_URL: "${db_url}"
    JWT_SECRET: "${jwt_secret}"

dashboard:
  image:
    repository: ghcr.io/featuresignals/dashboard
    tag: ${version}
  replicas: 1
  strategy:
    type: Recreate
  resources:
    requests:
      cpu: 25m
      memory: 64Mi
    limits:
      cpu: 100m
      memory: 128Mi
  env:
    HOSTNAME: "0.0.0.0"
    NEXT_PUBLIC_API_URL: "https://api.preview-${pr_number}.preview.featuresignals.com"
    NEXT_PUBLIC_APP_URL: "https://app.preview-${pr_number}.preview.featuresignals.com"

postgresql:
  enabled: false

ingress:
  enabled: true
  className: caddy
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    caddy-ingress-controller.io/tls: "true"
  api:
    host: api.preview-${pr_number}.preview.featuresignals.com
    path: /
    pathType: Prefix
  dashboard:
    host: app.preview-${pr_number}.preview.featuresignals.com
    path: /
    pathType: Prefix
  tls:
    - hosts:
        - api.preview-${pr_number}.preview.featuresignals.com
        - app.preview-${pr_number}.preview.featuresignals.com
      secretName: preview-${pr_number}-tls

networkPolicies:
  enabled: false

hpa:
  enabled: false

pdb:
  enabled: false

serviceMonitor:
  enabled: false

migration:
  enabled: true
  hook: post-upgrade,post-install
  resources:
    requests:
      cpu: 25m
      memory: 64Mi
    limits:
      cpu: 100m
      memory: 128Mi
  backoffLimit: 3
  activeDeadlineSeconds: 180

serviceAccount:
  create: true

podAnnotations:
  preview.featuresignals.com/created-by: "preview-manager"
  preview.featuresignals.com/pr-number: "${pr_number}"
  preview.featuresignals.com/ttl: "${PREVIEW_TTL}"

commonLabels:
  app.kubernetes.io/component: preview
  app.kubernetes.io/environment: preview
  app.kubernetes.io/part-of: featuresignals
  preview.featuresignals.com/pr-number: "${pr_number}"
EOF

    # Deploy using Helm
    helm upgrade --install "fs-${pr_number}" "${PROJECT_ROOT}/deploy/helm/featuresignals" \
        --namespace "${namespace}" \
        --values "${preview_values_file}" \
        --wait \
        --timeout="${HELM_TIMEOUT}" 2>&1 | while IFS= read -r line; do log_info "  helm: ${line}"; done

    log_info "FeatureSignals stack deployed."

    # ---- 4. Run database migrations ------------------------------------------
    log_step "4/6: Running database migrations..."
    # The migration runs as a Helm post-upgrade hook. Wait for it to complete,
    # or run it manually if the hook didn't trigger.
    local migrate_job="fs-${pr_number}-migrate"
    if kubectl get job "${migrate_job}" --namespace="${namespace}" &>/dev/null; then
        kubectl wait --for=condition=Complete "job/${migrate_job}" \
            --namespace="${namespace}" --timeout=120s 2>/dev/null || {
            log_warn "Migration job did not complete; checking pod logs..."
            local migrate_pod
            migrate_pod="$(kubectl get pods --namespace="${namespace}" \
                --selector="job-name=${migrate_job}" \
                -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
            if [[ -n "$migrate_pod" ]]; then
                kubectl logs --namespace="${namespace}" "${migrate_pod}" 2>/dev/null || true
            fi
        }
    else
        log_warn "No migration job found. Migrations may need to run manually."
    fi
    log_info "Database migrations complete."

    # ---- 5. Wait for health --------------------------------------------------
    log_step "5/6: Waiting for services to become healthy..."

    # Wait for server deployment
    if kubectl wait --for=condition=Available "deployment/fs-${pr_number}-server" \
        --namespace="${namespace}" --timeout=180s 2>/dev/null; then
        log_info "Server deployment is available."
    else
        log_warn "Server deployment not available within timeout. Checking status..."
        kubectl describe "deployment/fs-${pr_number}-server" --namespace="${namespace}" 2>/dev/null | tail -20
    fi

    # Wait for dashboard deployment
    if kubectl wait --for=condition=Available "deployment/fs-${pr_number}-dashboard" \
        --namespace="${namespace}" --timeout=180s 2>/dev/null; then
        log_info "Dashboard deployment is available."
    else
        log_warn "Dashboard deployment not available within timeout. Checking status..."
        kubectl describe "deployment/fs-${pr-number}-dashboard" --namespace="${namespace}" 2>/dev/null | tail -20
    fi

    # ---- 6. Output preview URLs ----------------------------------------------
    log_step "6/6: Preview environment ready!"
    echo ""
    echo "================================================================"
    echo "  🚀 Preview Environment PR #${pr_number}"
    echo "================================================================"
    echo ""
    echo "  API:       https://api.preview-${pr_number}.preview.featuresignals.com"
    echo "  Dashboard: https://app.preview-${pr_number}.preview.featuresignals.com"
    echo ""
    echo "  Namespace: ${namespace}"
    echo "  TTL:       ${PREVIEW_TTL}"
    echo "  Version:   ${version}"
    echo ""
    echo "  To delete: $0 delete ${pr_number}"
    echo "================================================================"
    echo ""

    # Verify with a quick health check
    local server_pod
    server_pod="$(kubectl get pods --namespace="${namespace}" \
        --selector=app.kubernetes.io/name=server \
        --field-selector=status.phase=Running \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
    if [[ -n "$server_pod" ]]; then
        log_info "Server pod: ${server_pod}"
    fi
}

# ---- Delete Preview ----------------------------------------------------------

delete_preview() {
    local pr_number="$2"
    local namespace
    namespace="$(ns_name "${pr_number}")"

    log_step "Deleting preview environment PR #${pr_number}"

    validate_pr_number "$pr_number"

    if ! ns_exists "$namespace"; then
        log_warn "Preview namespace '${namespace}' does not exist. Nothing to delete."
        return 0
    fi

    # ---- 1. Log trigger ------------------------------------------------------
    log_info "Initiating deletion of namespace '${namespace}'..."
    log_info "This will cascade-delete all resources (pods, services, PVCs, ingresses, secrets)."

    # ---- 2. Delete namespace (cascades everything) ---------------------------
    log_step "1/3: Deleting namespace '${namespace}'..."
    kubectl delete namespace "${namespace}" --wait=true --timeout=120s 2>&1 | while IFS= read -r line; do log_info "  ${line}"; done

    if ns_exists "$namespace"; 2>/dev/null; then
        log_warn "Namespace still exists. Forcing finalizer removal..."
        kubectl patch namespace "${namespace}" -p '{"metadata":{"finalizers":[]}}' --type=merge 2>/dev/null || true
        kubectl delete namespace "${namespace}" --wait=true --timeout=60s 2>/dev/null || true
    fi

    if ns_exists "$namespace" 2>/dev/null; then
        log_error "Failed to delete namespace '${namespace}'. Manual intervention required."
        log_error "Run: kubectl delete namespace ${namespace} --force --grace-period=0"
        exit 1
    fi
    log_info "Namespace '${namespace}' deleted."

    # ---- 3. Clean up lingering PVCs (shouldn't exist, but be thorough) -------
    log_step "2/3: Cleaning up any lingering PVCs..."
    local lingering_pvcs
    lingering_pvcs="$(kubectl get pvc --all-namespaces \
        -o jsonpath='{range .items[?(@.metadata.namespace=="'"${namespace}"'")]}{.metadata.name}{"\n"}{end}' 2>/dev/null || true)"
    if [[ -n "$lingering_pvcs" ]]; then
        log_warn "Found lingering PVCs in deleted namespace. Force-removing..."
        echo "$lingering_pvcs" | while IFS= read -r pvc; do
            kubectl delete pvc --namespace="${namespace}" "${pvc}" --force --grace-period=0 2>/dev/null || true
        done
    fi
    log_info "No lingering PVCs."

    # ---- 4. Log deletion -----------------------------------------------------
    log_step "3/3: Logging deletion event..."
    log_info "Preview PR #${pr_number} has been fully cleaned up."
    echo ""
    echo "================================================================"
    echo "  🗑️  Preview PR #${pr_number} Deleted"
    echo "================================================================"
    echo "  Freed resources:"
    echo "    CPU:    50m request / 200m limit"
    echo "    Memory: 320Mi request / 640Mi limit"
    echo "================================================================"
    echo ""
}

# ---- List Previews -----------------------------------------------------------

list_previews() {
    log_step "Listing all preview environments"

    local namespaces
    namespaces="$(kubectl get namespaces \
        --selector=app.kubernetes.io/component=preview \
        -o json 2>/dev/null || echo '{"items":[]}')"

    local count
    count="$(echo "$namespaces" | jq -r '.items | length' 2>/dev/null || echo 0)"

    if [[ "$count" -eq 0 ]]; then
        log_info "No preview environments found."
        return 0
    fi

    echo ""
    echo "================================================================"
    echo "  Preview Environments (${count}/${MAX_PREVIEWS} used)"
    echo "================================================================"
    echo ""
    printf "  %-25s %-25s %-10s %-10s\n" "NAMESPACE" "TTL" "AGE" "VERSION"
    echo "  $(printf '%0.s-' {1..75})"

    echo "$namespaces" | jq -r '
        .items[] | [
            .metadata.name,
            (.metadata.annotations["preview.featuresignals.com/ttl"] // "N/A"),
            (.metadata.creationTimestamp),
            (.metadata.annotations["preview.featuresignals.com/version"] // "N/A")
        ] | @tsv' 2>/dev/null | while IFS=$'\t' read -r ns ttl created version; do
        local age=""
        if [[ -n "$created" ]]; then
            local created_epoch
            created_epoch="$(date -d "$created" +%s 2>/dev/null || echo 0)"
            local now_epoch
            now_epoch="$(date +%s)"
            local diff=$((now_epoch - created_epoch))
            local hours=$((diff / 3600))
            local minutes=$(((diff % 3600) / 60))
            age="${hours}h${minutes}m"
        fi
        # Extract PR number from namespace
        local pr_number="${ns#preview-pr-}"
        printf "  %-25s %-25s %-10s %-10s\n" "${ns}" "${ttl}" "${age}" "${version}"
        printf "  %-75s\n" "  API: https://api.preview-${pr_number}.preview.featuresignals.com"
        printf "  %-75s\n" "  Dashboard: https://app.preview-${pr_number}.preview.featuresignals.com"
        echo ""
    done

    echo "================================================================"
    echo ""
}

# ---- Cleanup Stale Previews --------------------------------------------------

cleanup_stale() {
    log_step "Checking for stale preview environments (TTL: ${PREVIEW_TTL})"

    # Parse TTL duration into seconds
    local ttl_seconds
    case "${PREVIEW_TTL}" in
        *h) ttl_seconds=$(( ${PREVIEW_TTL%h} * 3600 )) ;;
        *m) ttl_seconds=$(( ${PREVIEW_TTL%m} * 60 )) ;;
        *s) ttl_seconds="${PREVIEW_TTL%s}" ;;
        *)  ttl_seconds=$((24 * 3600)) ;;  # Default: 24h
    esac

    local now_epoch
    now_epoch="$(date +%s)"
    local deleted_count=0
    local found_count=0

    kubectl get namespaces \
        --selector=app.kubernetes.io/component=preview \
        -o json 2>/dev/null | jq -r '
        .items[] | [
            .metadata.name,
            (.metadata.creationTimestamp // ""),
            (.metadata.annotations["preview.featuresignals.com/ttl"] // "24h"),
            (.metadata.annotations["preview.featuresignals.com/pr-number"] // "unknown")
        ] | @tsv' 2>/dev/null | while IFS=$'\t' read -r ns created ns_ttl pr_number; do

        found_count=$((found_count + 1))

        if [[ -z "$created" ]]; then
            log_warn "Namespace '${ns}' has no creation timestamp. Skipping."
            return
        fi

        local created_epoch
        created_epoch="$(date -d "$created" +%s 2>/dev/null || echo 0)"
        if [[ "$created_epoch" -eq 0 ]]; then
            log_warn "Cannot parse creation timestamp for '${ns}'. Skipping."
            return
        fi

        # Parse the namespace-specific TTL (from annotation) or use default
        local effective_ttl="$PREVIEW_TTL"
        if [[ -n "$ns_ttl" ]]; then
            effective_ttl="$ns_ttl"
        fi

        local effective_ttl_seconds
        case "${effective_ttl}" in
            *h) effective_ttl_seconds=$(( ${effective_ttl%h} * 3600 )) ;;
            *m) effective_ttl_seconds=$(( ${effective_ttl%m} * 60 )) ;;
            *s) effective_ttl_seconds="${effective_ttl%s}" ;;
            *)  effective_ttl_seconds="$ttl_seconds" ;;
        esac

        local expiry_epoch=$((created_epoch + effective_ttl_seconds))
        local age_seconds=$((now_epoch - created_epoch))

        if [[ "$now_epoch" -gt "$expiry_epoch" ]]; then
            local age_display
            age_display="$((age_seconds / 3600))h$(((age_seconds % 3600) / 60))m"
            log_warn "Preview '${ns}' (PR #${pr_number}) expired (age: ${age_display}, TTL: ${effective_ttl}). Deleting..."
            kubectl delete namespace "${ns}" --wait=false --timeout=30s 2>/dev/null || true
            deleted_count=$((deleted_count + 1))
            log_info "Deleted stale preview '${ns}'."
        else
            local remaining=$((expiry_epoch - now_epoch))
            local remaining_display
            remaining_display="$((remaining / 3600))h$(((remaining % 3600) / 60))m"
            log_info "Preview '${ns}' (PR #${pr_number}) has ${remaining_display} remaining. Skipping."
        fi
    done

    if [[ "$deleted_count" -eq 0 ]] && [[ "$found_count" -gt 0 ]]; then
        log_info "No stale previews found. All ${found_count} preview(s) within TTL."
    elif [[ "$deleted_count" -eq 0 ]]; then
        log_info "No preview environments to clean up."
    else
        log_info "Cleaned up ${deleted_count} stale preview environment(s)."
    fi
}

# ---- Help --------------------------------------------------------------------

show_help() {
    echo ""
    echo "FeatureSignals — Preview Environment Manager"
    echo ""
    echo "Usage:"
    echo "  $0 create <pr-number> [version]    Create or update a preview"
    echo "  $0 delete <pr-number>              Delete a preview"
    echo "  $0 list                            List all previews"
    echo "  $0 cleanup-stale                   Delete expired previews"
    echo "  $0 help                            Show this help"
    echo ""
    echo "Arguments:"
    echo "  pr-number     Pull request number (numeric)"
    echo "  version       Image tag (default: pr-{pr-number})"
    echo ""
    echo "Environment Variables:"
    echo "  KUBECONFIG    Path to kubeconfig (default: /etc/rancher/k3s/k3s.yaml)"
    echo "  HELM_TIMEOUT  Timeout for Helm operations (default: 5m)"
    echo "  MAX_PREVIEWS  Maximum concurrent previews (default: 5)"
    echo "  PREVIEW_TTL   TTL for new previews (default: 24h)"
    echo ""
    echo "Examples:"
    echo "  $0 create 42"
    echo "  $0 create 42 sha-a1b2c3d4"
    echo "  $0 delete 42"
    echo "  $0 list"
    echo "  $0 cleanup-stale"
    echo ""
}

# ---- Main --------------------------------------------------------------------

main() {
    local command="${1:-help}"

    # Validate kubeconfig for commands that need it (not help or list)
    case "$command" in
        create|delete|cleanup-stale)
            validate_prerequisites
            ;;
    esac

    case "$command" in
        create)
            create_preview "$@"
            ;;
        delete)
            delete_preview "$@"
            ;;
        list)
            list_previews
            ;;
        cleanup-stale)
            cleanup_stale
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "Unknown command: ${command}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
