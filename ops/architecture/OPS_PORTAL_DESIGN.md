# FeatureSignals — Ops Portal Design & Architecture

> **Version:** 1.0.0
> **Status:** Fresh Design — Complete rewrite. No relation to the previous `ops/` Next.js app.
> **Philosophy:** One portal to manage everything — customers, cells, previews, billing, infra, env vars, backups, and observability.
> **Target Audience:** FeatureSignals internal team (founder, engineers, support, sales).

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [Tech Stack](#2-tech-stack)
3. [Architecture & Data Flow](#3-architecture--data-flow)
4. [Pages & Features](#4-pages--features)
5. [UI/UX Design System](#5-uiux-design-system)
6. [Component Architecture](#6-component-architecture)
7. [API Integration](#7-api-integration)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [State Management](#9-state-management)
10. [Testing Strategy](#10-testing-strategy)
11. [CLAUDE.md](#11-claudemd)

---

## 1. Overview & Philosophy

### 1.1 Why a Dedicated Ops Portal?

The customer dashboard (`app.featuresignals.com`) is for end-users managing their
feature flags. The ops portal is for **us** — the FeatureSignals team — to
manage the platform itself.

**What the ops portal does that the customer dashboard doesn't:**

| Capability | Customer Dashboard | Ops Portal |
|---|---|---|
| Manage my feature flags | ✅ | ❌ |
| View my usage & billing | ✅ | ✅ (all customers) |
| Provision new customer cells | ❌ | ✅ |
| Monitor cell health | ❌ | ✅ |
| Manage env vars per cell | ❌ | ✅ |
| View cross-cell metrics | ❌ | ✅ |
| Manage preview environments | ❌ | ✅ |
| Trigger backups & restores | ❌ | ✅ |
| View audit log (all tenants) | ❌ | ✅ |
| Impersonate a customer | ❌ | ✅ |
| Configure global routing | ❌ | ✅ |

### 1.2 Design Principles

1. **Data-dense but not overwhelming** — Show the important numbers first, let
   users drill down. Think Grafana, not Instagram.

2. **Dark theme by default** — Ops tools are used in low-light environments
   (on-call at 3 AM). Dark theme reduces eye strain.

3. **Real-time where it matters** — Cell health, active previews, billing
   metrics update via SSE/polling. No manual refresh.

4. **Keyboard-first** — Every action has a keyboard shortcut. Power users
   should never touch the mouse for common operations.

5. **Everything is a link** — Every cell name, tenant ID, metric is clickable
   and leads to a detail view. Never a dead-end.

6. **Failure is the default** — Every data fetch has loading, error, and empty
   states. The portal must work even when downstream services are down.

7. **Action confirmation for destructive ops** — Delete, deprovision, suspend
   all require confirmation. Optionally with a reason.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Same as customer dashboard, consistent patterns |
| Language | TypeScript 5 (strict) | No `any`, no `@ts-ignore` |
| Styling | Tailwind CSS 4 | Same as dashboard |
| UI Components | Radix UI primitives + custom | Accessible, composable |
| Icons | Lucide React | Lightweight, consistent |
| Charts | Recharts | Simple, React-native |
| Tables | TanStack Table | Virtual scrolling for large datasets |
| State | Zustand + React Query | Zustand for global, React Query for server state |
| Forms | React Hook Form + Zod | Type-safe validation |
| API Client | Custom fetch wrapper (like `lib/api.ts`) | Consistent error handling, auth injection |
| Testing | Vitest + React Testing Library + Playwright | Same as dashboard |

### 2.1 Directory Structure

```
ops-portal/
├── CLAUDE.md                    # Portal-specific rules for AI agents
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
│
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── layout.tsx           # Root layout with sidebar + topbar
│   │   ├── page.tsx             # Redirect to /dashboard
│   │   ├── login/               # Authentication page
│   │   ├── dashboard/           # Main overview
│   │   ├── tenants/             # Customer management
│   │   ├── cells/               # Cell management
│   │   ├── previews/            # Preview environment management
│   │   ├── billing/             # Billing & usage
│   │   ├── env-vars/            # Environment variable management
│   │   ├── backups/             # Backup management
│   │   ├── audit/               # Audit log
│   │   ├── settings/            # Portal settings
│   │   └── system/              # System health (embedded SigNoz)
│   │
│   ├── components/              # Shared UI components
│   │   ├── ui/                  # Primitives (Button, Input, Table, etc.)
│   │   ├── layout/              # Sidebar, Topbar, MainContent
│   │   ├── cells/               # Cell-related components (CellCard, CellStatus)
│   │   ├── tenants/             # Tenant-related components
│   │   ├── billing/             # Billing components (CostBreakdown, InvoiceTable)
│   │   ├── previews/            # Preview management components
│   │   └── system/              # System health widgets
│   │
│   ├── lib/                     # Utilities
│   │   ├── api.ts               # API client (single gateway)
│   │   ├── auth.ts              # Auth context + token management
│   │   ├── utils.ts             # cn(), formatCurrency(), formatBytes(), etc.
│   │   ├── constants.ts         # API endpoints, routes, enums
│   │   └── validators.ts        # Zod schemas for forms
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-tenants.ts       # Tenant queries + mutations
│   │   ├── use-cells.ts         # Cell queries + mutations
│   │   ├── use-previews.ts      # Preview queries
│   │   ├── use-billing.ts       # Billing queries
│   │   ├── use-audit.ts         # Audit log queries
│   │   ├── use-env-vars.ts      # Env var queries + mutations
│   │   └── use-websocket.ts     # Real-time updates via SSE
│   │
│   ├── types/                   # TypeScript interfaces
│   │   ├── tenant.ts            # Tenant, TenantList, ProvisionRequest
│   │   ├── cell.ts              # Cell, CellStatus, CellHealth
│   │   ├── billing.ts           # Invoice, UsageRecord, CostBreakdown
│   │   ├── preview.ts           # Preview, PreviewRequest
│   │   ├── env-var.ts           # EnvVar, EnvVarOverride
│   │   └── api.ts               # API response types, pagination
│   │
│   └── __tests__/               # Test files (mirrors src structure)
│       ├── components/
│       ├── hooks/
│       └── pages/
│
├── public/                      # Static assets
│   └── logo.svg
│
└── e2e/                         # Playwright E2E tests
    ├── login.spec.ts
    ├── tenants.spec.ts
    ├── cells.spec.ts
    └── billing.spec.ts
```

---

## 3. Architecture & Data Flow

### 3.1 How the Ops Portal Connects to the Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                   Browser (Ops Portal UI)                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Tenant Pages  │  │ Cell Pages   │  │ Billing Pages        │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │                 │
│         └─────────────────┼──────────────────────┘                │
│                           │                                       │
│                    ┌──────┴──────┐                                │
│                    │  api.ts     │  ← Single gateway for ALL       │
│                    │  (fetch +   │     API calls. Handles auth,    │
│                    │   auth)     │     retry, error mapping.       │
│                    └──────┬──────┘                                │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTPS + JWT (ops_token)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              FeatureSignals API Server (Go)                      │
│                                                                   │
│  /api/v1/ops/*             → Ops-specific endpoints               │
│  /api/v1/tenants/*         → Shared with customer portal          │
│  /api/v1/cells/*           → Cell management                     │
│                                                                   │
│  Auth: ops_token (separate from customer tokens)                  │
│  Scopes: admin, support, billing, read-only                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Services                               │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ PostgreSQL │  │ SigNoz     │  │ Temporal   │  │ Kubernetes│  │
│  │ (tenant    │  │ (metrics,  │  │ (workflows)│  │ API       │  │
│  │  registry) │  │  logs,     │  │            │  │ (kubectl) │  │
│  │            │  │  traces)   │  │            │  │           │  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow Patterns

**Pattern 1: Standard CRUD (Tenants, Cells, Previews)**
```
Page mounts → useQuery fetches data → displays table/list
User clicks "Create" → opens modal → fills form (Zod validated) →
useMutation sends POST → on success: invalidate query → list refreshes
```

**Pattern 2: Real-time Monitoring (Cell Health)**
```
Page mounts → establishes SSE connection → receives updates →
Zustand store updates → UI re-renders affected components →
Connection lost → auto-reconnect with exponential backoff
```

**Pattern 3: Embedded SigNoz (System Health)**
```
Page mounts → iframe or API proxy to SigNoz →
SigNoz renders its own dashboards inside the ops portal →
No cross-origin issues (same cluster, CORS configured)
```

---

## 4. Pages & Features

### 4.1 Login (`/login`)

```
┌─────────────────────────────────────────────┐
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │                                     │   │
│   │   🔒 FeatureSignals Ops Portal      │   │
│   │                                     │   │
│   │   Email:    [________________]      │   │
│   │   Password: [________________]      │   │
│   │                                     │   │
│   │   [Sign In]                         │   │
│   │                                     │   │
│   │   Forgot password?                  │   │
│   └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

- Independent auth from customer dashboard
- JWT token with 8h expiry, refresh token with 7d expiry
- Rate-limited: 5 attempts per minute per IP
- Audit-logged: every login attempt recorded

**States:**
- `idle` — Form ready for input
- `loading` — "Signing in..." with spinner
- `error` — "Invalid credentials" or "Account locked" (don't reveal which)
- `success` — Redirect to `/dashboard`

**Tests:**
```typescript
// src/__tests__/pages/login.test.tsx
describe('Login Page', () => {
  it('renders email and password fields')
  it('shows error on invalid credentials')
  it('redirects to dashboard on success')
  it('locks after 5 failed attempts')
  it('is accessible (keyboard navigation, ARIA labels)')
})
```

### 4.2 Dashboard (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  Tenants  │  Cells  │ ...  👤 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Active        │  │ Monthly      │  │ Cells        │           │
│  │ Tenants       │  │ Revenue (MRR)│  │ Healthy      │           │
│  │ 42            │  │ €1,847       │  │ 6/6          │           │
│  │ ▲ +3 this wk  │  │ ▲ 12% vs mo │  │ ✅ All green  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Recent Activity (last 24h)                                  │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ 🟢 Acme Corp — Cell provisioned (US-Ashburn, 12s)  2m ago │  │
│  │ 🟢 Preview pr-142 created                         15m ago │  │
│  │ 🔴 Billing failed — Globex Inc (card declined)     1h ago │  │
│  │ 🟢 Backup completed (1.2 GB, 47s)                  3h ago │  │
│  │ 🟡 Preview demo-acme expired (TTL reached)         5h ago │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ System Health                                               │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Cluster: ✅ 1/1 nodes healthy    CPU: 34%  Mem: 62%       │  │
│  │ SigNoz:   ✅ Receiving data      Disk: 47% of 160GB       │  │
│  │ Backups:  ✅ Last: 3h ago        Cert: ✅ 42d remaining   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Data sources:**
- Tenant count: `GET /api/v1/ops/tenants/stats`
- Revenue: `GET /api/v1/ops/billing/mrr`
- Cell health: `GET /api/v1/ops/cells/health`
- Recent activity: `GET /api/v1/ops/audit?since=24h&limit=5`
- System health: `GET /api/v1/ops/system/health`

**States:**
- `loading` — Skeleton cards for all stat blocks
- `partial` — Some data loaded, some failing (show what we have)
- `error` — "Unable to load dashboard. [Retry]" with last-known-good data
- `refreshing` — Data is updating (subtle indicator, don't disrupt layout)

**Tests:**
```typescript
// src/__tests__/pages/dashboard.test.tsx
describe('Dashboard Page', () => {
  it('renders all stat cards with correct values')
  it('shows skeletons while loading')
  it('displays partial data when some APIs fail')
  it('shows retry button on complete failure')
  it('updates activity feed in real-time via SSE')
  it('navigates to detail pages on card click')
})
```

### 4.3 Tenants (`/tenants`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  Tenants  │  Cells  │ ...      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tenants ─────────────────────────────────────────────────── [+] │
│                                                                   │
│  ┌───────────────────────────────────────────────┬──────┬──────┐ │
│  │ Tenant           │ Tier    │ Cell    │ Status │ Cost │ Created│ │
│  ├───────────────────────────────────────────────┼──────┼──────┤ │
│  │ Acme Corp        │ Pro     │ eu-fsn  │ 🟢    │ €19  │ Jan  │ │
│  │   slug: acme-corp│         │ shared  │ Active │      │ 2026 │ │
│  ├───────────────────────────────────────────────┼──────┼──────┤ │
│  │ Globex Inc       │ Free    │ eu-fsn  │ 🟡    │ €0   │ Mar  │ │
│  │   slug: globex   │         │ shared  │ Past Due│      │ 2026 │ │
│  ├───────────────────────────────────────────────┼──────┼──────┤ │
│  │ Initech          │ Ent.    │ us-ash  │ 🟢    │ €247 │ Feb  │ │
│  │   slug: initech  │         │ dedic.  │ Active │      │ 2026 │ │
│  └───────────────────────────────────────────────┴──────┴──────┘ │
│                                                                   │
│  Showing 1-3 of 42  [1] [2] [3] ... [14]                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Search by name, slug, email
- Filter by tier, status, cloud, region
- Sort by any column
- Click tenant → detail page with full info
- Bulk actions: suspend, activate, export CSV

**Tenant Detail (`/tenants/[id]`):**
- Overview: name, slug, tier, status, created date
- API keys list (key_prefix, label, last_used, created)
- Cell assignment (which cell, region, cloud)
- Current bill breakdown
- Activity log for this tenant
- Actions: Suspend, Activate, Deprovision, Impersonate, Migrate Cell

**Tests:**
```typescript
// src/__tests__/pages/tenants.test.tsx
describe('Tenants Page', () => {
  it('lists all tenants with correct data')
  it('searches by name')
  it('filters by tier')
  it('paginates correctly')
  it('shows empty state when no tenants match filter')
  it('navigates to tenant detail on click')
})
```

### 4.4 Cells (`/cells`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  Tenants  │  Cells  │ ...      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Cells ───────────────────────────────────────────────────── [+] │
│                                                                   │
│  ┌──────┬──────────┬──────────┬──────────┬──────────┬──────────┐ │
│  │ Cell │ Region   │ Tenants  │ CPU      │ Mem      │ Status   │ │
│  ├──────┼──────────┼──────────┼──────────┼──────────┼──────────┤ │
│  │eu-fsn│ Falkenstein│ 18      │ ████░   │ ███░░   │ 🟢 Healthy│ │
│  │us-ash│ Ashburn  │ 24      │ ██████  │ ████░   │ 🟢 Healthy│ │
│  │sg-1  │ Singapore│ 0       │ ░░░░░   │ ░░░░░   │ 🟡 Empty   │ │
│  │acme  │ Ashburn  │ 1       │ ██░░░   │ ██░░░   │ 🟢 Healthy│ │
│  │      │ (ded.)   │         │          │          │           │ │
│  └──────┴──────────┴──────────┴──────────┴──────────┴──────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Cell Detail (`/cells/[id]`):**
- Real-time metrics (CPU, memory, disk, network) — updated every 5s via SSE
- Tenant list assigned to this cell
- Resource allocation per tenant
- Pod status (from Kubernetes API)
- Logs stream (from SigNoz, last 100 lines)
- Actions: Scale up/down, Drain (for maintenance), Migrate tenants, Decommission

**States:**
- Cell is healthy: 🟢
- Cell is degraded (>80% resource usage): 🟡
- Cell is down: 🔴
- Cell has no tenants: empty state with provisioning prompt

**Tests:**
```typescript
// src/__tests__/pages/cells.test.tsx
describe('Cells Page', () => {
  it('lists all cells with health status')
  it('shows real-time metrics updates')
  it('displays cell detail with correct data')
  it('handles cell drain gracefully')
  it('shows error state when cell is unreachable')
})
```

### 4.5 Previews (`/previews`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  Tenants  │  Previews │ ...    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Preview Environments ────────────────────────────────────── [+] │
│  (Auto-deleted after TTL. Max: 5 simultaneous)                   │
│                                                                   │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────┐ │
│  │ Name     │ PR/Tag   │ Owner    │ Created  │ TTL      │ Del  │ │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┼──────┤ │
│  │ pr-142   │ feat-    │ dinesh   │ 2h ago   │ 22h rem  │ [x] │ │
│  │          │ new-flag │          │          │          │      │ │
│  │ demo-    │ v1.5.0   │ sales-   │ 3d ago   │ 4d rem   │ [x] │ │
│  │ acme     │          │ alice    │          │          │      │ │
│  │ pr-141   │ hotfix-  │ maria    │ 6h ago   │ 18h rem  │ [x] │ │
│  │          │ crash    │          │          │          │      │ │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴──────┘ │
│                                                                   │
│  Quick Actions: [Create Demo] [Create Sandbox] [Cleanup All]     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Create Demo Modal:**
```
┌─────────────────────────────────────────────┐
│  Create Demo Environment                     │
│                                             │
│  Tag:     [v1.5.0          ] ▼             │
│  Customer:[Acme Corp       ] ▼             │
│  TTL:     [7            ] days             │
│  Data:    [x] Include sample data           │
│                                             │
│  [Cancel]  [Create]                         │
└─────────────────────────────────────────────┘
```

**Tests:**
```typescript
// src/__tests__/pages/previews.test.tsx
describe('Previews Page', () => {
  it('lists active previews with correct data')
  it('shows warning when near max preview limit')
  it('creates a demo environment via modal')
  it('deletes a preview with confirmation')
  it('shows TTL countdown correctly')
  it('disables delete button for non-owners (confirmation required)')
})
```

### 4.6 Billing (`/billing`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  Billing  │ ...                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Billing ─────────────────────────────────────────────────────── │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ MRR          │  │ Avg Revenue  │  │ Churn Rate   │           │
│  │ €1,847       │  │ €44/customer │  │ 2.4% monthly │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Monthly Revenue (last 6 months)                             │  │
│  │  ██                                                         │  │
│  │  ██ ██                                                      │  │
│  │  ██ ██ ██                                                   │  │
│  │  ██ ██ ██ ██                                                │  │
│  │  ██ ██ ██ ██ ██                                             │  │
│  │  ██ ██ ██ ██ ██ ██                                          │  │
│  │  Dec  Jan  Feb  Mar  Apr  May                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Outstanding Invoices                                        │  │
│  ├──────────┬──────────┬──────────┬──────────┬────────────────┤  │
│  │ Tenant   │ Amount   │ Due      │ Status   │ Actions        │  │
│  ├──────────┼──────────┼──────────┼──────────┼────────────────┤  │
│  │ Globex   │ €18.75   │ 3d ago   │ 🔴 Past  │ [Retry] [Note] │  │
│  │ Initech  │ €247.00  │ 12d      │ 🟡 Pending│ [View]        │  │
│  └──────────┴──────────┴──────────┴──────────┴────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Tests:**
```typescript
// src/__tests__/pages/billing.test.tsx
describe('Billing Page', () => {
  it('shows MRR and revenue chart')
  it('lists outstanding invoices')
  it('allows retrying failed payments')
  it('shows per-tenant cost breakdown on click')
  it('displays correct currency formatting')
})
```

### 4.7 Environment Variables (`/env-vars`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  Env Vars  │ ...               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Environment Variables ──────────────────────────────────────── │
│                                                                   │
│  Cell: [eu-fsn (shared cell)          ] ▼  [View Effective]     │
│                                                                   │
│  ┌──────────┬──────────────┬──────────────┬──────────┬────────┐ │
│  │ Key      │ Value        │ Source       │ Override │ Actions│ │
│  ├──────────┼──────────────┼──────────────┼──────────┼────────┤ │
│  │ LOG_LEVEL│ info         │ Global       │ —        │ [Edit] │ │
│  │ OTEL_EN  │ true         │ Global       │ —        │ [Edit] │ │
│  │ CORS_    │ https://app  │ Region       │ eu-fsn   │ [Edit] │ │
│  │ ORIGIN   │ .features..  │              │          │        │ │
│  │ RATE_LIM │ 500          │ Cell         │ —        │ [Edit] │ │
│  │ _EVAL    │              │              │          │        │ │
│  │ FEATURE_ │ true         │ Cell         │ —        │ [Edit] │ │
│  │ _X_ENABLE│              │ (custom)     │          │        │ │
│  └──────────┴──────────────┴──────────────┴──────────┴────────┘ │
│                                                                   │
│  Inheritance: Global → Cloud → Region → Cell → Tenant           │
│  [Learn more about env var precedence]                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Tests:**
```typescript
// src/__tests__/pages/env-vars.test.tsx
describe('Env Vars Page', () => {
  it('shows effective env vars for selected cell')
  it('shows source of truth for each variable')
  it('allows adding/editing cell-level overrides')
  it('validates env var names (uppercase, underscore only)')
  it('shows confirmation before updating live vars')
})
```

### 4.8 Backups (`/backups`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  Backups   │ ...               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Backup Management ──────────────────────────────────────────── │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Last Backup  │  │ Backup Size  │  │ Next Backup  │           │
│  │ 3 hours ago  │  │ 1.2 GB       │  │ in 21 hours  │           │
│  │ ✅ Success   │  │ (7.4 GB total)│ │ (Daily 3 AM) │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Backup History                                              │  │
│  ├──────────┬──────────┬──────────┬──────────┬────────────────┤  │
│  │ Date     │ Type     │ Size     │ Status   │ Actions        │  │
│  ├──────────┼──────────┼──────────┼──────────┼────────────────┤  │
│  │ 2026-05- │ Daily    │ 1.2 GB   │ ✅       │ [Restore] [DL]│  │
│  │ 15 03:00 │          │          │          │                │  │
│  │ 2026-05- │ Weekly   │ 1.1 GB   │ ✅       │ [Restore] [DL]│  │
│  │ 14 03:00 │          │          │          │                │  │
│  │ 2026-05- │ Pre-     │ 1.2 GB   │ ✅       │ [Restore] [DL]│  │
│  │ 13 14:23 │ deploy   │          │          │                │  │
│  └──────────┴──────────┴──────────┴──────────┴────────────────┘  │
│                                                                   │
│  Quick Actions: [Backup Now] [Verify Latest] [Cleanup Old]       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Tests:**
```typescript
// src/__tests__/pages/backups.test.tsx
describe('Backups Page', () => {
  it('shows backup status with last successful time')
  it('lists recent backups with correct metadata')
  it('triggers manual backup')
  it('shows confirmation before restore')
  it('handles backup failure state')
})
```

### 4.9 Audit Log (`/audit`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  Audit     │ ...               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Audit Log ──────────────────────────────────────────────────── │
│                                                                   │
│  Search: [________________________]  Type: [All     ] ▼         │
│  Date: [2026-05-01] → [2026-05-15]                              │
│                                                                   │
│  ┌──────┬──────────┬──────────┬──────────┬────────────────────┐ │
│  │ Time │ Actor    │ Action   │ Target   │ Details            │ │
│  ├──────┼──────────┼──────────┼──────────┼────────────────────┤ │
│  │14:23 │ dinesh   │ cell.    │ eu-fsn   │ Scaled replicas:   │ │
│  │      │          │ update   │          │ 2 → 3              │ │
│  │14:20 │ system   │ backup.  │ —        │ Daily backup:      │ │
│  │      │          │ complete │          │ 1.2 GB, 47s        │ │
│  │13:15 │ sales-   │ preview. │ demo-    │ Created demo for   │ │
│  │      │ alice    │ create   │ acme     │ Acme Corp, 7d TTL  │ │
│  │12:00 │ system   │ billing. │ globex   │ Payment failed:    │ │
│  │      │          │ failed   │          │ card_declined      │ │
│  └──────┴──────────┴──────────┴──────────┴────────────────────┘ │
│                                                                   │
│  Showing 1-4 of 1,247  [1] [2] [3] ... [312]                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Tests:**
```typescript
// src/__tests__/pages/audit.test.tsx
describe('Audit Log Page', () => {
  it('renders paginated audit entries')
  it('filters by action type')
  it('searches by actor name')
  it('shows date range picker')
  it('preserves filters in URL query params')
  it('handles empty state (no matching entries)')
})
```

### 4.10 System Health (`/system`)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 Ops Portal  │  Dashboard  │  System    │ ...               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  System Health ──────────────────────────────────────────────── │
│                                                                   │
│  Cluster Status: ✅ Healthy                                       │
│  ┌──────────────┬──────────┬──────────┬──────────┬────────────┐ │
│  │ Node         │ CPU      │ Memory   │ Disk     │ Status     │ │
│  ├──────────────┼──────────┼──────────┼──────────┼────────────┤ │
│  │ k3s-prod-01  │ 34%      │ 62%      │ 47%      │ ✅ Ready   │ │
│  └──────────────┴──────────┴──────────┴──────────┴────────────┘ │
│                                                                   │
│  Service Status:                                                  │
│  🟢 PostgreSQL       │  🟢 SigNoz          │  🟢 Temporal        │
│  🟢 API Server       │  🟢 Dashboard       │  🟢 Caddy Ingress   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Embedded SigNoz Dashboard (iframe)                          │  │
│  │ ┌────────────────────────────────────────────────────────┐ │  │
│  │ │                                                        │ │  │
│  │ │  SigNoz metrics, traces, and logs rendered here        │ │  │
│  │ │                                                        │ │  │
│  │ └────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Tests:**
```typescript
// src/__tests__/pages/system.test.tsx
describe('System Health Page', () => {
  it('shows node status with resource usage')
  it('shows all service health indicators')
  it('embedded SigNoz iframe loads without errors')
  it('shows degraded state when services are down')
  it('auto-refresh every 30s')
})
```

### 4.11 Settings (`/settings`)

- Ops user management (add/remove ops team members)
- Ops user roles: admin, support, billing, read-only
- Portal preferences (theme, timezone, notification preferences)
- API endpoint configuration (dev/staging/production targets)

---

## 5. UI/UX Design System

### 5.1 Theme

```css
/* Dark theme (default) */
:root {
  --bg-primary: #0f1117;       /* Main background */
  --bg-secondary: #1a1d27;     /* Cards, sidebar */
  --bg-tertiary: #242736;      /* Hover states, inputs */
  --bg-elevated: #2d3045;      /* Modals, dropdowns */

  --text-primary: #e8eaed;     /* Primary text */
  --text-secondary: #9aa0a6;   /* Secondary text, labels */
  --text-muted: #5f6368;       /* Disabled, placeholders */

  --border-default: #333645;   /* Default borders */
  --border-hover: #444759;     /* Hover borders */

  --accent-primary: #6366f1;   /* Primary actions, links (indigo) */
  --accent-hover: #818cf8;     /* Hover state for accent */
  --accent-success: #22c55e;   /* Success, healthy */
  --accent-warning: #f59e0b;   /* Warning, degraded */
  --accent-danger: #ef4444;    /* Error, critical */
  --accent-info: #3b82f6;      /* Info, neutral updates */

  --sidebar-width: 240px;
  --topbar-height: 56px;
}
```

### 5.2 Layout

```
┌──────────────┬──────────────────────────────────────────────────┐
│              │                                                  │
│   Sidebar    │   Topbar (breadcrumbs + search + user menu)      │
│   (fixed)    ├──────────────────────────────────────────────────┤
│              │                                                  │
│   🔒 Ops     │   Main Content Area                              │
│   Portal     │   (scrollable, fills remaining space)            │
│              │                                                  │
│   📊 Dash    │   ┌──────────────────────────────────────────┐  │
│   👥 Tenants │   │                                          │  │
│   🖥 Cells   │   │  Page content goes here                  │  │
│   🎬 Previews│   │                                          │  │
│   💰 Billing │   └──────────────────────────────────────────┘  │
│   🔧 Env Vars│                                                  │
│   💾 Backups │                                                  │
│   📋 Audit   │                                                  │
│   🏥 System  │                                                  │
│   ⚙ Settings │                                                  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### 5.3 Component Library

**Primitives (in `src/components/ui/`):**

| Component | File | Description |
|---|---|---|
| `Button` | `button.tsx` | Variants: primary, secondary, ghost, danger. Sizes: sm, md, lg |
| `Input` | `input.tsx` | With label, error state, icon support |
| `Select` | `select.tsx` | Native select with custom styling |
| `Table` | `table.tsx` | Sortable, filterable, with TanStack Table |
| `Modal` | `modal.tsx` | With title, description, action buttons, close on Escape |
| `ConfirmDialog` | `confirm-dialog.tsx` | Destructive action confirmation with text input |
| `Badge` | `badge.tsx` | Status badges (green, yellow, red, gray) |
| `Card` | `card.tsx` | Stats card with icon, value, trend |
| `Skeleton` | `skeleton.tsx` | Loading skeleton for cards, tables, text |
| `EmptyState` | `empty-state.tsx` | Illustration + message + action button |
| `ErrorState` | `error-state.tsx` | Error message + retry button |
| `Toast` | `toast.tsx` | Success/error/info notifications |
| `Tooltip` | `tooltip.tsx` | Hover tooltip for truncated text |
| `StatusDot` | `status-dot.tsx` | Green/yellow/red dot with pulsing animation |

**Composed Components (in `src/components/{domain}/`):**

| Component | File | Description |
|---|---|---|
| `CellHealthCard` | `cells/cell-health-card.tsx` | Real-time cell status card |
| `TenantTable` | `tenants/tenant-table.tsx` | Filterable, sortable tenant list |
| `CostBreakdown` | `billing/cost-breakdown.tsx` | Transparent cost line items |
| `PreviewCard` | `previews/preview-card.tsx` | Preview environment card |
| `EnvVarEditor` | `env-vars/env-var-editor.tsx` | Inline env var editing |
| `BackupTimeline` | `system/backup-timeline.tsx` | Backup history visualization |
| `ActivityFeed` | `dashboard/activity-feed.tsx` | Recent activity stream |
| `StatCard` | `dashboard/stat-card.tsx` | Metric card with icon and trend |
| `SigNozEmbed` | `system/signoz-embed.tsx` | Embedded SigNoz iframe with loading state |

### 5.4 Responsive Behavior

- **Desktop (1280px+)**: Full sidebar + topbar + content layout
- **Tablet (768-1279px)**: Collapsed sidebar (icons only), full topbar
- **Mobile (< 768px)**: Hidden sidebar (hamburger menu), stacked content
- Data tables collapse to cards on mobile

---

## 6. Component Architecture

### 6.1 Component Tree

```
<RootLayout>
  <AuthProvider>
    <Sidebar>
      <NavItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
      <NavItem icon={Users} label="Tenants" href="/tenants" />
      <NavItem icon={Server} label="Cells" href="/cells" />
      <NavItem icon={Play} label="Previews" href="/previews" />
      <NavItem icon={CreditCard} label="Billing" href="/billing" />
      <NavItem icon={Settings} label="Env Vars" href="/env-vars" />
      <NavItem icon={HardDrive} label="Backups" href="/backups" />
      <NavItem icon={ScrollText} label="Audit" href="/audit" />
      <NavItem icon={HeartPulse} label="System" href="/system" />
      <NavItem icon={Cog} label="Settings" href="/settings" />
    </Sidebar>
    <MainContent>
      <TopBar>
        <Breadcrumbs />
        <SearchBar />
        <UserMenu>
          <Avatar />
          <Dropdown>
            <DropdownItem>Profile</DropdownItem>
            <DropdownItem>Sign Out</DropdownItem>
          </Dropdown>
        </UserMenu>
      </TopBar>
      <PageContent>
        {children}  ← Page-specific content
      </PageContent>
    </MainContent>
  </AuthProvider>
</RootLayout>
```

### 6.2 Data Flow with React Query

```typescript
// src/hooks/use-tenants.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { Tenant, TenantList, ProvisionRequest } from '@/types/tenant';

// Queries
export function useTenants(filters: TenantFilters) {
  return useQuery<TenantList>({
    queryKey: ['tenants', filters],
    queryFn: () => api.listTenants(filters),
    // Data is fresh for 30s, stale after 1min
    staleTime: 30_000,
    gcTime: 60_000,
    // Retry 3 times with exponential backoff
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

export function useTenant(id: string) {
  return useQuery<Tenant>({
    queryKey: ['tenant', id],
    queryFn: () => api.getTenant(id),
    enabled: !!id,
  });
}

// Mutations
export function useProvisionTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: ProvisionRequest) => api.provisionTenant(req),
    onSuccess: () => {
      // Invalidate tenant list to refetch
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      // Also invalidate cells (resource counts changed)
      queryClient.invalidateQueries({ queryKey: ['cells'] });
    },
    onError: (error) => {
      // Show error toast
      toast.error(error.message);
    },
  });
}

export function useSuspendTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.suspendTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant suspended');
    },
  });
}
```

### 6.3 Real-time Updates via SSE

```typescript
// src/hooks/use-websocket.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface SSEMessage {
  type: 'cell.health' | 'preview.created' | 'preview.deleted' | 'backup.complete' | 'billing.failed';
  payload: Record<string, unknown>;
}

export function useSSE(url: string) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const message: SSEMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'cell.health':
          queryClient.invalidateQueries({ queryKey: ['cells'] });
          break;
        case 'preview.created':
        case 'preview.deleted':
          queryClient.invalidateQueries({ queryKey: ['previews'] });
          break;
        case 'backup.complete':
          queryClient.invalidateQueries({ queryKey: ['backups'] });
          break;
        case 'billing.failed':
          queryClient.invalidateQueries({ queryKey: ['billing'] });
          // Show toast for payment failures
          toast.warning('A payment has failed. Check billing page.');
          break;
      }
    };

    es.onerror = () => {
      // Auto-reconnect is built into EventSource
      // It will retry with exponential backoff automatically
      console.warn('SSE connection lost, reconnecting...');
    };

    return () => {
      es.close();
    };
  }, [url, queryClient]);
}
```

---

## 7. API Integration

### 7.1 API Client (`src/lib/api.ts`)

```typescript
// Single gateway for ALL API calls. Never call fetch directly in components.

import { getAuthToken, refreshToken } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_OPS_API_URL || '/api/v1/ops';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  retries?: number;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth = false, retries = 2, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers as Record<string, string>,
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError(401, 'Not authenticated');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
      });

      // Token expired — try refresh
      if (response.status === 401 && !skipAuth) {
        const refreshed = await refreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${getAuthToken()}`;
          const retryResponse = await fetch(`${BASE_URL}${path}`, {
            ...fetchOptions,
            headers,
          });
          if (!retryResponse.ok) {
            throw await parseError(retryResponse);
          }
          return retryResponse.json();
        }
        // Refresh failed — redirect to login
        window.location.href = '/login';
        throw new ApiError(401, 'Session expired');
      }

      if (!response.ok) {
        throw await parseError(response);
      }

      return response.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }

  throw lastError;
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    return new ApiError(
      response.status,
      body.error || 'Unknown error',
      body.request_id
    );
  } catch {
    return new ApiError(response.status, response.statusText);
  }
}

// API methods
export function listTenants(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters) : '';
  return request<{ tenants: Tenant[]; total: number }>(`/tenants${params}`);
}

export function getTenant(id: string) {
  return request<Tenant>(`/tenants/${id}`);
}

export function provisionTenant(req: ProvisionRequest) {
  return request<Tenant>('/tenants', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function getCells() {
  return request<Cell[]>('/cells');
}

export function getCellHealth() {
  return request<CellHealth[]>('/cells/health');
}

export function getMRR() {
  return request<MRRData>('/billing/mrr');
}

export function getAuditLog(params: AuditParams) {
  return request<AuditList>('/audit', { params });
}

// ... more methods for all endpoints
```

### 7.2 Backend API Endpoints

The Go API server exposes these endpoints for the ops portal:

```
GET    /api/v1/ops/auth/login          # Authenticate
POST   /api/v1/ops/auth/refresh        # Refresh token
POST   /api/v1/ops/auth/logout         # Invalidate session

GET    /api/v1/ops/dashboard/stats     # Dashboard overview stats

GET    /api/v1/ops/tenants             # List tenants (paginated, filterable)
GET    /api/v1/ops/tenants/:id         # Get tenant detail
POST   /api/v1/ops/tenants             # Provision new tenant
PUT    /api/v1/ops/tenants/:id         # Update tenant
DELETE /api/v1/ops/tenants/:id         # Deprovision tenant
POST   /api/v1/ops/tenants/:id/suspend    # Suspend tenant
POST   /api/v1/ops/tenants/:id/activate   # Reactivate tenant

GET    /api/v1/ops/cells               # List cells
GET    /api/v1/ops/cells/:id           # Get cell detail
GET    /api/v1/ops/cells/:id/metrics   # Real-time metrics (SSE endpoint)
POST   /api/v1/ops/cells/:id/scale     # Scale cell resources
POST   /api/v1/ops/cells/:id/drain     # Drain cell for maintenance
POST   /api/v1/ops/cells/:id/migrate   # Migrate tenants to another cell

GET    /api/v1/ops/previews            # List active previews
POST   /api/v1/ops/previews            # Create preview/demo
DELETE /api/v1/ops/previews/:id        # Delete preview
PUT    /api/v1/ops/previews/:id/ttl    # Extend TTL

GET    /api/v1/ops/billing/mrr         # Monthly Recurring Revenue
GET    /api/v1/ops/billing/invoices    # Outstanding invoices
POST   /api/v1/ops/billing/invoices/:id/retry  # Retry payment
GET    /api/v1/ops/billing/tenants/:id/cost    # Per-tenant cost breakdown

GET    /api/v1/ops/env-vars            # List env vars (with inheritance)
GET    /api/v1/ops/env-vars/:cell      # Get effective env vars for cell
PUT    /api/v1/ops/env-vars/:cell      # Update cell-level env vars

GET    /api/v1/ops/backups             # List backups
POST   /api/v1/ops/backups             # Trigger manual backup
POST   /api/v1/ops/backups/:id/restore # Restore from backup
GET    /api/v1/ops/backups/status      # Current backup status

GET    /api/v1/ops/audit               # Audit log (paginated, filterable)

GET    /api/v1/ops/system/health       # System health overview
GET    /api/v1/ops/system/services     # Service statuses

GET    /api/v1/ops/users               # Ops user management
POST   /api/v1/ops/users               # Add ops user
PUT    /api/v1/ops/users/:id           # Update ops user role
DELETE /api/v1/ops/users/:id           # Remove ops user
```

---

## 8. Authentication & Authorization

### 8.1 Auth Flow

```
1. User visits ops.featuresignals.com/login
2. Enters email + password
3. POST /api/v1/ops/auth/login
4. Server validates credentials against ops_users table
5. Returns { access_token, refresh_token, user }
6. Token stored in httpOnly cookie + localStorage (for API client)
7. Access token: 8h expiry
8. Refresh token: 7d expiry
9. API client auto-refreshes 5 minutes before expiry
```

### 8.2 User Roles

| Role | Tenant Mgmt | Cell Mgmt | Previews | Billing | Env Vars | Backups | Audit | System | Settings |
|------|-------------|-----------|----------|---------|----------|---------|-------|--------|----------|
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **support** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **billing** | ✅ (view) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (billing) | ❌ | ❌ |
| **read-only** | ✅ (view) | ✅ (view) | ✅ (view) | ✅ (view) | ✅ (view) | ✅ (view) | ✅ | ✅ (view) | ❌ |

### 8.3 Route Protection

```typescript
// src/lib/auth.ts
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export function getServerSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('ops_access_token');
  if (!token) return null;
  // Verify token with API server
  return verifyToken(token.value);
}

// Middleware: protect all ops routes except /login
// src/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('ops_access_token');
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

## 9. State Management

### 9.1 What Goes Where

| State Type | Solution | Examples |
|---|---|---|
| Server data (tenants, cells, etc.) | React Query cache | Tenant list, cell health, invoices |
| Global UI state | Zustand | Sidebar collapsed, theme preference |
| Form state | React Hook Form | Create tenant form, env var editor |
| URL state | Next.js searchParams | Page, filters, search query |
| Real-time updates | SSE + React Query invalidation | Cell health updates |
| Notification toasts | Zustand + Toast component | Success/error messages |

### 9.2 Zustand Store

```typescript
// src/lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'dark',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'ops-portal-ui' }
  )
);
```

---

## 10. Testing Strategy

### 10.1 Test Pyramid

```
        /  E2E (Playwright)  \    ← Critical flows: login, tenant CRUD, cell management
       /   Integration        \   ← Component + hook tests with MSW
      /     Unit Tests         \  ← Pure functions, utils, validators
```

### 10.2 Testing Standards

**Every component, hook, page, and utility must have tests.** No exceptions.

**Naming convention:** `{filename}.test.tsx` (co-located with the source)

**Required test scenarios for every component:**

| Test Type | Description |
|---|---|
| **Render** | Component mounts without crashing |
| **Loading state** | Shows skeleton/spinner while data loads |
| **Error state** | Shows error message when API fails |
| **Empty state** | Shows appropriate message when no data |
| **Primary interaction** | Main user action works (click, submit, toggle) |
| **Edge cases** | Long text, special characters, boundary values |
| **Accessibility** | Keyboard navigation, ARIA labels, focus management |

### 10.3 Mocking Strategy

```typescript
// src/__tests__/setup.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/ops/tenants', () => {
    return HttpResponse.json({
      tenants: [
        { id: '1', name: 'Acme Corp', tier: 'pro', status: 'active' },
        { id: '2', name: 'Globex', tier: 'free', status: 'suspended' },
      ],
      total: 2,
    });
  }),
  // ... more handlers
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 10.4 Test Files to Create

```
src/__tests__/
├── setup.ts                          # MSW server setup
├── components/
│   ├── ui/
│   │   ├── button.test.tsx
│   │   ├── table.test.tsx
│   │   ├── modal.test.tsx
│   │   ├── confirm-dialog.test.tsx
│   │   ├── badge.test.tsx
│   │   ├── card.test.tsx
│   │   ├── skeleton.test.tsx
│   │   ├── empty-state.test.tsx
│   │   ├── error-state.test.tsx
│   │   ├── toast.test.tsx
│   │   └── status-dot.test.tsx
│   ├── cells/
│   │   └── cell-health-card.test.tsx
│   ├── tenants/
│   │   └── tenant-table.test.tsx
│   ├── billing/
│   │   └── cost-breakdown.test.tsx
│   ├── previews/
│   │   └── preview-card.test.tsx
│   ├── dashboard/
│   │   ├── stat-card.test.tsx
│   │   └── activity-feed.test.tsx
│   └── system/
│       ├── signoz-embed.test.tsx
│       └── backup-timeline.test.tsx
├── hooks/
│   ├── use-tenants.test.ts
│   ├── use-cells.test.ts
│   ├── use-previews.test.ts
│   ├── use-billing.test.ts
│   └── use-websocket.test.ts
├── lib/
│   ├── api.test.ts
│   ├── auth.test.ts
│   └── utils.test.ts
└── pages/
    ├── login.test.tsx
    ├── dashboard.test.tsx
    ├── tenants.test.tsx
    ├── cells.test.tsx
    ├── previews.test.tsx
    ├── billing.test.tsx
    ├── env-vars.test.tsx
    ├── backups.test.tsx
    ├── audit.test.tsx
    ├── system.test.tsx
    └── settings.test.tsx
```

E2E tests (Playwright):
```
e2e/
├── login.spec.ts           # Login flow, token refresh, logout
├── tenants.spec.ts         # CRUD, search, filter, pagination
├── cells.spec.ts           # View, scale, drain, migrate
├── billing.spec.ts         # View MRR, retry payment, cost breakdown
├── previews.spec.ts        # Create, delete, extend TTL
├── audit.spec.ts           # Search, filter, pagination
└── system.spec.ts          # Health check, SigNoz embed
```

### 10.5 CI Requirements

```bash
# Every PR must pass:
npm run lint           # ESLint (strict)
npm run typecheck      # tsc --noEmit (strict mode)
npm run test           # vitest (coverage: 80%+)
npm run test:e2e       # Playwright (critical flows)
npx playwright show-report # Generate E2E report
```

---

## 11. CLAUDE.md

```markdown
# FeatureSignals Ops Portal — Development Standards

> **Version:** 1.0.0
> **Applies To:** All code in `ops-portal/`
> **Philosophy:** One portal to manage everything. Data-dense, dark-themed, keyboard-first.

## Architecture

- **App Router only.** All pages under `ops-portal/src/app/`. Never Pages Router.
- **Server components by default.** Only add `"use client"` when you need browser APIs, event handlers, or hooks.
- **React Query** for all server state. Never store API responses in Zustand.
- **Zustand** for UI state only (sidebar, theme, toasts).
- **`lib/api.ts`** is the single API gateway. Never call `fetch` directly in components.
- **`lib/auth.ts`** handles all auth logic. Never write auth logic in components.
- **Path alias** `@/` maps to `ops-portal/src/`. Always use it.

## TypeScript

- **Strict mode is on.** Zero tolerance for `any`.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- All API responses must have typed interfaces in `src/types/`.
- Use discriminated unions for async state: `{ status: 'loading' } | { status: 'error'; error: string } | { status: 'success'; data: T }`.
- No `!` (non-null assertion) without a preceding guard or justifying comment.
- No `@ts-ignore` or `@ts-expect-error` without a linked issue explaining why.

## Component Architecture

- **Every component must have tests.** No exceptions.
- Functional components only.
- Custom hooks for reusable logic (`hooks/use-*.ts`). Hooks must be pure (no side effects outside of React lifecycle).
- UI primitives in `components/ui/`. Page-specific components in `components/{domain}/`.
- Radix UI for accessible interactive elements (dialogs, dropdowns, tooltips, etc.).
- `cn()` from `lib/utils.ts` for conditional Tailwind class merging.
- Error boundaries for every major page section. Use `error.tsx` convention.
- Loading states for every async operation. Use suspense boundaries or explicit loading UI.

## Data Display Patterns

Every data display must handle these states:
1. **Loading** — Skeleton/Spinner
2. **Error** — Error message with retry button
3. **Empty** — Empty state with illustration and action
4. **Success** — Actual data

## Styling

- **Tailwind CSS 4 only.** No CSS modules, styled-components, or inline styles.
- Dark theme is default. Light theme is secondary.
- Design tokens from above. No hardcoded color hex values.
- Mobile-first responsive: base styles for mobile, `sm:`, `md:`, `lg:` for larger screens.

## Testing

- **Every new component, hook, page must have tests.** No exceptions.
- **Test naming:** `describe('ComponentName')` for the block, `it('does X')` for each case.
- Test these states for every component: render, loading, error, empty, interaction, edge cases, accessibility.
- Use MSW for API mocking. Never mock fetch directly.
- Use `@testing-library/user-event` for user interactions (not `fireEvent`).
- E2E tests in Playwright for critical flows only (login, tenant CRUD, cell operations).

## Performance

- Virtual scrolling for tables with > 100 rows (TanStack Virtual).
- Debounce search inputs (300ms).
- Memoize expensive computations with `useMemo`.
- Lazy load chart libraries (Recharts is large).
- Keep bundle size under 200KB (initial load).

## Security

- Ops portal has INDEPENDENT auth from the customer dashboard.
- No customer API keys displayed in the ops portal (except for support purposes, with confirmation).
- All destructive actions require confirmation dialog.
- Audit all ops actions (who did what, when, to which resource).
- Rate limit login attempts (5 per minute).
```

---

## Appendix A: Page Routes & Navigation

| Route | Page | Nav Item | Auth Required |
|---|---|---|---|
| `/login` | Login | No | No |
| `/dashboard` | Dashboard Overview | Yes | Yes |
| `/tenants` | Tenant List | Yes | Yes |
| `/tenants/[id]` | Tenant Detail | No (from list) | Yes |
| `/cells` | Cell List | Yes | Yes |
| `/cells/[id]` | Cell Detail | No (from list) | Yes |
| `/previews` | Preview List | Yes | Yes |
| `/billing` | Billing Dashboard | Yes | Yes (billing+) |
| `/env-vars` | Environment Variables | Yes | Yes (admin+) |
| `/env-vars?cell=[id]` | Env Vars (filtered) | No | Yes (admin+) |
| `/backups` | Backup Management | Yes | Yes (admin+) |
| `/audit` | Audit Log | Yes | Yes (read-only+) |
| `/system` | System Health | Yes | Yes (read-only+) |
| `/settings` | Portal Settings | Yes | Yes (admin) |

## Appendix B: Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `g d` | Go to Dashboard |
| `g t` | Go to Tenants |
| `g c` | Go to Cells |
| `g p` | Go to Previews |
| `g b` | Go to Billing |
| `g e` | Go to Env Vars |
| `g k` | Go to Backups |
| `g a` | Go to Audit |
| `g s` | Go to System |
| `/` | Focus search bar |
| `n` | Create new (context-dependent) |
| `r` | Refresh current page data |
| `?` | Show keyboard shortcuts help |

## Appendix C: Color Semantic Mapping

| Context | Color | Hex |
|---|---|---|
| Success, healthy | Green | `#22c55e` |
| Warning, degraded | Yellow | `#f59e0b` |
| Error, critical | Red | `#ef4444` |
| Info, neutral | Blue | `#3b82f6` |
| Primary action | Indigo | `#6366f1` |
| Paused, inactive | Gray | `#6b7280` |
| New, creating | Cyan | `#06b6d4` |
```
