---
title: Incident Runbook
sidebar_position: 1
description: "Incident response runbook for FeatureSignals self-hosted deployments with diagnostic commands."
---

Internal SRE/ops reference for multi-region SaaS: **US** (Hetzner Ashburn), **EU** (Hetzner Falkenstein), **India** (Utho Mumbai). Stack: Docker Compose, PostgreSQL 16, Caddy 2, OpenTelemetry → SigNoz.

Assume deploy root and compose file (adjust if your layout differs):

```bash
export FS_DEPLOY=/opt/featuresignals
export COMPOSE="docker compose -f $FS_DEPLOY/deploy/docker-compose.region.yml"
cd "$FS_DEPLOY"
```

## 1. Severity levels

| Level | Definition | Examples | Response target |
|-------|------------|----------|-----------------|
| **P1** | Full outage or data loss risk | All regions or single region completely unreachable; auth broken for all; DB unavailable | Immediate page; war room |
| **P2** | Major degradation | One product surface down (API or app); eval errors elevated; partial region impact | Within 15 min acknowledgement |
| **P3** | Minor / limited | Elevated errors for subset; non-critical feature broken; perf slip below SLO | Next business hours queue |
| **P4** | Cosmetic / internal | UI glitches; docs typo; non-customer-impacting bugs | Backlog |

Escalate severity when customer impact or blast radius grows.

## 2. First response checklist

**SSH into the affected region’s host** (Hetzner Cloud / Utho console → server IP).

```bash
ssh -i ~/.ssh/fs_ops deploy@<REGION_SERVER_IP>
cd /opt/featuresignals
```

**Container health**

```bash
docker compose -f deploy/docker-compose.region.yml ps -a
docker compose -f deploy/docker-compose.region.yml top
```

**Recent logs (API, proxy, DB)**

```bash
docker compose -f deploy/docker-compose.region.yml logs --tail=200 server
docker compose -f deploy/docker-compose.region.yml logs --tail=200 caddy
docker compose -f deploy/docker-compose.region.yml logs --tail=100 postgres
```

**API health (from host, via container network)**

```bash
docker compose -f deploy/docker-compose.region.yml exec -T server wget -qO- http://127.0.0.1:8080/health || true
curl -sfS https://"$DOMAIN_API"/health   # after exporting DOMAIN_API from .env
```

**Database connectivity**

```bash
set -a && source .env && set +a
docker compose -f deploy/docker-compose.region.yml exec -T postgres \
  psql -U fs -d featuresignals -c "SELECT 1 AS ok, now() AS ts;"
```

**SigNoz**

1. Open your SigNoz instance (e.g. cloud or self-hosted UI).
2. **Services** → `featuresignals-api` (or `OTEL_SERVICE_NAME` from `.env`).
3. Filter **region** = `us` / `eu` / `in` (`OTEL_SERVICE_REGION`).
4. Check error rate, p99 latency, trace waterfall for 5xx spikes.
5. **Logs** (if enabled) correlated by `trace_id` / `request_id`.

**Quick external checks**

```bash
curl -sI "https://$DOMAIN_API/health"
curl -sI "https://$DOMAIN_APP/"
```

## 3. Region down

**Symptoms:** Health checks fail for one region only; DNS/geo still points users at that POP.

**Confirm scope**

```bash
# On the bad host
$COMPOSE ps
$COMPOSE logs --tail=100 caddy server postgres
```

**Mitigate single region**

1. **DNS / traffic steering:** At your DNS or CDN (e.g. geo records or health-checked failover), point the failing region’s hostnames to a healthy region’s edge **only if** that region can legally and technically serve those users (latency, data residency, org `data_region` — see product policy). Otherwise keep DNS as-is and restore the region.
2. **Temporary redirect (example):** Lower TTL on affected names (e.g. `api.eu.…`) ahead of changes; swap A/AAAA to a standby IP or to US edge if approved.
3. **GeoDNS failover:** With Cloudflare Load Balancing, unhealthy regions are automatically steered away from via health checks. No server-side configuration change is needed — Cloudflare handles failover at the DNS layer.

**Bring region back**

```bash
cd "$FS_DEPLOY"
$COMPOSE pull   # if using pinned images
$COMPOSE up -d --force-recreate caddy server dashboard postgres
```

**Post-incident:** Document RTO/RPO for the region; verify backups and runbook times.

## 4. Database issues

**Connection pool exhausted / “too many clients”**

```bash
docker compose -f deploy/docker-compose.region.yml exec -T postgres \
  psql -U fs -d featuresignals -c "SELECT count(*) FROM pg_stat_activity;"
docker compose -f deploy/docker-compose.region.yml exec -T postgres \
  psql -U fs -d featuresignals -c "SELECT state, wait_event_type, wait_event, count(*) FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY 4 DESC;"
```

Mitigation: restart `server` containers to drop leaked pools (causes brief disconnects); scale API replicas only if architecture supports it; raise `max_connections` only with sizing review; fix stuck transactions.

**Slow queries**

```bash
docker compose -f deploy/docker-compose.region.yml exec -T postgres \
  psql -U fs -d featuresignals -c "SELECT pid, now() - query_start AS dur, state, left(query,120) FROM pg_stat_activity WHERE state <> 'idle' ORDER BY dur DESC LIMIT 20;"
```

Enable `pg_stat_statements` if not already; correlate with SigNoz DB client spans.

**Replication lag** (if using streaming replica)

```bash
docker compose -f deploy/docker-compose.region.yml exec -T postgres \
  psql -U fs -d featuresignals -c "SELECT pg_is_in_recovery(), pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"
```

Mitigation: network/disk on replica; pause heavy writes; fail over only via approved procedure.

**Disk full**

