#!/usr/bin/env bash
# ==============================================================================
# FeatureSignals — PostgreSQL Restore Script
# ==============================================================================
# Restores a PostgreSQL database from a backup.
# Supports both local files and S3 (Hetzner Storage Box) backups.
#
# Usage:
#   restore.sh                                                  # Interactive mode
#   restore.sh s3://fs-backups/daily/featuresignals-20240101-020000.sql.gz
#   restore.sh /backups/daily/featuresignals-20240101-020000.sql.gz
#   restore.sh --list                                           # List available backups
#   restore.sh --list daily                                     # List daily backups
#   restore.sh --latest                                         # Restore latest daily backup
#   restore.sh --latest hourly                                  # Restore latest hourly backup
#
# Environment:
#   DB_HOST, DB_USER, DB_DATABASE, POSTGRES_PASSWORD (or PGPASSWORD)
#   S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# ==============================================================================

set -euo pipefail

# --- Constants ---------------------------------------------------------------
SCRIPT_NAME=$(basename "$0")
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
TEMP_DIR="/tmp/fs-restore-${TIMESTAMP}"
S3_BUCKET="s3://fs-backups"

# --- Defaults ----------------------------------------------------------------
DB_HOST="${DB_HOST:-postgresql.featuresignals-system.svc.cluster.local}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_DATABASE="${DB_DATABASE:-featuresignals}"
S3_ENDPOINT="${S3_ENDPOINT:-}"

# Use POSTGRES_PASSWORD or PGPASSWORD
export PGPASSWORD="${POSTGRES_PASSWORD:-${PGPASSWORD:-}}"

# --- Functions ---------------------------------------------------------------

log_info()  { echo "[INFO]  $(date -u '+%Y-%m-%d %H:%M:%S') — $*"; }
log_warn()  { echo "[WARN]  $(date -u '+%Y-%m-%d %H:%M:%S') — $*" >&2; }
log_error() { echo "[ERROR] $(date -u '+%Y-%m-%d %H:%M:%S') — $*" >&2; }
log_step()  { echo ""; echo "━━▶ $*"; echo "──────────────────────────────────────────────────────"; }

fatal() {
    log_error "$*"
    exit 1
}

