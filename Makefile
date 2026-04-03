.PHONY: db-tunnel db-admin db-readonly db-setup-roles help

# ─── Database Access ──────────────────────────────────────────────────────────
# Requires: FS_VPS_HOST env var or ~/.featuresignals/config with VPS_HOST=...

db-tunnel: ## Open SSH tunnel to production Postgres (for GUI clients)
	@bash scripts/db-connect.sh --tunnel-only

db-admin: ## Open psql as fs_admin (full privileges)
	@bash scripts/db-connect.sh --role admin

db-readonly: ## Open psql as fs_readonly (SELECT only)
	@bash scripts/db-connect.sh --role readonly

db-setup-roles: ## Run role provisioning on VPS via SSH
	@if [ -z "$${FS_VPS_HOST:-}" ]; then \
		echo "ERROR: Set FS_VPS_HOST first"; exit 1; \
	fi
	ssh $${FS_VPS_USER:-deploy}@$${FS_VPS_HOST} "cd /opt/featuresignals && bash deploy/pg-setup-roles.sh"

# ─── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
