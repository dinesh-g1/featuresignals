# Runbook: Full VPS Recovery (The Worst Case)
Severity: P0 — Critical
Trigger: VPS unreachable, data inaccessible, Hetzner confirms hardware failure

## Impact
Complete service outage. All customers cannot evaluate flags or access dashboard.
Estimated downtime: 1-2 hours for full recovery from backups.

## Pre-requisites
- Hetzner API token (stored in 1Password)
- Backup access credentials (Storage Box — in 1Password)
- DNS API access (Cloudflare token in 1Password)
- This runbook (stored in repo AND 1Password)
- `hcloud` CLI installed on your machine
- `kubectl` and `helm` installed on your machine
- `aws s3` CLI with Storage Box configuration

## Step-by-step Recovery

### Step 1: Assess the damage
```bash
# Can we SSH in?
ssh deploy@<vps-ip>

# If no SSH, check Hetzner Cloud Console:
#   https://console.hetzner.cloud
# Is the VPS running? → Check status in dashboard
# Is the disk attached? → Check volume status
# Is there a snapshot? → Check if we have recent snapshots

# If SSH works but services are down:
kubectl get nodes
kubectl get pods --all-namespaces
kubectl get events --all-namespaces --sort-by='.lastTimestamp'
```

### Step 2: If VPS is dead (hardware failure, disk corruption, etc.)
```bash
# 2a. Note the VPS specs for replacement:
#     CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe), Ubuntu 24.04, fsn1 region

# 2b. Provision new VPS via Hetzner API
export HCLOUD_TOKEN="<from-1password>"
export VPS_NAME="featuresignals-prod-$(date +%s)"

hcloud server create \
  --name "$VPS_NAME" \
  --type cpx42 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key "<your-ssh-key-name>"

# 2c. Get the new IP
NEW_IP=$(hcloud server ip "$VPS_NAME")
echo "New VPS IP: $NEW_IP"

# 2d. Wait for SSH
echo "Waiting for VPS..."
while ! nc -z "$NEW_IP" 22 2>/dev/null; do
  sleep 5
  echo -n "."
done
echo " SSH ready!"
```

### Step 3: Install k3s and restore infrastructure
```bash
# 3a. SSH into new VPS and run bootstrap
ssh -o StrictHostKeyChecking=no "deploy@${NEW_IP}" \
  "curl -sfL https://raw.githubusercontent.com/featuresignals/featuresignals/main/deploy/k3s/bootstrap.sh | bash"

# 3b. Verify k3s is running
ssh "deploy@${NEW_IP}" "kubectl get nodes"

# 3c. Copy kubeconfig locally
ssh "deploy@${NEW_IP}" "cat /etc/rancher/k3s/k3s.yaml" > /tmp/k3s-config
sed -i "s/127.0.0.1/${NEW_IP}/g" /tmp/k3s-config
export KUBECONFIG=/tmp/k3s-config

# 3d. Verify cluster access
kubectl get nodes
```

### Step 4: Restore Helm releases
```bash
# 4a. Clone the repo (if not already local)
git clone https://github.com/featuresignals/featuresignals.git /opt/featuresignals
cd /opt/featuresignals

# 4b. Install PostgreSQL
helm upgrade --install postgresql bitnami/postgresql \
  --namespace featuresignals-system --create-namespace \
  --values deploy/k8s/infra/postgresql/values.yaml \
  --set postgresqlPassword="$(aws s3 get-secret ...)" \
  --wait --timeout 10m

# 4c. Deploy the application
helm upgrade --install featuresignals deploy/k8s/helm/featuresignals/ \
  --namespace featuresignals-saas --create-namespace \
  --values deploy/k8s/env/production/values.yaml \
  --set secrets.databaseUrl="postgres://postgres:${DB_PASSWORD}@postgresql.featuresignals-system:5432/featuresignals?sslmode=disable" \
  --wait --timeout 10m

# 4d. Run database migrations
kubectl wait --for=condition=complete job/db-migrate -n featuresignals-saas --timeout=5m
```

