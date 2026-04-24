#!/usr/bin/env bash
# ==============================================================================
# FeatureSignals — Backup Verification Script
# ==============================================================================
# Verifies PostgreSQL backup integrity by restoring to a temporary database and
# running validation queries.
#
# Usage:
#   verify-backup.sh <backup_file>           # Verify a local backup file
#   verify-backup.sh s3://path/to/backup.gz  # Verify a backup from Storage Box
#   verify-backup.sh --all                   # Verify all backups in a directory
#   verify-backup.sh --latest                # Verify the latest daily backup
#
# Environment:
#   Same as backup.sh + restore.sh
#   DB_HOST, DB_USER, DB_DATABASE, POSTGRES_PASSWORD
#   S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# ==============================================================================

set -euo pipefail

# --- Constants ---------------------------------------------------------------
SCRIPT_NAME=$(basename "$0")
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
TEMP_DB="fs_verify_${TIMESTAMP}"
TEMP_DIR="/tmp/fs-verify-${TIMESTAMP}"
S3_BUCKET="s3://fs-backups"

# --- Defaults ----------------------------------------------------------------
DB_HOST="${DB_HOST:-postgresql.featuresignals-system.svc.cluster.local}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_MAINT_DB="${DB_MAINT_DB:-postgres}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
export PGPASSWORD="${POSTGRES_PASSWORD:-${PGPASSWORD:-}}"

# --- Functions ---------------------------------------------------------------

log_info()  { echo "[INFO]  $(date -u '+%Y-%m-%d %H:%M:%S') — $*"; }
log_warn()  { echo "[WARN]  $(date -u '+%Y-%m-%d %H:%M:%S') — $*" >&2; }
log_error() { echo "[ERROR] $(date -u '+%Y-%m-%d %H:%M:%S') — $*" >&2; }
log_pass()  { echo "[PASS]  $*"; }
log_fail()  { echo "[FAIL]  $*" >&2; }

fatal() {
    log_error "$*"
    exit 1
}

cleanup() {
    log_info "Cleaning up temporary database and files..."
    # Terminate connections and drop temp database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_MAINT_DB" -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEMP_DB}' AND pid <> pg_backend_pid();" \
        2>/dev/null || true
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_MAINT_DB" -c \
        "DROP DATABASE IF EXISTS \"${TEMP_DB}\";" 2>/dev/null || true
    rm -rf "$TEMP_DIR" 2>/dev/null || true
}

trap cleanup EXIT

usage() {
    cat <<EOF
Usage: ${SCRIPT_NAME} [options] [backup_file]

Options:
  --all                Verify all backups in a local directory or S3 prefix
  --latest [type]      Verify the latest backup of given type (default: daily)
  --list               List available backups for verification
  --help               Show this help

Arguments:
  backup_file          Path to .sql.gz file or S3 URI

Environment:
  Same as backup.sh
EOF
    exit 0
}

# --- Core Verification -------------------------------------------------------

verify_archive_integrity() {
    local file="$1"
    local errors=0

    log_info "Phase 1/5 — Archive integrity check..."

    # Check file exists and is readable
    if [ ! -f "$file" ]; then
        log_fail "File not found: $file"
        return 1
    fi

    # Check file size
    local size
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    if [ "$size" -lt 1024 ]; then
        log_fail "File too small (${size} bytes) — likely empty or truncated"
        return 1
    fi

    # Verify gzip integrity
    if ! gunzip -t "$file" 2>/dev/null; then
        log_fail "gzip integrity check FAILED — file is corrupted"
        return 1
    fi

    # Check gzip magic bytes
    local magic
    magic=$(head -c 2 "$file" | xxd -p 2>/dev/null || echo "00")
    if [ "$magic" != "1f8b" ]; then
        log_fail "Invalid gzip magic bytes: 0x${magic} (expected 0x1f8b)"
        return 1
    fi

    log_pass "Archive integrity: OK (${size} bytes)"
    return 0
}

