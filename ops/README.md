# FeatureSignals Operations Portal

Internal operations portal for managing FeatureSignals infrastructure, customers, licenses, and environments.

> **Access:** Restricted to `@featuresignals.com` email addresses only.  
> **Auth:** Same credentials as `app.featuresignals.com`. No separate account needed.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (port 3001)
npm run dev

# Or from project root:
make dev-ops
```

Access at: http://localhost:3001

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](./docs/USER_GUIDE.md) | Step-by-step instructions for each role (Founder, Engineer, Customer Success, Demo Team, Finance) |
| [Setup Guide](./docs/SETUP_GUIDE.md) | Deployment options, VPS setup, Docker Compose, Caddy configuration |
| [Architecture Strategy](./docs/infrastructure-architecture-strategy.md) | Complete infrastructure design document |
| [Operations Runbook](./docs/operations-runbook.md) | Common operations, debugging procedures, emergency contacts |

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Ops Portal (Next.js)                    │
│                    ops.featuresignals.com                  │
│                                                            │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐  │
│  │Dashboard │ │Environments│ │ Customers  │ │ Licenses  │  │
│  └──────────┘ └───────────┘ └────────────┘ └───────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐  │
│  │Sandboxes │ │Financial  │ │Observability│ │ Audit Log │  │
│  └──────────┘ └───────────┘ └────────────┘ └───────────┘  │
└────────────────────────┬───────────────────────────────────┘
                         │
                         │ REST API
                         │ /api/v1/ops/*
                         ▼
┌────────────────────────────────────────────────────────────┐
│              FeatureSignals API Server (Go)                │
│              api.featuresignals.com                        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/v1/ops/* route group                           │  │
│  │  ├── /environments (CRUD, provision, decommission)   │  │
│  │  ├── /licenses (create, revoke, quota override)      │  │
│  │  ├── /sandboxes (create, renew, decommission)        │  │
│  │  ├── /financial/costs/daily                          │  │
│  │  ├── /financial/costs/monthly                        │  │
│  │  ├── /financial/summary                              │  │
│  │  ├── /customers (list, detail)                       │  │
│  │  ├── /users (ops users CRUD)                         │  │
│  │  └── /audit (ops audit log)                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Auth: JWT + RequireDomain("featuresignals.com")          │
└────────────────────────┬───────────────────────────────────┘
                         │
                         │ SQL
                         ▼
┌────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16                           │
│                                                            │
│  Tables created by migrations 000038-000043:               │
│  ├── customer_environments (env registry)                  │
│  ├── licenses (unified license management)                 │
│  ├── license_quota_breaches (breach tracking)              │
│  ├── license_usage_snapshots (usage history)               │
│  ├── ops_users (portal access control)                     │
│  ├── ops_audit_log (full audit trail)                      │
│  ├── org_cost_daily (daily cost attribution)               │
│  ├── sandbox_environments (internal sandboxes)             │
│  └── org_cost_monthly_summary (view)                      │
└────────────────────────────────────────────────────────────┘
```

---

## Roles & Permissions

| Role | Access |
|------|--------|
| **Founder** | Full access — everything |
| **Engineer** | Provision, debug, manage licenses, sandboxes (no finance) |
| **Customer Success** | View environments, customers, logs (no modifications) |
| **Demo Team** | View environments, create/manage sandboxes |
| **Finance** | Financial dashboards only |

---

## Deployment Recommendation

Deploy the ops portal on a **dedicated Hetzner VPS** (cx22, €4.51/mo) rather than sharing with customer-facing services. See [Setup Guide](./docs/SETUP_GUIDE.md) for detailed instructions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| State Management | Zustand with localStorage persistence |
| Icons | Lucide React |
| Charts | Recharts |
| Tables | TanStack Table |
| API Client | Custom fetch wrapper with retry, timeout, deduplication |
| Auth | Shared JWT with main dashboard (separate localStorage keys) |

---

## File Structure

```
ops/
├── docs/                          # Documentation
│   ├── USER_GUIDE.md              # Role-based user guide
│   ├── SETUP_GUIDE.md             # Deployment guide
│   ├── infrastructure-architecture-strategy.md
│   └── operations-runbook.md
├── src/
│   ├── app/
│   │   ├── (app)/                 # Protected routes
│   │   │   ├── layout.tsx         # App layout with AuthGuard
│   │   │   ├── dashboard/         # Overview dashboard
│   │   │   ├── environments/      # Environment management
│   │   │   ├── customers/         # Customer management
│   │   │   ├── licenses/          # License management
│   │   │   ├── sandboxes/         # Sandbox management
│   │   │   ├── observability/     # Logs, DB, metrics, terminal
│   │   │   ├── financial/         # Cost & revenue analysis
│   │   │   ├── audit/             # Audit log viewer
│   │   │   └── ops-users/         # Ops user management
│   │   ├── login/page.tsx         # Login page (public)
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── auth-guard.tsx         # Authentication guard
│   │   ├── sidebar.tsx            # Navigation sidebar
│   │   ├── header.tsx             # Top header bar
│   │   └── loading-spinner.tsx    # Loading indicator
│   ├── lib/
│   │   ├── api.ts                 # API client
│   │   ├── types.ts               # TypeScript types
│   │   └── utils.ts               # Utility functions
│   └── stores/
│       └── app-store.ts           # Zustand state management
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.js
└── .env.example
```
