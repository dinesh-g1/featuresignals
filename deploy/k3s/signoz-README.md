# SigNoz Deployment on k3s

SigNoz provides observability for FeatureSignals (metrics, traces, logs).

## One-time Setup

```bash
helm repo add signoz https://charts.signoz.io
helm install signoz signoz/signoz \
  --namespace signoz --create-namespace \
  --set clickhouse.persistence.size=20Gi \
  --set queryService.resources.requests.memory=512Mi
```

## Access

After deployment, port-forward the SigNoz query service:

```bash
kubectl port-forward -n signoz svc/signoz-query-service 3301:3301
```

Access at: http://localhost:3301

## Configuration

Set the following environment variables on the FeatureSignals API server:

- `OTEL_ENABLED=true`
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz-otel-collector.signoz:4318`
- `OTEL_SERVICE_NAME=featuresignals-api`

## Data Retention

ClickHouse data retention is configured via the ClickHouse configuration.
Default: 30 days for traces, 7 days for logs.