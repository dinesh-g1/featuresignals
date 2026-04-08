.PHONY: up down local-up local-up-caddy local-down local-reset local-logs seed local-seed \
	db-tunnel db-admin db-readonly db-setup-roles onprem-up onprem-down \
	schema-snapshot status help setup dev test test-server test-dash lint \
	migrate-new deploy-staging deploy-prod release

# ─── One-Time Setup ──────────────────────────────────────────────────────────

setup: ## One-time dev setup (hooks, deps)
	git config core.hooksPath .githooks
	cd server && go mod download
	cd dashboard && npm ci
	@echo ""
	@echo "  Setup complete. Pre-commit hooks installed."
	@echo ""

# ─── Native Dev (DB in Docker, server/dashboard run natively) ────────────────

up: ## Start Postgres via Docker for native dev
	docker compose up -d postgres
	@echo "Postgres ready at localhost:5432"
	@echo "Run: cd server && go run ./cmd/server"
	@echo "Run: cd dashboard && npm run dev"

down: ## Stop Postgres
	docker compose down

dev: up ## Start DB + native server + dashboard (requires tmux or multiple terminals)
	@echo ""
	@echo "  Postgres started. Now run in separate terminals:"
	@echo "    Terminal 1: cd server && make dev"
	@echo "    Terminal 2: cd dashboard && npm run dev"
	@echo ""

# ─── Full-Stack Local Docker ─────────────────────────────────────────────────

local-up: ## Start entire product in Docker (server + dashboard + postgres)
	docker compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
	@echo ""
	@echo "  FeatureSignals running:"
	@echo "    Dashboard  → http://localhost:3000"
	@echo "    API Server → http://localhost:8080"
	@echo ""

local-up-caddy: ## Start with Caddy reverse proxy (everything at http://localhost)
	docker compose -f docker-compose.yml -f docker-compose.override.yml --profile caddy up --build -d
	@echo ""
	@echo "  FeatureSignals running:"
	@echo "    Unified    → http://localhost"
	@echo "    Dashboard  → http://localhost:3000"
	@echo "    API Server → http://localhost:8080"
	@echo ""

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

# ─── Testing ─────────────────────────────────────────────────────────────────

test: test-server test-dash ## Run all tests

test-server: ## Run server tests with coverage
	cd server && go test ./... -count=1 -timeout 120s -race -coverprofile=coverage.out
	@echo ""
	cd server && go tool cover -func=coverage.out | tail -1

test-dash: ## Run dashboard tests with coverage
	cd dashboard && npm run test:coverage

lint: ## Run all linters (server + dashboard)
	cd server && go vet ./...
	cd dashboard && npx tsc --noEmit
	@echo "All lints passed"

# ─── Migrations ──────────────────────────────────────────────────────────────

migrate-new: ## Create a new migration pair (usage: make migrate-new NAME=add_foo)
	@if [ -z "$(NAME)" ]; then echo "Usage: make migrate-new NAME=description"; exit 1; fi
	@NEXT=$$(printf "%06d" $$(($$(ls server/migrations/*.up.sql 2>/dev/null | wc -l) + 1))); \
	touch "server/migrations/$${NEXT}_$(NAME).up.sql" \
	      "server/migrations/$${NEXT}_$(NAME).down.sql"; \
	echo "Created:"; \
	echo "  server/migrations/$${NEXT}_$(NAME).up.sql"; \
	echo "  server/migrations/$${NEXT}_$(NAME).down.sql"

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

# ─── Deploy (via GitHub Actions CLI) ─────────────────────────────────────────

deploy-staging: ## Trigger staging deploy via GitHub CLI
	gh workflow run deploy-staging.yml
	@echo "Staging deploy triggered. Monitor at: gh run list --workflow=deploy-staging.yml"

deploy-prod: ## Trigger production deploy via GitHub CLI (with confirmation)
	@echo "WARNING: This will deploy to ALL production regions (IN -> US -> EU)."
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	gh workflow run deploy-production.yml
	@echo "Production deploy triggered. Monitor at: gh run list --workflow=deploy-production.yml"

release: ## Create a new release (usage: make release V=1.2.3)
	@if [ -z "$(V)" ]; then echo "Usage: make release V=1.2.3"; exit 1; fi
	git tag -a "v$(V)" -m "Release v$(V)"
	git push origin "v$(V)"
	@echo "Release v$(V) created. CI will build and publish images."

# ─── Status ───────────────────────────────────────────────────────────────────

status: ## Show status of all Docker services
	docker compose ps

# ─── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
