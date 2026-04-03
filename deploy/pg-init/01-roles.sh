#!/usr/bin/env bash
#
# Runs inside the Postgres container on first DB initialization
# (docker-entrypoint-initdb.d). Creates fs_admin and fs_readonly roles.
#
# Expects DB_ADMIN_PASSWORD and DB_READONLY_PASSWORD env vars to be set
# on the postgres container in docker-compose.prod.yml.
#
set -euo pipefail

if [ -z "${DB_ADMIN_PASSWORD:-}" ] || [ -z "${DB_READONLY_PASSWORD:-}" ]; then
  echo "pg-init: DB_ADMIN_PASSWORD or DB_READONLY_PASSWORD not set, skipping role creation."
  exit 0
fi

echo "pg-init: Creating fs_admin and fs_readonly roles..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- fs_admin: full-privilege role for direct admin access
  CREATE ROLE fs_admin WITH LOGIN PASSWORD '${DB_ADMIN_PASSWORD}' CREATEDB CREATEROLE;

  -- fs_readonly: read-only role for team members
  CREATE ROLE fs_readonly WITH LOGIN PASSWORD '${DB_READONLY_PASSWORD}';

  -- fs_admin: full access
  GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO fs_admin;
  GRANT ALL PRIVILEGES ON SCHEMA public TO fs_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fs_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fs_admin;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO fs_admin;

  -- fs_readonly: SELECT only
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO fs_readonly;
  GRANT USAGE ON SCHEMA public TO fs_readonly;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO fs_readonly;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO fs_readonly;

  -- Prevent PUBLIC from creating objects
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
EOSQL

echo "pg-init: Roles created successfully."
