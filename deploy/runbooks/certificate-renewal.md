# Runbook: Certificate Renewal Management
Severity: P2 — Medium (P1 if certificate is already expired)
Trigger: TLS certificate expiring within 7 days, cert-manager renewal failure, new domain added

## Impact
Expired certificates cause browser security warnings and API failures for clients
with strict TLS validation. Service remains operational but untrusted.
Estimated fix time: 5-15 minutes.

## Pre-requisites
- `kubectl` configured for the cluster (KUBECONFIG env or ~/.kube/config)
- `openssl` CLI installed locally
- Cloudflare API token (in 1Password) for DNS troubleshooting
- Cluster access to cert-manager namespace

## Architecture
FeatureSignals uses cert-manager with Let's Encrypt for automated TLS:
- **ClusterIssuer**: `letsencrypt-prod` (production) / `letsencrypt-staging` (testing)
- **Challenge type**: HTTP-01 via Caddy ingress (port 80)
- **Certificates**: One per ingress host (api.featuresignals.com, app.featuresignals.com)
- **Renewal window**: 30 days before expiry (renews at 60 days into 90-day validity)
- **Auto-renewal**: Managed entirely by cert-manager — no manual intervention needed normally

## Step-by-step

### Step 1: Check certificate status
```bash
# List all certificates and their expiry dates
kubectl get certificates -A -o wide

# Detailed view of a specific certificate
kubectl describe certificate -n featuresignals-saas featuresignals-tls 2>/dev/null || \
  kubectl describe certificate -n featuresignals-saas

# Check certificate expiry using openssl
echo | openssl s_client -connect api.featuresignals.com:443 -servername api.featuresignals.com 2>/dev/null | \
  openssl x509 -noout -dates

# Check all secrets that contain TLS certs
kubectl get secret -n featuresignals-saas -l controller.cert-manager.io/fao=true
```

### Step 2: Check cert-manager health
```bash
# Check cert-manager pods are running
kubectl get pods -n cert-manager

# Check cert-manager controller logs for errors
kubectl logs -n cert-manager -l app.kubernetes.io/component=controller --tail=50

# Check cert-manager CRDs are installed
kubectl get clusterissuer
kubectl get certificaterequests -A
kubectl get orders -A
kubectl get challenges -A
```

### Step 3: Verify Ingress annotations
```bash
# Ensure the Ingress has the correct cert-manager annotation
kubectl get ingress -n featuresignals-saas -o yaml | grep -A5 "cert-manager.io"

# Expected output:
#   annotations:
#     cert-manager.io/cluster-issuer: letsencrypt-prod

# If missing, add the annotation:
kubectl annotate ingress featuresignals -n featuresignals-saas \
  cert-manager.io/cluster-issuer=letsencrypt-prod --overwrite
```

### Step 4: Debug common renewal failures

#### Issue 4.1: HTTP-01 challenge fails
```bash
# Check the challenge status
kubectl describe challenges -A

# Common cause: Caddy ingress not routing /.well-known/acme-challenge/ properly
# Verify by making a test request:
curl -v http://api.featuresignals.com/.well-known/acme-challenge/test 2>&1 | head -20

# Expected: 404 with body "Not Found" (means routing works, just no token)
# Actual problem: 503 or connection refused means ingress is misconfigured

# Fix: Ensure port 80 is open on the firewall and Caddy is running
kubectl get pods -n caddy-system
kubectl get svc -n caddy-system
```

#### Issue 4.2: DNS not resolving
```bash
# Verify DNS records point to the correct IP
dig +short api.featuresignals.com
dig +short app.featuresignals.com

# Get the Caddy ingress LoadBalancer IP
kubectl get svc -n caddy-system -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}'

# They should match. If not, update DNS records via Cloudflare API
```

#### Issue 4.3: Let's Encrypt rate limited
```bash
# Check cert-manager events for rate limit errors
kubectl get events -n cert-manager --sort-by='.lastTimestamp' | grep -i "rate\|limit\|error"

# Common rate limits:
#   50 certificates per registered domain per week
#   300 new orders per account per 3 hours
#   5 failed authorizations per account per hostname per hour

# If rate limited:
# 1. Switch to staging issuer temporarily for testing
# 2. Wait for rate limit to reset (typically 1 hour)
# 3. Reduce cert churn — avoid creating/deleting certs repeatedly
```

#### Issue 4.4: cert-manager pod issues
```bash
# Check for OOMKilled or CrashLoopBackOff
kubectl describe pod -n cert-manager -l app.kubernetes.io/component=controller

# Check resource usage
kubectl top pods -n cert-manager

# If OOM: increase memory limits in the Helm values
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --set resources.requests.memory=64Mi \
  --set resources.limits.memory=128Mi
```

### Step 5: Force certificate renewal
```bash
# Method 1: Delete the certificate (will be recreated by cert-manager via ingress annotation)
kubectl delete certificate -n featuresignals-saas --all

# Method 2: Delete only the secret (triggers re-issuance)
kubectl delete secret -n featuresignals-saas -l controller.cert-manager.io/fao=true

# Method 3: Annotate for manual renewal
kubectl annotate certificate -n featuresignals-saas featuresignals-tls \
  cert-manager.io/issue-temporary-certificate="true" --overwrite

# Monitor the renewal
kubectl get certificaterequests -n featuresignals-saas -w
```

