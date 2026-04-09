.PHONY: up down local-up local-up-caddy local-down local-reset local-logs seed local-seed \
	db-tunnel db-admin db-readonly db-setup-roles onprem-up onprem-down \
	schema-snapshot status help setup dev test test-server test-dash lint \
	migrate-new deploy-staging deploy-prod release \
	dev-server dev-dash dev-migrate dev-seed dev-db-create dev-stalescan

# ─── One-Time Setup ──────────────────────────────────────────────────────────

setup: ## One-time dev setup (hooks, deps, migrate CLI)
	git config core.hooksPath .githooks
	cd server && go mod download
	cd dashboard && npm ci
	@command -v migrate >/dev/null 2>&1 || { \
		echo "Installing golang-migrate CLI..."; \
		go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest; \
	}
	@echo ""
	@echo "  Setup complete. Pre-commit hooks installed."
	@echo "  Run 'make dev-help' to see how to run services individually."
	@echo ""

# ══════════════════════════════════════════════════════════════════════════════
# Native Development — run each process individually for debugging
# ══════════════════════════════════════════════════════════════════════════════
#
# Option A: Postgres in Docker (quickest)
#   make up            — start Postgres container
#   make dev-migrate   — apply migrations
#   make dev-server    — run Go API server
#   make dev-dash      — run Next.js dashboard
#
# Option B: Fully native Postgres (no Docker at all)
#   make dev-db-create — create database in local Postgres
#   make dev-migrate   — apply migrations
#   make dev-server    — run Go API server
#   make dev-dash      — run Next.js dashboard
#
# Each command runs in the foreground. Use separate terminals.
# ══════════════════════════════════════════════════════════════════════════════

dev-help: ## Show native development quickstart
	@echo ""
	@echo "  ╔══════════════════════════════════════════════════════════════╗"
	@echo "  ║  FeatureSignals — Native Development                       ║"
	@echo "  ╚══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  Prerequisites:"
	@echo "    Go 1.25+, Node 22+, migrate CLI (run 'make setup' first)"
	@echo ""
	@echo "  Option A: Postgres in Docker"
	@echo "    Terminal 1:  make up              # Postgres container"
	@echo "    Terminal 2:  make dev-server       # Go API on :8080"
	@echo "    Terminal 3:  make dev-dash         # Next.js on :3000"
	@echo ""
	@echo "  Option B: Fully native (no Docker)"
	@echo "    Prereq:      brew install postgresql@16 && brew services start postgresql@16"
	@echo "    Once:         make dev-db-create   # create DB + user"
	@echo "    Terminal 1:   make dev-server      # Go API on :8080"
	@echo "    Terminal 2:   make dev-dash        # Next.js on :3000"
	@echo ""
	@echo "  Useful targets:"
	@echo "    make dev-migrate    — apply pending migrations"
	@echo "    make dev-seed       — load sample data"
	@echo "    make dev-stalescan  — run stale flag scanner"
	@echo "    make test           — run all tests"
	@echo ""

dev-db-create: ## Create database and user in locally installed Postgres (no Docker)
	@echo "==> Creating local Postgres database..."
	@createuser -s fs 2>/dev/null || true
	@psql -U fs -tc "SELECT 1 FROM pg_database WHERE datname = 'featuresignals'" | grep -q 1 || \
		createdb -U fs featuresignals
	@psql -U fs -d featuresignals -c "ALTER USER fs PASSWORD 'fsdev';" 2>/dev/null || true
	@echo "  Database 'featuresignals' ready (user: fs, password: fsdev)"
	@echo "  Run 'make dev-migrate' to apply migrations"

dev-migrate: ## Apply all pending database migrations
	@command -v migrate >/dev/null 2>&1 || { echo "ERROR: 'migrate' CLI not found. Run 'make setup' first."; exit 1; }
	migrate -path server/migrations -database "$${DATABASE_URL:-postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable}" up
	@echo "  Migrations applied"

dev-server: ## Run Go API server natively (reads server/.env)
	@echo "==> Starting API server on :$${PORT:-8080}..."
	cd server && go run ./cmd/server

dev-dash: ## Run Next.js dashboard natively
	@echo "==> Starting dashboard on :3000..."
	cd dashboard && npm run dev

dev-seed: ## Load sample data into the database
	psql "$${DATABASE_URL:-postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable}" -f server/scripts/seed.sql
	@echo "  Seed data loaded"

dev-stalescan: ## Run the stale flag scanner
	cd server && go run ./cmd/stalescan

# ─── Postgres in Docker (for devs who prefer it) ────────────────────────────

up: ## Start only Postgres in Docker (for native dev)
	docker compose up -d postgres
	@echo "  Postgres ready at localhost:5432"

down: ## Stop Postgres container
	docker compose down

dev: up dev-migrate ## Start Postgres + apply migrations (then run server/dash in separate terminals)
	@echo ""
	@echo "  Postgres started and migrations applied."
	@echo "  Now run in separate terminals:"
	@echo "    make dev-server"
	@echo "    make dev-dash"
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

seed: ## Load seed data into Dockerized Postgres
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
# All db-* targets require REGION=in|us|eu (e.g. make db-tunnel REGION=us)

db-tunnel: ## Open SSH tunnel to production Postgres (REGION=in|us|eu)
	@if [ -z "$${REGION:-}" ]; then \
		echo "Usage: make db-tunnel REGION=in|us|eu"; \
		echo ""; \
		echo "  Tunnels each region to a dedicated local port:"; \
		echo "    in → localhost:15432    us → localhost:15433    eu → localhost:15434"; \
		echo ""; \
		echo "  You can run multiple tunnels simultaneously."; \
		exit 1; \
	fi
	@bash deploy/db-connect.sh --region $${REGION} --tunnel-only

db-admin: ## Open psql as fs_admin (REGION=in|us|eu)
	@if [ -z "$${REGION:-}" ]; then echo "Usage: make db-admin REGION=in|us|eu"; exit 1; fi
	@bash deploy/db-connect.sh --region $${REGION} --role admin

db-readonly: ## Open psql as fs_readonly (REGION=in|us|eu)
	@if [ -z "$${REGION:-}" ]; then echo "Usage: make db-readonly REGION=in|us|eu"; exit 1; fi
	@bash deploy/db-connect.sh --region $${REGION} --role readonly

db-setup-roles: ## Run role provisioning on VPS (REGION=in|us|eu)
	@if [ -z "$${REGION:-}" ]; then echo "Usage: make db-setup-roles REGION=in|us|eu"; exit 1; fi
	@HOST=$$(bash -c '\
		REGION_UPPER=$$(echo "$${REGION}" | tr "[:lower:]" "[:upper:]"); \
		HOST_VAR="FS_VPS_HOST_$${REGION_UPPER}"; \
		echo "$${!HOST_VAR:-}"'); \
	if [ -z "$$HOST" ]; then \
		echo "ERROR: Set FS_VPS_HOST_$$(echo $${REGION} | tr '[:lower:]' '[:upper:]') first"; exit 1; \
	fi; \
	ssh $${FS_VPS_USER:-deploy}@$$HOST "cd /opt/featuresignals && bash deploy/pg-setup-roles.sh"

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