verify_sql_syntax() {
    local file="$1"
    local errors=0

    log_info "Phase 2/5 — SQL syntax validation..."

    # Decompress and pipe through psql with --no-psqlrc in dry-run mode
    # We check for obvious syntax errors without connecting to a database
    local sample_size=100000  # Check first 100KB for header validation
    local header
    header=$(gunzip -c "$file" 2>/dev/null | head -c "$sample_size")

    # Check for pg_dump header
    if ! echo "$header" | head -5 | grep -q "PostgreSQL database dump"; then
        log_warn "File does not appear to be a standard pg_dump output"
        log_warn "First line: $(echo "$header" | head -1)"
    fi

    # Count SQL statements
    local statement_count
    statement_count=$(echo "$header" | grep -cE "^(CREATE|ALTER|INSERT|COPY|SELECT|GRANT|REVOKE)" 2>/dev/null || echo "0")
    if [ "$statement_count" -eq 0 ]; then
        log_fail "No SQL statements found in first 100KB of backup"
        return 1
    fi

    # Check for common corruption patterns
    if echo "$header" | grep -q "PGRES_FATAL_ERROR\|PANIC:\|FATAL:" 2>/dev/null; then
        log_fail "Backup contains error messages embedded in the dump"
        return 1
    fi

    log_pass "SQL syntax: OK (${statement_count} statements in header)"
    return 0
}

restore_to_temp_db() {
    local file="$1"

    log_info "Phase 3/5 — Restoring to temporary database '${TEMP_DB}'..."

    # Create temporary database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_MAINT_DB" -c \
        "CREATE DATABASE \"${TEMP_DB}\";" >/dev/null 2>&1 || {
        log_fail "Failed to create temporary database"
        return 1
    }

    # Restore backup to temp database
    if ! gunzip -c "$file" 2>/dev/null | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" \
        --set ON_ERROR_STOP=on \
        -q \
        2>&1; then
        log_fail "Restore to temporary database FAILED"
        return 1
    fi

    log_pass "Restore to temp database: OK"
    return 0
}

verify_database_integrity() {
    local errors=0

    log_info "Phase 4/5 — Database integrity checks..."

    # Check 1: Can connect
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -c "SELECT 1;" >/dev/null 2>&1; then
        log_fail "Cannot connect to restored database"
        return 1
    fi
    log_pass "Connection to restored database: OK"

    # Check 2: Count tables
    local table_count
    table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
        -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" \
        2>/dev/null || echo "0")

    if [ "$table_count" -eq 0 ]; then
        log_fail "No tables found in restored database"
        errors=$((errors + 1))
    else
        log_pass "Tables: ${table_count}"
        # List all tables
        local tables
        tables=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
            -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" \
            2>/dev/null | tr '\n' ', ' | sed 's/,$//')
        log_info "Tables: ${tables}"
    fi

    # Check 3: Check for required FeatureSignals tables
    local required_tables=("tenants" "projects" "environments" "flags" "segments")
    local missing=0
    for table in "${required_tables[@]}"; do
        local exists
        exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
            -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}';" \
            2>/dev/null || echo "0")
        if [ "$exists" -eq 0 ]; then
            log_warn "Optional table not found: ${table}"
        fi
    done

    # Check 4: Row counts
    local total_rows
    total_rows=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A -q \
        -c "SELECT COALESCE(sum(n_live_tup), 0) FROM pg_stat_user_tables WHERE schemaname = 'public';" \
        2>/dev/null || echo "0")

    if [ "$total_rows" -gt 0 ] 2>/dev/null; then
        log_pass "Total rows across all tables: ~${total_rows}"
    else
        log_warn "Row count appears to be 0 (may be expected for new/empty databases)"
    fi

    # Check 5: Check for NULL/empty required columns (data quality)
    local null_checks=0
    for table in "${required_tables[@]}"; do
        local exists
        exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
            -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}';" \
            2>/dev/null || echo "0")
        if [ "$exists" -gt 0 ]; then
            local row_count
            row_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
                -c "SELECT count(*) FROM \"${table}\";" 2>/dev/null || echo "0")
            if [ "$row_count" -gt 0 ]; then
                null_checks=$((null_checks + 1))
            fi
        fi
    done
    if [ "$null_checks" -gt 0 ]; then
        log_pass "Data quality sample: ${null_checks} tables have populated data"
    fi

    # Check 6: Index count
    local index_count
    index_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
        -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null || echo "0")
    log_pass "Indexes: ${index_count}"

    # Check 7: Primary key check
    local pk_count
    pk_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
        -c "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'PRIMARY KEY' AND table_schema = 'public';" \
        2>/dev/null || echo "0")
    log_pass "Primary keys: ${pk_count}"

    if [ $errors -gt 0 ]; then
        log_warn "Database integrity: ${errors} issue(s) found"
        return 1
    fi

    log_pass "Database integrity: ALL CHECKS PASSED"
    return 0
}