### Step 6: Use staging issuer for testing
```bash
# For testing renewal without hitting production rate limits:
# Temporarily switch to the staging issuer
kubectl annotate ingress featuresignals -n featuresignals-saas \
  cert-manager.io/cluster-issuer=letsencrypt-staging --overwrite

# Delete existing certificate to force re-issuance
kubectl delete certificate -n featuresignals-saas --all

# Wait for staging cert to be issued
kubectl get certificates -n featuresignals-saas -w

# Verify the staging cert works (it will show as untrusted — that's expected)
echo | openssl s_client -connect api.featuresignals.com:443 2>/dev/null | \
  openssl x509 -noout -issuer | grep "Let's Encrypt"

# Switch back to production issuer
kubectl annotate ingress featuresignals -n featuresignals-saas \
  cert-manager.io/cluster-issuer=letsencrypt-prod --overwrite

# Force production renewal
kubectl delete certificate -n featuresignals-saas --all
```

### Step 7: Manual certificate creation (if automated flow fails entirely)
```bash
# Create a Certificate resource directly (not managed by ingress annotation)
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: featuresignals-tls-manual
  namespace: featuresignals-saas
spec:
  secretName: featuresignals-tls-manual
  duration: 2160h    # 90 days
  renewBefore: 720h  # 30 days before expiry
  commonName: api.featuresignals.com
  isCA: false
  privateKey:
    algorithm: RSA
    size: 2048
  dnsNames:
  - api.featuresignals.com
  - app.featuresignals.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
    group: cert-manager.io
EOF

# Monitor issuance
kubectl get certificate featuresignals-tls-manual -n featuresignals-saas -w
kubectl describe certificate featuresignals-tls-manual -n featuresignals-saas

# Once ready, update the Ingress to use this certificate
kubectl patch ingress featuresignals -n featuresignals-saas --type=json \
  -p='[{"op": "replace", "path": "/spec/tls/0/secretName", "value": "featuresignals-tls-manual"}]'
```

### Step 8: Verify renewal succeeded
```bash
# Check certificate ready status
kubectl get certificates -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} {"\n"}  Ready: {.status.conditions[?(@.type=="Ready")].status} {"\n"}  Expires: {.status.notAfter} {"\n\n"}{end}'

# Verify with openssl
echo | openssl s_client -connect api.featuresignals.com:443 -servername api.featuresignals.com 2>/dev/null | \
  openssl x509 -noout -text | grep -E "(Subject:|Not Before:|Not After:|Issuer:)"

# Verify the full chain is valid
echo | openssl s_client -connect api.featuresignals.com:443 -servername api.featuresignals.com 2>/dev/null | \
  openssl x509 -noout -purpose | grep -E "(SSL server|Any CA)"

# Check cert is trusted by the system
curl -vI https://api.featuresignals.com/health 2>&1 | grep "SSL certificate verify"
# Expected: "SSL certificate verify ok"
```

## Verification Checklist
- [ ] `kubectl get certificates -A` shows all certificates with `Ready=True`
- [ ] `openssl s_client` shows valid Not Before and Not After dates (>30 days remaining)
- [ ] `curl https://api.featuresignals.com/health` returns 200 without certificate warnings
- [ ] `curl https://app.featuresignals.com` returns 200 without certificate warnings
- [ ] cert-manager pod logs show no errors in the last hour
- [ ] `kubectl get certificaterequests -A` shows recent successful requests
- [ ] Certificate is issued by "Let's Encrypt" (production issuer)

## Rollback
If manual intervention causes issues:

### Revert to auto-renewal via ingress annotation
```bash
# Delete the manually created certificate
kubectl delete certificate featuresignals-tls-manual -n featuresignals-saas

# Revert the ingress to use auto-generated secret
kubectl patch ingress featuresignals -n featuresignals-saas --type=json \
  -p='[{"op": "replace", "path": "/spec/tls/0/secretName", "value": "featuresignals-tls"}]'

# Ensure the annotation is correct
kubectl annotate ingress featuresignals -n featuresignals-saas \
  cert-manager.io/cluster-issuer=letsencrypt-prod --overwrite

# Delete old secret to trigger re-issuance
kubectl delete secret featuresignals-tls-manual -n featuresignals-saas
```

### Switch to staging issuer for debugging
```bash
kubectl annotate ingress featuresignals -n featuresignals-saas \
  cert-manager.io/cluster-issuer=letsencrypt-staging --overwrite

# Delete existing cert to force re-issue with staging
kubectl delete certificate -n featuresignals-saas featuresignals-tls

# Test with staging (expect untrusted — that's normal)
```

## Post-recovery
- If auto-renewal failed silently, create a monitoring alert for certificate expiry
  - Alert when: `certmanager_certificate_expiration_timestamp_seconds - time() < 604800` (7 days)
  - Severity: warning for 14 days, critical for 7 days
- Add a monthly CronJob that checks certificate expiry and reports
- Investigate root cause of renewal failure:
  - Was cert-manager down? → Add pod anti-affinity
  - Was Let's Encrypt unreachable? → Check network policies
  - Was the challenge failing? → Check ingress routing
- Update this runbook with any domain-specific troubleshooting

## Automatic renewal monitoring
```bash
# One-liner to check all certs and their remaining validity
kubectl get certificates -A -o json | jq -r '
  .items[] | 
  "\(.metadata.namespace)/\(.metadata.name): " +
  "\(.status.notAfter // "unknown") " +
  "(\(((.status.notAfter | fromdateiso8601 // now) - now) / 86400 | floor) days remaining)" +
  " \(.status.conditions[] | select(.type=="Ready") | if .status=="True" then "✅" else "❌" end)"'

# Expected output (example):
# featuresignals-saas/featuresignals-tls: 2025-07-15T12:34:56Z (72 days remaining) ✅
```

## Related resources
- cert-manager documentation: https://cert-manager.io/docs/
- Let's Encrypt rate limits: https://letsencrypt.org/docs/rate-limits/
- ClusterIssuer definitions: `deploy/k8s/infra/cert-manager/cluster-issuer.yaml`
