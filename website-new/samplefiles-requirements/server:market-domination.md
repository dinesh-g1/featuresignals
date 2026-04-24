# Backend Implementation Gaps for Market Domination

Based on the `website-new` marketing claims, the `server` needs the following implementations to avoid "vaporware" accusations during enterprise PoCs.

### 1. AI Janitor (GitHub App Integration)
* **Current State:** `cmd/stalescan/main.go` exists, but it only detects stale flags.
* **Missing:** We need a GitHub App integration in `internal/integrations/github` that can authenticate via short-lived tokens, clone the repository, run a regex/AST parser to remove the `if (fs.isEnabled("flag"))` block, and open a Pull Request.

### 2. The "Escape Hatch" (Migration Engine)
* **Current State:** `internal/migrate` exists, but is currently used for SQL migrations.
* **Missing:** We need an API endpoint `POST /api/v1/import/launchdarkly`. It must accept an LD API key, fetch their environments/flags via LD REST API, and map them to our internal `project`/`environment` schemas instantly.

### 3. Edge Node Data Plane
* **Current State:** `cmd/relay` exists (likely a proxy).
* **Missing:** To claim "Sub-millisecond Edge Latency," we need a Wasm-compiled evaluation engine that runs on Cloudflare Workers/Vercel Edge, syncing rules via a decentralized Redis stream rather than polling the core PostgreSQL database.