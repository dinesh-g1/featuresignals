---
description: "Disaster recovery procedures for FeatureSignals including backup, restore, and failover strategies."
---

# Disaster Recovery Runbook

## Recovery Objectives

| Metric | Target | Notes |
|--------|--------|-------|
| **RTO** (Recovery Time Objective) | < 30 min single region, < 2 hours full rebuild | Time from incident detection to service restoration |
| **RPO** (Recovery Point Objective) | < 24 hours (daily backup) | Maximum data loss window |
| **Status check interval** | 5 minutes | Background recorder in `main.go` |
| **Backup frequency** | Daily (3:00 UTC) + weekly (Sundays) | `pg-backup.sh` via cron |
| **Backup retention** | 7 daily + 4 weekly + 3 remote copies | Rotation in `pg-backup.sh`, remote in `pg-backup-replicate.sh` |

---

## Scenario 1: Single Region API Down

**Symptoms:** Health check fails for one region; other regions operational.

**Detection:** Status recorder logs `ERROR` level; `/v1/status/global` shows region as `down`.

### Steps

1. **SSH to the affected VPS:**
   ```bash
   ssh deploy@<VPS_HOST>
   ```

2. **Check service status:**
   ```bash
   cd /opt/featuresignals
   docker compose --project-directory . -f deploy/docker-compose.region.yml ps
   docker compose --project-directory . -f deploy/docker-compose.region.yml logs --tail=50 server
   ```

3. **If server container is crashing, check for bad deploy:**
   ```bash
   # View recent deploys
   cat /mnt/data/deploy-history.log | tail -5

   # Rollback to previous known-good commit
   ROLLBACK_COMMIT=<previous_sha> bash deploy/deploy-region.sh
   ```

4. **If database is the issue:**
   ```bash
   docker compose --project-directory . -f deploy/docker-compose.region.yml logs --tail=50 postgres
   docker compose --project-directory . -f deploy/docker-compose.region.yml restart postgres
   # Wait for server to reconnect (automatic via pgxpool)
   ```

5. **If VPS is unreachable:**
   - Check cloud provider dashboard (Hetzner/Utho)
   - Reboot VPS from cloud dashboard
   - If VPS is destroyed, proceed to Scenario 3

---

## Scenario 2: Database Corruption

**Symptoms:** Postgres errors in server logs; queries failing; data inconsistency.

### Steps

1. **Stop the API server to prevent further writes:**
   ```bash
   cd /opt/featuresignals
   DC="docker compose --project-directory . -f deploy/docker-compose.region.yml"
   $DC stop server dashboard
   ```

2. **Locate latest backup:**
   ```bash
   ls -lt /mnt/data/backups/daily/
   # If local backups are corrupted, check remote copies:
   ls -lt /mnt/data/backups/remote/
   ```

3. **Restore from backup:**
   ```bash
   # Stop postgres
   $DC stop postgres

   # Remove corrupted data
   sudo rm -rf /mnt/data/pgdata/*

   # Start fresh postgres
   $DC up -d postgres
   sleep 10

   # Restore backup
   gunzip -c /mnt/data/backups/daily/<latest>.sql.gz | \
     docker exec -i $($DC ps -q postgres) psql -U fs -d featuresignals

   # Re-run migrations (in case backup predates latest migrations)
   $DC up migrate
   ```

4. **Restart all services:**
   ```bash
   $DC up -d
   ```

5. **Verify data integrity:**
   ```bash
   docker exec $($DC ps -q postgres) psql -U fs -d featuresignals -c "
     SELECT 'organizations' AS table_name, count(*) FROM organizations
     UNION ALL SELECT 'users', count(*) FROM users
     UNION ALL SELECT 'projects', count(*) FROM projects
     UNION ALL SELECT 'flags', count(*) FROM flags;
   "
   ```

---

## Scenario 3: Full Region Rebuild

**Symptoms:** VPS destroyed or irrecoverable.

### Steps

1. **Provision new VPS:**
   - Hetzner (US/EU): Use Terraform in `deploy/terraform/hetzner/`
   - Utho (IN): Use provisioning script in `deploy/terraform/utho/`

2. **Initial server setup:**
   ```bash
   # Run the setup script (Docker, firewall, deploy user)
   bash deploy/terraform/hetzner/setup.sh  # or utho/setup-utho.sh
   ```

