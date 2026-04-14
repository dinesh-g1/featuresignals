# FeatureSignals Operations Runbook

**For:** Engineering, Customer Success, Demo Team, Founders  
**Last Updated:** April 14, 2026  

---

## Quick Reference

| Operation | How | Who |
|-----------|-----|-----|
| Provision isolated VPS | GitHub Actions → "Provision Isolated Customer VPS" | Engineer, Founder |
| Decommission VPS | GitHub Actions → "Decommission Isolated Customer VPS" | Engineer, Founder |
| View logs | Ops Portal → Environment → Logs | All (read) |
| Access DB | Ops Portal → Environment → Database | Engineer, Founder |
| SSH to VPS | Ops Portal → Environment → SSH Access | Engineer, Founder |
| Toggle maintenance mode | Ops Portal → Environment → Toggle | Engineer, Founder |
| Override quota | Ops Portal → License → Override | Founder |
| Create sandbox | Ops Portal → Sandbox → Create | @featuresignals.com users |

---

## Runbook: Provision Isolated VPS for Customer

### Pre-requisites
- [ ] Customer has signed Enterprise Cloud contract
- [ ] Organization exists in the system
- [ ] Customer name is finalized (used in subdomain)
- [ ] Region is agreed with customer
- [ ] VPS type selected based on plan (cx22/cx32/cx42)

### Steps
1. **Open Operations Portal** → `ops.featuresignals.com`
2. **Navigate to** → Environments → Provision New
3. **Fill in the form:**
   - Customer Name: `acmecorp` (this becomes `acmecorp.featuresignals.com`)
   - Organization ID: (from CRM or customer detail page)
   - VPS Type: `cx32` (or as per plan)
   - Region: `fsn1` (EU) / `ash` (US) / `hel1` (EU backup)
   - Plan: `enterprise` / `growth` / `scale`
4. **Click "Provision"** — this triggers the GitHub Actions workflow
5. **Monitor progress** in GitHub Actions → "Provision Isolated Customer VPS"
6. **Wait for completion** (~15 minutes)
7. **Verify:**
   - [ ] URL `https://acmecorp.featuresignals.com` is accessible
   - [ ] Health check passes: `https://acmecorp.featuresignals.com/health`
   - [ ] Ops Portal shows status as "Active"
8. **Generate admin credentials** and send to customer (secure channel)
9. **Schedule onboarding call** with Customer Success

### Post-Provisioning Checklist
- [ ] Add customer to Slack support channel
- [ ] Create internal announcement in #customer-success
- [ ] Update CRM with environment details
- [ ] Set up monitoring alerts for this customer
- [ ] Schedule 30-day check-in

---

## Runbook: Decommission Customer VPS

### Pre-requisites
- [ ] Customer contract has ended / been cancelled
- [ ] Final invoice has been settled
- [ ] Customer has been notified of data retention period
- [ ] Approval from founder (double-confirm)

### Steps
1. **Open Operations Portal** → Environments → [Customer] → Decommission
2. **Enter reason:** "Contract ended" / "Customer requested" / "Non-payment"
3. **Double-confirm** the decommission action
4. **Monitor progress** in GitHub Actions → "Decommission Isolated Customer VPS"
5. **Verify completion:**
   - [ ] Backup uploaded to S3
   - [ ] VPS destroyed (check Hetzner console)
   - [ ] DNS record removed
   - [ ] Ops Portal shows status "Decommissioned"
   - [ ] License revoked

### Post-Decommissioning Checklist
- [ ] Notify Customer Success team
- [ ] Update CRM
- [ ] Cancel monitoring alerts
- [ ] Archive support tickets
- [ ] Send final invoice if pending
- [ ] Remove from active customer list

---

## Runbook: Debug Customer Environment Issue

### Scenario: Customer reports errors in their environment

### Steps
1. **Open Operations Portal** → Search for customer
2. **Check environment status:**
   - Status: Active / Maintenance / Suspended?
   - Last health check: When?
   - Recent errors in log viewer
3. **View logs:**
   - Ops Portal → Environment → Logs
   - Filter by time range around reported issue
   - Look for error patterns
4. **Check database (read-only):**
   - Ops Portal → Environment → Database Access
   - Run diagnostic queries:
     ```sql
     -- Recent errors
     SELECT COUNT(*) FROM audit_logs 
     WHERE created_at > NOW() - INTERVAL '1 hour' 
     AND action LIKE '%error%';
     
     -- Active API keys
     SELECT COUNT(*) FROM api_keys WHERE is_active = true;
     
     -- Recent evaluations
     SELECT COUNT(*) FROM usage_metrics 
     WHERE created_at > NOW() - INTERVAL '1 hour';
     ```
