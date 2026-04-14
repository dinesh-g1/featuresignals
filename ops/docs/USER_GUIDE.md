# Ops Portal — User Guide by Role

> **URL:** `ops.featuresignals.com` (production) or `http://localhost:3001` (dev)
> **Access:** Restricted to `@featuresignals.com` email addresses only.
> **Auth:** Uses the same login credentials as `app.featuresignals.com`. No separate account needed.

---

## Table of Contents

1. [Login & Access Control](#1-login--access-control)
2. [Founder (Full Access)](#2-founder-full-access)
3. [Engineer (Provision, Debug, No Finance)](#3-engineer-provision-debug-no-finance)
4. [Customer Success (View Only)](#4-customer-success-view-only)
5. [Demo Team (Sandbox Only)](#5-demo-team-sandbox-only)
6. [Finance (Financial Dashboards)](#6-finance-financial-dashboards)
7. [Common Operations](#7-common-operations)

---

## 1. Login & Access Control

### First-Time Login

1. Navigate to `ops.featuresignals.com`
2. Enter your `@featuresignals.com` email and password (same as `app.featuresignals.com`)
3. You will be redirected to the Dashboard

### If You Can't Log In

| Problem | Cause | Solution |
|---------|-------|----------|
| "Access restricted to authorized domain" | Not a `@featuresignals.com` email | Only FeatureSignals employees can access |
| "Access denied" | No `ops_users` entry | Contact a founder to be added |
| "Insufficient permissions" | Role doesn't allow the action | Check your role permissions below |

### Role Permissions Matrix

| Action | Founder | Engineer | Customer Success | Demo Team | Finance |
|--------|---------|----------|-----------------|-----------|---------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Environments | ✅ | ✅ | ✅ | ✅ | ❌ |
| Provision VPS | ✅ | ✅ | ❌ | ❌ | ❌ |
| Toggle Maintenance | ✅ | ✅ | ❌ | ❌ | ❌ |
| Toggle Debug | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Customers | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Licenses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Sandboxes | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Observability | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Financial | ✅ | ❌ | ❌ | ❌ | ✅ |
| Manage Ops Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Audit Log | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 2. Founder (Full Access)

### Who: You and Shashi

### What You Can Do
Everything. Unlimited sandbox creation. Full financial access.

### Key Operations

#### Provision a New Isolated VPS
1. Go to **Environments** → Click **Provision VPS** (top-right)
2. Fill in the form:
   - **Customer Name:** `acmecorp` (becomes `acmecorp.featuresignals.com`)
   - **Organization ID:** Copy from CRM or the customer's org detail page
   - **VPS Type:** Choose based on plan:
     - Growth → `cx22` (2 CPU, 4GB, €4.51/mo)
     - Scale → `cx32` (4 CPU, 8GB, €8.49/mo)
     - Enterprise → `cx42` (8 CPU, 16GB, €14.21/mo)
   - **Region:** `fsn1` (EU default), `ash` (US)
   - **Plan:** Growth / Scale / Enterprise
3. Click **Provision** → GitHub Actions workflow triggers (~15 min)
4. Monitor progress in GitHub Actions
5. Once complete, generate admin credentials and share with customer

#### Decommission a Customer VPS
1. Go to **Environments** → Find the customer
2. Click the **⚙️** action menu → **Decommission**
3. Enter reason (e.g., "Contract ended", "Non-payment")
4. Confirm → Backup is created → VPS destroyed

#### Override a Customer's Quota
1. Go to **Licenses** → Find the customer's license
2. Click **Override Quota**
3. Increase limits (evaluations, API calls, seats)
4. Save → Changes take effect immediately

#### Add an Ops User
1. Go to **Ops Users** → Click **Add User**
2. Enter their User ID (from the main app's users table)
3. Select their role
4. Set max sandbox environments (-1 for unlimited, 2 for default)
5. Click **Create**

---

## 3. Engineer (Provision, Debug, No Finance)

### Who: Development team members

### What You Can Do
- Provision/decommission environments
- Debug customer issues (logs, DB, metrics, SSH)
- Toggle maintenance/debug modes
- Manage licenses (create, revoke, override)
- Create sandboxes (limited to 2 by default)
- **Cannot** view financial data

### Key Operations

#### Debug a Customer Issue
1. Customer reports error → Go to **Customers** → Search for customer
2. Click customer name → See environment status, health score
3. Go to **Environments** → Find the environment
4. **View Logs:** Click the expand arrow (⌄) to see recent logs
5. **Toggle Debug Mode:** Click the 🐛 icon → Enables verbose logging (auto-expires in 4 hours)
6. **Access Database:** Go to **Observability** → **Database** tab → Run read-only queries
7. **SSH Terminal:** Go to **Observability** → **Terminal** tab → Break-glass access (15 min session)

#### Put Environment in Maintenance Mode
1. Go to **Environments** → Find the environment
2. Click the 🔧 icon
3. Enter reason: "Database migration" / "Configuration update"
4. Environment shows maintenance page to end users
5. Perform your maintenance tasks
6. Click 🔧 again to disable maintenance mode

#### Create a Sandbox for Testing
1. Go to **Sandboxes** → Click **Create Sandbox**
2. Enter purpose: "Testing flag promotion flow"
3. Click **Create** → VPS provisions (~5 min)
4. Access at `sandbox-{uuid}.featuresignals.com`
5. Sandbox auto-expires after 30 days

#### Renew a Sandbox
1. Go to **Sandboxes** → Find your sandbox
2. Click **Renew** → Extends expiry by 30 days
3. Max 2 renewals (60 days total)

---

## 4. Customer Success (View Only)

### Who: Customer success / support team

### What You Can Do
- View all environments and their status
- View customer list with health scores
- View logs (read-only)
- View audit logs
- Create sandboxes (limited to 2)
- **Cannot** provision, modify, or access financial data

### Key Operations

#### Check Customer Health
1. Go to **Customers**
2. Look at the **Health** column — last health check timestamp
3. Check **Margin** — negative margin customers need attention
4. Click customer name for detail view

#### Check if a Customer's Environment is Down
1. Go to **Environments**
2. Filter by status → Look for `maintenance` or `suspended`
3. Check **Last Health Check** — if old, there may be an issue
4. Notify engineering via Slack if you see problems

#### View Recent Ops Activity
1. Go to **Audit Log**
2. Filter by action type to see what engineers have been doing
3. Use this to answer customer questions about changes

---

## 5. Demo Team (Sandbox Only)

### Who: Sales demo team

### What You Can Do
- View environments (for reference)
- Create and manage sandboxes for demos
- **Cannot** provision, modify customer envs, or view financial/audit data

### Key Operations

#### Create a Demo Sandbox
1. Go to **Sandboxes** → Click **Create Sandbox**
2. Enter purpose: "Demo for prospect XYZ — healthcare vertical"
3. Click **Create**
4. Share the sandbox URL with the prospect
5. Sandbox auto-expires after 30 days

#### Extend a Demo Sandbox
1. If a demo needs more time, click **Renew**
2. Extends by 30 days (max 2 renewals)

---

## 6. Finance (Financial Dashboards)

### Who: Finance team

### What You Can Do
- View financial summary (MRR, costs, margins)
- View revenue by tier
- View top customers and negative margin alerts
- **Cannot** view environments, customers, or provision anything

### Key Operations

#### Check Monthly Financials
1. Go to **Financial** dashboard
2. View:
   - **Total MRR** — Monthly recurring revenue
   - **Total Infrastructure Cost** — What we spend
   - **Gross Margin** — (Revenue - Cost) / Revenue %
3. Review **Revenue by Tier** — which plans are most profitable
4. Check **Negative Margin Customers** — customers costing more than they generate

#### Identify Unprofitable Customers
1. Go to **Financial** → Scroll to "Negative Margin Customers"
2. Review the list — these customers cost more than their MRR
3. Share with customer success for pricing review or plan migration

---

## 7. Common Operations

### Search for a Customer
- Use the search bar on **Environments** or **Customers** page
- Search by name, subdomain, or IP address

### View Logs for a Specific Service
1. Go to **Observability** → **Logs** tab
2. Enter Environment ID
3. Select service: `server`, `dashboard`, `caddy`, or `postgres`
4. Click **Fetch Logs**

### Check Audit Trail
1. Go to **Audit Log**
2. Filter by action type (provision, decommission, SSH access, etc.)
3. See who did what and when

### Restart a Customer's Services
1. Go to **Environments** → Find the environment
2. Click the 🔄 icon
3. Confirms restart → Services restart within ~30 seconds

---

## Troubleshooting

| Issue | What to Do |
|-------|-----------|
| "Access denied" on a page | Check your role in the sidebar — you may not have permission |
| Sandbox expired | Create a new one — expired sandboxes are auto-decommissioned |
| Can't see a customer | They may be on multi-tenant (shared) — search in Customers page |
| VPS provisioning stuck | Check GitHub Actions workflow for failures |
| Logs not loading | Environment may be in provisioning or decommissioned state |

---

**Last Updated:** April 14, 2026
