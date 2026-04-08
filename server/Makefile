.PHONY: build run test dev dev-deps dev-native migrate-up migrate-down migrate-status tidy lint seed clean help

# ─── Configuration ────────────────────────────────────────────────────────────
# Source .env if it exists so env vars are available without manual export.
-include .env
export

DATABASE_URL ?= postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable

# ─── Core ─────────────────────────────────────────────────────────────────────

build: ## Build the server binary
	go build -o bin/server ./cmd/server

build-all: ## Build all binaries (server + stalescan)
	go build -o bin/server ./cmd/server
	go build -o bin/stalescan ./cmd/stalescan

run: ## Run the server (reads .env automatically)
	go run ./cmd/server

run-stalescan: ## Run the stale flag scanner
	go run ./cmd/stalescan

test: ## Run all tests with verbose output
	go test ./... -v -count=1

test-cover: ## Run tests with coverage report
	go test ./... -coverprofile=coverage.out -covermode=atomic
	go tool cover -func coverage.out
	@echo "\n→ Open HTML report: go tool cover -html=coverage.out"

test-race: ## Run tests with race detector
	go test ./... -v -count=1 -race

# ─── Local Development ────────────────────────────────────────────────────────

dev-deps: ## Start Postgres via docker compose (background)
	docker compose -f ../docker-compose.yml up -d postgres

dev: dev-deps migrate-up ## Docker Postgres + migrations + server
	@echo "Starting server on :$${PORT:-8080}..."
	go run ./cmd/server

dev-native: migrate-up ## Native Postgres (already running) + migrations + server
	@echo "Starting server on :$${PORT:-8080}..."
	@echo "  DB: $${DATABASE_URL}"
	go run ./cmd/server

# ─── Seed ─────────────────────────────────────────────────────────────────────

seed: ## Insert sample data for local testing
	@echo "Seeding database..."
	psql "$(DATABASE_URL)" -f scripts/seed.sql

# ─── Migrations ───────────────────────────────────────────────────────────────

migrate-up: ## Apply all pending migrations
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down: ## Roll back the last migration
	migrate -path migrations -database "$(DATABASE_URL)" down 1

migrate-down-all: ## Roll back ALL migrations (destructive)
	migrate -path migrations -database "$(DATABASE_URL)" down -all

migrate-status: ## Show current migration version
	migrate -path migrations -database "$(DATABASE_URL)" version

# ─── Quality ──────────────────────────────────────────────────────────────────

tidy: ## Tidy go modules
	go mod tidy

lint: ## Run go vet
	go vet ./...

clean: ## Remove build artifacts
	rm -rf bin/ coverage.out server relay stalescan

# ─── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