### Step 5: Restore database from backup
```bash
# 5a. List available backups
aws s3 ls s3://fs-backups/daily/ --endpoint-url "$S3_ENDPOINT"

# 5b. Choose the latest daily backup
LATEST=$(aws s3 ls s3://fs-backups/daily/ --endpoint-url "$S3_ENDPOINT" | \
  sort | tail -1 | awk '{print $4}')
echo "Restoring from: $LATEST"

# 5c. Download and restore directly into the running PostgreSQL
aws s3 cp "s3://fs-backups/daily/${LATEST}" - --endpoint-url "$S3_ENDPOINT" | \
  gunzip | kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals

# 5d. Verify data
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### Step 6: Update DNS
```bash
# 6a. Update Cloudflare DNS records to point to the new IP
# Using Cloudflare API:
ZONE_ID="<your-cloudflare-zone-id>"
API_TOKEN="<cloudflare-api-token>"

# Get DNS record IDs for api and app
for RECORD_NAME in "api" "app"; do
  RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${RECORD_NAME}.featuresignals.com" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" | jq -r '.result[0].id')
  
  curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"${NEW_IP}\"}" | jq '.success'
done

# 6b. Verify DNS propagation
dig +short api.featuresignals.com
# Expected: $NEW_IP

dig +short app.featuresignals.com
# Expected: $NEW_IP
```

### Step 7: Verify recovery
```bash
# 7a. Health checks
curl -s -o /dev/null -w "%{http_code}" https://api.featuresignals.com/health
# Expected: 200

# 7b. Dashboard loads
curl -s -o /dev/null -w "%{http_code}" https://app.featuresignals.com
# Expected: 200

# 7c. Check TLS certificates
curl -sI https://api.featuresignals.com | grep -i "certificate"
curl -sI https://app.featuresignals.com | grep -i "certificate"

# 7d. Run smoke tests
dagger call smoke-test --url=https://api.featuresignals.com

# 7e. Check certificate renewal
kubectl get certificates -A
kubectl describe certificate featuresignals-tls -n featuresignals-saas
```

### Step 8: Post-recovery
```bash
# 8a. Trigger a fresh full backup immediately
kubectl create job --from=cronjob/fs-backup-daily manual-post-recovery -n featuresignals-system

# 8b. Delete old VPS (after confirming everything works)
# Wait at least 1 hour before deleting
hcloud server delete "$OLD_VPS_NAME"

# 8c. Remove old VPS SSH key from known_hosts
ssh-keygen -R "$OLD_VPS_IP"

# 8d. Update any monitoring/alerting with new IP
```

## Verification Checklist
- [ ] `kubectl get nodes` shows Ready
- [ ] `kubectl get pods -n featuresignals-saas` shows all pods Running
- [ ] `curl https://api.featuresignals.com/health` returns 200
- [ ] `curl -I https://app.featuresignals.com` returns 200
- [ ] TLS certificate is valid: `curl -vI https://api.featuresignals.com 2>&1 | grep "SSL certificate verify"`
- [ ] Database has data: `kubectl exec deployment/postgresql -n featuresignals-system -- psql -U postgres -d featuresignals -c "SELECT count(*) FROM tenants;"`
- [ ] Backups working: `kubectl get cronjob -n featuresignals-system`

## Rollback
If the new VPS also fails:
1. Try a different region (e.g., `hel1` Helsinki instead of `fsn1` Falkenstein)
2. Try a different Hetzner server type (e.g., CCX32 instead of CPX42)
3. As last resort: provision on a different cloud provider and restore backup there

## Post-recovery
- Notify affected customers if downtime > 5 minutes
- File a blameless post-mortem within 48 hours
- Update this runbook with any lessons learned
- Consider adding multi-region failover if this happens again
````

```markdown
# Runbook: Database Restore (Partial/Point-in-Time)
Severity: P1 — High
Trigger: Accidental data deletion, data corruption, application bug caused data loss

## Impact
Partial data loss for affected customers. Service remains operational but
data is incorrect or missing. Estimated downtime: 15-30 minutes for restore.

## Pre-requisites
- Database access credentials (in 1Password)
- Backup access credentials (Storage Box — in 1Password)
- `kubectl` configured for the cluster
- `aws s3` CLI configured for Storage Box

## Step-by-step

### Step 1: Assess the damage
```bash
# Determine what data was lost and when
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals -c \
  "SELECT tablename, n_live_tup, n_dead_tup, last_autovacuum
   FROM pg_stat_user_tables
   ORDER BY n_dead_tup DESC;"

