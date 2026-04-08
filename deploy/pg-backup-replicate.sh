#!/usr/bin/env bash
#
# Cross-region backup replication for FeatureSignals.
#
# Copies the latest daily backup to a remote region for disaster recovery.
# Supports both encrypted (.gpg) and plain (.gz) backup files.
# Rotation: IN -> US, US -> EU, EU -> IN (circular).
#
# Prerequisites:
#   - SSH key-based access between VPS instances (deploy user)
#   - REPLICATE_TARGET_HOST and REPLICATE_TARGET_USER env vars set
#
# Usage (daily cron, after pg-backup.sh):
#   30 3 * * * /opt/featuresignals/deploy/pg-backup-replicate.sh >> /var/log/fs-backup-replicate.log 2>&1
#
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/mnt/data/backups/daily}"
REMOTE_BACKUP_DIR="${REMOTE_BACKUP_DIR:-/mnt/data/backups/remote}"
REMOTE_KEEP="${REMOTE_KEEP:-3}"
TARGET_HOST="${REPLICATE_TARGET_HOST:-}"
TARGET_USER="${REPLICATE_TARGET_USER:-deploy}"
SSH_KEY="${REPLICATE_SSH_KEY:-/home/deploy/.ssh/id_ed25519}"
SSH_OPTS="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=30"

if [ -z "$TARGET_HOST" ]; then
  echo "[$(date)] SKIP: REPLICATE_TARGET_HOST not set — replication disabled"
  exit 0
fi

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz* 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
  echo "[$(date)] ERROR: No backup files found in $BACKUP_DIR"
  exit 1
fi

FILENAME=$(basename "$LATEST_BACKUP")
echo "[$(date)] Replicating $FILENAME to $TARGET_HOST..."

ssh -i "$SSH_KEY" $SSH_OPTS \
  "$TARGET_USER@$TARGET_HOST" "mkdir -p $REMOTE_BACKUP_DIR"

scp -i "$SSH_KEY" $SSH_OPTS \
  "$LATEST_BACKUP" "$TARGET_USER@$TARGET_HOST:$REMOTE_BACKUP_DIR/$FILENAME"

echo "[$(date)] Rotating old remote backups (keeping $REMOTE_KEEP)..."
ssh -i "$SSH_KEY" $SSH_OPTS "$TARGET_USER@$TARGET_HOST" \
  "ls -t $REMOTE_BACKUP_DIR/*.sql.gz* 2>/dev/null | tail -n +$((REMOTE_KEEP + 1)) | xargs -r rm -f"

echo "[$(date)] Replication complete: $FILENAME -> $TARGET_HOST:$REMOTE_BACKUP_DIR/"
