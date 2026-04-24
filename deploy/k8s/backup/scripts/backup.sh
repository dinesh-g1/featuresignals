#!/usr/bin/env bash
# ==============================================================================
# FeatureSignals — PostgreSQL Backup Script
# ==============================================================================
# Backups are the foundation of our 3-2-1 strategy:
#   3 copies, 2 media types, 1 off-site (Hetzner Storage Box)
#
# Usage:
#   backup.sh hourly                          # Keep 24 hours
#   backup.sh daily                           # Keep 30 days (default)
#   backup.sh weekly                          # Keep 12 weeks
#   backup.sh monthly                         # Keep 12 months
#   backup.sh pre-deploy                      # Keep until next pre-deploy
#
# Environment:
#   DB_HOST, DB_USER, DB_DATABASE, PGPASSWORD
#   S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# ==============================================================================

set -euo pipefail

# --- Constants ---------------------------------------------------------------
SCRIPT_NAME=$(basename "$0")
BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
BACKUP_FILENAME="featuresignals-${BACKUP_TYPE}-${TIMESTAMP}.sql.gz"
LOCAL_DIR="/backups/${BACKUP_TYPE}"
LOCAL_PATH="${LOCAL_DIR}/${BACKUP_FILENAME}"
S3_BUCKET="s3://fs-backups"
S3_PATH="${S3_BUCKET}/${BACKUP_TYPE}/${BACKUP_FILENAME}"

# --- Defaults ----------------------------------------------------------------
DB_HOST="${DB_HOST:-postgresql.featuresignals-system.svc.cluster.local}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_DATABASE="${DB_DATABASE:-featuresignals}"
S3_ENDPOINT="${S3_ENDPOINT:-}"

# Retention periods (in days)
declare -A RETENTION
RETENTION[hourly]=1
RETENTION[daily]=30
RETENTION[weekly]=84     # 12 weeks
RETENTION[monthly]=365   # 12 months
RETENTION[pre-deploy]=7

# --- Functions ---------------------------------------------------------------

log_info()  { echo "[INFO]  $(date -u '+%Y-%m-%d %H:%M:%S') — $*"; }
log_warn()  { echo "[WARN]  $(date -u '+%Y-%m-%d %H:%M:%S') — $*" >&2; }
log_error() { echo "[ERROR] $(date -u '+%Y-%m-%d %H:%M:%S') — $*" >&2; }