# Check recent audit log (if available)
curl -s https://api.featuresignals.com/v1/audit?limit=50 | jq '.'
```

### Step 2: Choose the right backup
```bash
# Check available backups
aws s3 ls s3://fs-backups/pre-deploy/ --endpoint-url "$S3_ENDPOINT"
aws s3 ls s3://fs-backups/daily/ --endpoint-url "$S3_ENDPOINT"
aws s3 ls s3://fs-backups/hourly/ --endpoint-url "$S3_ENDPOINT"

# Choose the backup closest to but before the data loss event
# For pre-deploy backups (if the data loss was from a bad deploy):
LATEST_PRE=$(aws s3 ls s3://fs-backups/pre-deploy/ --endpoint-url "$S3_ENDPOINT" | \
  sort | tail -1 | awk '{print $4}')
```

### Step 3: Restore to a temporary database
```bash
# Create a temporary database
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "CREATE DATABASE featuresignals_restore;"

# Restore the backup to temp database
aws s3 cp "s3://fs-backups/daily/${LATEST_PRE}" - --endpoint-url "$S3_ENDPOINT" | \
  gunzip | kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals_restore

# Verify the restored data
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals_restore -c \
  "SELECT count(*) FROM tenants;"
```

### Step 4: Extract specific data (if only partial restore needed)
```bash
# Dump only the affected table(s) from the restored database
kubectl exec deployment/postgresql -n featuresignals-system -- \
  pg_dump -U postgres -d featuresignals_restore \
  --table=flags \
  --data-only \
  --column-inserts \
  > /tmp/restored_flags.sql

# Preview the data before importing
head -50 /tmp/restored_flags.sql

# Import the specific table into live database
cat /tmp/restored_flags.sql | \
  kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals
```

### Step 5: Full database restore (if needed)
```bash
# If partial restore is not possible, do a full restore
# WARNING: This will replace ALL data in the featuresignals database

# First, take a backup of the current (corrupted) state
kubectl exec deployment/postgresql -n featuresignals-system -- \
  pg_dump -U postgres -d featuresignals | gzip > /tmp/corrupted-state-$(date +%Y%m%d).sql.gz

# Restore from backup
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "DROP DATABASE featuresignals;"
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "CREATE DATABASE featuresignals;"

aws s3 cp "s3://fs-backups/daily/${LATEST_PRE}" - --endpoint-url "$S3_ENDPOINT" | \
  gunzip | kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals

# Re-run any missed migrations
kubectl delete job db-migrate -n featuresignals-saas
kubectl create job --from=cronjob/db-migrate db-migrate-manual -n featuresignals-saas
```

### Step 6: Verify
```bash
# Check data consistency
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals -c \
  "SELECT count(*) FROM tenants;
   SELECT count(*) FROM projects;
   SELECT count(*) FROM environments;
   SELECT count(*) FROM flags;
   SELECT count(*) FROM segments;"

# Verify API health
curl -s https://api.featuresignals.com/health

# Run application smoke test
# Create a test flag and verify it evaluates correctly
```

## Verification Checklist
- [ ] Database tables have expected row counts
- [ ] API health endpoint returns 200
- [ ] Test flag evaluation works
- [ ] Dashboard loads and shows correct data
- [ ] All migrations have been re-run
- [ ] A fresh backup has been triggered

## Rollback
If the restore makes things worse:
```bash
# Restore the backup we took of the corrupted state
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "DROP DATABASE featuresignals;"
kubectl exec deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -c "CREATE DATABASE featuresignals;"
gunzip -c /tmp/corrupted-state-$(date +%Y%m%d).sql.gz | \
  kubectl exec -i deployment/postgresql -n featuresignals-system -- \
  psql -U postgres -d featuresignals
```

## Post-recovery
- Identify root cause of data loss
- Add guardrails to prevent recurrence (soft delete, confirmation prompts, etc.)
- Verify backup integrity — run verify-backup.sh on all recent backups
- Update runbook with any new lessons
```

