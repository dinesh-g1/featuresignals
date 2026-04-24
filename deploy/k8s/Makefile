# =============================================================================
# FeatureSignals — k3s Deployment Makefile
# =============================================================================
#
# Commands for managing the FeatureSignals k3s single-node cluster on
# Hetzner CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe).
#
# Usage:
#   make k3s-install         — Bootstrap the k3s cluster (run once on new VPS)
#   make infra-deploy        — Deploy all infrastructure components
#   make app-deploy          — Deploy/upgrade the FeatureSignals application
#   make app-deploy-staging  — Deploy staging (staging values)
#   make app-deploy-production — Deploy production (production values)
#   make db-migrate          — Run database migration job
#   make backup-now          — Trigger an immediate backup
#   make status              — Show cluster status overview
#   make logs-server         — Tail server API logs
#   make logs-dashboard      — Tail dashboard logs
#   make shell-postgres      — Open a psql shell to the database
#   make cert-renew          — Force certificate renewal
#   make help                — Show this help message
# =============================================================================

SHELL := /usr/bin/env bash
.SHELLFLAGS := -euo pipefail -c
.ONESHELL:
.SILENT:

# ---- Configuration ----------------------------------------------------------

KUBECONFIG ?= /etc/rancher/k3s/k3s.yaml
NAMESPACE_SYSTEM ?= featuresignals-system
NAMESPACE_SAAS   ?= featuresignals-saas
HELM_RELEASE     ?= featuresignals
HELM_CHART       ?= ../helm/featuresignals
INFRA_DIR        ?= infra

