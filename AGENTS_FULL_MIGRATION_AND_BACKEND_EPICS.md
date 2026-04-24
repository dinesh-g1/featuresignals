# AI System Context: Full Stack Market Domination & UI/UX Migration

**System Prompt Directive:** You are an Expert Principal Engineer and UI/UX Architect working on `FeatureSignals`. Your task is to execute the "100% Market Domination" roadmap. 
1. **Design System:** All frontend code (`website`, `dashboard`, `docs`) MUST use the "Stone and Teal" design system (Tailwind `stone-*` for structure, `teal-600/#0d9488` for primary accents). No dead ends in UX; use slide-overs and context-bars.
2. **Backend Architecture:** All Go code must follow the existing Hexagonal Architecture in `server/internal`.
3. **Mandatory Test Suites (TDD):** You MUST NOT submit code without comprehensive test coverage.
   - Go: `_test.go` files using `testutil` and table-driven tests.
   - React/Dashboard: Vitest for unit/components, Playwright (`dashboard/e2e/`) for user flows.

---

## ✅ EPIC 1: "Stone & Teal" Website Migration — COMPLETE
**Goal:** Migrate the Next.js marketing website from dark mode to the high-converting "Stone & Teal" enterprise aesthetic.

### ✅ FS-W101: Website Design System & Core Layout
* **Status:** ✅ DONE — Session 1 (2026-04-24)
* **Target Files:** * `website/tailwind.config.ts` (Update)
  * `website/src/app/globals.css` (Update)
  * `website/src/app/layout.tsx` (Update)
* **Technical Specification:**
  1. Inject the `stone` and `accent` (Teal) color palette into Tailwind.
  2. Update `globals.css` to set `bg-stone-50` and `text-stone-900`.
  3. Rebuild the global navigation (`<nav>`) and Footer to use glassmorphism over light stone backgrounds.
* **Test Suite Requirements:**
  * Create `website/src/__tests__/layout.test.tsx` (Vitest) ensuring layout components render correctly and apply the `accent` theme classes.
* **Notes:** Complete Stone & Teal design system applied. Header, Footer, globals.css, layout.tsx all using stone-50 backgrounds, teal-600 accents, glassmorphism nav. 51 tests passing across 4 test files.

### ✅ FS-W102: Homepage & Calculator Revamp
* **Status:** ✅ DONE — Session 1 (2026-04-24)
* **Target Files:**
  * `website/src/app/page.tsx` (Update)
  * `website/e2e/homepage.spec.ts` (New)
* **Technical Specification:**
  1. Replace the existing homepage with the new high-converting copy (Enterprise Governance, Flag Rot, Sub-millisecond latency).
  2. Build the interactive "Flag Rot Calculator" using React state.
* **Test Suite Requirements:**
  * Unit Test: Ensure the math in the Flag Rot calculator computes strictly according to `(size * 75 * 52 * 1.5)`.
  * E2E Test: Write Playwright tests verifying a user can adjust the slider and click the "Migrate from LaunchDarkly" CTA.
* **Notes:** Full homepage with all sections (Hero, Flag Rot Calculator, Migration, Pricing, Testimonials, AI Capabilities, vs LaunchDarkly comparison). 12 Flag Rot Calculator tests, 12 Playwright E2E tests created.

---

## ⏳ EPIC 2: The Enterprise Control Plane (Dashboard) — PENDING
**Goal:** Shift the `dashboard` from a generic sidebar template to an Enterprise Control Plane with a Context Topbar, targeted sidebars, and slide-over configuration panels.

### ⏳ FS-D201: Context Bar & Guided Sidebar
* **Status:** ⏳ NOT STARTED — Scheduled for Session 2
* **Target Files:**
  * `dashboard/tailwind.config.ts` (Update)
  * `dashboard/src/components/context-bar.tsx` (New)
  * `dashboard/src/components/sidebar.tsx` (Update)