```markdown
# Runbook: Certificate Renewal Issues
Severity: P2 — Medium
Trigger: TLS certificate expiring, cert-manager renewal failure, domain validation failure

## Impact
Browsers will show security warnings for api.featuresignals.com and app.featuresignals.com.
API calls may fail if clients enforce strict TLS. Estimated fix time: 5-15 minutes.

## Pre-requisites
- `kubectl` configured for the cluster
- Cloudflare API token (for DNS validation, if needed)

## Step-by-step

### Step 1: Check certificate status
```bash
# Check all certificates
kubectl get certificates -A

# Check certificate details
kubectl describe certificate -n featuresignals-saas

# Check cert-manager logs
kubectl logs -n cert-manager -l app.kubernetes.io/instance=cert-manager --tail=50

# Check certificate expiry dates
kubectl get certificates -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} — Expires: {.status.notAfter}{"\n"}{end}'
```

### Step 2: Force renewal
```bash
# Delete the certificate to force re-issuance
kubectl delete certificate -n featuresignals-saas --all
# cert-manager will automatically re-create it via the Ingress annotations

# Or, manually trigger renewal by deleting the secret
kubectl delete secret -n featuresignals-saas -l controller.cert-manager.io/fao=true

# Check the renewal progress
kubectl get certificaterequests -A
kubectl get orders -A
kubectl get challenges -A
```

### Step 3: Debug common issues
```bash
# Issue: HTTP-01 challenge fails
# Check if Caddy ingress is properly routing /.well-known/acme-challenge/
kubectl describe challenges -A

# Issue: Rate limiting (Let's Encrypt)
# Check if you've hit Let's Encrypt rate limits
# Solution: Use the staging issuer for testing

# Issue: DNS not propagating
# Verify DNS records point to the correct IP
dig +short api.featuresignals.com
# The IP must match the Caddy ingress LoadBalancer IP

# Issue: cert-manager pod issues
kubectl get pods -n cert-manager
kubectl logs -n cert-manager -l app.kubernetes.io/instance=cert-manager --tail=100
```

### Step 4: Manual certificate issuance (if automated renewal fails)
```bash
# Create a manual certificate request
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: featuresignals-tls-manual
  namespace: featuresignals-saas
spec:
  secretName: featuresignals-tls-manual
  duration: 2160h  # 90 days
  renewBefore: 720h  # 30 days before expiry
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.featuresignals.com
  - app.featuresignals.com
EOF

# Monitor the issuance
kubectl describe certificate featuresignals-tls-manual -n featuresignals-saas
kubectl get secret featuresignals-tls-manual -n featuresignals-saas
```

### Step 5: Verify renewal
```bash
# Check certificate is valid
echo | openssl s_client -connect api.featuresignals.com:443 -servername api.featuresignals.com 2>/dev/null | \
  openssl x509 -noout -dates

# Check the full chain
echo | openssl s_client -connect api.featuresignals.com:443 -servername api.featuresignals.com 2>/dev/null | \
  openssl x509 -noout -text | grep -A2 "Subject:"

# Verify the Ingress is using the new certificate
kubectl describe ingress -n featuresignals-saas
```

## Verification Checklist
- [ ] Certificate shows valid dates: `openssl s_client -connect api.featuresignals.com:443`
- [ ] No errors in cert-manager logs
- [ ] Certificate resource shows Ready=True
- [ ] All ingresses reference the correct secret
- [ ] Auto-renewal is configured (check Certificate renewBefore)

## Rollback
If manual certificate creation causes issues:
```bash
# Delete the manual certificate
kubectl delete certificate featuresignals-tls-manual -n featuresignals-saas
kubectl delete secret featuresignals-tls-manual -n featuresignals-saas

# Restore automatic renewal by ensuring Ingress annotations are correct
kubectl annotate ingress featuresignals -n featuresignals-saas \
  cert-manager.io/cluster-issuer=letsencrypt-prod --overwrite
```

## Post-recovery
- Alert if auto-renewal fails again (check cert-manager alert rules in SigNoz)
- Consider adding a CronJob to check certificate expiry weekly
- If Let's Encrypt rate limits are an issue, request rate limit increase
- Update monitoring to alert 14 days before expiry (not 7)
```