# Color output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
NC     := \033[0m

# ---- Targets ----------------------------------------------------------------

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "FeatureSignals — k3s Deployment Commands"
	@echo "=========================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo ""

.PHONY: k3s-install
k3s-install: ## Bootstrap the k3s cluster (run as root on fresh VPS)
	@echo -e "$(GREEN)[INFO]$(NC) Running k3s bootstrap script..."
	sudo bash ../k3s/bootstrap.sh
	@echo -e "$(GREEN)[INFO]$(NC) k3s bootstrap complete."
	@echo -e "$(GREEN)[INFO]$(NC) To use kubectl, run: export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"

.PHONY: infra-deploy
infra-deploy: ## Deploy all infrastructure components (cert-manager, MetalLB, Caddy)
	@echo -e "$(GREEN)[INFO]$(NC) Deploying infrastructure components..."
	source /etc/k3s.env 2>/dev/null || true
	export KUBECONFIG=$(KUBECONFIG)
	bash $(INFRA_DIR)/install.sh
	@echo -e "$(GREEN)[INFO]$(NC) Infrastructure deployment complete."

.PHONY: app-deploy
app-deploy: ## Deploy/upgrade the FeatureSignals application via Helm
	@echo -e "$(GREEN)[INFO]$(NC) Deploying FeatureSignals application..."
	source /etc/k3s.env 2>/dev/null || true
	export KUBECONFIG=$(KUBECONFIG)
	helm upgrade --install $(HELM_RELEASE) $(HELM_CHART) \
		--namespace $(NAMESPACE_SYSTEM) \
		--create-namespace \
		--values $(HELM_CHART)/values.yaml \
		--wait \
		--timeout 10m
	@echo -e "$(GREEN)[INFO]$(NC) Application deployment complete."

.PHONY: app-deploy-staging
app-deploy-staging: ## Deploy staging environment
	@echo -e "$(YELLOW)[WARN]$(NC) Deploying staging..."
	source /etc/k3s.env 2>/dev/null || true
	export KUBECONFIG=$(KUBECONFIG)
	helm upgrade --install $(HELM_RELEASE)-staging $(HELM_CHART) \
		--namespace $(NAMESPACE_SAAS) \
		--create-namespace \
		--values $(HELM_CHART)/values.yaml \
		--values $(HELM_CHART)/values-staging.yaml 2>/dev/null \
		--set ingress.hosts[0].host=staging.api.featuresignals.com \
		--set replicaCount=1 \
		--set resources.requests.cpu=100m \
		--set resources.requests.memory=128Mi \
		--wait \
		--timeout 10m || \
		echo -e "$(YELLOW)[WARN]$(NC) Staging deploy had warnings (values-staging.yaml may not exist)."
	@echo -e "$(GREEN)[INFO]$(NC) Staging deployment complete."

.PHONY: app-deploy-production
app-deploy-production: ## Deploy production environment (with production values)
	@echo -e "$(GREEN)[INFO]$(NC) Deploying production..."
	source /etc/k3s.env 2>/dev/null || true
	export KUBECONFIG=$(KUBECONFIG)
	helm upgrade --install $(HELM_RELEASE)-prod $(HELM_CHART) \
		--namespace $(NAMESPACE_SYSTEM) \
		--create-namespace \
		--values $(HELM_CHART)/values.yaml \
		--values $(HELM_CHART)/values-production.yaml 2>/dev/null \
		--set replicaCount=2 \
		--wait \
		--timeout 10m || \
		echo -e "$(YELLOW)[WARN]$(NC) Production deploy had warnings (values-production.yaml may not exist)."
	@echo -e "$(GREEN)[INFO]$(NC) Production deployment complete."

.PHONY: db-migrate
db-migrate: ## Run database migration job
	@echo -e "$(GREEN)[INFO]$(NC) Running database migrations..."
	source /etc/k3s.env 2>/dev/null || true
	kubectl create job --namespace $(NAMESPACE_SYSTEM) \
		--from=cronjob/featuresignals-db-migrate \
		db-migrate-manual-$(shell date +%s) 2>/dev/null || \
		echo -e "$(RED)[ERROR]$(NC) Migration CronJob not found. Deploy the app first."
	@echo -e "$(GREEN)[INFO]$(NC) Migration job triggered."

.PHONY: backup-now
backup-now: ## Trigger an immediate database backup
	@echo -e "$(GREEN)[INFO]$(NC) Triggering immediate backup..."
	source /etc/k3s.env 2>/dev/null || true
	kubectl create job --namespace $(NAMESPACE_SYSTEM) \
		--from=cronjob/featuresignals-db-backup \
		backup-manual-$(shell date +%s) 2>/dev/null || \
		echo -e "$(YELLOW)[WARN]$(NC) Backup CronJob not found. Creating one-off backup pod..."
	kubectl run --namespace $(NAMESPACE_SYSTEM) \
		--image=bitnami/postgresql:16 \
		--restart=Never \
		--env="PGPASSWORD=$$(kubectl get secret featuresignals-db-postgresql -n $(NAMESPACE_SYSTEM) -o jsonpath='{.data.postgres-password}' | base64 -d)" \
		backup-manual-$(shell date +%s) \
		-- pg_dump -h featuresignals-db-postgresql.$(NAMESPACE_SYSTEM).svc.cluster.local \
			-U fs -d featuresignals --compress=9 -f /tmp/backup.sql.gz 2>/dev/null || \
		echo -e "$(YELLOW)[WARN]$(NC) Could not run backup. Is PostgreSQL deployed?"

.PHONY: status
status: ## Show cluster status overview
	@echo -e "$(GREEN)[INFO]$(NC) Cluster Status"
	@echo "=========================================="
	@echo ""
	@echo "--- Nodes ---"
	kubectl get nodes -o wide 2>/dev/null || echo "  (cluster not reachable)"
	@echo ""
	@echo "--- Namespaces ---"
	kubectl get namespaces 2>/dev/null || echo "  (cluster not reachable)"
	@echo ""
	@echo "--- Pods (all namespaces) ---"
	kubectl get pods --all-namespaces 2>/dev/null || echo "  (cluster not reachable)"
	@echo ""
	@echo "--- Services ---"
	kubectl get services --all-namespaces 2>/dev/null || echo "  (cluster not reachable)"
	@echo ""
	@echo "--- Ingress ---"
	kubectl get ingress --all-namespaces 2>/dev/null || echo "  (cluster not reachable)"
	@echo ""
	@echo "--- Certificates ---"
	kubectl get certificates --all-namespaces 2>/dev/null || echo "  (cluster not reachable)"
	@echo ""
	@echo "--- Persistent Volumes ---"
	kubectl get pv --all-namespaces 2>/dev/null || echo "  (cluster not reachable)"
	@echo ""
	@echo "--- Helm Releases ---"
	helm ls --all-namespaces 2>/dev/null || echo "  (helm not available)"

.PHONY: logs-server
logs-server: ## Tail server API logs
	@echo -e "$(GREEN)[INFO]$(NC) Tailing server logs..."
	source /etc/k3s.env 2>/dev/null || true
	kubectl logs --namespace $(NAMESPACE_SYSTEM) \
		--selector=app=featuresignals-api \
		--tail=100 \
		--follow 2>/dev/null || \
	kubectl logs --namespace $(NAMESPACE_SYSTEM) \
		--selector=app.kubernetes.io/name=featuresignals \
		--tail=100 \
		--follow 2>/dev/null || \
	echo -e "$(YELLOW)[WARN]$(NC) No server pods found. Deploy the app first."

.PHONY: logs-dashboard
logs-dashboard: ## Tail dashboard logs
	@echo -e "$(GREEN)[INFO]$(NC) Tailing dashboard logs..."
	source /etc/k3s.env 2>/dev/null || true
	kubectl logs --namespace $(NAMESPACE_SAAS) \
		--selector=app=featuresignals-dashboard \
		--tail=100 \
		--follow 2>/dev/null || \
	kubectl logs --namespace $(NAMESPACE_SAAS) \
		--selector=app.kubernetes.io/name=featuresignals-dashboard \
		--tail=100 \
		--follow 2>/dev/null || \
	echo -e "$(YELLOW)[WARN]$(NC) No dashboard pods found. Deploy the app first."

.PHONY: shell-postgres
shell-postgres: ## Open a psql shell to the database
	@echo -e "$(GREEN)[INFO]$(NC) Connecting to PostgreSQL..."
	source /etc/k3s.env 2>/dev/null || true
	POSTGRES_POD=$$(kubectl get pod --namespace $(NAMESPACE_SYSTEM) \
		--selector=app.kubernetes.io/instance=featuresignals-db \
		--selector=role=primary \
		-o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
	if [ -z "$$POSTGRES_POD" ]; then
		echo -e "$(RED)[ERROR]$(NC) No PostgreSQL primary pod found."
		exit 1
	fi
	echo -e "$(GREEN)[INFO]$(NC) Found pod: $$POSTGRES_POD"
	kubectl exec --namespace $(NAMESPACE_SYSTEM) -it "$$POSTGRES_POD" -- \
		psql -U fs -d featuresignals

.PHONY: cert-renew
cert-renew: ## Force certificate renewal
	@echo -e "$(GREEN)[INFO]$(NC) Triggering certificate renewal..."
	source /etc/k3s.env 2>/dev/null || true
	# Delete the certificate resources to force re-issuance
	for cert in $$(kubectl get certificates --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' 2>/dev/null); do
		ns=$$(echo $$cert | awk '{print $$1}')
		name=$$(echo $$cert | awk '{print $$2}')
		echo -e "$(YELLOW)[WARN]$(NC) Deleting certificate $${ns}/$${name} to force renewal..."
		kubectl delete certificate -n "$$ns" "$$name" 2>/dev/null || true
	done
	# Also delete the ACME account key secrets to force fresh order
	kubectl delete secret letsencrypt-prod-account-key -n cert-manager 2>/dev/null || true
	echo -e "$(GREEN)[INFO]$(NC) Certificates will be re-issued by cert-manager shortly."
	echo -e "$(GREEN)[INFO]$(NC) Monitor with: kubectl get certificates --all-namespaces --watch"

.PHONY: infra-destroy
infra-destroy: ## Remove all infrastructure components (careful!)
	@echo -e "$(RED)[ERROR]$(NC) This will destroy ALL infrastructure!"
	@echo -e "$(RED)[ERROR]$(NC) Type 'yes' to confirm:"
	read -r confirmation
	if [ "$$confirmation" != "yes" ]; then
		echo -e "$(YELLOW)[WARN]$(NC) Aborted."
		exit 1
	fi
	source /etc/k3s.env 2>/dev/null || true
	helm uninstall featuresignals-db --namespace $(NAMESPACE_SYSTEM) 2>/dev/null || true
	helm uninstall caddy-ingress --namespace caddy-system 2>/dev/null || true
	helm uninstall metallb --namespace metallb-system 2>/dev/null || true
	helm uninstall cert-manager --namespace cert-manager 2>/dev/null || true
	kubectl delete namespace featuresignals-saas 2>/dev/null || true
	kubectl delete namespace featuresignals-system 2>/dev/null || true
	kubectl delete namespace caddy-system 2>/dev/null || true
	kubectl delete namespace metallb-system 2>/dev/null || true
	kubectl delete namespace cert-manager 2>/dev/null || true
	@echo -e "$(GREEN)[INFO]$(NC) Infrastructure destroyed."

.PHONY: k3s-uninstall
k3s-uninstall: ## Completely remove k3s from the node
	@echo -e "$(RED)[ERROR]$(NC) This will completely remove k3s!"
	@echo -e "$(RED)[ERROR]$(NC) Type 'yes' to confirm:"
	read -r confirmation
	if [ "$$confirmation" != "yes" ]; then
		echo -e "$(YELLOW)[WARN]$(NC) Aborted."
		exit 1
	fi
	/usr/local/bin/k3s-uninstall.sh 2>/dev/null || \
	/usr/local/bin/k3s-agent-uninstall.sh 2>/dev/null || \
	echo -e "$(YELLOW)[WARN]$(NC) Uninstall script not found."
	rm -f /etc/k3s.env
	rm -rf /etc/rancher/k3s
	@echo -e "$(GREEN)[INFO]$(NC) k3s removed."