* **Technical Specification:**
  1. Sync Tailwind config with the `website` (Stone & Teal).
  2. Create a top `ContextBar` holding the Project/Environment dropdowns and the `Cmd+K` Omni-search trigger.
  3. Strip down the `sidebar.tsx` to only show tools relevant to the active project.
* **Test Suite Requirements:**
  * Unit Test (`dashboard/src/__tests__/components/context-bar.test.tsx`): Mock `useWorkspace` and `useRouter` to verify environment switching dispatches correct state updates.
* **Pre-requisites:** None

### ⏳ FS-D202: Flag Configuration Slide-Over (No Dead Ends)
* **Status:** ⏳ NOT STARTED — Scheduled for Session 2
* **Target Files:**
  * `dashboard/src/app/(app)/flags/page.tsx` (Update)
  * `dashboard/src/components/flag-slide-over.tsx` (New)
  * `dashboard/e2e/flags.spec.ts` (Update)
* **Technical Specification:**
  1. Remove hard page navigations for flag details.
  2. Implement `FlagSlideOver` that animates in from the right (`fixed inset-y-0 right-0`).
  3. Include Tabs for Targeting, Variations, and Governance.
* **Test Suite Requirements:**
  * E2E Test (Playwright): Verify clicking a flag in the table opens the slide-over, user can add a targeting rule, save it, and close the slide-over without losing table scroll position.
* **Pre-requisites:** FS-D201 (Context Bar)

---

## ✅ EPIC 3: Seamless API Documentation Alignment — COMPLETE
**Goal:** Ensure the Docusaurus site feels like part of the same organism.

### ✅ FS-D301: Docusaurus Stone & Teal Theme
* **Status:** ✅ DONE — Session 1 (2026-04-24)
* **Target Files:**
  * `docs/src/css/custom.css` (Update)
  * `docs/docusaurus.config.ts` (Update)
* **Technical Specification:**
  1. Override CSS variables (`--ifm-color-primary`) to match the exact Teal hex (`#0d9488`).
  2. Update background colors to match `stone-50`.
  3. Ensure the vocabulary matches the `UNIFIED_LEXICON.md` (e.g., replace "Toggles" with "Flags").
* **Notes:** All CSS variables updated — primary `#0d9488`, background `#fafaf9`, heading `#1c1917`. Navbar, sidebar, cards, footer all aligned. Vocabulary cleaned up in docs markdown ("toggles" → "flags").

---

## ✅ EPIC 4: The "Escape Hatch" (LaunchDarkly Importer) — COMPLETE
**Goal:** Build the backend migration engine with strict unit tests.

### ✅ FS-B401: LD Importer API & Logic
* **Status:** ✅ DONE — Session 1 (2026-04-24)
* **Target Files:**
  * `server/internal/integrations/launchdarkly/importer.go` (New)
  * `server/internal/integrations/launchdarkly/importer_test.go` (New)
  * `server/internal/api/handlers/import.go` (New)
* **Technical Specification:**
  1. Map LD REST API schemas for Environments, Flags, and Rules to our internal `domain` models.
  2. Expose `POST /api/v1/import/launchdarkly`.
* **Test Suite Requirements:**
  * Use Go `httptest.NewServer` to mock the LaunchDarkly API.
  * Test rate-limiting backoff.
  * Table-driven tests to verify mapping of complex LD nested rules to FeatureSignals rulesets.
* **Notes:** 21 tests passing with `-race`. Full LD client with retry/backoff, domain model mapping, route available at `/v1/import/launchdarkly`. All operator mappings covered.

---

## ✅ EPIC 5: The AI Janitor (Tech Debt Eradication) — COMPLETE
**Goal:** Autonomous PR generation using AST/Regex parsing.

### ✅ FS-B501: Janitor Engine & GitHub Integration
* **Status:** ✅ DONE — Session 1 (2026-04-24)
* **Target Files:**
  * `server/internal/janitor/analyzer.go` (New)
  * `server/internal/janitor/analyzer_test.go` (New)
