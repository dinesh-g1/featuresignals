# FeatureSignals — Server Setup Guide

All deployment and infrastructure management is handled via GitHub Actions.
No manual SSH access is required after the initial setup.

---

## Infrastructure

| Item | Value |
|------|-------|
| **VPS Provider** | Utho Cloud |
| **VPS IP** | `103.146.242.243` |
| **Spec** | 4 vCPU / 8 GB RAM / 160 GB SSD / Ubuntu 24.04 LTS |
| **DNS** | Tucows |
| **Reverse Proxy** | Caddy (auto-HTTPS via Let's Encrypt) |

---

## Step 1: Add GitHub Secrets

Go to your GitHub repository **Settings > Secrets and variables > Actions** and add these 6 secrets:

| Secret | Value | How to Generate |
|--------|-------|-----------------|
| `VPS_HOST` | `103.146.242.243` | Your VPS public IP |
| `VPS_USER` | `deploy` | Created by the setup workflow |
| `VPS_SSH_KEY` | *(your SSH private key)* | The private key matching your public key |
| `REPO_TOKEN` | *(GitHub PAT)* | GitHub > Settings > Developer settings > Personal access tokens > Generate (needs `repo` scope) |
| `POSTGRES_PASSWORD` | *(hex, URL-safe)* | Run: `openssl rand -hex 24` (do NOT use base64, it contains `+/=` that break DB URLs) |
| `JWT_SECRET` | *(64-char hex)* | Run: `openssl rand -hex 32` |

> **Important**: `VPS_SSH_KEY` must be the **private key** (starts with `-----BEGIN`). The public key is already configured on the VPS by Utho and will be copied to the `deploy` user by the setup workflow.
>
> **REPO_TOKEN**: Required because the repo is private. Go to https://github.com/settings/tokens > "Generate new token (classic)" > select the `repo` scope > Generate. Copy the token and add it as the `REPO_TOKEN` secret.

---

## Step 2: Run the VPS Setup Workflow (One-Time)

1. Go to **Actions** tab in your GitHub repository
2. Select **"Setup VPS"** from the workflow list
3. Click **"Run workflow"** > **"Run workflow"**

This automated workflow will:

1. SSH into the VPS as `root`
2. Install system packages (`curl`, `git`, `ufw`, `fail2ban`)
3. Create a `deploy` user with SSH access
4. Install Docker Engine and Docker Compose
5. Configure UFW firewall (ports 22, 80, 443 only)
6. Enable fail2ban for SSH brute-force protection
7. Clone the repository to `/opt/featuresignals`
8. Write the `.env` file from GitHub Secrets
9. Install the daily backup cron job
10. Run the first deploy (build all images, start all services)
11. Harden SSH (disable root login, disable password auth)

The workflow takes ~10-15 minutes on first run. Monitor progress in the Actions tab.

---

## Step 3: Verify Deployment

After the setup workflow completes, verify these URLs:

| URL | Expected |
|-----|----------|
| https://featuresignals.com | Marketing website |
| https://www.featuresignals.com | Same as root |
| https://api.featuresignals.com/health | `{"status":"ok"}` |
| https://app.featuresignals.com | Dashboard login page |
| https://docs.featuresignals.com | Documentation site |

---

## Ongoing Deployments (Fully Automated)

After initial setup, all deployments are automatic:

```
Push to main
    |
    v
CI workflow runs (tests, lint, build checks)
    |
    v (on success)
CD workflow runs automatically:
  1. Writes .env from GitHub Secrets
  2. Backs up PostgreSQL
  3. git pull + docker compose build + up
  4. Health checks all 4 endpoints
```

**Manual deploy**: Go to Actions > "CD" > "Run workflow" to trigger a deploy without pushing code (useful for secret rotation or restarting services).

---

## Managing Secrets

Secrets are stored in GitHub and written to the VPS `.env` file on every deploy.

**To rotate a secret:**
1. Update the secret in GitHub (Settings > Secrets > Actions)
2. Trigger a deploy: Actions > "CD" > "Run workflow"

No SSH access needed. The CD pipeline writes the fresh `.env` from secrets before each deploy.

---

## DNS Records (Tucows)

| Record | Type | Value |
|--------|------|-------|
| `@` (root) | A | `103.146.242.243` |
| `www` | CNAME | `featuresignals.com` |
| `api` | A | `103.146.242.243` |
| `app` | A | `103.146.242.243` |
| `docs` | A | `103.146.242.243` |

---

## Backups

- **Automatic**: Daily at 3:00 AM via cron (`deploy/pg-backup.sh`)
- **Location**: `/opt/featuresignals/backups/` on the VPS
- **Retention**: 7 daily + 4 weekly (auto-rotated)

---

## GitHub Actions Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `ci.yml` | Push/PR to main | Tests, lint, build checks |
| **CD** | `cd.yml` | After CI passes on main, or manual | Deploy to production |
| **Setup VPS** | `setup-vps.yml` | Manual only | One-time VPS provisioning |

---

## Architecture

```
Internet → Tucows DNS → Utho VPS (103.146.242.243)

Caddy (ports 80, 443 — auto HTTPS)
  ├── featuresignals.com     → static files (Astro)
  ├── docs.featuresignals.com → static files (Docusaurus)
  ├── app.featuresignals.com  → dashboard:3000 (Next.js)
  └── api.featuresignals.com  → server:8080 (Go)
                                    └── PostgreSQL 16
```