```bash
df -h
docker system df
docker compose -f deploy/docker-compose.region.yml exec -T postgres df -h /var/lib/postgresql/data
```

Mitigation: prune old images/logs **after** confirming space; expand volume per provider; `VACUUM` / archive WAL per playbook — avoid deleting `pgdata` files manually.

**Restore from backup**

1. Stop writers: `$COMPOSE stop server dashboard` (or full stack).
2. Restore provider-specific snapshot or `pg_dump`/`pg_restore` into `pgdata` volume per your backup tool’s docs.
3. Run migrations if needed: `$COMPOSE run --rm migrate` (verify image/command matches prod).
4. Start stack: `$COMPOSE up -d`; verify `/health` and SigNoz.

## 5. High API latency

1. **SigNoz traces:** Service → latency graph → slow traces → span breakdown (HTTP handler vs DB).
2. **Database:** Run slow-query SQL from §4; check CPU/iowait on DB host.
3. **Eval cache:** In logs, look for cache miss storms or LISTEN/notify issues; restart `server` if cache corruption suspected (last resort).
4. **Pool wait:** Application metrics / logs for acquisition timeouts; align pool size with Postgres `max_connections`.
5. **Caddy / TLS:** `$COMPOSE logs caddy` for upstream timeouts or TLS handshake delays.

```bash
docker stats --no-stream
$COMPOSE logs --tail=300 server | grep -Ei "error|slow|timeout|pool"
```

## 6. Certificate expiry (Caddy)

Caddy auto-renews via ACME. If renewal fails:

```bash
$COMPOSE logs --tail=200 caddy | grep -Ei "acme|certificate|tls|error"
$COMPOSE exec caddy caddy list-modules
```

**Manual renew / reload**

```bash
$COMPOSE exec caddy caddy reload --config /etc/caddy/Caddyfile
# If file was edited on host, ensure volume mount is correct then:
$COMPOSE restart caddy
```

**DNS / HTTP-01:** Verify `_acme-challenge` or TLS-ALPN reachability; ports 80/443 open; no stale firewall. **Rate limits:** stagger restarts across regions.

## 7. Deployment rollback (Docker Compose)

**Git-based (typical for image `build:` compose)**

```bash
cd "$FS_DEPLOY"
git fetch origin
git log --oneline -10
git checkout <GOOD_COMMIT_SHA>
docker compose -f deploy/docker-compose.region.yml build --parallel
docker compose -f deploy/docker-compose.region.yml rm -fsv website-build docs-build migrate 2>/dev/null || true
docker volume rm -f featuresignals_website-dist featuresignals_docs-dist 2>/dev/null || true
docker compose -f deploy/docker-compose.region.yml up -d
docker compose -f deploy/docker-compose.region.yml ps
```

**Tagged images (if you use `image:` + registry)**

```bash
# Edit .env or override on CLI to previous tag, then:
docker compose -f deploy/docker-compose.region.yml pull server dashboard
docker compose -f deploy/docker-compose.region.yml up -d server dashboard
```

Verify health, SigNoz error rate, and Flag Engine/API smoke tests before closing incident.

## 8. Security incident

**Contain**

- Rotate compromised credentials first; block attacker IPs at firewall/CDN if applicable.
- Preserve logs: copy relevant `docker compose logs` output and SigNoz exports to secure storage.

**Key rotation**

| Secret | Action |
|--------|--------|
| **JWT_SECRET** | Generate new secret; update `.env`; restart `server`; **all sessions invalidated** — notify customers if needed. |
| **API keys** | In app DB: revoke/rotate per org in admin tooling or SQL (hashed keys only in DB); customers re-issue keys. |
| **POSTGRES_PASSWORD** | Change in Postgres + `.env`; update `DATABASE_URL` references; restart `postgres` (planned window) and `server`. |
| **OTEL / third-party** | Rotate `OTEL_INGESTION_KEY` in `.env`; restart `server`. |

```bash
openssl rand -base64 48   # JWT_SECRET candidate
$COMPOSE up -d --force-recreate server
```

**Aftermath:** Postmortem, customer notice per legal/comms, audit log review, dependency patch deploy.

## 9. Scaling

**Vertical (Hetzner / Utho)**

1. Snapshot/backup instance.
2. Resize CPU/RAM/disk in provider console (disk expansion procedure per vendor).
3. Reboot if required; confirm `docker` starts, `$COMPOSE ps`, Postgres data mount intact.
4. Tune Postgres `shared_buffers` / `work_mem` and Go `DATABASE_URL` pool sizes to match new RAM.

**Horizontal**

- Each region’s compose file is a single-node stack; adding second API node requires shared state (same DB, cache invalidation via existing LISTEN/NOTIFY), load balancer in front of multiple `server` containers or hosts, and sticky sessions **not** required for REST if stateless.
- Do not run two writable Postgres primaries against the same data directory; use managed HA or Patroni if you need multi-node DB.

## 10. Communication template (status page)

Use until replaced by your status vendor’s workflow.

```text
Title: [Investigating | Identified | Monitoring | Resolved] – Short customer-visible symptom

Status: [Major outage | Degraded performance | Partial service]

What happened:
We are investigating reports of <symptom> affecting <API / Flag Engine / evaluations / region>.

Impact:
Customers may experience <specific impact>. Data integrity is <not known / not impacted / under review>.

What we are doing:
Our team is actively working on this incident. We will update this page every <15> minutes or when status changes.

Workaround (if any):
<None / use region X / retry after Y>

Updated: <ISO 8601 UTC>
```

---

**Reference:** Deploy script `deploy/deploy-region.sh`; compose `deploy/docker-compose.region.yml`; Caddy `deploy/Caddyfile.region`.
