# FeatureSignals Operations Portal

Internal operations portal for managing FeatureSignals infrastructure, customers, licenses, and environments.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (port 3001)
npm run dev

# Build for production
npm run build
```

Access at: http://localhost:3001

## Authentication

The ops portal has **independent authentication** from the customer dashboard.

### Default Admin Account

On first run, the migration `000092_ops_portal_auth` creates a founder account. Set up credentials via the API:

```bash
# Create ops user credentials (run after migration)
curl -X POST http://localhost:8080/api/v1/ops/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@featuresignals.com", "password": "admin123"}'
```

> **⚠️ Change the default password immediately after first login.**

### Login Flow

1. Navigate to `/login`
2. Enter email and password
3. Token is stored in `localStorage` under `ops_access_token`
4. Session expires after 8 hours (access token) / 7 days (refresh token)
5. Auto-refresh happens 5 minutes before expiry

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Overview metrics, MRR, customer count |
| Environments | `/environments` | List, provision, manage customer environments |
| Customers | `/customers` | Customer list with health scores |
| Licenses | `/licenses` | License CRUD, quota overrides |
| Sandboxes | `/sandboxes` | Internal sandbox environment management |
| Financial | `/financial` | Cost tracking, revenue, margin analysis |
| Audit | `/audit` | Full audit trail of all ops actions |
| Ops Users | `/ops-users` | Manage ops portal user access |
| Observability | `/observability` | Logs, metrics, traces |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Ops Portal (Next.js)                       │
│                    ops.featuresignals.com                     │
│                                                               │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌──────────────┐  │
│  │Dashboard │ │Environments│ │ Customers  │ │ Licenses     │  │
│  └──────────┘ └───────────┘ └────────────┘ └──────────────┘  │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌──────────────┐  │
│  │Sandboxes │ │Financial  │ │ Audit Log  │ │ Ops Users    │  │
│  └──────────┘ └───────────┘ └────────────┘ └──────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ REST API (independent auth)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              FeatureSignals API Server (Go)                   │
│                                                               │
│  /api/v1/ops/auth/login     — Independent ops login          │
│  /api/v1/ops/auth/refresh   — Token refresh                  │
│  /api/v1/ops/auth/logout    — Session invalidation            │
│  /api/v1/ops/environments/* — Environment CRUD + provisioning │
│  /api/v1/ops/licenses/*     — License management             │
│  /api/v1/ops/sandboxes/*    — Sandbox management             │
│  /api/v1/ops/financial/*    — Cost & revenue data            │
│  /api/v1/ops/audit          — Audit log queries              │
│  /api/v1/ops/users/*        — Ops user management            │
│  /api/v1/ops/customers/*    — Customer data                  │
└──────────────────────────────────────────────────────────────┘
```

## API Client

All API calls go through `ops/src/lib/api.ts`. Never call `fetch` directly in components.

```typescript
import * as api from "@/lib/api";

// Login
const response = await api.login("admin@featuresignals.com", "password");
api.persistAuth(response);

// List environments
const { environments, total } = await api.listEnvironments({ status: "active" });

// Provision environment
const env = await api.provisionEnvironment({
  customer_name: "Acme Corp",
  org_id: "org_xxx",
  vps_type: "dedicated",
  region: "us",
  plan: "cax21",
});
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API server URL | `http://localhost:8080` |

## Deployment

```bash
# Production build
npm run build

# Start production server
npm start
```

The ops portal runs on its own VPS, separate from customer-facing infrastructure.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| State | Zustand with localStorage persistence |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Charts | Recharts |
| Tables | TanStack Table |
| API Client | Custom fetch wrapper with retry, timeout, deduplication |
