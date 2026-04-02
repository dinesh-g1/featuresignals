# FeatureSignals Dashboard

The admin UI for FeatureSignals -- a Next.js application for managing feature flags, targeting rules, segments, environments, and team access.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4, Radix UI primitives
- **State:** TanStack Query (server state), Zustand (client state)
- **Icons:** Lucide React
- **Auth:** JWT-based (tokens from the Go API server)

## Prerequisites

- Node.js 22+
- The FeatureSignals API server running at `http://localhost:8080` (see [Server README](../server/README.md))

## Quick Start

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev
```

The dashboard runs at **http://localhost:3000** and expects the API server at the URL configured in `NEXT_PUBLIC_API_URL`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | URL of the FeatureSignals API server |

For local development, no `.env` file is needed if the API server runs on the default port.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build (standalone output) |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Key Features

- **Flag Management** -- create, toggle, and configure feature flags with a visual targeting rules editor
- **Percentage Rollouts** -- slider-based rollout configuration with sticky user assignment
- **Segment Editor** -- define reusable audience segments with attribute-based conditions
- **Environment Switcher** -- global sidebar selector, color-coded (green/yellow/red for dev/staging/prod)
- **Approval Workflows** -- request, review, approve, or reject production changes
- **Kill Switch** -- one-click emergency flag disable that bypasses approval workflows
- **Flag Health** -- dashboard showing stale, expiring, and expired flags with health scores
- **Evaluation Metrics** -- bar charts of top flags, reason breakdowns, per-environment filtering
- **Audit Log** -- searchable activity feed with actor, timestamp, and before/after diffs
- **Command Palette** -- `Cmd+K` search across all flags
- **API Key Management** -- create and manage server and client API keys per environment
- **Team Management** -- invite members with role-based access (Owner, Admin, Developer, Viewer)
- **Flag Scheduling** -- set auto-enable/disable times for flag launches
- **Mutual Exclusion** -- configure flag groups where only one flag can be active per user
- **A/B Variants** -- manage experiment variants with weight distribution

## Project Structure

```
dashboard/
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # Reusable UI components
│   │   └── ui/          # Base primitives (Button, Dialog, Switch, Tabs, ...)
│   ├── lib/             # API client, utilities, auth helpers
│   └── stores/          # Zustand state stores
├── public/              # Static assets
├── next.config.ts
├── postcss.config.mjs
└── tailwind.config.ts
```

## Docker

The dashboard is built as a standalone Next.js application:

```bash
docker build -f ../deploy/docker/Dockerfile.dashboard \
  --build-arg NEXT_PUBLIC_API_URL=https://api.featuresignals.com \
  -t featuresignals-dashboard .
docker run -p 3000:3000 featuresignals-dashboard
```

## Running with the Full Stack

From the repository root:

```bash
docker compose up
```

This starts PostgreSQL, runs migrations, launches the API server, and starts the dashboard -- all wired together.