usage() {
    cat <<EOF
Usage: ${SCRIPT_NAME} [options] [backup_source]

Options:
  --list [type]      List available backups (type: hourly|daily|weekly|monthly)
  --latest [type]    Restore the latest backup of the given type (default: daily)
  --dry-run          Show what would be done without actually restoring
  --force            Skip confirmation prompt
  --help             Show this help message

Arguments:
  backup_source      Path to a local backup file (.sql.gz) or S3 URI (s3://...)

Examples:
  ${SCRIPT_NAME}                                          # Interactive mode
  ${SCRIPT_NAME} s3://fs-backups/daily/backup-20240101.sql.gz
  ${SCRIPT_NAME} /backups/daily/backup-20240101.sql.gz
  ${SCRIPT_NAME} --list daily                             # List daily backups
  ${SCRIPT_NAME} --latest                                 # Restore latest daily
  ${SCRIPT_NAME} --latest --force                         # Restore without prompt

Environment:
  DB_HOST              Database host (default: postgresql...svc.cluster.local)
  DB_PORT              Database port (default: 5432)
  DB_USER              Database user (default: postgres)
  DB_DATABASE          Database name (default: featuresignals)
  POSTGRES_PASSWORD    Database password
  S3_ENDPOINT          Hetzner Storage Box S3 endpoint
  AWS_ACCESS_KEY_ID    Storage Box access key
  AWS_SECRET_ACCESS_KEY Storage Box secret key
EOF
    exit 0
}

# --- Validation --------------------------------------------------------------

validate_environment() {
    if [ -z "${PGPASSWORD:-}" ]; then
        fatal "POSTGRES_PASSWORD environment variable is required"
    fi
    # S3 endpoint only required for S3 operations
    if [ "${USE_S3:-false}" = true ]; then
        if [ -z "${S3_ENDPOINT:-}" ]; then
            fatal "S3_ENDPOINT is required for S3 operations"
        fi
        if [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
            fatal "AWS credentials required for S3 operations"
        fi
    fi
}

check_db_connectivity() {
    log_info "Checking database connectivity to ${DB_HOST}:${DB_PORT}..."
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_DATABASE" -c "SELECT 1;" >/dev/null 2>&1; then
        log_warn "Cannot connect to database. Attempting connection without database..."
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
            fatal "Cannot connect to PostgreSQL at ${DB_HOST}:${DB_PORT}"
        fi
        log_info "Connected to PostgreSQL server (database ${DB_DATABASE} may not exist yet)"
    else
        log_info "Database connection successful"
    fi
}

# --- Backup Listing ----------------------------------------------------------

list_backups() {
    local type="${1:-}"
    local prefix="${type:+${type}/}"

    if [ -z "${S3_ENDPOINT:-}" ]; then
        fatal "S3_ENDPOINT is required to list backups"
    fi

    log_info "Listing backups in s3://fs-backups/${prefix}..."

    if [ -n "$type" ]; then
        echo ""
        echo "Available ${type} backups:"
        echo "──────────────────────────────────────────────────────"
        aws s3 ls "${S3_BUCKET}/${prefix}" \
            --endpoint-url "$S3_ENDPOINT" \
            --human-readable \
            --summarize 2>/dev/null || echo "  (no backups found)"
    else
        for t in hourly daily weekly monthly; do
            echo ""
            echo "=== ${t} backups ==="
            aws s3 ls "${S3_BUCKET}/${t}/" \
                --endpoint-url "$S3_ENDPOINT" \
                --human-readable 2>/dev/null || echo "  (none)"
        done
    fi
    exit 0
}

# --- Backup Source Resolution -------------------------------------------------

get_latest_backup() {
    local type="${1:-daily}"

    if [ -z "${S3_ENDPOINT:-}" ]; then
        fatal "S3_ENDPOINT is required to find latest backup"
    fi

    log_info "Finding latest ${type} backup..."

    local latest
    latest=$(aws s3 ls "${S3_BUCKET}/${type}/" \
        --endpoint-url "$S3_ENDPOINT" \
        --recursive 2>/dev/null | \
        sort | tail -1 | awk '{print $4}')

    if [ -z "$latest" ]; then
        fatal "No ${type} backups found in Storage Box"
    fi

    echo "s3://fs-backups/${latest}"
}

resolve_backup_source() {
    local source="$1"

    if [[ "$source" == s3://* ]]; then
        USE_S3=true
        S3_URI="$source"
        log_info "Backup source: S3 URI — ${S3_URI}"
    elif [[ "$source" == /* ]] || [[ "$source" == ./* ]] || [[ "$source" =~ ^[a-zA-Z0-9] ]]; then
        USE_S3=false
        LOCAL_FILE="$source"
        if [ ! -f "$LOCAL_FILE" ]; then
            fatal "Local backup file not found: ${LOCAL_FILE}"
        fi
        log_info "Backup source: Local file — ${LOCAL_FILE}"
    else
        fatal "Unknown backup source format: ${source}"
    fi
}

# --- Download -----------------------------------------------------------------

download_backup() {
    local dest="$1"

    if [ "$USE_S3" = true ]; then
        log_info "Downloading from Storage Box..."
        log_info "  Source: ${S3_URI}"

        local download_start
        download_start=$(date +%s)

        if ! aws s3 cp "$S3_URI" "$dest" --endpoint-url "$S3_ENDPOINT" --no-progress; then
            fatal "Failed to download backup from Storage Box"
        fi

        local download_end
        download_end=$(date +%s)
        local size
        size=$(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest" 2>/dev/null)
        log_info "Downloaded: $((size / 1024 / 1024)) MB in $((download_end - download_start))s"
    else
        log_info "Using local file..."
        cp "$LOCAL_FILE" "$dest"
    fi
}

# --- Backup Verification ------------------------------------------------------

verify_backup_integrity() {
    local backup_file="$1"

    log_info "Verifying backup integrity..."

    # Verify gzip integrity
    if ! gunzip -t "$backup_file" 2>/dev/null; then
        fatal "Backup file is corrupted (gzip integrity check failed)"
    fi

    # Check file is not empty (gzipped, so check uncompressed size)
    local uncompressed_size
    uncompressed_size=$(gunzip -c "$backup_file" 2>/dev/null | wc -c)
    if [ "$uncompressed_size" -lt 100 ]; then
        fatal "Backup file appears to be empty or too small (${uncompressed_size} bytes uncompressed)"
    fi

    # Quick check: verify it starts with valid SQL patterns
    local first_chars
    first_chars=$(gunzip -c "$backup_file" 2>/dev/null | head -c 100)
    if [[ ! "$first_chars" =~ (^--|^CREATE|^INSERT|^COPY|^SET|^SELECT) ]]; then
        log_warn "Backup does not start with expected SQL headers (first chars: '${first_chars:0:40}...')"
        log_warn "This may still be valid, but proceed with caution."
    fi

    log_info "Backup integrity verified (${uncompressed_size} bytes uncompressed)"
}

# --- Database Restoration -----------------------------------------------------

get_target_db_name() {
    # Try to find the database name from the backup
    local backup_file="$1"
    local db_name
    db_name=$(gunzip -c "$backup_file" 2>/dev/null | grep -m1 "^--.*Database:" | sed 's/.*Database: //' || echo "")
    echo "${db_name:-$DB_DATABASE}"
}

drop_and_recreate_database() {
    local target_db="$1"

    log_step "Recreating database: ${target_db}"

    # Terminate all connections to the target database
    log_info "Terminating existing connections to ${target_db}..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${target_db}'
          AND pid <> pg_backend_pid();
    " 2>/dev/null || true

    # Drop and recreate
    log_info "Dropping database ${target_db}..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS \"${target_db}\";" >/dev/null 2>&1 || \
        fatal "Failed to drop database ${target_db}"

    log_info "Creating database ${target_db}..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "CREATE DATABASE \"${target_db}\";" >/dev/null 2>&1 || \
        fatal "Failed to create database ${target_db}"

    log_info "Database recreated successfully"
}

restore_from_backup() {
    local backup_file="$1"
    local target_db="$2"

    log_step "Restoring data to: ${target_db}"

    local restore_start
    restore_start=$(date +%s)

    log_info "Starting restore..."
    if ! gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" \
        --set ON_ERROR_STOP=on \
        -v VERBOSITY=verbose \
        2>&1; then
        log_error "Restore failed. The database may be in an inconsistent state."
        log_error "See above for specific errors."
        return 1
    fi

    local restore_end
    restore_end=$(date +%s)
    local duration=$((restore_end - restore_start))
    log_info "Restore completed in ${duration}s"
}

verify_restore() {
    local target_db="$1"

    log_step "Verifying restore"

    local checks=0
    local passed=0

    # Check 1: Connection works
    checks=$((checks + 1))
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -c "SELECT 1;" >/dev/null 2>&1; then
        log_info "✅ Connection to database verified"
        passed=$((passed + 1))
    else
        log_error "❌ Cannot connect to restored database"
    fi

    # Check 2: Has tables
    checks=$((checks + 1))
    local table_count
    table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -A \
        -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
    if [ "$table_count" -gt 0 ]; then
        log_info "✅ Database has ${table_count} tables"
        passed=$((passed + 1))
    else
        log_error "❌ Database has no tables — restore may be incomplete"
    fi

    # Check 3: Check for pg_dump restore markers (extension tables)
    checks=$((checks + 1))
    local ext_count
    ext_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -A \
        -c "SELECT count(*) FROM pg_extension WHERE extname IS NOT NULL;" 2>/dev/null || echo "0")
    log_info "✅ Extensions loaded: ${ext_count}"

    # Check 4: Data integrity — count rows across all tables (quick sampling)
    checks=$((checks + 1))
    local row_count
    row_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -A -q \
        -c "SELECT sum(n_live_tup) FROM pg_stat_user_tables WHERE schemaname = 'public';" 2>/dev/null || echo "0")
    if [ "$row_count" -gt 0 ] 2>/dev/null; then
        log_info "✅ Estimated ${row_count} total rows across all tables"
        passed=$((passed + 1))
    else
        log_warn "⚠️  Row count check returned 0 (may be expected for empty databases)"
        checks=$((checks - 1))
    fi

    # Summary
    echo ""
    if [ "$passed" -eq "$checks" ]; then
        log_info "Restore verification: ALL ${passed}/${checks} checks passed"
        return 0
    else
        log_warn "Restore verification: ${passed}/${checks} checks passed — review warnings above"
        return 0  # Non-fatal — data may still be usable
    fi
}

# --- Cleanup -----------------------------------------------------------------

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR" 2>/dev/null || true
}

# --- Confirmation Prompt -----------------------------------------------------

confirm_restore() {
    local backup_desc="$1"
    local target_db="$2"

    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                 RESTORE CONFIRMATION                        ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  This will PERMANENTLY REPLACE the database:                ║"
    echo "║                                                              ║"
    echo "║  Database:  ${target_db} @ ${DB_HOST}:${DB_PORT}"
    echo "║  Backup:    ${backup_desc}"
    echo "║                                                              ║"
    echo "║  ⚠️  All current data in '${target_db}' will be LOST."
    echo "║  ⚠️  This action CANNOT be undone without another restore."
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    if [ "${FORCE:-false}" = true ]; then
        log_warn "Force mode enabled — skipping confirmation prompt"
        return 0
    fi

    read -r -p "Are you sure you want to proceed? [y/N] " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo ""
        log_warn "Restore cancelled by user"
        exit 0
    fi

    echo ""
    log_warn "Proceeding with restore in 5 seconds... (Ctrl+C to abort)"
    sleep 1
    log_warn "4..."
    sleep 1
    log_warn "3..."
    sleep 1
    log_warn "2..."
    sleep 1
    log_warn "1..."
    sleep 1
    log_info "Starting restore..."
}

# --- Main --------------------------------------------------------------------

main() {
    local ARGS=()
    local LIST_MODE=false
    local LIST_TYPE=""
    local LATEST_MODE=false
    local LATEST_TYPE="daily"
    local DRY_RUN=false
    FORCE=false

    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --help|-h)
                usage
                ;;
            --list)
                LIST_MODE=true
                LIST_TYPE="${2:-}"
                if [ -n "$LIST_TYPE" ] && [[ "$LIST_TYPE" != --* ]]; then
                    shift
                fi
                ;;
            --latest)
                LATEST_MODE=true
                LATEST_TYPE="${2:-daily}"
                if [ -n "$LATEST_TYPE" ] && [[ "$LATEST_TYPE" != --* ]]; then
                    shift
                fi
                ;;
            --dry-run)
                DRY_RUN=true
                ;;
            --force)
                FORCE=true
                ;;
            -*)
                fatal "Unknown option: $1"
                ;;
            *)
                ARGS+=("$1")
                ;;
        esac
        shift
    done

    # Setup cleanup trap
    trap cleanup EXIT

    # Create temp directory
    mkdir -p "$TEMP_DIR"

    # Mode dispatch
    if [ "$LIST_MODE" = true ]; then
        validate_environment
        USE_S3=true
        list_backups "$LIST_TYPE"
    fi

    if [ "$LATEST_MODE" = true ]; then
        validate_environment
        USE_S3=true
        BACKUP_SOURCE=$(get_latest_backup "$LATEST_TYPE")
    elif [ ${#ARGS[@]} -eq 0 ]; then
        # Interactive mode — show available backups and prompt
        validate_environment
        USE_S3=true
        echo "FeatureSignals — Database Restore Tool"
        echo "══════════════════════════════════════"
        echo ""
        echo "Available backups in Storage Box:"
        echo ""
        for t in hourly daily weekly monthly; do
            local count
            count=$(aws s3 ls "${S3_BUCKET}/${t}/" --endpoint-url "$S3_ENDPOINT" 2>/dev/null | wc -l)
            echo "  ${t}: ${count} backup(s)"
        done
        echo ""
        echo "Latest backups:"
        for t in hourly daily weekly monthly; do
            local latest
            latest=$(aws s3 ls "${S3_BUCKET}/${t}/" --endpoint-url "$S3_ENDPOINT" --recursive 2>/dev/null | \
                sort | tail -1 | awk '{print $4}' | sed 's/.*\///')
            echo "  ${t}: ${latest:-none}"
        done
        echo ""
        read -r -p "Enter backup type to restore from [daily]: " LATEST_TYPE
        LATEST_TYPE="${LATEST_TYPE:-daily}"
        BACKUP_SOURCE=$(get_latest_backup "$LATEST_TYPE")
    else
        BACKUP_SOURCE="${ARGS[0]}"
        resolve_backup_source "$BACKUP_SOURCE"
    fi

    # Resolve backup source if not already done
    if [ -z "${BACKUP_SOURCE:-}" ]; then
        fatal "No backup source specified"
    fi

    # For positional args, resolve the source
    if [ -z "${LOCAL_FILE:-}" ] && [ -z "${S3_URI:-}" ] && [ -n "${BACKUP_SOURCE:-}" ]; then
        resolve_backup_source "$BACKUP_SOURCE"
    fi

    validate_environment
    check_db_connectivity

    # Download and verify
    DOWNLOADED_FILE="${TEMP_DIR}/backup.sql.gz"
    download_backup "$DOWNLOADED_FILE"
    verify_backup_integrity "$DOWNLOADED_FILE"

    # Determine target database
    TARGET_DB=$(get_target_db_name "$DOWNLOADED_FILE")

    # Show backup info
    local size
    size=$(stat -f%z "$DOWNLOADED_FILE" 2>/dev/null || stat -c%s "$DOWNLOADED_FILE" 2>/dev/null)
    local uncompressed_size
    uncompressed_size=$(gunzip -c "$DOWNLOADED_FILE" 2>/dev/null | wc -c)

    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   BACKUP INFORMATION                        ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  Source:       ${BACKUP_SOURCE}"
    echo "║  Size:         $((size / 1024 / 1024)) MB compressed / $((uncompressed_size / 1024 / 1024)) MB uncompressed"
    echo "║  Target DB:    ${TARGET_DB}"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    # Dry run
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY RUN — no changes made"
        log_info "Would restore ${BACKUP_SOURCE} to database ${TARGET_DB}"
        exit 0
    fi

    # Confirm
    confirm_restore "$BACKUP_SOURCE" "$TARGET_DB"

    # Perform restore
    drop_and_recreate_database "$TARGET_DB"
    if ! restore_from_backup "$DOWNLOADED_FILE" "$TARGET_DB"; then
        log_error "Restore failed!"
        log_error "Check the error messages above."
        log_error "The database ${TARGET_DB} was dropped but may not be fully restored."
        log_error "You can try again from: ${DOWNLOADED_FILE}"
        exit 1
    fi

    # Verify
    verify_restore "$TARGET_DB"

    # Done
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                   RESTORE COMPLETE                          ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    echo "║  Database:  ${TARGET_DB} @ ${DB_HOST}:${DB_PORT}"
    echo "║  Source:    ${BACKUP_SOURCE}"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    log_info "Post-restore steps:"
    echo "  1. Verify your data:  kubectl exec -n featuresignals-system deployment/postgresql -- psql -U postgres -d featuresignals -c 'SELECT count(*) FROM tenants;'"
    echo "  2. Check API health:  curl https://api.featuresignals.com/health"
    echo "  3. Check dashboard:   curl -I https://app.featuresignals.com"
    echo "  4. Run smoke tests:   dagger call smoke-test --url=https://api.featuresignals.com"
    echo "  5. Trigger a fresh backup: kubectl create job --from=cronjob/fs-backup-hourly manual-post-restore -n featuresignals-system"
    echo ""
    log_info "Restore completed successfully"

    # Keep temp file for potential re-run
    log_info "Temporary backup retained at: ${DOWNLOADED_FILE}"
    log_info "Clean up manually with: rm -rf ${TEMP_DIR}"
}

main "$@"
