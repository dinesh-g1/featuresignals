.PHONY: up down local-up local-down local-reset local-logs seed db-tunnel db-admin db-readonly db-setup-roles onprem-up onprem-down help

# ─── Native Dev (DB in Docker, server/dashboard run natively) ────────────────

up: ## Start Postgres via Docker for native dev
	docker compose up -d postgres
	@echo "Postgres ready at localhost:5432"
	@echo "Run: cd server && go run ./cmd/server"
	@echo "Run: cd dashboard && npm run dev"

down: ## Stop Postgres
	docker compose down

# ─── Full-Stack Local Docker ─────────────────────────────────────────────────

local-up: ## Start entire product in Docker (server + dashboard + postgres)
	docker compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
	@echo "FeatureSignals running at http://localhost:3000"

local-down: ## Stop full-stack local environment
	docker compose -f docker-compose.yml -f docker-compose.override.yml down

local-reset: ## Nuke volumes and restart (clean slate)
	docker compose -f docker-compose.yml -f docker-compose.override.yml down -v
	docker compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
	@echo "Clean restart complete"

local-logs: ## Tail logs for all local services
	docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f

# ─── On-Prem ─────────────────────────────────────────────────────────────────

onprem-up: ## Start on-prem deployment
	docker compose -f deploy/onprem/docker-compose.onprem.yml up -d

onprem-down: ## Stop on-prem deployment
	docker compose -f deploy/onprem/docker-compose.onprem.yml down

# ─── Seed ─────────────────────────────────────────────────────────────────────

seed: ## Load seed data into running Postgres
	@docker compose exec -T postgres psql -U fs -d featuresignals < server/scripts/seed.sql
	@echo "Seed data loaded"

local-seed: ## Start full-stack Docker with seed data pre-loaded
	docker compose -f docker-compose.yml -f docker-compose.override.yml --profile seed up --build -d
	@echo "FeatureSignals running at http://localhost:3000 (with seed data)"

# ─── Database Access ──────────────────────────────────────────────────────────

db-tunnel: ## Open SSH tunnel to production Postgres
	@bash scripts/db-connect.sh --tunnel-only

db-admin: ## Open psql as fs_admin
	@bash scripts/db-connect.sh --role admin

db-readonly: ## Open psql as fs_readonly
	@bash scripts/db-connect.sh --role readonly

db-setup-roles: ## Run role provisioning on VPS
	@if [ -z "$${FS_VPS_HOST:-}" ]; then \
		echo "ERROR: Set FS_VPS_HOST first"; exit 1; \
	fi
	ssh $${FS_VPS_USER:-deploy}@$${FS_VPS_HOST} "cd /opt/featuresignals && bash deploy/pg-setup-roles.sh"

# ─── Schema ───────────────────────────────────────────────────────────────────

schema-snapshot: ## Dump current DB schema to server/schema.snapshot.sql
	@docker compose exec -T postgres pg_dump -U fs -d featuresignals --schema-only --no-owner --no-acl | \
		grep -v '^--' | grep -v '^$$' | grep -v '^SET ' | grep -v '^SELECT ' > server/schema.snapshot.sql
	@echo "Schema snapshot saved to server/schema.snapshot.sql"

# ─── Status ───────────────────────────────────────────────────────────────────

status: ## Show status of all Docker services
	docker compose ps

# ─── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