5. **If deeper debugging needed:**
   - Toggle "Debug Mode" (auto-expires in 4 hours)
   - Use SSH Access for terminal access
   - Run `docker compose logs -f` for container logs
6. **Document findings** in customer's support ticket
7. **Turn off debug mode** when done

### Common Issues & Fixes

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| 502 Bad Gateway | Caddy can't reach backend | `docker compose restart caddy` |
| High latency | Resource exhaustion | Check VPS CPU/memory in Hetzner console |
| DB connection errors | Connection pool exhausted | Restart server: `docker compose restart server` |
| TLS errors | Certificate expired | Caddy auto-renews; check logs |
| Flags not updating | Cache invalidation issue | Restart server, check LISTEN/NOTIFY |

---

## Runbook: Create Sandbox Environment (Internal)

### Eligibility
- Must have `@featuresignals.com` email
- Non-founders: max 2 active sandboxes
- Founders: unlimited
- Auto-expires after 30 days

### Steps
1. **Open Operations Portal** → Sandbox → Create New
2. **Fill in:**
   - Purpose: "Demo for prospect X" / "Testing feature Y"
   - Duration: 30 days (default)
3. **Click "Create Sandbox"**
4. **Wait for provisioning** (~5 minutes)
5. **Access sandbox** at `sandbox-{uuid}.featuresignals.com`

### Renew Sandbox
1. Ops Portal → Sandbox → [Your Sandbox] → Renew
2. Max 2 renewals (60 days total)
3. After max renewals, must decommission and create new

---

## Runbook: Handle Quota Breach

### Scenario: Customer has exceeded their evaluation/API call quota

### Steps
1. **Ops Portal alerts** show quota breach
2. **Check license details:**
   - Current usage vs. limit
   - Plan tier
   - Contract terms
3. **Decide action:**
   - **First breach:** Warn (notification to customer)
   - **Second breach:** Warn + offer upgrade
   - **Third+ breach:** Throttle (rate limit) or Block
4. **Apply action:**
   - Ops Portal → License → Override Quota
   - Or: Contact customer with upgrade offer
5. **Document** in customer record

---

## Runbook: Put Environment in Maintenance Mode

### When to use
- Database migrations
- Configuration changes
- Debugging production issues
- Planned maintenance

### Steps
1. **Ops Portal** → Environment → Toggle Maintenance Mode
2. **Enter reason:** "Database migration" / "Configuration update"
3. **Notify customer** (if applicable)
4. **Perform maintenance tasks**
5. **Verify services are healthy**
6. **Disable maintenance mode**
7. **Notify customer** that maintenance is complete

### What happens in maintenance mode
- Custom maintenance page served to users
- API returns 503 with retry-after header
- Admin access still works
- All actions are logged

---

## Emergency Contacts

| Role | Contact | When to Contact |
|------|---------|-----------------|
| Founder (You) | [phone/slack] | Critical incidents, quota overrides, pricing decisions |
| Founder (Shashi) | [phone/slack] | Same as above |
| Engineering | #engineering-slack | Bugs, outages, debugging |
| Customer Success | #customer-success-slack | Customer complaints, onboarding |

---

## Useful Commands

### Hetzner Cloud CLI
```bash
# List servers
hcloud server list

# Get server details
hcloud server describe <server-name>

# Console access (emergency)
hcloud server enable-rescue <server-name>
```

### Docker Compose (on customer VPS)
```bash
# SSH to VPS
ssh root@<vps-ip>

# Check status
cd /opt/featuresignals && docker compose ps

# View logs
docker compose logs -f server
docker compose logs -f dashboard
docker compose logs -f caddy
docker compose logs -f postgres

# Restart a service
docker compose restart server

# Full restart
docker compose down && docker compose up -d

# Update images
docker compose pull && docker compose up -d
```

### Database (read-only)
```bash
# Via SSH tunnel
ssh -L 5433:localhost:5432 root@<vps-ip>

# Connect locally
psql "postgres://fs_readonly:<password>@localhost:5433/featuresignals"

# Or via Ops Portal (recommended)
```

---

## Notes
- All operations are audited in `ops_audit_log`
- Never manually edit customer data
- Always use the Ops Portal for operations (not direct SSH)
- Debug mode auto-expires after 4 hours
- Sandboxes auto-decommission after expiry