```markdown
# Runbook: Pod Crash Loop / Application Failure
Severity: P1-P2 — High to Medium
Trigger: Pods crashing, restarting, or failing readiness probes

## Impact
Partial or complete service degradation depending on which pod is affected.
Server pods have 2 replicas (HA), dashboard has 1 (single point of failure).

## Pre-requisites
- `kubectl` configured for the cluster
- `stern` or `kubectl logs` for log viewing

## Step-by-step

### Step 1: Identify the failing pod
```bash
# Check pod status
kubectl get pods -n featuresignals-saas

# Check pod events
kubectl describe pod -n featuresignals-saas -l app.kubernetes.io/component=server
kubectl describe pod -n featuresignals-saas -l app.kubernetes.io/component=dashboard

# Check recent events
kubectl get events -n featuresignals-saas --sort-by='.lastTimestamp' | tail -20
```

### Step 2: Get logs from the failing pod
```bash
# Tail logs from the latest pod
POD=$(kubectl get pods -n featuresignals-saas -l app.kubernetes.io/component=server -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n featuresignals-saas "$POD" --tail=100 --previous  # Get logs from crashed instance
kubectl logs -n featuresignals-saas "$POD" --tail=100              # Get current logs

# Use stern for multi-pod streaming
stern -n featuresignals-saas server
```

### Step 3: Common crash causes and fixes
```bash
# Cause: Database connection failure
# Fix: Check PostgreSQL is running and credentials are correct
kubectl get pods -n featuresignals-system
kubectl exec deployment/postgresql -n featuresignals-system -- pg_isready

# Cause: OOMKilled (out of memory)
# Fix: Increase memory limits
kubectl describe pod -n featuresignals-saas "$POD" | grep -A5 "State:"
# Then update values.yaml and helm upgrade

# Cause: Image pull failure
# Fix: Check image exists and credentials are valid
kubectl describe pod -n featuresignals-saas "$POD" | grep "Failed to pull image"
# Then: kubectl delete pod ... (triggers re-pull)

# Cause: Configuration error
# Fix: Check environment variables and secrets
kubectl exec -n featuresignals-saas "$POD" -- env | sort
kubectl get secret -n featuresignals-saas db-credentials -o jsonpath='{.data}'

# Cause: Liveness probe failure
# Fix: Check if the probe endpoint is working, adjust probe parameters
kubectl describe pod -n featuresignals-saas "$POD" | grep -A15 "Liveness"
```

### Step 4: Rollback (if caused by recent deploy)
```bash
# Check deploy history
helm history featuresignals -n featuresignals-saas

# Rollback to previous revision
helm rollback featuresignals -n featuresignals-saas <revision>

# Monitor after rollback
kubectl rollout status deployment/featuresignals-server -n featuresignals-saas --watch
```

### Step 5: Force restart (if pod is stuck)
```bash
# Delete the pod to force recreation
kubectl delete pod -n featuresignals-saas "$POD" --grace-period=30

# Or scale down and up
kubectl scale deployment/featuresignals-server -n featuresignals-saas --replicas=0
sleep 5
kubectl scale deployment/featuresignals-server -n featuresignals-saas --replicas=2

# For dashboard (single replica):
kubectl rollout restart deployment/featuresignals-dashboard -n featuresignals-saas
```

## Verification Checklist
- [ ] All pods show Running and ready (2/2 or 1/1)
- [ ] Readiness probes pass
- [ ] API health check returns 200
- [ ] Dashboard loads
- [ ] No recent OOMKilled or CrashLoopBackOff events
- [ ] Disk space is adequate: `kubectl exec ... df -h`

## Rollback
If a helm rollback fails:
```bash
# Manual deploy from known-good state
git checkout <last-known-good-tag>
helm upgrade --install featuresignals deploy/k8s/helm/featuresignals/ \
  -n featuresignals-saas \
  -f deploy/k8s/env/production/values.yaml \
  --set server.image.tag=<last-known-good-version>
```

## Post-recovery
- Extract crash root cause from logs
- Add or improve monitoring alerts
- If OOM: adjust resource limits with 20% headroom
- If config: add config validation in CI/CD
````
