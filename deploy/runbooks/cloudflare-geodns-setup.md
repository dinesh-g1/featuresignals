# Cloudflare GeoDNS Setup Runbook

This runbook covers migrating DNS from Tucows to Cloudflare and configuring
latency-based (proximity) load balancing for FeatureSignals multi-region
deployment.

## Prerequisites

- Cloudflare account (free tier is sufficient for DNS; Load Balancing is a paid
  add-on at ~$20/month for 3 origin pools)
- Access to Tucows / OpenSRS domain management panel for `featuresignals.com`
- VPS IP addresses for all three regions (IN, US, EU)

## Step 1: Add Domain to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Add a Site** and enter `featuresignals.com`
3. Select the **Free** plan (DNS + CDN + DDoS protection)
4. Cloudflare scans existing DNS records — **verify every record** matches your
   current Tucows configuration before proceeding

## Step 2: Update Nameservers at Tucows

1. Log in to your Tucows / OpenSRS domain management panel
2. Navigate to **Name Servers** for `featuresignals.com`
3. Replace the current nameservers with the two Cloudflare nameservers shown in
   your Cloudflare setup wizard (e.g. `anna.ns.cloudflare.com`,
   `bob.ns.cloudflare.com`)
4. Save the changes
5. Propagation takes 15 minutes to 48 hours (typically under 1 hour)
6. Cloudflare sends an email when the site is active

**Important:** Disable DNSSEC at Tucows before updating nameservers to avoid
resolution failures during propagation.

## Step 3: Verify DNS Records

After Cloudflare activates, confirm these records exist:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `featuresignals.com` | IN VPS IP | Proxied |
| A | `api.us.featuresignals.com` | US VPS IP | DNS only |
| A | `api.eu.featuresignals.com` | EU VPS IP | DNS only |
| A | `app.us.featuresignals.com` | US VPS IP | DNS only |
| A | `app.eu.featuresignals.com` | EU VPS IP | DNS only |
| A | `docs.featuresignals.com` | IN VPS IP | Proxied |

**Note:** `api.featuresignals.com` and `app.featuresignals.com` will be managed
by Load Balancer records (Step 4), not plain A records. Remove any existing A
records for these hostnames.

## Step 4: Enable Load Balancing

1. In Cloudflare Dashboard, go to **Traffic** → **Load Balancing**
2. Enable the Load Balancing add-on ($5/month base)

### Create Origin Pools

Create three origin pools ($5/month each):

**Pool: `fs-india`**
- Origin: IN VPS IP, port 443
- Health check: HTTPS GET `https://api.featuresignals.com/health`
- Health check interval: 60 seconds
- Region: South Asia

**Pool: `fs-us`**
- Origin: US VPS IP, port 443
- Health check: HTTPS GET `https://api.us.featuresignals.com/health`
- Health check interval: 60 seconds
- Region: North America

**Pool: `fs-eu`**
- Origin: EU VPS IP, port 443
- Health check: HTTPS GET `https://api.eu.featuresignals.com/health`
- Health check interval: 60 seconds
- Region: Western Europe

### Create Load Balancer Records

**Load Balancer: `api.featuresignals.com`**
- Steering policy: **Proximity** (routes to geographically nearest healthy pool)
- Pools: `fs-india`, `fs-us`, `fs-eu`
- Fallback pool: `fs-india`
- Proxy status: DNS only (let Caddy handle TLS)
- Session affinity: None

**Load Balancer: `app.featuresignals.com`**
- Steering policy: **Proximity**
- Pools: `fs-india`, `fs-us`, `fs-eu`
- Fallback pool: `fs-india`
- Proxy status: DNS only
- Session affinity: None

## Step 5: Create Cloudflare API Token

For Caddy DNS-01 TLS challenges (all regions need to obtain certificates for
`api.featuresignals.com` and `app.featuresignals.com`):

1. Go to **My Profile** → **API Tokens** → **Create Token**
2. Use the **Edit zone DNS** template
3. Scope: Zone = `featuresignals.com`, Permissions = `Zone:DNS:Edit`
4. Create the token and save it securely
5. Add as GitHub repository secret: `CLOUDFLARE_API_TOKEN`
6. Add to each region's `.env` file as `CLOUDFLARE_API_TOKEN`

## Step 6: Verify GeoDNS Resolution

Test from different geographic locations using:

```bash
# From a US machine:
dig api.featuresignals.com +short
# Should return US VPS IP

# From an India machine:
dig api.featuresignals.com +short
# Should return IN VPS IP

# Or use online tools:
# https://www.whatsmydns.net/#A/api.featuresignals.com
```

## Step 7: Monitor Health Checks

In Cloudflare Dashboard → Traffic → Load Balancing → Monitors:

- Verify all three pools show **Healthy** status
- Test failover by stopping the API server on one region and confirming traffic
  shifts to the next nearest pool

## Cost Summary

| Item | Monthly Cost |
|------|-------------|
| Cloudflare Free plan (DNS + CDN + DDoS) | $0 |
| Load Balancing base | $5 |
| 3 origin pools × $5 | $15 |
| **Total** | **~$20/month** |

Query volume: first 500,000 DNS queries are included; additional usage at
$0.50 per 500,000 queries.
