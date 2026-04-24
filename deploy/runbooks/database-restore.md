# Runbook: Database Restore (Partial/Point-in-Time)
Severity: P1 — High
Trigger: Accidental data deletion, data corruption, application bug causing data loss

## Impact
Partial data loss for affected customers. Service remains operational but
data is incorrect or missing. Estimated downtime: 15-30 minutes for restore.

## Pre-requisites
- Database access credentials (in 1Password)
- Backup access credentials (Storage Box — in 1Password)
- `kubectl` configured for the cluster
- `aws s3` CLI configured for Hetzner Storage Box endpoint
- `deploy/k8s/backup/scripts/restore.sh` script available

## Step-by-step

### Step 1: Assess the damage
```bash
# Determine what data was lost and when
# Check current table sizes and dead tuples
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals -c \
  "SELECT schemaname, tablename, n_live_tup, n_dead_tup, last_autovacuum
   FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   ORDER BY n_live_tup DESC;"

# Check for recent deletions (if audit table exists)
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals -c \
  "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;"

# Check application logs for errors
kubectl logs -n featuresignals-saas -l app.kubernetes.io/component=server --tail=100 | \
  grep -E "(error|ERROR|panic|PANIC|deleted|DELETED)" | tail -30
```

### Step 2: Stop writes to the database (if data corruption is ongoing)
```bash
# Scale down the API server to prevent further writes
kubectl scale deployment/featuresignals-server -n featuresignals-saas --replicas=0

# Wait for all server pods to terminate
kubectl wait --for=delete pod -l app.kubernetes.io/component=server -n featuresignals-saas --timeout=60s

# Verify no server pods are running
kubectl get pods -n featuresignals-saas
```

### Step 3: Choose the right backup
```bash
# List available backup types
echo "=== Daily backups ==="
aws s3 ls s3://fs-backups/daily/ --endpoint-url "$S3_ENDPOINT" | tail -10

echo "=== Hourly backups ==="
aws s3 ls s3://fs-backups/hourly/ --endpoint-url "$S3_ENDPOINT" | tail -10

echo "=== Pre-deploy backups ==="
aws s3 ls s3://fs-backups/pre-deploy/ --endpoint-url "$S3_ENDPOINT" | tail -5

# Select the backup just before the data loss event
# Format: featuresignals-<type>-<YYYYMMDD-HHMMSS>.sql.gz
# Example: featuresignals-daily-20240101-020000.sql.gz

LATEST_GOOD=$(aws s3 ls s3://fs-backups/daily/ --endpoint-url "$S3_ENDPOINT" | \
  sort | tail -1 | awk '{print $4}')
echo "Latest backup: $LATEST_GOOD"

# Set the backup URL
BACKUP_URL="s3://fs-backups/daily/${LATEST_GOOD}"
```

### Step 4: Take a forensic backup of the current state
```bash
# Before restoring, preserve the current (corrupted) state for investigation
FORENSIC_FILE="/tmp/forensic-$(date -u +%Y%m%d-%H%M%S).sql.gz"

kubectl exec deployment/postgresql -n featuresignals-system -- \
  pg_dump -U postgres -d featuresignals --no-owner --no-acl \
  | gzip > "$FORENSIC_FILE"

echo "Forensic backup saved to: $FORENSIC_FILE"
echo "Size: $(ls -lh "$FORENSIC_FILE" | awk '{print $5}')"
```

### Step 5A: Selective table restore (preferred — lower risk)
```bash
# If only specific tables are affected, restore just those tables

# Step 5A.1: Create a temporary restore database
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "CREATE DATABASE featuresignals_restore TEMPLATE template0;"

# Step 5A.2: Restore the full backup to temp database
aws s3 cp "$BACKUP_URL" - --endpoint-url "$S3_ENDPOINT" | \
  gunzip | kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals_restore

# Step 5A.3: Verify the restored data
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals_restore -c \
  "SELECT 'tenants' AS tbl, count(*) FROM tenants
   UNION ALL SELECT 'projects', count(*) FROM projects
   UNION ALL SELECT 'environments', count(*) FROM environments
   UNION ALL SELECT 'flags', count(*) FROM flags
   UNION ALL SELECT 'segments', count(*) FROM segments;"

# Step 5A.4: Dump only the affected table(s)
# Replace 'flags' with the actual affected table name
kubectl exec deployment/postgresql -n featuresignals-system -- \
  pg_dump -U postgres -d featuresignals_restore \
  --table=flags \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-acl \
  > /tmp/restored_flags.sql

# Step 5A.5: Review the data before importing
echo "=== First 10 rows of restored data ==="
head -20 /tmp/restored_flags.sql

echo "=== Row count ==="
grep -c "^INSERT" /tmp/restored_flags.sql

# Step 5A.6: Import into the live database
cat /tmp/restored_flags.sql | \
  kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals
```

