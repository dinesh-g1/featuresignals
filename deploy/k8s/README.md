# K3s Deployment

## Prerequisites

1. **CloudNative PG Operator** — install before applying manifests:
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.25/releases/cnpg-1.25.1.yaml
   ```
   
   Wait for the operator to be ready:
   ```bash
   kubectl wait --for=condition=Ready pods -l app.kubernetes.io/name=cloudnative-pg -n cnpg-system --timeout=120s
   ```

2. **Apply the stack:**
   ```bash
   kubectl apply -k deploy/k8s/
   ```

3. **Verify:**
   ```bash
   kubectl get clusters.postgresql.cnpg.io -n featuresignals
   kubectl get pods -n featuresignals
   ```

## Services

| Service | Endpoint | Description |
|---------|----------|-------------|
| PostgreSQL (RW) | `featuresignals-db-rw:5432` | Read-write database endpoint |
| PostgreSQL (RO) | `featuresignals-db-ro:5432` | Read-only database endpoint |
| Server API | `featuresignals-server:8080` | Go API server |
| Dashboard | `featuresignals-dashboard:3000` | Next.js dashboard |
| Global Router | `global-router:443` | TLS edge router |