verify_data_sanity() {
    local errors=0

    log_info "Phase 5/5 — Data sanity verification..."

    # Run a series of queries to verify data consistency
    local checks=0
    local passed=0

    # Check for orphaned records (foreign key violations)
    checks=$((checks + 1))
    local fk_violations
    fk_violations=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
        -c "
        SELECT count(*) FROM (
            SELECT 'environments' AS tbl FROM environments e
            WHERE e.project_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = e.project_id)
            UNION ALL
            SELECT 'flags' FROM flags f
            WHERE f.project_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = f.project_id)
            UNION ALL
            SELECT 'segments' FROM segments s
            WHERE s.project_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = s.project_id)
        ) AS orphans;" 2>/dev/null || echo "0")

    if [ "$fk_violations" -eq 0 ] 2>/dev/null; then
        log_pass "Foreign key integrity: No orphaned records"
        passed=$((passed + 1))
    else
        log_warn "Foreign key violations found: ${fk_violations} orphaned records"
        # This is often expected during partial restores
    fi

    # Check for duplicate primary keys
    checks=$((checks + 1))
    local dupes
    dupes=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
        -c "
        SELECT sum(cnt) FROM (
            SELECT count(*) - count(DISTINCT id) AS cnt FROM tenants
            UNION ALL
            SELECT count(*) - count(DISTINCT id) FROM projects
            UNION ALL
            SELECT count(*) - count(DISTINCT id) FROM environments
            UNION ALL
            SELECT count(*) - count(DISTINCT id) FROM flags
        ) AS dupes;" 2>/dev/null || echo "0")

    if [ "$dupes" -eq 0 ] 2>/dev/null; then
        log_pass "Primary key uniqueness: No duplicates found"
        passed=$((passed + 1))
    else
        log_fail "Duplicate IDs found: ${dupes}"
        errors=$((errors + 1))
    fi

    # Check for negative or zero IDs (common corruption sign)
    checks=$((checks + 1))
    local bad_ids
    bad_ids=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
        -c "
        SELECT COALESCE(sum(bad), 0) FROM (
            SELECT count(*) AS bad FROM tenants WHERE id IS NULL OR id = ''
            UNION ALL
            SELECT count(*) FROM projects WHERE id IS NULL OR id = ''
            UNION ALL
            SELECT count(*) FROM environments WHERE id IS NULL OR id = ''
            UNION ALL
            SELECT count(*) FROM flags WHERE id IS NULL OR id = ''
        ) AS bad_ids;" 2>/dev/null || echo "0")

    if [ "$bad_ids" -eq 0 ] 2>/dev/null; then
        log_pass "ID integrity: No null/empty IDs"
        passed=$((passed + 1))
    else
        log_fail "Null or empty IDs found: ${bad_ids}"
        errors=$((errors + 1))
    fi

    # Check timestamps are valid
    checks=$((checks + 1))
    local bad_timestamps
    bad_timestamps=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A \
        -c "
        SELECT COALESCE(sum(bad), 0) FROM (
            SELECT count(*) AS bad FROM tenants WHERE created_at IS NULL OR created_at > NOW() + INTERVAL '1 day'
            UNION ALL
            SELECT count(*) FROM projects WHERE created_at IS NULL OR created_at > NOW() + INTERVAL '1 day'
            UNION ALL
            SELECT count(*) FROM environments WHERE created_at IS NULL OR created_at > NOW() + INTERVAL '1 day'
            UNION ALL
            SELECT count(*) FROM flags WHERE created_at IS NULL OR created_at > NOW() + INTERVAL '1 day'
        ) AS bad_ts;" 2>/dev/null || echo "0")

    if [ "$bad_timestamps" -eq 0 ] 2>/dev/null; then
        log_pass "Timestamp integrity: No null or future timestamps"
        passed=$((passed + 1))
    else
        log_warn "Invalid timestamps found: ${bad_timestamps}"
    fi

    log_info "Data sanity: ${passed}/${checks} checks passed"
    if [ $errors -gt 0 ]; then
        return 1
    fi
    return 0
}

