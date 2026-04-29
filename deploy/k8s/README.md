# FeatureSignals K3s Deployment

## Prerequisites

1. **CloudNative PG Operator** — install before applying manifests:
   ```bash
   helm repo add cnpg https://cloudnative-pg.github.io/charts
   helm upgrade --install cnpg cnpg/cloudnative-pg --namespace cnpg-system --create-namespace --wait --timeout 5m
   ```

2. **SigNoz** — observability stack:
   ```bash
   helm repo add signoz https://charts.signoz.io
   helm upgrade --install signoz signoz/signoz --namespace observability --create-namespace --wait --timeout 10m --set global.storageClass=local-path
   ```

3. **FeatureSignals stack:**
   ```bash
   kubectl apply -k deploy/k8s/
   ```

## Services

| Service | Endpoint | Description |
|---------|----------|-------------|
| PostgreSQL (RW) | `featuresignals-db-rw:5432` | Read-write database endpoint |
| Server API | `featuresignals-server:8080` | Go API server |
| Dashboard | `featuresignals-dashboard:3000` | Next.js dashboard |
| Global Router | `(hostNetwork) :80/:443` | TLS edge router |
| SigNoz | `signoz.observability:8080` | Observability UI |
| SigNoz OTEL | `signoz-otel-collector.observability:4318` | OTLP telemetry ingestion |