### Step 5B: Full database restore (nuclear option — all data replaced)
```bash
# WARNING: This replaces ALL data in featuresignals with the backup data
# Only use if data corruption is widespread or selective restore is impossible

# Scale down the API
kubectl scale deployment/featuresignals-server -n featuresignals-saas --replicas=0

# Drop and recreate the database
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'featuresignals' AND pid <> pg_backend_pid();"

kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "DROP DATABASE featuresignals;"

kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "CREATE DATABASE featuresignals;"

# Restore from backup
aws s3 cp "$BACKUP_URL" - --endpoint-url "$S3_ENDPOINT" | \
  gunzip | kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals

# Re-run any pending migrations
kubectl delete job db-migrate -n featuresignals-saas --ignore-not-found
helm upgrade --install featuresignals deploy/k8s/helm/featuresignals/ \
  -n featuresignals-saas \
  -f deploy/k8s/env/production/values.yaml

# Wait for migration to complete
kubectl wait --for=condition=complete job/db-migrate -n featuresignals-saas --timeout=5m

# Scale the API back up
kubectl scale deployment/featuresignals-server -n featuresignals-saas --replicas=2
```

### Step 6: Verify the restore
```bash
# Check table row counts
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals -c \
  "SELECT 'tenants' AS tbl, count(*) FROM tenants
   UNION ALL SELECT 'projects', count(*) FROM projects
   UNION ALL SELECT 'environments', count(*) FROM environments
   UNION ALL SELECT 'flags', count(*) FROM flags
   UNION ALL SELECT 'segments', count(*) FROM segments;"

# Check API health
for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.featuresignals.com/health)
  if [ "$STATUS" = "200" ]; then
    echo "API healthy (attempt $i)"
    break
  fi
  echo "Waiting for API... (attempt $i, status: $STATUS)"
  sleep 5
done

# Check dashboard
curl -s -o /dev/null -w "Dashboard: %{http_code}\n" https://app.featuresignals.com

# Verify specific customer data (replace with actual customer ID)
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals -c \
  "SELECT id, name, tier, status FROM tenants LIMIT 10;"

# Verify flag evaluations work
# Create a test evaluation
curl -s -X POST https://api.featuresignals.com/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"flag_key": "test-flag", "entity_id": "test-user", "context": {}}' | jq '.'
```

### Step 7: Run verification script
```bash
# If the verify-backup script is available:
deploy/k8s/backup/scripts/verify-backup.sh "$BACKUP_URL"

# Manual verification:
# 1. Pick a known customer and check their data exists
# 2. Create a test flag via API
# 3. Evaluate the test flag
# 4. Check dashboard displays correct data
```

### Step 8: Post-restore actions
```bash
# Trigger a fresh full backup immediately
kubectl create job --from=cronjob/fs-backup-hourly manual-post-restore-hourly -n featuresignals-system
kubectl create job --from=cronjob/fs-backup-daily manual-post-restore-daily -n featuresignals-system

# Monitor the first backup completes
kubectl wait --for=condition=complete job/manual-post-restore-hourly -n featuresignals-system --timeout=10m

# Clean up temp database (if selective restore was used)
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'featuresignals_restore' AND pid <> pg_backend_pid();"
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "DROP DATABASE IF EXISTS featuresignals_restore;"
```

## Verification Checklist
- [ ] All database tables have expected row counts
- [ ] No orphaned records (foreign key violations)
- [ ] API health endpoint returns 200
- [ ] Test flag creation and evaluation works via API
- [ ] Dashboard loads and displays correct data
- [ ] All migrations are at the latest version
- [ ] A fresh backup has been triggered and completed
- [ ] Forensic backup of corrupted state is preserved for investigation

## Spot-check Customer Data
```bash
# Choose 3-5 customers and verify their complete data:
# Example customer IDs — replace with actual IDs
CUSTOMER_IDS=("cust_001" "cust_002" "cust_003")

for cid in "${CUSTOMER_IDS[@]}"; do
  echo ""
  echo "=== Customer: $cid ==="
  kubectl exec deployment/postgresql -n featuresignals-system -- \
    psql -U postgres -d featuresignals -t -A -c \
    "SELECT id, name, tier, status, created_at FROM tenants WHERE id = '$cid';"
  
  kubectl exec deployment/postgresql -n featuresignals-system -- \
    psql -U postgres -d featuresignals -t -A -c \
    "SELECT count(*) FROM projects p JOIN tenants t ON t.id = p.tenant_id WHERE t.id = '$cid';" \
    | xargs echo "Projects:"
done
```

## Rollback
If the restore makes things worse:

```bash
# Restore the forensic backup we took of the corrupted state
# (This reverts to the state just before we attempted the restore)
FORENSIC=$(ls -t /tmp/forensic-*.sql.gz | head -1)

kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'featuresignals' AND pid <> pg_backend_pid();"

kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "DROP DATABASE featuresignals;"

kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "CREATE DATABASE featuresignals;"

gunzip -c "$FORENSIC" | \
  kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals

echo "Reverted to forensic backup: $FORENSIC"
```

## Post-recovery
- Identify root cause of data loss (audit logs, application logs, git history)
- Add guardrails:
  - Soft-delete instead of hard-delete for critical entities
  - Confirmation prompts for destructive operations
  - Rate limiting on DELETE endpoints
  - Backup verification alerts
- Verify ALL backup frequencies are intact (hourly, daily, weekly, monthly)
- Run `verify-backup.sh --all` on all recent backups
- Update this runbook with any new lessons learned
- File a post-mortem within 48 hours