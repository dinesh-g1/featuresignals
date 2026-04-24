# FeatureSignals — Observability Setup Runbook

> **Last Updated:** 2026-01-15
> **Applies To:** SigNoz observability stack on k3s (Hetzner CPX42)
> **Prerequisites:** k3s cluster, Helm, SigNoz deployed (see `deploy/k8s/infra/signoz/install.sh`)

## Table of Contents

1. [Accessing the SigNoz Dashboard](#1-accessing-the-signoz-dashboard)
2. [First-Time Setup & Configuration](#2-first-time-setup--configuration)
3. [Configuring Dashboards](#3-configuring-dashboards)
4. [Setting Up Alerts](#4-setting-up-alerts)
5. [Verifying OTLP Data Flow](#5-verifying-otlp-data-flow)
6. [Instrumenting the FeatureSignals API](#6-instrumenting-the-featuresignals-api)
7. [Troubleshooting Common Issues](#7-troubleshooting-common-issues)
8. [Maintenance Tasks](#8-maintenance-tasks)
9. [Reference: SigNoz Architecture](#9-reference-signoz-architecture)
10. [Emergency Procedures](#10-emergency-procedures)

---

## 1. Accessing the SigNoz Dashboard

### 1.1 Port-Forward (Development / Quick Access)

The quickest way to access SigNoz is via port-forwarding. This is the default for MVP since we haven't configured an Ingress for observability.

```bash
# Port-forward the SigNoz frontend service
kubectl port-forward -n signoz svc/signoz-frontend 3301:3301

# Open in browser: http://localhost:3301
```

**Default credentials:**
- **Email:** `admin@featuresignals.com`
- **Password:** (set during first login — check the install script output)

### 1.2 Ingress (Production)

For production access, uncomment the Ingress configuration in `deploy/k8s/infra/signoz/values.yaml` and upgrade:

```yaml
# In deploy/k8s/infra/signoz/values.yaml:
frontend:
  ingress:
    enabled: true
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
      kubernetes.io/ingress.class: caddy
    hosts:
      - host: observability.featuresignals.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - hosts:
          - observability.featuresignals.com
        secretName: signoz-frontend-tls
```

Then upgrade the Helm release:

```bash
helm upgrade --install signoz signoz/signoz \
  --namespace signoz \
  --values deploy/k8s/infra/signoz/values.yaml \
  --wait \
  --timeout 10m
```

### 1.3 DNS Configuration

Add a DNS record pointing to your VPS IP:

```bash
observability.featuresignals.com  A  <VPS_IP>
```

---

## 2. First-Time Setup & Configuration

### 2.1 Initial Login

1. Access the SigNoz dashboard (see Section 1).
2. Create an admin account on first login.
3. Set a strong password (20+ characters, use a password manager).

### 2.2 Configure Data Retention

Retention is configured in `values.yaml` under the `ttl` section. The defaults are:

| Data Type | Retention | Storage Impact |
|-----------|-----------|----------------|
| Traces    | 7 days    | ~3 GiB (estimated) |
| Metrics   | 30 days   | ~5 GiB (estimated) |
| Logs      | 7 days    | ~2 GiB (estimated) |

**To adjust retention after deployment:**

```bash
# Update values.yaml with new TTLs, then upgrade
helm upgrade --install signoz signoz/signoz \
  --namespace signoz \
  --values deploy/k8s/infra/signoz/values.yaml \
  --set ttl.traces="336h" \
  --set ttl.metrics="1440h" \
  --reuse-values \
  --wait \
  --timeout 10m
```

> **⚠️ Warning:** Decreasing retention will permanently delete data. There is no undo.

### 2.3 Configure SigNoz User & Teams (Optional)

SigNoz supports multi-user access. Configure team members in Settings → Teams.

### 2.4 Set Up Ingestion Key

By default, SigNoz accepts OTLP data from any source. For production, restrict ingestion:

1. Navigate to **Settings → Ingestion Settings**.
2. Generate an ingestion key.
3. Configure the FeatureSignals API server to use this key.

---

## 3. Configuring Dashboards

### 3.1 Import Pre-Built Dashboards

The file `deploy/k8s/infra/signoz/dashboards.yaml` contains four pre-built dashboards:

| # | Dashboard | Purpose |
|---|-----------|---------|
| 1 | **API Performance** | Request rate, P50/P95/P99 latency, error rate, slowest endpoints |
| 2 | **Evaluation Hot Path** | Evaluations/sec, cache hit rate, evaluation latency, flag distribution |
| 3 | **Database** | Connections, query latency, table sizes, cache hit ratio |
| 4 | **Business Metrics** | Active tenants, API key usage, flag count, evaluation volume |

**Import via UI:**

1. Open SigNoz dashboard → **Dashboards** tab.
2. Click **Import Dashboard**.
3. Open `deploy/k8s/infra/signoz/dashboards.yaml` and copy the YAML section for the dashboard you want to import.
4. Paste into the import dialog and click **Import**.
5. Select the appropriate time range and click **Save**.

**Import via API (bulk):**

```bash
# Split dashboards.yaml into individual JSON files first,
# then import via SigNoz API
SIGNOZ_URL="http://localhost:3301"
SIGNOZ_API_KEY="your-ingestion-key"

for f in dashboard-*.json; do
  curl -X POST "${SIGNOZ_URL}/api/v1/dashboards" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SIGNOZ_API_KEY}" \
    -d "@${f}"
  echo ""
done
```

### 3.2 Customize Dashboards

Click the gear icon on any panel to customize:

- **Query:** Edit the ClickHouse or PromQL query.
- **Visualization:** Change chart type (timeseries, bar, table, stat).
- **Thresholds:** Set warning/critical thresholds (colored bands on charts).
- **Units:** Configure display units (ms, %, count, etc.).
- **Time range:** Override the dashboard default for a specific panel.

### 3.3 Create Custom Dashboards

To create a custom dashboard from scratch:

1. Navigate to **Dashboards → New Dashboard**.
2. Give it a name and description.
3. Click **Add Panel**.
4. Choose a chart type and write a query (ClickHouse or PromQL).
5. Configure visualization options.
6. Save.

**Useful ClickHouse queries for custom panels:**

```sql
-- Top-N errors by endpoint (last hour)
SELECT
  attributes["http.route"] AS route,
  attributes["http.method"] AS method,
  attributes["http.status_code"] AS status,
  count() AS errors
FROM signoz_traces.signoz_index_v2
WHERE
  service.name = 'featuresignals-api'
  AND timestamp >= now() - INTERVAL 1 HOUR
  AND attributes["http.status_code"] >= '500'
GROUP BY route, method, status
ORDER BY errors DESC
LIMIT 10;

-- Cache hit/miss ratio (last 5 minutes)
SELECT
  toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS t,
  sumIf(value, metric = 'fs_eval_cache_hits') AS hits,
  sumIf(value, metric = 'fs_eval_cache_misses') AS misses,
  hits / (hits + misses) * 100 AS hit_ratio
FROM signoz_metrics.distributed_samples_v2
WHERE
  metric IN ('fs_eval_cache_hits', 'fs_eval_cache_misses')
  AND timestamp >= now() - INTERVAL 5 MINUTE
GROUP BY t
ORDER BY t;
```

---

## 4. Setting Up Alerts

### 4.1 Pre-Defined Alert Rules

The file `deploy/k8s/infra/signoz/alerts.yaml` contains 12 alert rules covering:

| # | Alert | Severity | Threshold | Pager? |
|---|-------|----------|-----------|--------|
| 1 | High error rate | Critical | > 5% 5xx over 5m | Yes |
| 2 | High P99 latency | Warning | > 1s for 5m | No |
| 3 | High DB connections | Warning | > 50 active | No |
| 4 | DB connection exhaustion | Critical | > 80 active | Yes |
| 5 | Pod restart loop | Critical | > 5 restarts/h | Yes |
| 6 | High memory usage | Warning | > 85% of limit | No |
| 7 | Certificate expiring | Warning | < 7 days | No |
| 8 | Evaluation pipeline degraded | Critical | P99 > 10ms or cache < 90% | Yes |
| 9 | Evaluation error rate | Warning | > 1% | No |
| 10 | Low disk space | Warning | < 20% free | No |
| 11 | SigNoz down | Critical | Unreachable 5m | Yes |
| 12 | Temporal down | Warning | Unreachable 5m | No |

### 4.2 Import Alerts via UI

1. Open SigNoz dashboard → **Alerts** tab.
2. Click **Create Alert** to add individual alerts, or use **Import from JSON** for bulk import.
3. Follow the YAML file's `annotations` section for recommended configuration values.

### 4.3 Configure Alert Channels

SigNoz supports multiple notification channels:

| Channel | Configuration | Best For |
|---------|--------------|----------|
| Slack | Webhook URL from Slack app | Team notifications |
| Email | SMTP settings (use transactional email provider) | Critical alerts |
| PagerDuty | Integration key | On-call escalation |
| Webhook | Custom HTTP endpoint | Custom integrations |
| Discord | Webhook URL | Community/SRE channel |

**To set up Slack notifications:**

1. Go to **Settings → Notification Channels → Add Channel**.
2. Select **Slack**.
3. Enter the Slack webhook URL from your workspace's Slack app.
4. Test the channel.

**To set up email notifications:**

1. Go to **Settings → Notification Channels → Add Channel**.
2. Select **Email**.
3. Configure SMTP:
   - SMTP Host: `smtp.resend.com` (or your provider)
   - SMTP Port: `587`
   - SMTP User: `resend` (API key)
   - SMTP Password: (your API key)
4. Set the "From" address: `alerts@featuresignals.com`.

### 4.4 Alert Routing Rules

Configure alert severity routing in **Settings → Alert Rules**:

| Severity | Channels | Response Time |
|----------|----------|---------------|
| P0 (Critical) | Slack + Email + PagerDuty | < 15 minutes |
| P1 (Warning) | Slack (business hours only) | < 4 hours |
| P2 (Info) | Slack (#low-priority channel) | Best effort |

### 4.5 Testing Alerts

Trigger a test alert to verify the pipeline:

```bash
# Trigger a 5xx error (if API is running)
curl -X POST https://api.featuresignals.com/v1/nonexistent-endpoint \
  -H "Authorization: Bearer invalid-token"

# Check the alert fires within the configured evaluation interval (1-5 minutes)
```

---

## 5. Verifying OTLP Data Flow

### 5.1 Check SigNoz OTel Collector

Verify the OTel collector is running and accepting data:

```bash
# Check pod status
kubectl get pods -n signoz -l app.kubernetes.io/component=otel-collector

# Check collector logs
kubectl logs -n signoz deployment/signoz-otel-collector --tail=50

# Check the collector metrics endpoint
kubectl port-forward -n signoz svc/signoz-otel-collector 4317:4317 4318:4318

# In another terminal, verify gRPC endpoint
grpcurl -plaintext localhost:4317 list
# Expected: opentelemetry.proto.collector.trace.v1.TraceService
#           opentelemetry.proto.collector.metrics.v1.MetricsService
#           opentelemetry.proto.collector.log.v1.LogsService
```

### 5.2 Send Test Data

Use the OpenTelemetry CLI to send test data:

```bash
# Install telemetrygen
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

# Send a test trace
telemetrygen traces --otlp-endpoint localhost:4317 --duration 5s

# Send a test metric
telemetrygen metrics --otlp-endpoint localhost:4317 --duration 5s
```

### 5.3 Verify in SigNoz UI

1. Open the SigNoz dashboard.
2. Navigate to **Traces** → search for `telemetrygen` service.
3. You should see the test traces appearing within 30 seconds.
4. Navigate to **Metrics** → search for `telemetrygen` metrics.

### 5.4 Check FeatureSignals Integration

The FeatureSignals API server is configured to export OTLP data to SigNoz:

```yaml
# From deploy/k8s/helm/featuresignals/values.yaml:
OTEL_EXPORTER_OTLP_ENDPOINT: signoz-otel-collector.signoz:4317
OTEL_SERVICE_NAME: featuresignals-api
```

To verify the API is sending data:

1. Make a few API calls to the FeatureSignals API:
   ```bash
   curl https://api.featuresignals.com/v1/health
   curl https://api.featuresignals.com/v1/flags
   ```

2. In the SigNoz UI:
   - Go to **Traces** → filter by `service.name = featuresignals-api`.
   - You should see traces appearing.
   - Click on a trace to see spans (HTTP request, database query, etc.).

### 5.5 Data Flow Diagram

```
FeatureSignals API (Go)
  │
  │ OTLP gRPC (:4317)
  │ OTEL_EXPORTER_OTLP_ENDPOINT=signoz-otel-collector.signoz:4317
  ▼
SigNoz OTel Collector
  │
  ├──▶ ClickHouse (traces, metrics, logs)
  │
  ▼
SigNoz Query Service
  │
  ▼
SigNoz Frontend (UI)
```

---

## 6. Instrumenting the FeatureSignals API

### 6.1 Configuration

The FeatureSignals API uses OpenTelemetry Go SDK for instrumentation. The configuration is set via environment variables:

```yaml
# In the Helm chart values (deploy/k8s/helm/featuresignals/values.yaml):
env:
  - name: OTEL_ENABLED
    value: "true"
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: signoz-otel-collector.signoz:4317
  - name: OTEL_SERVICE_NAME
    value: featuresignals-api
  - name: OTEL_SAMPLING_RATIO
    value: "1.0"  # Full sampling for MVP; reduce to 0.1 for production
```

### 6.2 Automatic Instrumentation

The Go server uses these OpenTelemetry packages:
- `otelchi` — HTTP middleware for automatic request tracing
- `otelpgx` — PostgreSQL driver instrumentation
- `otelslog` — Structured logging bridge

Each HTTP request is automatically traced with:
- Route, method, status code
- Duration (nanosecond precision)
- Database query spans
- Error details (when errors occur)

### 6.3 Custom Metrics

The FeatureSignals API exposes these custom metrics (to be implemented):

| Metric | Type | Description |
|--------|------|-------------|
| `fs_evaluations_total` | Counter | Total flag evaluations |
| `fs_evaluation_duration_seconds` | Histogram | Evaluation latency |
| `fs_eval_cache_hits` | Counter | Cache hit count |
| `fs_eval_cache_misses` | Counter | Cache miss count |
| `fs_eval_cache_entries` | Gauge | Current cache size |
| `fs_flags_total` | Gauge | Total flags across all tenants |
| `fs_flags_per_tenant` | Gauge | Flags per tenant |
| `fs_db_connections_active` | Gauge | Active DB connections |
| `fs_db_connections_total` | Gauge | Total DB connections |
| `fs_db_query_duration_seconds` | Histogram | DB query latency |

### 6.4 Adding Custom Attributes to Traces

To add FeatureSignals-specific attributes to traces (for dashboard queries):

```go
import (
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// In the evaluation handler:
span := trace.SpanFromContext(ctx)
span.SetAttributes(
    attribute.String("flag_key", flag.Key),
    attribute.String("environment_id", env.ID),
    attribute.String("org_id", orgID),
    attribute.String("eval_result", result),
    attribute.Bool("eval_cache_hit", cached),
)
```

---

## 7. Troubleshooting Common Issues

### 7.1 No Data in SigNoz

**Symptoms:** Dashboards show no data. Traces/Metrics tabs are empty.

**Checklist:**

1. **Is the OTel collector running?**
   ```bash
   kubectl get pods -n signoz -l app.kubernetes.io/component=otel-collector
   ```

2. **Is the FeatureSignals API running and configured?**
   ```bash
   kubectl get pods -n featuresignals-system
   kubectl exec -n featuresignals-system deployment/featuresignals-api -- env | grep OTEL
   ```

3. **Can the API reach the collector?**
   ```bash
   # From an API pod
   kubectl exec -n featuresignals-system deployment/featuresignals-api -- \
     nc -zv signoz-otel-collector.signoz 4317
   ```

4. **Are there errors in the collector logs?**
   ```bash
   kubectl logs -n signoz -l app.kubernetes.io/component=otel-collector --tail=100
   ```

5. **Is ClickHouse accepting data?**
   ```bash
   kubectl logs -n signoz -l app.kubernetes.io/component=clickhouse --tail=50
   ```

### 7.2 High Memory Usage by ClickHouse

**Symptoms:** ClickHouse pod is OOM-killed, or `kubectl top pods` shows > 1Gi memory.

**Actions:**

1. Reduce the ClickHouse memory limit in `values.yaml`:
   ```yaml
   clickhouse:
     resources:
       limits:
         memory: 768Mi  # Reduced from 1Gi
   ```

2. Enable ClickHouse memory limits:
   ```yaml
   clickhouse:
     config:
       max_server_memory_usage: 751619276  # 716Mi in bytes
       max_memory_usage: 1073741824        # 1Gi per query
   ```

3. Upgrade the Helm chart:
   ```bash
   helm upgrade --install signoz signoz/signoz \
     --namespace signoz \
     --values deploy/k8s/infra/signoz/values.yaml \
     --wait \
     --timeout 10m
   ```

### 7.3 Database Connection Errors

**Symptoms:** `connection refused` errors in SigNoz logs for ClickHouse.

**Actions:**

1. Check ClickHouse pod status:
   ```bash
   kubectl get pods -n signoz -l app.kubernetes.io/component=clickhouse
   ```

2. Check ClickHouse logs:
   ```bash
   kubectl logs -n signoz -l app.kubernetes.io/component=clickhouse --tail=50
   ```

3. Verify ClickHouse service DNS:
   ```bash
   kubectl run -n signoz --rm -it test-pod --image=busybox -- nslookup signoz-clickhouse
   ```

4. Restart ClickHouse if needed:
   ```bash
   kubectl delete pod -n signoz -l app.kubernetes.io/component=clickhouse
   ```

### 7.4 Disk Space Running Low

**Symptoms:** Pods stuck in `ContainerCreating` (due to disk pressure), or ClickHouse read errors.

**Actions:**

1. Check disk usage on the node:
   ```bash
   kubectl exec -n kube-system node-shell -- df -h /var/lib/rancher/k3s
   ```

2. Verify ClickHouse data size:
   ```bash
   kubectl exec -n signoz deployment/signoz-clickhouse -- \
     du -sh /var/lib/clickhouse/data/
   ```

3. Reduce retention:
   ```bash
   helm upgrade --install signoz signoz/signoz \
     --namespace signoz \
     --reuse-values \
     --set ttl.traces="72h" \
     --set ttl.metrics="336h" \
     --set ttl.logs="72h" \
     --wait \
     --timeout 10m
   ```

4. Manually drop old partitions if needed:
   ```sql
   -- Connect to ClickHouse
   kubectl exec -n signoz deployment/signoz-clickhouse -- clickhouse-client

   -- Drop old trace partitions (older than 3 days)
   ALTER TABLE signoz_traces.signoz_index_v2 DROP PARTITION WHERE timestamp < now() - INTERVAL 3 DAY;
   ```

### 7.5 Dashboards Not Loading

**Symptoms:** Dashboard panels show "No data" or loading spinner indefinitely.

**Actions:**

1. Check the browser console for API errors (F12 → Console).
2. Verify the query service is running:
   ```bash
   kubectl get pods -n signoz -l app.kubernetes.io/component=query-service
   ```
3. Check query service logs:
   ```bash
   kubectl logs -n signoz -l app.kubernetes.io/component=query-service --tail=50
   ```
4. Clear browser cache and reload.
5. Restart the query service:
   ```bash
   kubectl delete pod -n signoz -l app.kubernetes.io/component=query-service
   ```

### 7.6 Alerts Not Firing

**Symptoms:** Alert conditions are met in dashboards, but no notifications are sent.

**Actions:**

1. Check alert rules in **Settings → Alerts** — are they enabled?
2. Verify notification channels are working — send a test notification.
3. Check the alert manager logs:
   ```bash
   kubectl logs -n signoz deployment/signoz-alertmanager --tail=50
   ```
4. Verify the alert evaluation interval — some alerts have a 5-minute `for` duration.
5. Ensure the metrics are available in the right format (check metric names and labels).

---

## 8. Maintenance Tasks

### 8.1 Backup SigNoz Configuration

SigNoz configuration (dashboards, alerts, settings) is stored in ClickHouse. However, exported JSON files make great backups:

```bash
# Export all dashboards
curl -X GET "http://localhost:3301/api/v1/dashboards" \
  -H "Authorization: Bearer ${SIGNOZ_API_KEY}" \
  -o "backups/signoz-dashboards-$(date +%Y%m%d).json"

# Export all alerts
curl -X GET "http://localhost:3301/api/v1/alerts" \
  -H "Authorization: Bearer ${SIGNOZ_API_KEY}" \
  -o "backups/signoz-alerts-$(date +%Y%m%d).json"
```

### 8.2 Upgrade SigNoz

```bash
# 1. Backup configuration (see above)

# 2. Update Helm repo
helm repo update signoz

# 3. Check available versions
helm search repo signoz/signoz --versions

# 4. Upgrade (replace with desired version)
helm upgrade --install signoz signoz/signoz \
  --namespace signoz \
  --values deploy/k8s/infra/signoz/values.yaml \
  --version 0.17.0 \
  --wait \
  --timeout 15m

# 5. Verify everything is running
kubectl get pods -n signoz
kubectl wait --for=condition=Ready pods --all -n signoz --timeout=5m

# 6. Verify data flow
# (see Section 5 — Verifying OTLP Data Flow)
```

### 8.3 Clean Up Old Data

If ClickHouse storage is filling up faster than expected:

```bash
# Check current partition sizes
kubectl exec -n signoz deployment/signoz-clickhouse -- \
  clickhouse-client --query "
    SELECT
      table,
      partition,
      formatReadableSize(sum(bytes)) AS size,
      count() AS parts
    FROM system.parts
    WHERE active AND table IN ('signoz_index_v2', 'distributed_samples_v2', 'logs_v2')
    GROUP BY table, partition
    ORDER BY table, partition DESC
  "
```

### 8.4 Monitor SigNoz Health

Set up a cron job to check SigNoz health daily:

```bash
#!/bin/bash
# /usr/local/bin/check-signoz-health.sh

SIGNOZ_URL="http://localhost:3301"

# Check query service
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${SIGNOZ_URL}/api/v1/health")
if [ "${HEALTH}" != "200" ]; then
  echo "CRITICAL: SigNoz health check failed (HTTP ${HEALTH})"
  # Send alert (Slack, email, etc.)
fi

# Check ClickHouse connectivity
kubectl exec -n signoz deployment/signoz-clickhouse -- \
  clickhouse-client --query "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "CRITICAL: ClickHouse not reachable"
fi
```

---

## 9. Reference: SigNoz Architecture

### 9.1 Component Overview

```
User
  │
  ├── SigNoz Frontend (React, :3301)
  │     │
  │     └── SigNoz Query Service (:8080)
  │           │
  │           └── ClickHouse (:9000, :8123)
  │
  └── OTel SDK / OTLP Exporters
        │
        └── SigNoz OTel Collector (:4317 gRPC, :4318 HTTP)
              │
              └── ClickHouse
```

| Component | Description | Ports |
|-----------|-------------|-------|
| Frontend | React-based web UI | 3301 |
| Query Service | REST + GraphQL API for the UI | 8080 |
| OTel Collector | Ingests OTLP data, processes, and writes to ClickHouse | 4317 (gRPC), 4318 (HTTP) |
| ClickHouse | Columnar storage for traces, metrics, and logs | 9000 (native), 8123 (HTTP) |
| Alert Manager | Evaluates alert rules and sends notifications | 9093 |

### 9.2 ClickHouse Storage Layout

SigNoz creates these databases in ClickHouse:

| Database | Tables | Description |
|----------|--------|-------------|
| `signoz_traces` | `signoz_index_v2`, `signoz_error_index_v2`, `usage_explorer` | Trace data |
| `signoz_metrics` | `distributed_samples_v2`, `samples_v2`, `metrics_v2` | Metrics data |
| `signoz_logs` | `logs_v2`, `logs_atrributes` | Log data |

### 9.3 Resource Budget (CPX42)

| Component | Request | Limit | Note |
|-----------|---------|-------|------|
| ClickHouse | 512Mi / 200m | 1Gi / 500m | Largest consumer |
| Query Service | 256Mi / 100m | 512Mi / 300m | Moderate |
| OTel Collector | 256Mi / 100m | 512Mi / 300m | Bounded by ingestion rate |
| Frontend | 128Mi / 50m | 256Mi / 200m | Lightweight |
| **Total** | **~1.15Gi / 450m** | **~2.3Gi / 1.3CPU** | |

---

## 10. Emergency Procedures

### 10.1 SigNoz Completely Down

**Impact:** No observability data. Dashboards and alerts unavailable.

**Restoration steps:**

```bash
# 1. Check if namespace exists
kubectl get namespace signoz

# 2. Check if any pods are running
kubectl get pods -n signoz

# 3. If pods are CrashLoopBackOff, check logs
kubectl logs -n signoz -l app.kubernetes.io/component=otel-collector --tail=100
kubectl logs -n signoz -l app.kubernetes.io/component=query-service --tail=100
kubectl logs -n signoz -l app.kubernetes.io/component=clickhouse --tail=100

# 4. If ClickHouse PVC is corrupted, restore from backup:
#    (Note: SigNoz does not have built-in backup. Plan for ClickHouse backup in Phase 6.)
kubectl delete pvc -n signoz -l app.kubernetes.io/component=clickhouse

# 5. Reinstall SigNoz
helm uninstall signoz --namespace signoz
helm upgrade --install signoz signoz/signoz \
  --namespace signoz \
  --create-namespace \
  --values deploy/k8s/infra/signoz/values.yaml \
  --wait \
  --timeout 15m
```

### 10.2 Data Corruption / Accidental Deletion

**Impact:** Lost dashboards, alerts, or configuration.

**Recovery:**

```bash
# Re-import dashboards from dashboards.yaml (see Section 3.1)
# Re-import alerts from alerts.yaml (see Section 4.2)
```

### 10.3 ClickHouse Storage Full

**Impact:** New data rejected. Dashboards stop updating.

**Immediate actions:**

```bash
# 1. Check ClickHouse disk usage
kubectl exec -n signoz deployment/signoz-clickhouse -- \
  df -h /var/lib/clickhouse

# 2. Drop old partitions (emergency — data loss!)
kubectl exec -n signoz deployment/signoz-clickhouse -- \
  clickhouse-client --query "
    ALTER TABLE signoz_traces.signoz_index_v2
    DROP WHERE timestamp < now() - INTERVAL 2 DAY;
  "
kubectl exec -n signoz deployment/signoz-clickhouse -- \
  clickhouse-client --query "
    ALTER TABLE signoz_metrics.distributed_samples_v2
    DROP WHERE timestamp < now() - INTERVAL 7 DAY;
  "

# 3. Reduce retention (prevents recurrence)
helm upgrade --install signoz signoz/signoz \
  --namespace signoz \
  --reuse-values \
  --set ttl.traces="48h" \
  --set ttl.metrics="168h" \
  --set ttl.logs="48h" \
  --wait \
  --timeout 10m

# 4. Run ClickHouse cleanup
kubectl exec -n signoz deployment/signoz-clickhouse -- \
  clickhouse-client --query "OPTIMIZE TABLE signoz_traces.signoz_index_v2 FINAL;"
kubectl exec -n signoz deployment/signoz-clickhouse -- \
  clickhouse-client --query "OPTIMIZE TABLE signoz_metrics.distributed_samples_v2 FINAL;"
```

---

## Reference: Quick Commands

```bash
# --- Access & Debug ---
kubectl port-forward -n signoz svc/signoz-frontend 3301:3301
kubectl get pods -n signoz -w
kubectl logs -n signoz deployment/signoz-otel-collector --tail=100 -f
kubectl logs -n signoz deployment/signoz-query-service --tail=100 -f
kubectl logs -n signoz deployment/signoz-clickhouse --tail=50 -f

# --- Test OTLP Ingestion ---
telemetrygen traces --otlp-endpoint localhost:4317 --duration 5s

# --- Helm Operations ---
helm upgrade --install signoz signoz/signoz -n signoz -f values.yaml
helm list -n signoz
helm history signoz -n signoz
helm rollback signoz <revision> -n signoz

# --- ClickHouse CLI ---
kubectl exec -n signoz deployment/signoz-clickhouse -- clickhouse-client
kubectl exec -n signoz deployment/signoz-clickhouse -- \
  clickhouse-client --query "SELECT count() FROM signoz_traces.signoz_index_v2"

# --- SigNoz API ---
curl http://localhost:3301/api/v1/health
curl http://localhost:3301/api/v1/dashboards
curl http://localhost:3301/api/v1/alerts
```

---

## Related Documents

- [Disaster Recovery Runbook](disaster-recovery.md) — Full system recovery procedures
- [Database Restore Runbook](database-restore.md) — PostgreSQL backup and restore
- [Deployment Infrastructure](../../k8s/README.md) — Cluster architecture overview
- [SigNoz Helm Values](../../k8s/infra/signoz/values.yaml) — Configuration reference
- [SigNoz Alert Rules](../../k8s/infra/signoz/alerts.yaml) — Alert rule definitions
- [SigNoz Dashboard Configs](../../k8s/infra/signoz/dashboards.yaml) — Dashboard definitions