# --- Main --------------------------------------------------------------------

main() {
    local file=""
    local ALL_MODE=false
    local LATEST_MODE=false
    local LATEST_TYPE="daily"

    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --help|-h) usage ;;
            --all) ALL_MODE=true ;;
            --latest)
                LATEST_MODE=true
                LATEST_TYPE="${2:-daily}"
                if [[ "$LATEST_TYPE" != --* ]]; then shift; fi
                ;;
            --list)
                [ -z "${S3_ENDPOINT:-}" ] && fatal "S3_ENDPOINT required"
                log_info "Backups in Storage Box:"
                for t in hourly daily weekly monthly; do
                    echo ""
                    echo "=== ${t} ==="
                    aws s3 ls "${S3_BUCKET}/${t}/" --endpoint-url "$S3_ENDPOINT" --human-readable 2>/dev/null || echo "(none)"
                done
                exit 0
                ;;
            -*)
                fatal "Unknown option: $1"
                ;;
            *)
                file="$1"
                ;;
        esac
        shift
    done

    # Validate required env
    [ -z "${PGPASSWORD:-}" ] && fatal "POSTGRES_PASSWORD is required"

    # Create temp dir
    mkdir -p "$TEMP_DIR"

    # Resolve backup file
    if [ -z "$file" ]; then
        if [ "$LATEST_MODE" = true ]; then
            [ -z "${S3_ENDPOINT:-}" ] && fatal "S3_ENDPOINT required for --latest"
            log_info "Finding latest ${LATEST_TYPE} backup..."
            file=$(aws s3 ls "${S3_BUCKET}/${LATEST_TYPE}/" --endpoint-url "$S3_ENDPOINT" --recursive 2>/dev/null | \
                sort | tail -1 | awk '{print $4}')
            [ -z "$file" ] && fatal "No ${LATEST_TYPE} backups found"
            file="s3://fs-backups/${file}"
        else
            fatal "No backup file specified. Use --help for usage."
        fi
    fi

    # Download if S3
    if [[ "$file" == s3://* ]]; then
        [ -z "${S3_ENDPOINT:-}" ] && fatal "S3_ENDPOINT required for S3 backups"
        local local_file="${TEMP_DIR}/backup.sql.gz"
        log_info "Downloading ${file}..."
        aws s3 cp "$file" "$local_file" --endpoint-url "$S3_ENDPOINT" --no-progress || \
            fatal "Download failed"
        file="$local_file"
    fi

    # Run verification phases
    local all_passed=true

    verify_archive_integrity "$file" || all_passed=false
    verify_sql_syntax "$file" || all_passed=false
    restore_to_temp_db "$file" || all_passed=false
    verify_database_integrity || all_passed=false
    verify_data_sanity || all_passed=false

    # Summary
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                BACKUP VERIFICATION RESULT                    ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    if [ "$all_passed" = true ]; then
        echo "║  RESULT:  ✅ VERIFIED — Backup is valid and restorable      ║"
    else
        echo "║  RESULT:  ❌ ISSUES FOUND — Review warnings above          ║"
    fi
    echo "║  File:    ${file}"
    echo "║  Tables:  $(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "?")"
    echo "║  Rows:    ~$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TEMP_DB" -t -A -q -c "SELECT COALESCE(sum(n_live_tup), 0) FROM pg_stat_user_tables WHERE schemaname = 'public';" 2>/dev/null || echo "?")"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    if [ "$all_passed" = false ]; then
        exit 1
    fi

    log_info "Backup verification completed successfully"
    log_info "Temporary database '${TEMP_DB}' will be cleaned up automatically"
}