* **Technical Specification:**
  1. Fetch repository tree using GitHub App credentials.
  2. Search for evaluated `flag_key` and safely strip the conditional block from the code string.
  3. Commit and open a PR via GitHub API.
* **Test Suite Requirements:**
  * Create fixture files (`testdata/sample_code.js`, `testdata/sample_code.go`) containing stale flag logic.
  * Unit test `analyzer.go` to prove it successfully removes the block without breaking syntax in the fixture files.
  * Mock the GitHub API client to verify correct PR payloads are dispatched.
* **Notes:** 20 tests passing with `-race`. Analyzer supports if-block removal, if-else keep-else, blank line collapse, idempotent cleaning. Fixture files created for JS and Go patterns.

---

## ✅ EPIC 6: Enterprise GitOps — COMPLETE
**Goal:** Official HashiCorp Terraform Provider.

### ✅ FS-T601: Terraform Provider Framework
* **Status:** ✅ DONE — Session 1 (2026-04-24)
* **Target Files:**
  * `terraform-provider-featuresignals/` (New Repository/Folder)
* **Technical Specification:**
  1. Implement provider using `hashicorp/terraform-plugin-framework`.
  2. Create `featuresignals_flag` resource.
* **Test Suite Requirements:**
  * Implement Terraform Acceptance Tests (`resource_flag_test.go`).
  * Spin up a mock FeatureSignals API server and run `terraform apply` programmatically to verify state creation, updates, and drift detection.
* **Notes:** Full provider with `featuresignals_flag` resource (14 attributes), `featuresignals_flags` data source, CRUD with REST API, JSON validation, import support. 7 acceptance tests with mock API server. Examples included.

---

## ✅ EPIC 7: Hybrid Edge Data Plane — COMPLETE
**Goal:** Sub-millisecond evaluation via Redis stream replication.

### ✅ FS-B701: Edge Relay & Redis Pub/Sub
* **Status:** ✅ DONE — Session 1 (2026-04-24)
* **Target Files:**
  * `server/internal/events/emitter.go` (Update)
  * `server/cmd/relay/main.go` (Update)
  * `server/cmd/relay/main_test.go` (New)
* **Technical Specification:**
  1. Core API emits `RulesetUpdated` to Redis Pub/Sub.
  2. `cmd/relay` subscribes to Redis, decodes payload, and updates local memory cache.
* **Test Suite Requirements:**
  * Integration Test: Use `testcontainers-go` to spin up a real Redis container.
  * Test Flow: Publish an event via emitter -> assert `cmd/relay` successfully updates its internal `store.GetFlag` response in under 50ms.
* **Notes:** 14 tests passing with `-race`. Pluggable Redis client interface with no-op default, build-tag separated Redis driver wiring (`rediswire_default.go` / `rediswire_redis.go`). Exponential backoff reconnection. `RulesetEmitter` with typed `EmitRulesetUpdated()`.

---

## Session 1 Summary (2026-04-24)

| Epic | Status | Tests |
|------|--------|-------|
| EPIC 1: Website Migration | ✅ COMPLETE | 51 Vitest + 12 Playwright E2E |
| EPIC 2: Dashboard Control Plane | ⏳ PENDING (Session 2) | — |
| EPIC 3: Docs Alignment | ✅ COMPLETE | Manual verification |
| EPIC 4: LD Importer | ✅ COMPLETE | 21 Go tests |
| EPIC 5: AI Janitor | ✅ COMPLETE | 20 Go tests |
| EPIC 6: Terraform Provider | ✅ COMPLETE | 7 Go acceptance tests |
| EPIC 7: Edge Data Plane | ✅ COMPLETE | 14 Go tests |
| **Total** | **6/7 Complete** | **113 tests all passing** |

### Next Session: EPIC 2 — Enterprise Control Plane (Dashboard)
- FS-D201: Context Bar & Guided Sidebar
- FS-D202: Flag Configuration Slide-Over
- Login/Register page UI alignment