.PHONY: build run test dev dev-deps migrate-up migrate-down tidy lint seed clean help

# ─── Configuration ────────────────────────────────────────────────────────────
# Source .env if it exists so `make run` works out of the box.
-include .env
export

DATABASE_URL ?= postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable

# ─── Core ─────────────────────────────────────────────────────────────────────

build: ## Build the server binary
	go build -o bin/server ./cmd/server

run: ## Run the server (reads .env automatically)
	go run ./cmd/server

test: ## Run all tests with verbose output
	go test ./... -v -count=1

test-cover: ## Run tests with coverage report
	go test ./... -coverprofile=coverage.out -covermode=atomic
	go tool cover -func coverage.out
	@echo "\n→ Open HTML report: go tool cover -html=coverage.out"

# ─── Local Development ────────────────────────────────────────────────────────

dev-deps: ## Start Postgres via docker compose (background)
	docker compose -f ../docker-compose.yml up -d postgres

dev: dev-deps migrate-up ## Full local dev setup: start Postgres, run migrations, start server
	@echo "Starting server on :$(PORT)..."
	go run ./cmd/server

seed: ## Insert sample data for local testing
	@echo "Seeding database..."
	psql "$(DATABASE_URL)" -f scripts/seed.sql

# ─── Migrations ───────────────────────────────────────────────────────────────

migrate-up: ## Apply all pending migrations
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down: ## Roll back the last migration
	migrate -path migrations -database "$(DATABASE_URL)" down 1

migrate-status: ## Show current migration version
	migrate -path migrations -database "$(DATABASE_URL)" version

# ─── Quality ──────────────────────────────────────────────────────────────────

tidy: ## Tidy go modules
	go mod tidy

lint: ## Run golangci-lint
	golangci-lint run ./...

clean: ## Remove build artifacts
	rm -rf bin/ coverage.out

# ─── Help ─────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