validate_environment() {
    if [ -z "${PGPASSWORD:-}" ]; then
        log_error "PGPASSWORD environment variable is required"
        exit 1
    fi
    if [ -z "${S3_ENDPOINT:-}" ]; then
        log_error "S3_ENDPOINT environment variable is required (Hetzner Storage Box URL)"
        exit 1
    fi
    if [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        log_error "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required"
        exit 1
    fi
}

validate_backup_type() {
    local valid=false
    for t in hourly daily weekly monthly pre-deploy; do
        if [ "$BACKUP_TYPE" = "$t" ]; then
            valid=true
            break
        fi
    done
    if [ "$valid" = false ]; then
        log_error "Invalid backup type: '$BACKUP_TYPE'"
        log_error "Valid types: hourly, daily, weekly, monthly, pre-deploy"
        exit 1
    fi
}

create_local_dir() {
    mkdir -p "$LOCAL_DIR"
    log_info "Local backup directory: $LOCAL_DIR"
}

dump_database() {
    log_info "Dumping database $DB_DATABASE from $DB_HOST:$DB_PORT ..."

    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_DATABASE" \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        --verbose \
        2>/tmp/pgdump-$$.log \
        | gzip > "$LOCAL_PATH"

    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "pg_dump failed (exit code: $exit_code)"
        cat /tmp/pgdump-$$.log >&2
        rm -f "$LOCAL_PATH" /tmp/pgdump-$$.log
        exit $exit_code
    fi

    local size
    size=$(stat -f%z "$LOCAL_PATH" 2>/dev/null || stat -c%s "$LOCAL_PATH" 2>/dev/null)
    log_info "Backup created: $LOCAL_PATH ($((size / 1024 / 1024)) MB)"
    rm -f /tmp/pgdump-$$.log
}

verify_backup() {
    log_info "Verifying backup integrity..."

    # Test the gzip archive
    if ! gunzip -t "$LOCAL_PATH" 2>/dev/null; then
        log_error "Backup verification failed: corrupted gzip archive"
        rm -f "$LOCAL_PATH"
        exit 1
    fi

    # Verify it contains valid SQL by checking first few bytes
    local magic_bytes
    magic_bytes=$(head -c 3 "$LOCAL_PATH" | xxd -p 2>/dev/null || echo "1f8b")
    if [ "$magic_bytes" != "1f8b" ]; then
        log_error "Backup verification failed: not a valid gzip file (magic: $magic_bytes)"
        rm -f "$LOCAL_PATH"
        exit 1
    fi

    log_info "Backup integrity verified"
}

upload_to_storage_box() {
    log_info "Uploading to Hetzner Storage Box at $S3_PATH ..."

    local upload_start
    upload_start=$(date +%s)

    if ! aws s3 cp "$LOCAL_PATH" "$S3_PATH" \
        --endpoint-url "$S3_ENDPOINT" \
        --no-progress \
        --storage-class STANDARD; then
        log_error "S3 upload failed"
        exit 1
    fi

    local upload_end
    upload_end=$(date +%s)
    log_info "Upload complete (duration: $((upload_end - upload_start))s)"

    # Verify upload
    if ! aws s3 ls "$S3_PATH" --endpoint-url "$S3_ENDPOINT" >/dev/null 2>&1; then
        log_error "Upload verification failed: object not found at $S3_PATH"
        exit 1
    fi
    log_info "Upload verified"
}

cleanup_old_backups() {
    local retention_days="${RETENTION[$BACKUP_TYPE]:-30}"
    local cutoff_date
    cutoff_date=$(date -u -d "-${retention_days} days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || \
                  date -u -v-${retention_days}d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)

    log_info "Cleaning up ${BACKUP_TYPE} backups older than ${retention_days} days (before $cutoff_date)..."

    # List old backups from S3
    local old_backups
    old_backups=$(aws s3api list-objects-v2 \
        --bucket "fs-backups" \
        --prefix "${BACKUP_TYPE}/" \
        --endpoint-url "$S3_ENDPOINT" \
        --query "Contents[?LastModified<'${cutoff_date}'].Key" \
        --output text 2>/dev/null || true)

    if [ -n "$old_backups" ] && [ "$old_backups" != "None" ]; then
        local count=0
        for key in $old_backups; do
            if aws s3 rm "s3://fs-backups/${key}" --endpoint-url "$S3_ENDPOINT" >/dev/null 2>&1; then
                count=$((count + 1))
            fi
        done
        log_info "Removed $count old backups from Storage Box"
    else
        log_info "No old backups to clean up"
    fi

    # Cleanup local backups
    local local_count=0
    if [ -d "$LOCAL_DIR" ]; then
        find "$LOCAL_DIR" -name "*.sql.gz" -mtime "+${retention_days}" -delete 2>/dev/null || true
        local_count=$(find "$LOCAL_DIR" -name "*.sql.gz" -mtime "+${retention_days}" 2>/dev/null | wc -l)
        log_info "Cleaned up $local_count local backups"
    fi
}

report_backup() {
    local size
    size=$(stat -f%z "$LOCAL_PATH" 2>/dev/null || stat -c%s "$LOCAL_PATH" 2>/dev/null)

    cat <<EOF
╔═══════════════════════════════════════════════════════════════╗
║                    BACKUP COMPLETE                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Type:      ${BACKUP_TYPE}
║  Database:  ${DB_DATABASE} @ ${DB_HOST}:${DB_PORT}
║  Timestamp: ${TIMESTAMP}
║  Size:      $((size / 1024 / 1024)) MB
║  Local:     ${LOCAL_PATH}
║  Remote:    ${S3_PATH}
║  Retention: ${RETENTION[$BACKUP_TYPE]:-30} days
╚═══════════════════════════════════════════════════════════════╝
EOF
}

# --- Main --------------------------------------------------------------------

main() {
    log_info "Starting ${BACKUP_TYPE} backup..."

    validate_environment
    validate_backup_type
    create_local_dir
    dump_database
    verify_backup
    upload_to_storage_box
    cleanup_old_backups
    report_backup

    log_info "${BACKUP_TYPE} backup completed successfully"
}

main
