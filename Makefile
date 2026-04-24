.PHONY: up down local-up local-up-caddy local-down local-reset local-logs seed local-seed \
	db-tunnel db-admin db-readonly db-setup-roles onprem-up onprem-down \
	schema-snapshot status help setup dev dev-stop test test-server test-dash lint \
	migrate-new migrate-up migrate-down migrate-status migrate-down-all \
	deploy-staging deploy-prod release \
	dev-server dev-dash dev-website dev-docs dev-migrate dev-seed dev-db-create dev-stalescan \
	k3s-install infra-deploy app-deploy app-deploy-staging app-deploy-production \
	db-migrate backup-now cert-renew k8s-status

# ─── One-Time Setup ──────────────────────────────────────────────────────────

setup: ## One-time dev setup (hooks, deps, migrate CLI)
	@if command -v uname >/dev/null 2>&1 && [ "$$(uname -o)" = "Msys" -o "$$(uname -o)" = "Cygwin" ]; then \
		echo "==> Windows detected. Setting up git hooks and dependencies..."; \
		if ! command -v git >/dev/null 2>&1; then \
			echo "ERROR: git not found. Please install Git for Windows first."; \
			exit 1; \
		fi; \
		git config core.hooksPath .githooks; \
	else \
		git config core.hooksPath .githooks; \
	fi
	cd server && go mod download
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "npm not found. Installing Node 22.x (includes npm)..."; \
		if command -v uname >/dev/null 2>&1 && [ "$$(uname -o)" = "Msys" -o "$$(uname -o)" = "Cygwin" ]; then \
			echo "Installing Node.js via winget..."; \
			winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements; \
		elif [ "$$(uname)" = "Darwin" ]; then \
			brew install node@22; \
		elif [ -f /etc/debian_version ]; then \
			curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -; \
			sudo apt-get install -y nodejs; \
		elif [ -f /etc/redhat-release ]; then \
			curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -; \
			sudo yum install -y nodejs; \
		else \
			echo "ERROR: Unsupported OS. Please install Node 22+ manually from https://nodejs.org"; \
			exit 1; \
		fi; \
	fi
	cd dashboard && npm ci
	@for dir in website docs; do \
		if [ -d "$$dir" ]; then \
			echo "==> Installing $$dir deps..."; \
			cd $$dir && npm ci && cd ..; \
		fi; \
	done
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
	@echo "  ║  FeatureSignals — Native Development                         ║"
	@echo "  ╚══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  Prerequisites:"
	@echo "    Go 1.25+, Node 22+ (run 'make setup' first)"
	@echo ""
	@echo "  Start services:"
	@echo "    make dev server     # Go API on :8080 (migrations run automatically)"
	@echo "    make dev dashboard  # Next.js dashboard on :3000"
	@echo "    make dev website    # Marketing site on :3001"
	@echo "    make dev docs       # Docs (Docusaurus) on :3002"
	@echo ""
	@echo "  Database:"
	@echo "    make up             # Start Postgres container"
	@echo "    make dev-migrate    # Apply pending migrations (optional, runs on startup)"
	@echo ""
	@echo "  Useful targets:"
	@echo "    make dev-stop       # Stop all services & free ports"
	@echo "    make dev-seed       # Load sample data"
	@echo "    make dev-stalescan  # Run stale flag scanner"
	@echo "    make test           # Run all tests"
	@echo ""

dev-db-create: ## Create database and user in locally installed Postgres (no Docker)
	@echo "==> Checking for local Postgres installation..."
	@if ! command -v psql >/dev/null 2>&1; then \
		echo "psql not found. Installing PostgreSQL..."; \
		if command -v uname >/dev/null 2>&1 && [ "$$(uname -o)" = "Msys" -o "$$(uname -o)" = "Cygwin" ]; then \
			echo "Installing PostgreSQL via winget..."; \
			winget install OSGeo.PostgreSQL --accept-source-agreements --accept-package-agreements; \
			echo "PostgreSQL installed. Please restart your terminal and run 'make dev-db-create' again."; \
			exit 0; \
		elif [ "$$(uname)" = "Darwin" ]; then \
			brew install postgresql@16 && brew services start postgresql@16; \
		elif [ -f /etc/debian_version ]; then \
			sudo apt-get install -y postgresql postgresql-contrib && sudo service postgresql start; \
		elif [ -f /etc/redhat-release ]; then \
			sudo yum install -y postgresql-server postgresql-contrib && sudo postgresql-setup --initdb && sudo systemctl start postgresql; \
		else \
			echo "ERROR: Unsupported OS. Please install PostgreSQL 16+ manually."; \
			exit 1; \
		fi; \
	fi
	@echo "==> Creating local Postgres database..."
	@createuser -s fs 2>/dev/null || true
	@psql -U fs -tc "SELECT 1 FROM pg_database WHERE datname = 'featuresignals'" | grep -q 1 || \
		createdb -U fs featuresignals
	@psql -U fs -d featuresignals -c "ALTER USER fs PASSWORD 'fsdev';" 2>/dev/null || true
	@echo "  Database 'featuresignals' ready (user: fs, password: fsdev)"
	@echo "  Run 'make dev-migrate' to apply migrations"

dev-migrate: ## Apply pending migrations manually (optional, runs on startup by default)
	@command -v migrate >/dev/null 2>&1 || { echo "ERROR: 'migrate' CLI not found. Run 'make setup' first."; exit 1; }
	migrate -path server/migrations -database "$${DATABASE_URL:-postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable}" up
	@echo "  Migrations applied"

dev-server: ## Run Go API server natively (reads server/.env)
	@echo "==> Starting API server on :$${PORT:-8080}..."
	cd server && go run ./cmd/server