3. **Clone repository:**
   ```bash
   ssh deploy@<new_vps>
   git clone https://github.com/dinesh-g1/featuresignals.git /opt/featuresignals
   ```

4. **Restore database from remote backup:**
   ```bash
   # Copy backup from another region
   scp deploy@<other_region_vps>:/mnt/data/backups/remote/<latest>.sql.gz /mnt/data/backups/

   # Follow Scenario 2 restore steps
   ```

5. **Deploy via GitHub Actions:**
   - Run CD Regional workflow with dispatch, targeting only the rebuilt region
   - Or manually: `cd /opt/featuresignals && bash deploy/deploy-region.sh`

6. **Update DNS (if IP changed):**
   - Update A records for the region's domains
   - Update GitHub secrets with new VPS host IP

7. **Verify:**
   ```bash
   curl -sf https://<domain_api>/health
   curl -sf https://<domain_api>/v1/status
   ```

---

## Scenario 4: Global Outage (All Regions)

### Steps

1. **Identify root cause** — most likely a bad deploy pushed to all regions:
   ```bash
   # Check if same commit is deployed everywhere
   for host in $VPS_HOST_IN $VPS_HOST_US $VPS_HOST_EU; do
     ssh deploy@$host "cd /opt/featuresignals && git log -1 --format='%h %s'"
   done
   ```

2. **Rollback all regions via GitHub Actions:**
   - Dispatch CD Regional with `rollback_commit` set to last known-good SHA

3. **If GitHub Actions is unavailable:**
   ```bash
   for host in $VPS_HOST_IN $VPS_HOST_US $VPS_HOST_EU; do
     ssh deploy@$host "cd /opt/featuresignals && ROLLBACK_COMMIT=<sha> bash deploy/deploy-region.sh"
   done
   ```

---

## Backup Verification

Weekly automated verification runs via `deploy/pg-backup-verify.sh`:
- Restores latest backup into a temporary container
- Runs sanity queries on core tables
- Logs results to `/var/log/fs-backup-verify.log`

**Manual verification:**
```bash
bash /opt/featuresignals/deploy/pg-backup-verify.sh
```

---

## Monitoring & Alerting

| Signal | Source | Alert Level |
|--------|--------|-------------|
| API health check failure | `node-health.sh` | ERROR |
| Disk usage > 85% | `node-health.sh` | ERROR |
| Memory usage > 90% | `node-health.sh` | ERROR |
| Container not running | `node-health.sh` | ERROR |
| PG connections > 80% max | `node-health.sh` | ERROR |
| Remote region unreachable | Status recorder | WARN |
| Backup verification failure | `pg-backup-verify.sh` | ERROR |

All ERROR-level logs flow to SigNoz via OTEL and should trigger alerts.

---

## Cron Schedule (per VPS)

```
# Daily backup (3:00 UTC)
0 3 * * * /opt/featuresignals/deploy/pg-backup.sh >> /var/log/fs-backup.log 2>&1

# Daily backup replication (3:30 UTC)
30 3 * * * /opt/featuresignals/deploy/pg-backup-replicate.sh >> /var/log/fs-backup-replicate.log 2>&1

# Weekly backup verification (Sunday 6:00 UTC)
0 6 * * 0 /opt/featuresignals/deploy/pg-backup-verify.sh >> /var/log/fs-backup-verify.log 2>&1

# Weekly DB maintenance (Sunday 5:00 UTC)
0 5 * * 0 /opt/featuresignals/deploy/pg-maintenance.sh >> /var/log/fs-pg-maintenance.log 2>&1

# Weekly data cleanup (Sunday 4:00 UTC)
0 4 * * 0 /opt/featuresignals/deploy/cleanup-cron.sh >> /var/log/fs-cleanup.log 2>&1

# Per-minute health monitoring
* * * * * /opt/featuresignals/deploy/monitoring/node-health.sh 2>&1 | logger -t fs-health
```

---

## Escalation

| Severity | Response Time | Who |
|----------|---------------|-----|
| P1 — All regions down | 15 min | On-call engineer |
| P2 — Single region down | 30 min | On-call engineer |
| P3 — Degraded performance | 4 hours | Engineering team |
| P4 — Non-critical (monitoring gap) | Next business day | Engineering team |
