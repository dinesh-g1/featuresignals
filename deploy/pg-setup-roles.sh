#!/usr/bin/env bash
#
# Idempotent PostgreSQL role provisioning for FeatureSignals.
#
# Creates fs_admin (full privileges) and fs_readonly (SELECT only).
# Safe to re-run: uses DO $$ IF NOT EXISTS $$ pattern and ALTER for passwords.
#
# Reads DB_ADMIN_PASSWORD and DB_READONLY_PASSWORD from /opt/featuresignals/.env
# (or from environment if already exported).
#
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/featuresignals}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DB_NAME="${POSTGRES_DB:-featuresignals}"
DB_USER="${POSTGRES_USER:-fs}"

cd "$PROJECT_DIR"

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -z "${DB_ADMIN_PASSWORD:-}" ]; then
  echo "ERROR: DB_ADMIN_PASSWORD is not set. Add it to .env or export it."
  exit 1
fi
if [ -z "${DB_READONLY_PASSWORD:-}" ]; then
  echo "ERROR: DB_READONLY_PASSWORD is not set. Add it to .env or export it."
  exit 1
fi

CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q postgres)
if [ -z "$CONTAINER" ]; then
  echo "ERROR: postgres container is not running."
  exit 1
fi

echo "==> Setting up PostgreSQL roles..."

docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOSQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fs_admin') THEN
    CREATE ROLE fs_admin WITH LOGIN PASSWORD 'changeme' CREATEDB CREATEROLE;
    RAISE NOTICE 'Created role fs_admin';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fs_readonly') THEN
    CREATE ROLE fs_readonly WITH LOGIN PASSWORD 'changeme';
    RAISE NOTICE 'Created role fs_readonly';
  END IF;
END
$$;
EOSQL

# Set passwords (always runs so rotations take effect)
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE fs_admin PASSWORD '${DB_ADMIN_PASSWORD}';" \
  -c "ALTER ROLE fs_readonly PASSWORD '${DB_READONLY_PASSWORD}';"

# Grant privileges
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<EOSQL
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO fs_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO fs_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fs_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fs_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO fs_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fs_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fs_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO fs_admin;

GRANT CONNECT ON DATABASE $DB_NAME TO fs_readonly;
GRANT USAGE ON SCHEMA public TO fs_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fs_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO fs_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO fs_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO fs_readonly;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
EOSQL

echo "==> PostgreSQL roles configured successfully."
echo "    fs_admin   -> full privileges (admin access)"
echo "    fs_readonly -> SELECT only (team member access)"