dev-dash: ## Run Next.js dashboard natively
	@echo "==> Starting dashboard on :3000..."
	cd dashboard && npm run dev

dev-ops: ## Run Ops Portal natively (port 3001)
	@echo "==> Starting ops portal on :3001..."
	cd ops && npm run dev

dev-website: ## Run Next.js marketing website natively (port 3002)
	@echo "==> Starting website on :3002..."
	cd website && PORT=3002 npm run dev

dev-docs: ## Run Docusaurus docs natively (port 3002)
	@echo "==> Starting docs on :3002..."
	cd docs && npm start -- --port 3002

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

dev: ## Start a specific service (usage: make dev server|dashboard|docs|website)
	@SERVICE=$$(echo "$(filter-out $@,$(MAKECMDGOALS))" | tr -d ' '); \
	if [ -z "$$SERVICE" ]; then \
		echo "Usage: make dev server|dashboard|docs|website"; \
		exit 1; \
	fi; \
	case "$$SERVICE" in \
		dashboard) TARGET="dev-dash" ;; \
		*) TARGET="dev-$$SERVICE" ;; \
	esac; \
	$(MAKE) $$TARGET

dev-stop: ## Stop all dev services and free ports (8080, 3000, 3001, 3002)
	@echo "==> Stopping all dev services..."
	@for port in 8080 3000 3001 3002; do \
		PID=$$(lsof -ti:$$port 2>/dev/null); \
		if [ -n "$$PID" ]; then \
			echo "  Killing PID $$PID on port $$port..."; \
			kill -9 $$PID 2>/dev/null || true; \
		fi; \
	done
	@echo "  All dev services stopped. Ports cleaned."

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

# ─── Documentation ───────────────────────────────────────────────────────────

docs: ## Regenerate OpenAPI spec from chi router + route metadata
	cd server && go run ./cmd/genspec -o ../docs/static/openapi/featuresignals.json
	cd server && go run ./cmd/genspec -o internal/api/docs/spec.json
	@echo "OpenAPI spec regenerated. Run 'npm run build' in docs/ to rebuild Scalar playground."

# ─── Migrations ──────────────────────────────────────────────────────────────

migrate-new: ## Create a new migration pair (usage: make migrate-new NAME=add_foo)
	@if [ -z "$(NAME)" ]; then echo "Usage: make migrate-new NAME=description"; exit 1; fi
	@NEXT=$$(printf "%06d" $$(($$(ls server/migrations/*.up.sql 2>/dev/null | wc -l) + 1))); \
	touch "server/migrations/$${NEXT}_$(NAME).up.sql" \
	      "server/migrations/$${NEXT}_$(NAME).down.sql"; \
	echo "Created:"; \
	echo "  server/migrations/$${NEXT}_$(NAME).up.sql"; \
	echo "  server/migrations/$${NEXT}_$(NAME).down.sql"

migrate-up: ## Apply all pending migrations using CLI (for manual control)
	@command -v migrate >/dev/null 2>&1 || { echo "ERROR: 'migrate' CLI not found. Run 'make setup' first."; exit 1; }
	migrate -path server/migrations -database "$${DATABASE_URL:-postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable}" up

migrate-down: ## Rollback last migration
	@command -v migrate >/dev/null 2>&1 || { echo "ERROR: 'migrate' CLI not found. Run 'make setup' first."; exit 1; }
	migrate -path server/migrations -database "$${DATABASE_URL:-postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable}" down 1

migrate-down-all: ## Rollback all migrations
	@command -v migrate >/dev/null 2>&1 || { echo "ERROR: 'migrate' CLI not found. Run 'make setup' first."; exit 1; }
	@read -p "WARNING: This will rollback ALL migrations. Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	migrate -path server/migrations -database "$${DATABASE_URL:-postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable}" down -all

migrate-status: ## Show current migration status
	@command -v migrate >/dev/null 2>&1 || { echo "ERROR: 'migrate' CLI not found. Run 'make setup' first."; exit 1; }
	migrate -path server/migrations -database "$${DATABASE_URL:-postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable}" version

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

# ─── k3s / k8s Deploy (single-node cluster) ──────────────────────────────────
#
# All commands delegate to deploy/k8s/Makefile which manages the k3s cluster
# on a Hetzner CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe). Run from the project root
# or directly from deploy/k8s/.
#
# Usage:
#   make k3s-install         — Bootstrap k3s on a fresh VPS (ssh & sudo)
#   make infra-deploy        — Deploy cert-manager, MetalLB, Caddy, PostgreSQL
#   make app-deploy          — Deploy the FeatureSignals application
#   make k8s-status          — Show cluster status

K8S_MAKEFILE := deploy/k8s/Makefile

k3s-install: ## Bootstrap k3s single-node cluster on a fresh VPS
	$(MAKE) -C deploy/k8s k3s-install

infra-deploy: ## Deploy all k8s infrastructure components
	$(MAKE) -C deploy/k8s infra-deploy

app-deploy: ## Deploy/upgrade the FeatureSignals application via Helm
	$(MAKE) -C deploy/k8s app-deploy

app-deploy-staging: ## Deploy staging environment
	$(MAKE) -C deploy/k8s app-deploy-staging

app-deploy-production: ## Deploy production environment
	$(MAKE) -C deploy/k8s app-deploy-production

db-migrate: ## Run database migration job
	$(MAKE) -C deploy/k8s db-migrate

backup-now: ## Trigger immediate database backup
	$(MAKE) -C deploy/k8s backup-now

cert-renew: ## Force certificate renewal via cert-manager
	$(MAKE) -C deploy/k8s cert-renew

k8s-status: ## Show k3s cluster status overview
	$(MAKE) -C deploy/k8s status

# ─── Status ───────────────────────────────────────────────────────────────────

status: ## Show status of all Docker services
	docker compose ps

# ─── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
