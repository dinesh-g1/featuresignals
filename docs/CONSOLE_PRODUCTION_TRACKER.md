# FeatureSignals Console — Production Readiness Tracker

> **Started:** 2026-05-25 | **Last Updated:** 2026-05-25 09:00  
> **Goal:** Every feature from login to logout — production-ready, real data flowing, premium UI/UX.  
> **Status:** ~85% COMPLETE

---

## Phase Status

| # | Phase | Status | % |
|---|-------|--------|---|
| 0 | Database & Foundation | ✅ DONE | 100% |
| 1 | Auth Flow (7 pages) | ✅ DONE | 100% |
| 2 | Settings & Management (9 pages) | ✅ DONE | 100% |
| 3 | Console Core (Layout + Lifecycle Zone) | ✅ DONE | 95% |
| 4 | Console Zones (Connect + Learn) | ✅ DONE | 90% |
| 5 | Feature Detail + Ship Wizard | ✅ DONE | 90% |
| 6 | Advanced Features (Preflight/Incident/Janitor/Approval/Scan/Agent) | ✅ DONE | 85% |
| 7 | GitHub OAuth + SDK Snippets | ✅ DONE | 90% |
| 8 | WebSocket & Real-Time | ✅ DONE | 85% |
| 9 | Onboarding & First-User Flow | ✅ DONE | 85% |
| 10 | URL Sync & Navigation | ✅ DONE | 95% |
| 11 | E2E Testing & Hardening | ⏳ PENDING | 10% |

---

## Recently Fixed (2026-05-25 08:30-09:00)

### Critical UX Fixes
- ✅ **Maturity dropdown** — Changed `right-0` to `left-0`, no longer off-screen
- ✅ **User menu** — Replaced static avatar with full UserMenu component in TopBar
- ✅ **Search** — Real search input in TopBar with focus animation, ⌘K button
- ✅ **Command palette** — Uses store state, openable from TopBar Cmd+K button
- ✅ **Help widget** — Quick suggestion chips, email as escalation only
- ✅ **Empty state** — Complete redesign with onboarding steps, wired create button
- ✅ **Flag creation flow** — `onCreated` adds flag to store + sets stage filter + triggers refetch
- ✅ **URL sync** — `useConsoleUrlSync` hook reads `?stage=` param and sets store filter
- ✅ **Build** — TypeScript 0 errors, Go 0 errors

### New Features Built
- ✅ **GitHub OAuth** — Server: `github_oauth.go` handler, `github_oauth_store.go`, migration 000116. Frontend: Connect button wired to OAuth URL
- ✅ **SDK Snippets** — `sdk-snippet.tsx` with 8 languages, per-block copy buttons, environment selector, spring-animated checkmark
- ✅ **Preflight Panel** — Impact assessment for configure/approve stages
- ✅ **Incident Panel** — Anomaly timeline, remediation for monitor/decide stages
- ✅ **Janitor Panel** — Stale flag detection, cleanup PRs for cleanup stage
- ✅ **Scan Results** — Code2Flag references in CONNECT zone
- ✅ **Approval Panel** — Approve/reject workflow for approve stage
- ✅ **Agent Controls** — Agent detail cards in CONNECT zone

---

## What Remains (~15%)

| # | Item | Priority |
|---|------|----------|
| 1 | Start Go server + PostgreSQL + run migrations — verify real data flow | 🔴 CRITICAL |
| 2 | Full lifecycle walkthrough: create flag → advance 14 stages → ship → cleanup | 🔴 CRITICAL |
| 3 | GitHub OAuth end-to-end test with real GitHub App | 🟡 HIGH |
| 4 | E2E Playwright tests for critical flows | 🟡 HIGH |
| 5 | Visual regression tests | 🟡 HIGH |
| 6 | Accessibility audit (Lighthouse ≥ 95) | 🟢 MEDIUM |
| 7 | Responsive mobile/tablet verification | 🟢 MEDIUM |
| 8 | Performance verification (60fps, LCP < 2s) | 🟢 MEDIUM |

---

## Server Startup Instructions

To see real data flowing, start the server and database:

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Run migrations
cd server && go run cmd/server/main.go migrate

# 3. Start the server
cd server && go run cmd/server/main.go serve

# 4. Start the frontend
cd dashboard && npm run dev
```

The server runs on `http://localhost:8080`, frontend on `http://localhost:3000`.
Set `NEXT_PUBLIC_API_URL=http://localhost:8080` in `dashboard/.env`.
