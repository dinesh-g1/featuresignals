# FeatureSignals — Enterprise Production Polish Prompt Document

> **Status:** Master Prompt Reference  
> **Applies To:** Dashboard, Website-New, Backend (Go Server), Docs, Terraform Provider  
> **Philosophy:** Every change must be production-ready, secure, testable, extensible, and maintainable. No exceptions.

---

## 0. End-to-End Coverage Mandate — "Full Stack or Don't Ship"

**CRITICAL RULE:** Every feature must be implemented end-to-end across ALL layers simultaneously. No siloed work. No "backend only" or "frontend only" tasks. A feature is NOT complete until it works across the full stack.

### 0.1 The Five-Layer Coverage Model

Every feature workstream must explicitly address these five layers:

| Layer | Location | Responsibility | Verification |
|---|---|---|---|
| **Backend API** | `server/internal/` | Go endpoints, business logic, data persistence, caching | `go test`, integration tests |
| **Dashboard UI** | `dashboard/src/app/` | React/Next.js pages, components, client state, API integration | Playwright, Vitest |
| **Website** | `website-new/` | Public-facing marketing pages, feature descriptions, migration docs | E2E tests, visual regression |
| **Documentation** | `docs/` + `dashboard/src/components/docs-link.tsx` | Docusaurus guides, API reference, setup tutorials, dashboard docs links | Link checker, doc tests |
| **SDK / Terraform / IaC** | `terraform-fs/` + `server/internal/integrations/iac/` | Infrastructure-as-code support, provider configs | Acceptance tests |

### 0.2 Definition of Done

Before any feature is marked complete, verify:

- [ ] Backend: API endpoints exist, tested, documented with OpenAPI annotations
- [ ] Backend: Database migrations written (up + down), indexed, `EXPLAIN ANALYZE` verified
- [ ] Dashboard: UI pages exist for the feature (list, create, edit, delete, details)
- [ ] Dashboard: All states handled (loading, empty, error, success, edge cases)
- [ ] Dashboard: API integration via `lib/api.ts` with typed interfaces
- [ ] Website: Public-facing page references the feature (features list, capabilities)
- [ ] Website: No broken links related to the feature
- [ ] Docs: Dedicated docs page(s) covering setup, usage, API reference, troubleshooting
- [ ] Docs: Dashboard inline docs links (`DOCS_LINKS`) point to valid pages
- [ ] IaC: Terraform provider (and other IaC formats) support the feature where applicable
- [ ] Tests: Unit, integration, and acceptance tests for all layers
- [ ] Observability: Logging, metrics, error tracking for the new feature

### 0.3 Coverage Matrix Per Workstream

| Workstream | Backend | Dashboard | Website | Docs | IaC | Status |
|---|---|---|---|---|---|---|
| 1. Color Migration | N/A | Required | Required | N/A | N/A | Spec complete |
| 2. Migration Importers | Required | Required | Done | Required | In export | Needs docs |
| 3. Slide-Over Panels | N/A | Required | N/A | N/A | N/A | Spec complete |
| 4. Premium Icons | N/A | Required | N/A | N/A | N/A | Spec complete |
| 5. AI Janitor | Required | Required | Done | Required | N/A | Needs docs |
| 6. Broken Links | N/A | Required | Required | Required | N/A | Spec complete |
| 7. Multi-IaC Providers | Required | Required | Done | Required | Required | Needs docs |

### 0.4 Common Anti-Patterns To Avoid

- ❌ "Backend implements the importer but dashboard migration UI comes in a future PR"
- ❌ "Docs can be written later after the API is stable"
- ❌ "The website migration section references features that don't exist yet"
- ❌ "Terraform provider supports the resource but there's no documentation"
- ❌ "Dashboard links to a docs page that hasn't been created"
- ❌ "I'll add loading/error states in a follow-up"

---

## Table of Contents

0. [End-to-End Coverage Mandate](#0-end-to-end-coverage-mandate)
1. [UI/UX Pixel-Perfect Color Migration](#1-uiux-pixel-perfect-color-migration)
2. [Backend Migration Support — Unleash & Flagsmith Importers](#2-backend-migration-support--unleash--flagsmith-importers)
3. [Uniform Slide-Over Panel Design](#3-uniform-slide-over-panel-design)
4. [Premium Iconography Across Dashboard](#4-premium-iconography-across-dashboard)
5. [AI Janitor — Production-Ready Implementation](#5-ai-janitor--production-ready-implementation)
6. [Fix All Broken Links](#6-fix-all-broken-links)
7. [Production-Ready Terraform Provider + Migration Expansion](#7-production-ready-terraform-provider--migration-expansion)
8. [Execution Order & Dependencies](#8-execution-order--dependencies)
9. [Quality Checklist](#9-quality-checklist)

---

## 1. UI/UX Pixel-Perfect Color Migration

**Problem:** Many dashboard pages and website components still use the old color scheme (`indigo-*`, `slate-*`, `text-slate-*`, `bg-slate-*`, `bg-indigo-*`, `text-indigo-*`, `ring-indigo-*`, `hover:bg-indigo-*`, `from-indigo-500 to-violet-600`). The new design system uses **teal (`accent` → `#0d9488`)** and **stone** tones (see `dashboard/src/app/globals.css` and `website-new/src/app/globals.css`).

### 1.1 Dashboard Color Audit

Audit and fix **every** dashboard file. Replace all `indigo-*` colors with `accent`/`accent-dark`/`accent-light`, replace all `slate-*` colors with `stone-*` equivalents:

#### Settings Pages

| File | Color Fixes Required |
|---|---|
| `dashboard/src/app/(app)/settings/general/page.tsx` | Replace `indigo-*`, `slate-*`, `text-slate-*`, `bg-slate-*` → `accent`/`stone` |
| `dashboard/src/app/(app)/settings/billing/page.tsx` | Full color palette replacement |
| `dashboard/src/app/(app)/settings/api-keys/page.tsx` | Full color palette replacement |
| `dashboard/src/app/(app)/settings/team/page.tsx` | Full color palette replacement |
| `dashboard/src/app/(app)/settings/webhooks/page.tsx` | Full color palette replacement |
| `dashboard/src/app/(app)/settings/integrations/page.tsx` | Full color palette replacement |
| `dashboard/src/app/(app)/settings/notifications/page.tsx` | Full color palette replacement |
| `dashboard/src/app/(app)/settings/sso/page.tsx` | Full color palette replacement |
| `dashboard/src/app/(app)/settings/layout.tsx` | Replace `border-indigo-600 text-indigo-600` → `border-accent text-accent`, replace `text-stone-*` remains correct but verify |

#### Feature Pages

| File | Color Fixes Required |
|---|---|
| `dashboard/src/app/(app)/segments/page.tsx` | Replace `bg-indigo-50/40`, `hover:bg-indigo-50/30`, `text-indigo-600` → `accent` variants |
| `dashboard/src/app/(app)/environments/page.tsx` | Replace `from-indigo-500 to-violet-600`, `indigo-200`, `indigo-50/30`, `ring-indigo-400/20`, `bg-indigo-600` → `accent` variants |
| `dashboard/src/app/(app)/approvals/page.tsx` | Replace `bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200`, `border-indigo-600 text-indigo-600`, `border-indigo-200 bg-indigo-50/50` → `accent`/`stone` |
| `dashboard/src/app/(app)/flags/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/flags/[flagKey]/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/analytics/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/audit/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/dashboard/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/env-comparison/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/health/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/metrics/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/onboarding/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/target-comparison/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/target-inspector/page.tsx` | Replace old colors |
| `dashboard/src/app/(app)/usage-insights/page.tsx` | Replace old colors |

#### UI Components

| File | Color Fixes Required |
|---|---|
| `dashboard/src/components/ui/badge.tsx` | Ensure badge variants use `accent`/`stone` consistently |
| `dashboard/src/components/ui/button.tsx` | Remove any `indigo-600`, use `accent` instead |
| `dashboard/src/components/ui/page-header.tsx` | Update any old color refs |
| `dashboard/src/components/ui/empty-state.tsx` | Update any old color refs |
| `dashboard/src/components/ui/tabs.tsx` | Ensure uses `accent`/`stone` |
| `dashboard/src/components/ui/loading-spinner.tsx` | Replace `text-indigo-600` → `text-accent` |
| `dashboard/src/components/ui/card.tsx` | Ensure stone-based borders |
| `dashboard/src/components/ui/input.tsx` | Ensure stone-based focus rings |
| `dashboard/src/components/ui/select.tsx` | Ensure stone-based styling |

#### Shared Components

| File | Color Fixes Required |
|---|---|
| `dashboard/src/components/sidebar.tsx` | Full color audit |
| `dashboard/src/components/context-bar.tsx` | Replace old colors |
| `dashboard/src/components/breadcrumb.tsx` | Replace old colors |
| `dashboard/src/components/command-palette.tsx` | Replace old colors |
| `dashboard/src/components/docs-link.tsx` | Replace `text-indigo-600` → `text-accent` |
| `dashboard/src/components/toast.tsx` | Ensure uses `accent`/`stone` |
| `dashboard/src/components/flag-slide-over.tsx` | Full color audit |
| `dashboard/src/components/entity-dialog.tsx` | Full color audit |
| `dashboard/src/components/logo.tsx` | Verify color scheme |
| `dashboard/src/components/verification-banner.tsx` | Full color audit |
| `dashboard/src/components/trial-banner.tsx` | Full color audit |
| `dashboard/src/components/upgrade-banner.tsx` | Full color audit |
| `dashboard/src/components/upgrade-nudge.tsx` | Full color audit |
| `dashboard/src/components/feedback-widget.tsx` | Full color audit |
| `dashboard/src/components/product-tour.tsx` | Full color audit |

### 1.2 Design Token Reference

Use these exact design tokens — **never hardcode hex values**:

```css
/* Correct palette — globals.css */
--accent: #0d9488;         /* teal-600 */
--accent-dark: #0f766e;    /* teal-700 */
--accent-light: #4fd1c5;   /* teal-300 */
--accent-subtle: rgba(13, 148, 136, 0.08);
--accent-glow: rgba(13, 148, 136, 0.25);
--accent-glass: rgba(13, 148, 136, 0.06);

--color-stone-50: #fafaf9;
--color-stone-100: #f5f5f4;
--color-stone-200: #e7e5e4;
--color-stone-300: #d6d3d1;
--color-stone-400: #a8a29e;
--color-stone-500: #78716c;
--color-stone-600: #57534e;
--color-stone-700: #44403c;
--color-stone-800: #292524;
--color-stone-900: #1c1917;
```

**Tailwind CSS 4 usage:** Use `accent`, `stone-*` classes. The `@theme` block in `globals.css` maps them. Do NOT use `indigo-*`, `slate-*`, `violet-*`, or `text-slate-*` anywhere.

---

## 2. Backend Migration Support — Unleash & Flagsmith Importers

**Problem:** The website (`website-new/src/app/page.tsx` lines ~830-910) prominently promises migration from LaunchDarkly, **Unleash**, and **Flagsmith** with commands like `fs migrate --from=unleash` and `fs migrate --from=flagsmith`. However, the backend currently only implements the LaunchDarkly importer (`server/internal/integrations/launchdarkly/importer.go`). No Unleash or Flagsmith importers exist, breaking customer trust.

### 2.1 Create Unleash Importer

**Path:** `server/internal/integrations/unleash/importer.go`

```go
package unleash

// -- API response types --
// LDEnvironment type aliases for Unleash:
// Project, FeatureToggle (with variants, strategies, environments),
// Strategy (flexibleRollout, userWithId, gradualRollout, etc.),
// ActivationStrategy, Segment, ContextField

// -- Data mapping functions --
// MapUnleashFlagToDomain(uf UnleashFlag) domain.Flag
// MapUnleashSegmentToDomain(us UnleashSegment) domain.Segment
// MapUnleashEnvironmentToDomain(ue UnleashEnvironment) domain.Environment
// MapUnleashStrategyToTargetingRules(strategy Strategy) []domain.TargetingRule
```

**Required functionality:**
- Fetch all flags (`GET /api/admin/projects/:projectId/features`)
- Fetch environments (`GET /api/admin/environments`)
- Fetch segments (`GET /api/admin/segments`)
- Fetch strategies for each flag in each environment
- Handle: flexibleRollout strategy (percentage), userWithId (user IDs), gradualRollout (percentage by group), default (standard targeting)
- Handle Unleash variants (with stickiness, weight, payload)
- Handle Unleash feature toggle types: release, experiment, ops, permission, killswitch
- Authentication via Unleash Admin API token (regular client keys with `*:admin` scope)

**Test file:** `server/internal/integrations/unleash/importer_test.go`
- Mock Unleash API responses for all endpoints
- Test flag with all strategy types
- Test segment mapping
- Test edge cases (empty project, no strategies, invalid responses)

### 2.2 Create Flagsmith Importer

**Path:** `server/internal/integrations/flagsmith/importer.go`

```go
package flagsmith

// -- API response types --
// FlagsmithEnvironment, FeatureState (with enabled state, value),
// Segment (with rules, conditions), MultivariateFlagOption,
// Identity (with overrides), SegmentCondition (with operator, value)

// -- Data mapping functions --
// MapFlagsmithFlagToDomain(fs FeatureState) domain.Flag
// MapFlagsmithSegmentToDomain(fs Segment) domain.Segment
// MapFlagsmithEnvironmentToDomain(fe FlagsmithEnvironment) domain.Environment
// MapFlagsmithIdentitiesToOverrides(identities []Identity) []domain.IdentityOverride
```

**Required functionality:**
- Fetch flags per environment (`GET /api/v1/environments/:envId/featurestates/`)
- Fetch environments (`GET /api/v1/projects/:projectId/environments/`)
- Fetch segments (`GET /api/v1/projects/:projectId/segments/`)
- Fetch identities/overrides (`GET /api/v1/environments/:envId/identities/`)
- Handle: multivariate flags with percentage allocation, segment rules with conditions (all/any matching), identity overrides, percentage rollouts per environment
- Handle Flagsmith operators: EQUAL, NOT_EQUAL, GREATER_THAN, LESS_THAN, CONTAINS, NOT_CONTAINS, REGEX, PERCENTAGE_SPLIT
- Authentication via Flagsmith Server-side SDK key (environment key)

**Test file:** `server/internal/integrations/flagsmith/importer_test.go`
- Mock Flagsmith API responses
- Test flag with multivariate options
- Test segment with complex conditions
- Test identity overrides
- Test edge cases

### 2.3 Unified Migration Interface — Extensible Registry Pattern

**Design principle:** The migration system must support any feature flag provider — not just the three we build first. New providers are added by implementing the `Importer` interface and registering with the global registry. No switch statements. No code changes to existing files. Open/Closed Principle.

**File:** `server/internal/integrations/migrator.go`

```go
package integrations

import (
    "context"
    "fmt"
    "sync"

    "github.com/featuresignals/server/internal/domain"
)

// ─── Core Interface ─────────────────────────────────────────────────────────

// Importer defines the contract for migration source providers.
// Every feature flag platform adapter must implement this interface.
type Importer interface {
    // Name returns the provider identifier (e.g., "launchdarkly", "unleash",
    // "flagsmith", "splitio", "configcat", "featbit", "growthbook").
    Name() string

    // DisplayName returns a human-readable name for UI display.
    DisplayName() string

    // FetchFlags retrieves all feature flags from the source platform.
    FetchFlags(ctx context.Context) ([]domain.Flag, error)

    // FetchEnvironments retrieves all environments from the source platform.
    FetchEnvironments(ctx context.Context) ([]domain.Environment, error)

    // FetchSegments retrieves all targeting segments from the source platform.
    FetchSegments(ctx context.Context) ([]domain.Segment, error)

    // ValidateConnection verifies that the configured credentials work
    // against the source platform's API.
    ValidateConnection(ctx context.Context) error

    // Capabilities returns what this provider can import (flags, environments,
    // segments, identities, experiments, etc.) for UI filtering.
    Capabilities() []string
}

// ImporterConfig holds connection details for a migration source.
type ImporterConfig struct {
    Provider  string // provider identifier (registered name)
    APIKey    string // API key or token
    BaseURL   string // base URL (for self-hosted instances)
    ProjectID string // source project/environment identifier
    Extra     map[string]string // provider-specific configuration
}

// ─── Registry Pattern (not switch statement) ────────────────────────────────

// ImporterRegistry holds all registered provider factory functions.
// Providers self-register via the init functions in their packages,
// but registration is explicit at startup — no init() side effects.
type ImporterRegistry struct {
    mu        sync.RWMutex
    factories map[string]ImporterFactory
}

// ImporterFactory creates a configured Importer instance.
type ImporterFactory func(config ImporterConfig) (Importer, error)

var globalRegistry = &ImporterRegistry{
    factories: make(map[string]ImporterFactory),
}

// Register adds a provider factory to the global registry.
// Called during application startup in main().
//
// Usage:
//
//	import "github.com/featuresignals/server/internal/integrations/launchdarkly"
//	integrations.Register("launchdarkly", launchdarkly.NewImporter)
func Register(name string, factory ImporterFactory) {
    globalRegistry.mu.Lock()
    defer globalRegistry.mu.Unlock()
    if _, exists := globalRegistry.factories[name]; exists {
        panic(fmt.Sprintf("importer %q already registered", name))
    }
    globalRegistry.factories[name] = factory
}

// NewImporter creates the appropriate importer for the given config.
// Returns an error if the provider is not registered.
func NewImporter(config ImporterConfig) (Importer, error) {
    globalRegistry.mu.RLock()
    factory, ok := globalRegistry.factories[config.Provider]
    globalRegistry.mu.RUnlock()

    if !ok {
        return nil, fmt.Errorf("%w: unknown migration provider %q — "+
            "available: %v", domain.ErrValidation, config.Provider, ListProviders())
    }

    return factory(config)
}

// ListProviders returns all registered provider names.
func ListProviders() []string {
    globalRegistry.mu.RLock()
    defer globalRegistry.mu.RUnlock()

    names := make([]string, 0, len(globalRegistry.factories))
    for name := range globalRegistry.factories {
        names = append(names, name)
    }
    return names
}

// MustRegister is like Register but panics on duplicate (for testing).
func MustRegister(name string, factory ImporterFactory) {
    Register(name, factory)
}
```

**File:** `server/cmd/server/main.go` (registration point)

```go
package main

import (
    "github.com/featuresignals/server/internal/integrations"
    "github.com/featuresignals/server/internal/integrations/flagsmith"
    "github.com/featuresignals/server/internal/integrations/launchdarkly"
    "github.com/featuresignals/server/internal/integrations/unleash"
)

func initImporters() {
    integrations.Register("launchdarkly", launchdarkly.NewImporter)
    integrations.Register("unleash", unleash.NewImporter)
    integrations.Register("flagsmith", flagsmith.NewImporter)

    // Future providers are added here:
    // integrations.Register("splitio", splitio.NewImporter)
    // integrations.Register("configcat", configcat.NewImporter)
    // integrations.Register("featbit", featbit.NewImporter)
    // integrations.Register("growthbook", growthbook.NewImporter)
    // integrations.Register("harness", harness.NewImporter)
    // integrations.Register("devcycle", devcycle.NewImporter)
    // integrations.Register("bullet-train", bullettrain.NewImporter) // flagsmith OSS fork
}
```

### 2.3.1 Provider Implementation Contract

Each provider package must:

1. **Define its own config struct** (wrapping `ImporterConfig`):
```go
type Config struct {
    APIKey    string
    BaseURL   string
    ProjectID string
    Extra     map[string]string // provider-specific fields
}
```

2. **Export a `NewImporter` factory function** matching `ImporterFactory`:
```go
func NewImporter(config ImporterConfig) (integrations.Importer, error) {
    if config.APIKey == "" {
        return nil, fmt.Errorf("launchdarkly: api_key is required")
    }
    // ... validate and build client
    return &client{...}, nil
}
```

3. **Implement the full `Importer` interface** with proper error handling:
   - All methods accept `context.Context`
   - Respect context cancellation and timeouts
   - Return domain sentinel errors (`domain.ErrNotFound`, `domain.ErrValidation`)
   - Use structured logging via `slog`
   - Handle rate limits with retry + backoff

4. **Handle provider-specific authentication**:
   - LaunchDarkly: API key (mobile key for client-side SDK projects)
   - Unleash: Admin API token (client keys with `*:admin` scope)
   - Flagsmith: Server-side environment key
   - Each provider documents its auth requirements in its package doc comment

### 2.3.2 Provider Expansion Strategy — "Major First, Then Long Tail"

**Tier 1 — Top 3 providers (build first, highest ROI):**

| Provider | Market Share | Complexity | Priority |
|---|---|---|---|
| LaunchDarkly | ~40% | Medium | P0 |
| Unleash | ~20% | Medium | P0 |
| Flagsmith | ~10% | Medium | P0 |

**Tier 2 — Strong second wave (build next):**

| Provider | Notes | Complexity |
|---|---|---|
| Split.io | Advanced targeting, ML-driven experiments | High |
| ConfigCat | Simple, clean REST API, growing fast | Low |
| Harness | Feature flags + CI/CD platform, enterprise | Medium |
| DevCycle | Modern API, experiment-first | Medium |
| GrowthBook | Open-source, data-science focused | Medium |

**Tier 3 — Niche / legacy / others (long tail):**

| Provider | Notes |
|---|---|
| FeatBit | Open-source, .NET ecosystem |
| Bullet Train | Flagsmith OSS fork, smaller community |
| Eppo | Experimentation platform with flag support |
| Flipt | Open-source, self-hosted, simple API |
| Kameleoon | Enterprise A/B testing + personalization |
| VWO | Web experimentation and feature management |
| AB Tasty | Enterprise experimentation |
| Apptimize | Mobile-first feature flags |
| CloudBees | Enterprise feature management (launchdarkly competitor) |
| Rollout.io | CloudBees Feature Flags SDK |
| Firebase Remote Config | Google ecosystem, mobile-heavy |
| Optimizely | Full-stack experimentation platform |
| Adobe Target | Adobe Experience Cloud integration |
| Hypertune | Modern, GraphQL-based, YC-backed |

**Implementation rule:** Tier 1 providers have full test coverage, documentation, and dashboard integration. Tier 2 providers get the core importer with unit tests. Tier 3 can be community contributed with a documented pattern.

**File structure for new providers:**
```
server/internal/integrations/
├── registry.go             # ← Registry pattern (above)
├── migrator.go             # ← Importer interface + config
├── launchdarkly/
│   ├── importer.go
│   └── importer_test.go
├── unleash/
│   ├── importer.go
│   └── importer_test.go
├── flagsmith/
│   ├── importer.go
│   └── importer_test.go
├── splitio/                # ← Future
├── configcat/              # ← Future
├── harness/                # ← Future
└── ...                     # ← Future additions
```

### 2.4 End-to-End Coverage — Migration Feature

#### 2.4.1 Backend API

**Path:** `server/internal/api/handler/migration.go`

```
POST /v1/migration/providers        — List registered migration providers with capabilities
POST /v1/migration/connect          — Validate connection to a source provider
POST /v1/migration/analyze          — Analyze source and return migration plan
POST /v1/migration/execute          — Execute migration (import flags, envs, segments, optionally export IaC)
GET  /v1/migration/status/:id       — Check migration job progress
GET  /v1/migration/logs/:id         — Stream detailed migration logs
```

Follow the handler pattern from CLAUDE.md: narrowest interface, structured logging, proper error wrapping.

#### 2.4.2 Dashboard UI — Migration Wizard

**File:** `dashboard/src/app/(app)/settings/integrations/migration/page.tsx` (new)

A 4-step wizard component:

1. **Source Provider:** Card-based selection of migration source providers (fetched from `/v1/migration/providers`). Each card shows provider name, icon, capabilities supported (flags, environments, segments), and connection status.

2. **Credentials:** Provider-specific form fields (API key, base URL, project ID). Dynamic fields based on selected provider. "Test Connection" button that calls `/v1/migration/connect` and shows success/error inline.

3. **Scope & Target:**
   - Checkboxes for what to migrate: flags, environments, segments, everything
   - Format selector: Import to FeatureSignals API, Export as IaC (Terraform/Pulumi/Ansible), or Both
   - Click "Analyze" to preview the migration plan

4. **Preview & Execute:**
   - Shows migration plan summary (N flags, N environments, N segments to import)
   - IaC format selector with file tree preview (if export format chosen)
   - "Execute Migration" button with progress indicator
   - Results page with imported resources listed and download links for IaC files

**States:** Loading (skeleton wizard steps), Error (connection failures, validation errors, API errors), Empty (no migration source selected), Edge cases (duplicate flag keys, conflicting environment names).

**Integration:** Uses `api.ts` for all API calls, typed interfaces for migration responses, `toast` for success/error notifications, `ExternalLink` for docs links.

#### 2.4.3 Documentation

**Docs pages to create/update in `docs/docs/`:**

| Page | Path | Content |
|---|---|---|
| Migration Overview | `docs/docs/getting-started/migration-overview.md` | High-level guide: supported providers, what gets migrated, prerequisites |
| Migrate from LaunchDarkly | `docs/docs/getting-started/migrate-from-launchdarkly.md` | Step-by-step: API key setup, flag mapping notes, targeting rule translation |
| Migrate from Unleash | `docs/docs/getting-started/migrate-from-unleash.md` | Step-by-step: Admin token setup, strategy mapping, segment handling |
| Migrate from Flagsmith | `docs/docs/getting-started/migrate-from-flagsmith.md` | Step-by-step: environment key setup, multivariate flag mapping, identity handling |
| IaC Export Formats | `docs/docs/getting-started/migration-iac-export.md` | How to export as Terraform/Pulumi/Ansible, configuring outputs |
| Troubleshooting Migration | `docs/docs/getting-started/migration-troubleshooting.md` | Common issues: rate limits, conflicts, missing resources, validation errors |

**Dashboard docs links:**
```typescript
// Add to dashboard/src/components/docs-link.tsx
DOCS_LINKS.migration = `${DOCS_BASE}/getting-started/migration-overview`
DOCS_LINKS.migrationLaunchDarkly = `${DOCS_BASE}/getting-started/migrate-from-launchdarkly`
DOCS_LINKS.migrationUnleash = `${DOCS_BASE}/getting-started/migrate-from-unleash`
DOCS_LINKS.migrationFlagsmith = `${DOCS_BASE}/getting-started/migrate-from-flagsmith`
```

#### 2.4.4 Website

The website-new already has the migration section on the landing page (`website-new/src/app/page.tsx` lines ~830-910) and footer links. Verify:
- Migration section links to the correct dashboard URL (`https://app.featuresignals.com/settings/integrations/migration`)
- Footer `Migrate from LaunchDarkly/Unleash/Flagsmith` links have proper `id="migration"` anchor or point to `/features/integrations#migration`
- Add migration section to `/features/integrations` page with the three provider cards

#### 2.4.5 Tests

| Layer | Test Type | Coverage |
|---|---|---|
| Backend | Unit | Every importer method with mock provider API responses |
| Backend | Integration | Full migration flow against test database |
| Dashboard | Component | Wizard steps render, form validation, API integration |
| Dashboard | E2E | Complete migration flow with mocked API |
| Docs | Link check | All migration docs links resolve to valid pages |

---

## 3. Uniform Slide-Over Panel Design

**Problem:** The flags page has a rich `FlagSlideOver` component (`dashboard/src/components/flag-slide-over.tsx`) that opens a side panel for CRUD operations. Other entities (segments, environments, API keys, webhooks, team members) use dialogs or inline forms — the UX is inconsistent.

### 3.1 Create Reusable SlideOver Component

**Path:** `dashboard/src/components/ui/slide-over.tsx`

```typescript
interface SlideOverProps {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    footer?: React.ReactNode
    width?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}
```

**Features:**
- Animated panel sliding in from the right using Tailwind animations from globals.css (`slide-in-right`)
- Overlay backdrop with blur (glassmorphism)
- Close on Escape key, close on backdrop click
- Header with title, optional description, close (X) button
- Scrollable body content
- Optional footer with action buttons
- Consistent with `FlagSlideOver` layout pattern (tabs/sections, form fields, save/cancel)
- Loading state: show `Skeleton` matching the slide-over layout
- Error state: show inline error within the slide-over
- Unsaved changes prompt with confirmation before close
- Trap focus within the slide-over while open
- Prevent body scroll while open

### 3.2 Entity-Specific Slide-Overs

| Component | Path | Features |
|---|---|---|
| `SegmentSlideOver` | `dashboard/src/components/segment-slide-over.tsx` | Create/edit segments with `SegmentRulesEditor` inline, match type selector, key/name/description fields |
| `EnvironmentSlideOver` | `dashboard/src/components/environment-slide-over.tsx` | Create/edit environments with name, slug, color picker (12 preset colors) |
| `APIKeySlideOver` | `dashboard/src/components/api-key-slide-over.tsx` | Create API keys with name, type (server/client), optional expiry date |
| `WebhookSlideOver` | `dashboard/src/components/webhook-slide-over.tsx` | Create/edit webhooks with URL, event type checkboxes, secret toggle |
| `TeamMemberSlideOver` | `dashboard/src/components/team-member-slide-over.tsx` | Invite team members with email, role selector, optional env permissions |

### 3.3 Migration Plan

For each entity page:
1. Replace existing `CreateDialog`, `EditDialog`, inline forms with the new slide-over
2. Import and use the appropriate entity-specific slide-over component
3. Add the same optimistic UI / loading / error patterns as `FlagSlideOver`
4. Ensure all existing functionality is preserved (validation, error handling, success toast)

---

## 4. Premium Iconography Across Dashboard

**Problem:** The sidebar and various dashboard components use emoji icons or low-quality icons that appear unprofessional ("roadside"). Icons must express the intent and look premium.

### 4.1 Sidebar Icon Replacement

**File:** `dashboard/src/components/sidebar.tsx`

**Change:** Replace the `icon: string` (emoji) field in `NavItem` with `icon: LucideIcon`.

Remove the emoji field and replace with lucide icons:

| Nav Item | Current (emoji) | New (LucideIcon) |
|---|---|---|
| Dashboard | `📊` | `LayoutDashboard` |
| Flags | `🚩` | `Flag` |
| Segments | `👥` | `Users` |
| Environments | `🌍` | `Globe` |
| Approvals | `✅` | `ShieldCheck` |
| Audit Log | `📋` | `ClipboardList` |
| Analytics | `📈` | `BarChart3` |
| Metrics | `📉` | `PieChart` |
| AI Janitor | `🤖` | `Brain` or `Sparkles` |
| Health | `❤️` | `HeartPulse` |
| Target Inspector | `🎯` | `UserSearch` |
| Usage Insights | `📊` | `LineChart` or `TrendingUp` |
| Settings | `⚙️` | `Settings` |
| Migration | `🔄` | `ArrowLeftRight` |
| Compare Environments | `🔀` | `GitCompare` |

**Types update:**
```typescript
interface NavItem {
    href: string
    label: string
    icon: LucideIcon            // previously: icon: string (emoji)
    gatedFeature?: string
    badge?: string | number
}
```

### 4.2 Command Palette Icon Replacement

**File:** `dashboard/src/components/command-palette.tsx`

Replace any remaining emoji or hardcoded SVG icons with lucide-react icons.

### 4.3 Toast Icon Enhancement

**File:** `dashboard/src/components/toast.tsx`

| Toast Type | Icon |
|---|---|
| `success` | `CheckCircle2` |
| `error` | `AlertTriangle` |
| `warning` | `AlertCircle` |
| `info` | `Info` |

### 4.4 Empty State Icons

Every `EmptyState` component across all pages must use a meaningful lucide icon:
- No flags → `Flag`
- No segments → `Users`
- No environments → `Globe`
- No team members → `UsersRound`
- No API keys → `KeyRound`
- No webhooks → `Webhook`
- No approvals → `CheckCircle`
- No audit entries → `ClipboardList`
- No analytics → `BarChart3`

---

## 5. AI Janitor — Production-Ready Implementation

**Problem:** The janitor page (`dashboard/src/app/(app)/janitor/page.tsx`) is filled with mock/hardcoded data (`MOCK_STALE_FLAGS`, `MOCK_STATS`). The backend janitor (`server/internal/janitor/analyzer.go`) is well-structured but the dashboard doesn't connect to it properly.

### 5.1 Dashboard Janitor Page — Remove Mock Data

**File:** `dashboard/src/app/(app)/janitor/page.tsx`

**Changes:**
1. Remove all `MOCK_STALE_FLAGS` and `MOCK_STATS` constants
2. Replace with real API data fetching via a custom hook `useJanitor`
3. Add proper loading, error, and empty states
4. Add contextual help section explaining how the Janitor works

**Required hook:** `dashboard/src/hooks/use-janitor.ts`

```typescript
interface UseJanitorReturn {
    stats: JanitorStats | null
    staleFlags: StaleFlag[]
    filter: StaleFlagFilter
    setFilter: (f: StaleFlagFilter) => void
    scanning: boolean
    handleScan: () => Promise<void>
    handleGeneratePR: (flag: StaleFlag) => Promise<void>
    handleDismiss: (flag: StaleFlag) => Promise<void>
    loading: boolean
    error: string | null
}
```

### 5.2 User Instructions & Documentation

Add a clear contextual hint section at the top of the Janitor page explaining:

> **How the AI Janitor works:**
>
> 1. **What are stale flags?** Flags that haven't been evaluated in N days (default: 90), or flags that are always-on / always-off (no variation in evaluation results over a period).
>
> 2. **How scanning works:** The Janitor connects to your Git repositories (GitHub, GitLab, Bitbucket) and scans source code for references to each flag. It identifies:
>    - Flags with zero SDK references (safe to remove)
>    - Flags used only in tests (safe to remove)
>    - Flags with dead conditional branches (safe to simplify)
>    - Flags that are always evaluated to the same value
>
> 3. **What "Dismiss" does:** Marks the flag as reviewed. It won't appear in future scans unless the flag is modified.
>
> 4. **What "Generate PR" does:** Creates a pull request in your connected repository that removes the flag's conditional code blocks (keeping else branches intact). The PR is ready for your team to review and merge.
>
> 5. **Configuration:** Set scan frequency, stale thresholds, and repository connection in Settings → Janitor.

Link to full docs: `DOCS_LINKS.janitor` (add this to `docs-link.tsx`).

### 5.3 Backend Janitor — Multi-Git-Provider Integration

**Problem:** Companies use different Git platforms — GitHub, GitLab, Bitbucket, Azure DevOps, self-hosted variants. The janitor must work with all of them, not just GitHub.

**Architecture:** Create a provider-based system with a common interface and individual implementations for each platform. New providers are added by implementing the interface, following the Open/Closed Principle.

**File:** `server/internal/janitor/provider.go` (new)

```go
package janitor

import "context"

// GitProvider defines the contract for interacting with Git platforms.
// Every implementation must support: repository access, file scanning,
// PR creation, webhook management, and OAuth authentication.
type GitProvider interface {
    // Provider metadata
    Name() string                              // "github", "gitlab", "bitbucket", "azure-devops"
    Scopes() []string                          // Required OAuth scopes for this provider

    // Repository operations
    FetchRepository(ctx context.Context, repo string, branch string) ([]byte, error)
    ListRepositories(ctx context.Context) ([]Repository, error)
    GetFileContents(ctx context.Context, repo, path, branch string) ([]byte, error)
    ListFiles(ctx context.Context, repo, path, branch string) ([]string, error)

    // Branch operations
    CreateBranch(ctx context.Context, repo, branch, baseBranch string) error
    DeleteBranch(ctx context.Context, repo, branch string) error
    BranchExists(ctx context.Context, repo, branch string) (bool, error)

    // PR/merge request operations
    CreatePullRequest(ctx context.Context, repo, branch, title, body string, changes []FileChange) (*PR, error)
    UpdatePullRequest(ctx context.Context, repo string, prNumber int, changes []FileChange) error
    GetPullRequest(ctx context.Context, repo string, prNumber int) (*PR, error)
    ListPullRequests(ctx context.Context, repo, state string) ([]PR, error)
    MergePullRequest(ctx context.Context, repo string, prNumber int) error

    // Comment operations
    AddPullRequestComment(ctx context.Context, repo string, prNumber int, body string) error

    // Webhook operations (for auto-scan triggers)
    CreateWebhook(ctx context.Context, repo, url, secret string, events []string) (string, error)
    DeleteWebhook(ctx context.Context, repo, webhookID string) error

    // Authentication
    ValidateToken(ctx context.Context) error
    RefreshToken(ctx context.Context) error

    // File operations
    CommitFiles(ctx context.Context, repo, branch, message string, changes []FileChange) error
}

// Repository represents a Git repository on a provider.
type Repository struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    FullName string `json:"full_name"`
    CloneURL string `json:"clone_url"`
    HTMLURL  string `json:"html_url"`
    DefaultBranch string `json:"default_branch"`
    Private  bool   `json:"private"`
    Language string `json:"language"`
}

// FileChange represents a file to create or modify in a PR.
type FileChange struct {
    Path    string `json:"path"`
    Content []byte `json:"content"`
    Mode    string `json:"mode"` // "create", "modify", "delete"
}

// PR represents a pull request or merge request.
type PR struct {
    Number    int       `json:"number"`
    URL       string    `json:"url"`
    Title     string    `json:"title"`
    Body      string    `json:"body"`
    State     string    `json:"state"` // "open", "closed", "merged"
    Branch    string    `json:"branch"`
    BaseBranch string   `json:"base_branch"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    HeadSHA   string    `json:"head_sha"`
}

// GitProviderConfig holds authentication and connection details.
type GitProviderConfig struct {
    Provider    string // "github", "gitlab", "bitbucket", "azure-devops"
    Token       string // OAuth token or personal access token
    BaseURL     string // For self-hosted instances (empty = cloud SaaS)
    OrgOrGroup  string // Organization or group scope
    WebhookSecret string // Secret for webhook verification
}

// ─── Registry Pattern (not switch statement) ────────────────────────────────
//
// New Git providers are added by implementing GitProvider and registering
// the factory in main(). No switch statements. No code changes to existing
// files. Open/Closed Principle.

// GitProviderRegistry holds all registered Git provider factory functions.
type GitProviderRegistry struct {
    mu        sync.RWMutex
    factories map[string]GitProviderFactory
}

// GitProviderFactory creates a configured GitProvider instance.
type GitProviderFactory func(config GitProviderConfig) (GitProvider, error)

var gitProviderRegistry = &GitProviderRegistry{
    factories: make(map[string]GitProviderFactory),
}

// RegisterGitProvider adds a provider factory to the global registry.
// Called during application startup in main().
//
// Usage:
//
//	import "github.com/featuresignals/server/internal/janitor"
//	janitor.RegisterGitProvider("github", NewGitHubProvider)
func RegisterGitProvider(name string, factory GitProviderFactory) {
    gitProviderRegistry.mu.Lock()
    defer gitProviderRegistry.mu.Unlock()
    if _, exists := gitProviderRegistry.factories[name]; exists {
        panic(fmt.Sprintf("git provider %q already registered", name))
    }
    gitProviderRegistry.factories[name] = factory
}

// NewGitProvider creates the appropriate provider for the given config.
func NewGitProvider(config GitProviderConfig) (GitProvider, error) {
    gitProviderRegistry.mu.RLock()
    factory, ok := gitProviderRegistry.factories[config.Provider]
    gitProviderRegistry.mu.RUnlock()

    if !ok {
        return nil, fmt.Errorf("%w: unsupported git provider %q — "+
            "available: %v", domain.ErrValidation, config.Provider, ListGitProviders())
    }

    return factory(config)
}

// ListGitProviders returns all registered Git provider names.
func ListGitProviders() []string {
    gitProviderRegistry.mu.RLock()
    defer gitProviderRegistry.mu.RUnlock()

    names := make([]string, 0, len(gitProviderRegistry.factories))
    for name := range gitProviderRegistry.factories {
        names = append(names, name)
    }
    return names
}
```

#### 5.3.1 GitHub Provider

**File:** `server/internal/janitor/github.go` (new)

```go
package janitor

// GitHubProvider implements GitProvider for github.com and GitHub Enterprise.
//
// API used:
//   - REST API v3 (repos, contents, pulls, comments)
//   - GraphQL API v4 (for efficient file listing)
//   - GitHub App Installation tokens for org-wide access
//   - Fine-grained PATs for repo-scoped access
//
// Authentication methods supported:
//   1. Personal Access Token (classic or fine-grained)
//   2. GitHub App installation (for org-wide scanning)
//   3. OAuth app token (for user-scoped operations)
//
// Rate limiting:
//   - Respects X-RateLimit-* headers
//   - Falls back to secondary rate limit handling
//   - Uses conditional requests (If-None-Match, If-Modified-Since)
//   - Retries with exponential backoff on 429/403 rate limits
//
// Pagination:
//   - Handles Link header-based pagination for list endpoints
//   - Supports page/per_page parameters with configurable page size
//   - Graceful timeout for large orgs with many repos
//
// Webhooks:
//   - Creates push & pull_request webhooks with HMAC-SHA256 secret verification
//   - Handles ping, push, pull_request, check_run events
//   - Supports self-hosted webhook URL configuration
//
// PR generation:
//   - Creates branches from the default branch
//   - Commits changes with descriptive messages
//   - Creates PRs with summary of changes and risk assessment
//   - Adds labels like "janitor", "stale-flags", "auto-cleanup"
```

**Required implementation details:**
- Full REST v3 API coverage for all required endpoints
- GraphQL v4 for efficient tree/file listing in large repos
- Proper error handling: 404 → repo not found, 403 → permission denied, 422 → validation error
- OAuth flow support with state parameter for CSRF protection
- Token refresh via stored refresh token
- Self-hosted GitHub Enterprise support via `BaseURL` config
- Blob upload via the Git Data API for large files
- Retry logic: 3 retries with jitter on 5xx, 5 retries on 429 with Retry-After header

**Test file:** `server/internal/janitor/github_test.go`
- Mock HTTP server for all API interactions
- Test: repo listing, file content fetch, branch creation, PR lifecycle
- Test: rate limiting handling, error responses, edge cases
- Test: webhook creation and payload verification

#### 5.3.2 GitLab Provider

**File:** `server/internal/janitor/gitlab.go` (new)

```go
package janitor

// GitLabProvider implements GitProvider for gitlab.com and self-hosted GitLab.
//
// API used:
//   - GitLab REST API v4
//   - GitLab CI/CD integration for merge request pipelines
//
// Authentication methods supported:
//   1. Personal Access Token (with api scope)
//   2. OAuth2 application token
//   3. Group access token (for group-wide operations)
//
// Key differences from GitHub:
//   - Uses "merge request" instead of "pull request" terminology
//   - Project IDs are numeric, not org/repo strings
//   - File operations use project ID + path encoding
//   - Branch creation is via the Repository Files API
//   - Supports multiple assignees and reviewers
//
// Self-hosted support:
//   - Full support via BaseURL config (e.g., https://gitlab.example.com)
//   - Works with CE and EE editions
//   - Supports custom CA certificates for internal GitLab instances
//
// Merge request features:
//   - Creates MRs with description including Janitor output summary
//   - Sets squash option, delete source branch on merge
//   - Adds labels: "janitor", "stale-flag-cleanup"
//   - Assigns to project maintainers automatically
//   - Supports approval rules integration (GitLab EE)
//
// Pipeline integration:
//   - Triggers MR pipelines automatically
//   - Waits for pipeline status (optional)
//   - Adds comments with pipeline results
//   - Merges automatically if pipeline passes (configurable)
```

**Required implementation details:**
- Full REST v4 API coverage
- URL encoding for project paths with namespaces (e.g., `namespace%2Fproject`)
- Proper handling of GitLab's pagination (X-Total-Page, X-Next-Page headers)
- GitLab CI YAML generation support (for janitor pipeline jobs)
- OAuth flow with `read_api` + `write_repository` + `api` scopes
- Support for GitLab subgroups
- Merge request approval configuration (EE feature with graceful fallback)

**Test file:** `server/internal/janitor/gitlab_test.go`
- Mock HTTP server
- Test: project discovery, file operations, MR lifecycle
- Test: self-hosted URL handling, subgroup projects
- Test: error cases (project not found, merge conflict, pipeline failure)

#### 5.3.3 Bitbucket Provider

**File:** `server/internal/janitor/bitbucket.go` (new)

```go
package janitor

// BitbucketProvider implements GitProvider for bitbucket.org and Bitbucket Server.
//
// APIs supported:
//   - Bitbucket Cloud REST API v2 (bitbucket.org)
//   - Bitbucket Server/Data Center REST API (self-hosted)
//
// Authentication methods:
//   Cloud: OAuth consumer key/secret, App passwords, OAuth2
//   Server: Personal Access Token, Basic Auth (username + app password)
//
// Key differences:
//   - Cloud uses workspace/slug, Server uses project/repo
//   - Two distinct API versions with different endpoints
//   - PRs are called "pull requests" like GitHub but API differs
//   - File content is Base64-encoded in API responses
//   - Branch permissions may restrict direct pushes
//
// Bitbucket Cloud specific:
//   - Workspace-level repo discovery
//   - OAuth 2.0 with consumer key + callback URL
//   - Pull request diffstat endpoint for change summary
//   - Code insight reports for PR quality gates
//   - Supports multiple reviewers
//
// Bitbucket Server specific:
//   - Project-level and repo-level operations
//   - Supports SSH-based clone URLs
//   - Pull request merge strategies (squash, no-ff, ff-only)
//   - Pre-webhook and post-webhook support
//   - Plugin system integration
```

**Required implementation details:**
- Dual API support (Cloud v2 + Server API) with auto-detection via BaseURL
- Handle Bitbucket's specific pagination (pagelen, page, size, next URL)
- Proper diff generation for large file changes
- Branch permission error handling with clear user messaging
- Support for branch-restricted repos (fallback to fork-based PRs)
- Diffstat-based PR descriptions with file change summaries

**Test file:** `server/internal/janitor/bitbucket_test.go`
- Mock servers for both Cloud and Server APIs
- Test: workspace/project repo listing, content operations
- Test: PR creation with diffstats, branch restrictions
- Test: auth failures, rate limits, error mapping

#### 5.3.4 Azure DevOps Provider

**File:** `server/internal/janitor/azuredevops.go` (new)

```go
package janitor

// AzureDevOpsProvider implements GitProvider for Azure DevOps Services and Server.
//
// APIs used:
//   - Azure DevOps REST API v7.1+ (dev.azure.com)
//   - Azure DevOps Server REST API (on-premises)
//   - Git API, Pull Request API, Status API
//
// Authentication methods:
//   1. Personal Access Token (PAT) with Code (Read & Write) scope
//   2. Azure AD OAuth token (for enterprise-managed orgs)
//   3. Managed Identity (for Azure-hosted deployments)
//
// Key differences:
//   - Organization → Project → Repository hierarchy (3 levels)
//   - PRs include vote/approval system with required reviewers
//   - Branch policies may require minimum number of approvers
//   - File paths are URL-encoded differently than other providers
//   - Uses "refs/heads/branch-name" format for branch references
//   - PR completion includes merge strategies (squash, merge, rebase)
//
// Repository discovery:
//   - Lists all projects in the organization
//   - Lists all repositories in each project
//   - Handles large orgs with hundreds of projects
//   - Supports team project collection (Server)
//
// Pull request features:
//   - Creates PRs with title, description, work item links
//   - Sets optional reviewers from team/project groups
//   - Adds tags/labels for classification
//   - Supports auto-complete with merge commit message
//   - Handles branch policy evaluation failures gracefully
//   - Adds pipeline status checks via PR status API
//
// Self-hosted support:
//   - Azure DevOps Server 2020+ (REST API v6.0+)
//   - Configurable collection URL
//   - Windows auth (NTLM/Kerberos) via PAT
//   - May require proxy configuration for on-premises installs
```

**Required implementation details:**
- Organization/collection → project → repo → branch hierarchy navigation
- Proper URL encoding for Azure DevOps paths (single quotes → `''`, spaces → `-`)
- Handle "TF401019: The git repository is disabled" errors
- PR vote system handling (approve, approve-with-suggestions, wait-for-author, reject)
- Auto-complete configuration when policies are satisfied
- Work item linking for traceability
- Support for both `dev.azure.com/{org}` and `{org}.visualstudio.com` URLs

**Test file:** `server/internal/janitor/azuredevops_test.go`
- Mock server for Azure DevOps REST API
- Test: org/project/repo discovery
- Test: PR creation with auto-complete, file commits
- Test: branch policy failures, permission errors

#### 5.3.5 Git Provider Expansion Strategy — "Major First, Then Long Tail"

**Design principle:** The registry pattern means any Git provider can be added without touching existing code. Start with the market leaders, then expand to niche/legacy platforms. Community contributions follow the documented pattern.

**Tier 1 — Top 4 providers (build first, highest ROI):**

| Provider | Market Share | Notes | Priority |
|---|---|---|---|
| GitHub | ~60% | Most popular, complete API, Actions integration | P0 |
| GitLab | ~25% | Strong in enterprise, built-in CI/CD | P0 |
| Bitbucket | ~10% | Popular with Jira/Atlassian shops | P1 |
| Azure DevOps | ~5% | Microsoft enterprise ecosystem | P1 |

**Tier 2 — Strong second wave (build next):**

| Provider | Notes | Complexity |
|---|---|---|
| Gitea / Forgejo | Self-hosted, lightweight, Go-based | Low |
| SourceForge | Legacy but still active projects | Medium |
| AWS CodeCommit | AWS ecosystem, IAM integration | Medium |
| Gerrit | Code review focused, Android/AOSP ecosystem | High |
| Phabricator | Used by large orgs (Facebook heritage) | High |

**Tier 3 — Edge cases (long tail, community-contributed):**

| Provider | Notes |
|---|---|
| Gogs | Go-based, self-hosted, smaller than Gitea |
| RhodeCode | Enterprise self-hosted, Mercurial + Git |
| Perforce Helix | Enterprise, Git + Perforce hybrid |
| Plastic SCM | Game development, Unity integration |
| Allura | Apache foundation, source forge alternative |
| Launchpad | Ubuntu/Canonical, Bazaar + Git |
| Pagure | Fedora project, lightweight |
| Radicle | P2P, decentralized code collaboration |
| Gitness | Drone CI creator, Harness ecosystem |

**Provider health tracking (for future deprecation):**
```go
// ProviderStatus tracks whether a provider is actively maintained.
type ProviderStatus struct {
    Name          string   `json:"name"`
    MarketShare   float64  `json:"market_share,omitempty"`
    MaintainedBy  string   `json:"maintained_by"` // "core", "community", "deprecated"
    DocsURL       string   `json:"docs_url,omitempty"`
    AddedInVersion string  `json:"added_in_version"`
    DeprecatedIn  string   `json:"deprecated_in,omitempty"` // empty = active
    RemovalDate   string   `json:"removal_date,omitempty"`
}

// Provider registry tracks provider lifecycle.
func (r *GitProviderRegistry) ProviderStatus() []ProviderStatus {
    // Returns status for all registered and known providers
}
```

**Registry UI in dashboard:**
- Admin panel showing all registered Git providers
- Per-provider: connection health, rate limit status, version (for self-hosted)
- Provider lifecycle: active / deprecated / removal-scheduled
- Documentation link for adding new providers

#### 5.3.6 Provider Registry & Health Checks

**File:** `server/internal/janitor/registry.go` (new)

```go
package janitor

// NewGitProvider is the factory entry point that all providers register with.
// Adding a new provider:
//   1. Create the implementation file (e.g., gitea.go)
//   2. Call RegisterGitProvider("gitea", NewGiteaProvider) in main()
//   3. Provider auto-registers — no switch statement changes needed

// ProviderHealth holds status information for a Git provider connection.
type ProviderHealth struct {
    Provider    string `json:"provider"`
    Connected   bool   `json:"connected"`
    LastChecked time.Time `json:"last_checked"`
    Error       string `json:"error,omitempty"`
    RateLimit   struct {
        Remaining int   `json:"remaining"`
        ResetAt   time.Time `json:"reset_at"`
    } `json:"rate_limit"`
    SelfHosted  bool   `json:"self_hosted"`
    Version     string `json:"version,omitempty"` // API version for self-hosted
}
```

#### 5.3.7 Dashboard UI — Multi-Provider Connection

**File:** `dashboard/src/components/janitor-connection-setup.tsx` (new)

A stepper/wizard component for connecting Git providers:

1. **Select Provider:** Card-based selection of GitHub, GitLab, Bitbucket, or Azure DevOps
2. **Authentication:**
   - GitHub: OAuth button with scopes selection (repo, pull_requests, webhooks)
   - GitLab: OAuth with api scope selector
   - Bitbucket: OAuth consumer key setup or app password
   - Azure DevOps: PAT input with scope selector + organization picker
   - **Self-hosted instances:** URL input field for custom base URL
   - Token validation test button that shows connection status
3. **Repository Selection:**
   - Multi-select with search/filter
   - Organization/project grouping
   - Default branch selection per repo
4. **Confirmation:** Summary of selected repos and permissions

Each provider shows its specific icon and branding colors for visual clarity.

**File:** `dashboard/src/app/(app)/settings/janitor/page.tsx` (enhanced)

The Janitor settings page now includes:
- **Connected providers** list with health status per provider
- **Add provider** flow using the connection setup wizard
- **Provider-specific configuration** (which orgs/projects/repos to scan)
- **OAuth token management** with refresh indicators
- **Webhook status** for auto-scan triggers
- **Rate limit monitoring** with usage graphs
- **Self-hosted instance management** (add/remove/edit base URLs)

### 5.4 New API Endpoints

```
POST /v1/janitor/scan                 — Trigger a scan (returns scan job ID)
GET  /v1/janitor/scans/:id            — Get scan status/results
GET  /v1/janitor/flags                — List stale flags with metadata
POST /v1/janitor/flags/:id/dismiss    — Dismiss a flag from janitor report
POST /v1/janitor/flags/:id/generate-pr — Generate cleanup PR
GET  /v1/janitor/stats                — Get janitor dashboard statistics
GET  /v1/janitor/config               — Get janitor configuration
PUT  /v1/janitor/config               — Update janitor configuration
GET  /v1/janitor/repositories         — List connected git repositories
POST /v1/janitor/repositories         — Connect a git repository
DELETE /v1/janitor/repositories/:id   — Disconnect a repository
```

### 5.5 Janitor Configuration UI

**File:** `dashboard/src/app/(app)/settings/janitor/page.tsx` (new)

Create a settings page for janitor configuration:
- Repository connections (GitHub/GitLab/Bitbucket OAuth setup)
- Scan schedule (manual, daily, weekly, monthly)
- Stale threshold (days without evaluation: default 90)
- Auto-generate PR (enabled/disabled)
- PR branch naming convention
- Approval requirements before PR merge
- Notification settings (Slack, email on scan complete)

### 5.6 End-to-End Coverage — AI Janitor

#### 5.6.1 Documentation

**Docs pages to create/update in `docs/docs/`:**

| Page | Path | Content |
|---|---|---|
| Janitor Overview | `docs/docs/advanced/ai-janitor.md` | What is the AI Janitor, how it works, supported Git providers, stale flag detection logic |
| Quick Start | `docs/docs/advanced/ai-janitor-quickstart.md` | Connect a repo, run first scan, review results, generate a PR |
| Configuration | `docs/docs/advanced/ai-janitor-configuration.md` | Scan schedule, stale thresholds, auto-PR settings, notification setup |
| Git Provider Setup | `docs/docs/advanced/ai-janitor-git-providers.md` | OAuth setup for GitHub, GitLab, Bitbucket, Azure DevOps; self-hosted instances |
| PR Workflow | `docs/docs/advanced/ai-janitor-pr-workflow.md` | How PRs are generated, branch naming conventions, review process, merge strategies |
| API Reference | `docs/docs/api-reference/janitor.md` | All janitor API endpoints with request/response examples |
| Troubleshooting | `docs/docs/advanced/ai-janitor-troubleshooting.md` | Common issues: rate limits, branch protections, merge conflicts, scan timeouts |

**Dashboard docs links:**
```typescript
// Add to dashboard/src/components/docs-link.tsx
DOCS_LINKS.janitor = `${DOCS_BASE}/advanced/ai-janitor`
DOCS_LINKS.janitorQuickstart = `${DOCS_BASE}/advanced/ai-janitor-quickstart`
DOCS_LINKS.janitorGitProviders = `${DOCS_BASE}/advanced/ai-janitor-git-providers`
```

#### 5.6.2 Website

The website-new already has the AI Janitor section on the landing page (`website-new/src/app/page.tsx`). Verify:
- The `/features/ai` page exists with detailed AI Janitor capabilities (stale detection, auto-PR, multi-Git provider support, configurable thresholds)
- The `/features` page mentions the AI Janitor in the feature grid
- Footer links to `/features/ai` resolve correctly
- No disconnect between website promises and actual dashboard capabilities (e.g., don't promise "auto-PR for GitLab" until it's implemented)

#### 5.6.3 Tests

| Layer | Test Type | Coverage |
|---|---|---|
| Backend | Unit | Every analyzer method, each Git provider implementation, registry operations |
| Backend | Integration | Full scan flow: fetch repo → find references → generate clean code → create PR |
| Backend | Integration | Git provider health checks, rate limit handling, token refresh |
| Dashboard | Component | Janitor page renders all states, settings page, connection wizard |
| Dashboard | E2E | Complete flow: connect repo → scan → review results → generate PR |
| Docs | Link check | All janitor docs links resolve to valid pages |

#### 5.6.4 API Handler Implementation

**File:** `server/internal/api/handler/janitor.go` (new)

Implement all endpoints listed in section 5.4 with:
- `httputil.JSON` for success responses, `httputil.Error` for errors
- Request validation with domain sentinel errors
- Structured logging with `"handler": "janitor"`, `"org_id"`, `"scan_id"`, `"flag_key"`
- Context propagation with timeouts for long-running scan operations
- Background job processing for scans (return immediately, poll for status)

Follow the handler pattern from CLAUDE.md:
```go
type JanitorHandler struct {
    store  domain.JanitorStore  // narrowest interface
    git    *janitor.GitProviderRegistry
    logger *slog.Logger
}

func NewJanitorHandler(store domain.JanitorStore, git *janitor.GitProviderRegistry, logger *slog.Logger) *JanitorHandler {
    return &JanitorHandler{store: store, git: git, logger: logger}
}
```

---

## 6. Fix All Broken Links

**Problem:** The `website-new` has multiple broken/missing links in the footer and header. Dashboard docs links may point to non-existent pages. The Docusaurus docs site may have missing pages.

### 6.1 Website-New Missing Pages

**Footer links requiring real pages:**

| Link | Path | Required Content |
|---|---|---|
| Core Features | `/features` | Full features page with flag management, targeting, rollouts, A/B testing, kill switches, GitOps |
| AI Janitor | `/features/ai` | AI Janitor capabilities: stale flag detection, auto-cleanup, PR generation |
| Security & Governance | `/features/security` | RBAC, audit logs, SSO, CAB approvals, SOC 2, encryption, compliance |
| Integrations | `/features/integrations` | All integrations: Terraform, Slack, GitHub, Jira, Datadog, webhooks; migration section with LaunchDarkly/Unleash/Flagsmith |
| Use Cases | `/use-cases` | CI/CD, canary releases, kill switches, experimentation, progressive delivery |
| Pricing | `/pricing` | Pricing tiers: Free, Pro, Enterprise with feature comparison |
| Blog | `/blog` | Blog listing page (can be minimal with "coming soon" for posts) |
| Changelog | `/changelog` | Release history and feature announcements |
| System Status | `/status` | System health/uptime status page |
| About | `/about` | Company info, team, mission, contact |
| Contact Sales | `/contact` | Contact form or sales inquiry |
| Terms & Conditions | `/terms-and-conditions` | Legal terms |
| Privacy Policy | `/privacy-policy` | Privacy policy |
| Refund Policy | `/refund-policy` | Refund policy |
| Cancellation Policy | `/cancellation-policy` | Cancellation policy |
| Shipping Policy | `/shipping-policy` | Shipping policy (if applicable) |

**Header links requiring real pages:**
- Same pages as above that are already in the navigation
- `/features`, `/features/ai`, `/features/security`, `/features/integrations`, `/use-cases`, `/pricing`, `/blog`, `/contact`, `/changelog`

**Migration links (`#migration`):**
- Footer has `Migrate from LaunchDarkly`, `Migrate from Unleash`, `Migrate from Flagsmith` linking to `#migration`
- These must link to an element with `id="migration"` on the page, OR link to a proper page like `/features/integrations#migration`
- The landing page already has a migration section — ensure the footer links to it properly

**Page creation rules:**
- Every page must use the stone/accent design system (same as landing page)
- Every page must have proper `<head>` metadata (title, description, open graph)
- Pages can be concise but must NOT be empty shells — provide real content
- Use server components by default, only add `"use client"` when needed
- Add page transition animations consistent with the site

### 6.2 Dashboard Docs Links Verification

**File:** `dashboard/src/components/docs-link.tsx`

Verify each `DOCS_LINKS` entry points to a real page in `docs/docs/`:

| Key | Expected Path | Status |
|---|---|---|
| `flags` | `/core-concepts/feature-flags` | Must exist |
| `segments` | `/core-concepts/targeting-and-segments` | Must exist |
| `environments` | `/core-concepts/projects-and-environments` | Must exist |
| `apiKeys` | `/api-reference/api-keys` | Must exist |
| `webhooks` | `/advanced/webhooks` | Must exist |
| `approvals` | `/advanced/approval-workflows` | Must exist |
| `audit` | `/advanced/audit-logging` | Must exist |
| `rbac` | `/advanced/rbac` | Must exist |
| `sdks` | `/sdks/overview` | Must exist |
| `quickstart` | `/getting-started/quickstart` | Must exist |
| `apiReference` | `/api-playground` | Must exist (note: no `/docs` prefix) |
| `abExperiments` | `/core-concepts/ab-experimentation` | Must exist |
| `relayProxy` | `/advanced/relay-proxy` | Must exist |
| `evalEngine` | `/architecture/evaluation-engine` | Must exist |
| `openFeature` | `/sdks/openfeature` | Must exist |
| `sso` | `/api-reference/sso` | Must exist |
| `deployment` | `/deployment/self-hosting` | Must exist |

If any docs page doesn't exist in `docs/docs/`, it must be created with meaningful content.

### 6.3 Docusaurus Docs Health

**File:** `docs/docs/` directory

Ensure all the above paths exist in the Docusaurus docs site. Add any missing pages. Each page should have:
- Meaningful, technically accurate content
- Code examples where applicable
- A sidebar entry in `sidebars.ts`
- Proper frontmatter (title, description, sidebar position)

---

## 7. Production-Ready Multi-IaC Provider Support + Migration Expansion

**Problem:** The Terraform provider exists at `terraform-fs/` but only supports `featuresignals_flag` resource and `featuresignals_flags` data source. Companies use diverse infrastructure-as-code toolchains — Terraform, Pulumi, Ansible, Crossplane, AWS CDK, and more. The system must support all of them for true enterprise adoption.

**Architecture:** Create a **provider-agnostic resource definition layer** that generates IaC configs for any target platform. The migration tool and IaC management system share a common core: a "FeatureSignals resource model" that each provider adapts to its own syntax and semantics.

```
┌─────────────────────────────────────────────────────┐
│              Common Resource Model                    │
│  (flags, projects, environments, segments, webhooks)  │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┼────────────┬──────────────┐
          ▼            ▼            ▼              ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
   │ Terraform │ │  Pulumi  │ │  Ansible │ │  Crossplane  │
   │ (HCL)     │ │ (TS/Go/Py)│ │ (YAML)   │ │  (K8s CRDs)  │
   └──────────┘ └──────────┘ └──────────┘ └──────────────┘
          │            │            │              │
          └────────────┴────────────┴──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  FeatureSignals    │
                    │  Management API    │
                    └───────────────────┘
```

**Note:** The Terraform provider (section 7.1) is a native Go provider using the Terraform Plugin Framework. The other providers (sections 7.2–7.5) can be implemented as config generation libraries that produce the target format, OR as native providers where the platform allows (e.g., Pulumi has Go-based providers). The common resource model lives as Go types in `server/internal/integrations/iac/`.

---

### 7.0 Common Resource Model

**File:** `server/internal/integrations/iac/model.go` (new)

```go
package iac

// ResourceModel is the provider-agnostic representation of all FeatureSignals
// resources. Every IaC provider adapter maps to/from these types.
type ResourceModel struct {
    Provider string `json:"provider"` // "terraform", "pulumi", "ansible", "crossplane", "cdk"

    Projects    []ProjectResource    `json:"projects,omitempty"`
    Environments []EnvironmentResource `json:"environments,omitempty"`
    Flags       []FlagResource       `json:"flags,omitempty"`
    Segments    []SegmentResource    `json:"segments,omitempty"`
    Webhooks    []WebhookResource    `json:"webhooks,omitempty"`
    APIKeys     []APIKeyResource     `json:"api_keys,omitempty"`
}

type ProjectResource struct {
    Name        string `json:"name"`
    Slug        string `json:"slug,omitempty"`
    Description string `json:"description,omitempty"`
}

type EnvironmentResource struct {
    ProjectSlug string `json:"project_slug"`
    Name        string `json:"name"`
    Slug        string `json:"slug,omitempty"`
    Color       string `json:"color,omitempty"`
    Description string `json:"description,omitempty"`
}

type FlagResource struct {
    ProjectSlug  string            `json:"project_slug"`
    Key          string            `json:"key"`
    Name         string            `json:"name"`
    Description  string            `json:"description,omitempty"`
    FlagType     string            `json:"flag_type"`
    DefaultValue string            `json:"default_value"`
    Tags         []string          `json:"tags,omitempty"`
    Environments []FlagEnvironment `json:"environments,omitempty"`
}

type FlagEnvironment struct {
    Key     string `json:"key"`
    Enabled bool   `json:"enabled"`
    Rules   string `json:"rules,omitempty"` // JSON-encoded targeting rules
}

type SegmentResource struct {
    ProjectSlug string               `json:"project_slug"`
    Key         string               `json:"key"`
    Name        string               `json:"name"`
    Description string               `json:"description,omitempty"`
    MatchType   string               `json:"match_type"` // "all" or "any"
    Rules       []SegmentCondition   `json:"rules,omitempty"`
}

type SegmentCondition struct {
    Attribute string   `json:"attribute"`
    Operator  string   `json:"operator"`
    Values    []string `json:"values"`
}

type WebhookResource struct {
    ProjectSlug string   `json:"project_slug"`
    Name        string   `json:"name"`
    URL         string   `json:"url"`
    Secret      string   `json:"secret,omitempty"`
    EventTypes  []string `json:"event_types"`
    Enabled     bool     `json:"enabled"`
}

type APIKeyResource struct {
    EnvironmentSlug string `json:"environment_slug"`
    Name            string `json:"name"`
    KeyType         string `json:"key_type"` // "server" or "client"
    ExpiresAt       string `json:"expires_at,omitempty"`
}
```

**File:** `server/internal/integrations/iac/generator.go` (new)

```go
package iac

// Generator defines the contract for producing IaC configs.
type Generator interface {
    Name() string                              // "terraform", "pulumi", "ansible", "crossplane", "cdk"
    FileExtension() string                     // ".tf", ".ts", ".yml", ".yaml", ".go"
    Generate(ctx context.Context, model ResourceModel) ([]GeneratedFile, error)
}

// GeneratedFile represents a single file in the output.
type GeneratedFile struct {
    Path    string `json:"path"`    // relative file path
    Content []byte `json:"content"` // file contents
    Comment string `json:"comment"` // human description (displayed in UI)
}

// ─── Registry Pattern (not switch statement) ────────────────────────────────
//
// New IaC generators are added by implementing the Generator interface and
// registering the factory in main(). No switch statements. No code changes
// to existing files. Open/Closed Principle.

// GeneratorRegistry holds all registered IaC generator factory functions.
type GeneratorRegistry struct {
    mu        sync.RWMutex
    factories map[string]GeneratorFactory
}

// GeneratorFactory creates a configured Generator instance.
type GeneratorFactory func() Generator

var generatorRegistry = &GeneratorRegistry{
    factories: make(map[string]GeneratorFactory),
}

// RegisterGenerator adds a generator factory to the global registry.
// Called during application startup in main().
//
// Usage:
//
//	import "github.com/featuresignals/server/internal/integrations/iac"
//	iac.RegisterGenerator("terraform", NewTerraformGenerator)
func RegisterGenerator(name string, factory GeneratorFactory) {
    generatorRegistry.mu.Lock()
    defer generatorRegistry.mu.Unlock()
    if _, exists := generatorRegistry.factories[name]; exists {
        panic(fmt.Sprintf("generator %q already registered", name))
    }
    generatorRegistry.factories[name] = factory
}

// NewGenerator creates the appropriate generator for the given provider name.
func NewGenerator(provider string) (Generator, error) {
    generatorRegistry.mu.RLock()
    factory, ok := generatorRegistry.factories[provider]
    generatorRegistry.mu.RUnlock()

    if !ok {
        return nil, fmt.Errorf("unsupported IaC provider %q — "+
            "available: %v", provider, ListGenerators())
    }

    return factory(), nil
}

// ListGenerators returns all registered generator names.
func ListGenerators() []string {
    generatorRegistry.mu.RLock()
    defer generatorRegistry.mu.RUnlock()

    names := make([]string, 0, len(generatorRegistry.factories))
    for name := range generatorRegistry.factories {
        names = append(names, name)
    }
    return names
}
```

---

### 7.1 Terraform Provider (Native Go Provider)

**Path:** `terraform-fs/internal/provider/`

The native Terraform provider built with the Terraform Plugin Framework. This is the primary IaC integration, fully type-safe with plan modifiers, validators, and import support.

#### 7.1.1 New Resources

| Resource | File | Description |
|---|---|---|
| `featuresignals_project` | `resource_project.go` | Manage projects (name, slug, description) |
| `featuresignals_environment` | `resource_environment.go` | Manage environments (name, slug, color, description) |
| `featuresignals_segment` | `resource_segment.go` | Manage segments with targeting rules/conditions |
| `featuresignals_webhook` | `resource_webhook.go` | Manage webhooks (url, secret, event types) |
| `featuresignals_api_key` | `resource_api_key.go` | Manage API keys per environment (type, expiry) |
| `featuresignals_team_member` | `resource_team_member.go` | Manage team members (email, role, env permissions) |

**Each resource must implement:**

```go
var _ resource.Resource                = &ProjectResource{}
var _ resource.ResourceWithConfigure   = &ProjectResource{}
var _ resource.ResourceWithImportState = &ProjectResource{}
var _ resource.ResourceWithUpgradeState = &ProjectResource{} // schema versioning
```

**Schema conventions:**
```go
"name": schema.StringAttribute{
    Required: true,
    Validators: []validator.String{
        stringvalidator.LengthBetween(1, 128),
        stringvalidator.UTF8LengthAtMost(128),
    },
    PlanModifiers: []planmodifier.String{
        stringplanmodifier.RequiresReplaceIf(...), // if key changes
    },
}

"slug": schema.StringAttribute{
    Optional: true,
    Computed: true, // auto-generated if not provided
    PlanModifiers: []planmodifier.String{
        stringplanmodifier.UseStateForUnknown(),
    },
}

"tags": schema.SetAttribute{
    ElementType: types.StringType,
    Optional: true,
    Computed: true,
    Validators: []validator.Set{
        setvalidator.SizeAtMost(20),
    },
}
```

#### 7.1.2 New Data Sources

| Data Source | File | Description |
|---|---|---|
| `featuresignals_projects` | `data_source_projects.go` | List all projects |
| `featuresignals_environments` | `data_source_environments.go` | List environments for a project |
| `featuresignals_segments` | `data_source_segments.go` | List segments for a project |
| `featuresignals_flag` | `data_source_flag.go` | Get single flag by key |

#### 7.1.3 Production Hardening

For **every** resource and data source:

1. **Import State Support:**
   ```go
   func (r *ProjectResource) ImportState(ctx context.Context, req resource.ImportStateRequest, resp *resource.ImportStateResponse) {
       resource.Read(ctx, &resp.State, r.client, req.ID)
   }
   ```

2. **Plan Modifiers:**
   - `RequiresReplace` for immutable attributes (key, project_id)
   - `UseStateForUnknown` for computed attributes
   - `RequiresReplaceIf` for config-driven replacement

3. **Validators:**
   - String length boundaries (`stringvalidator.LengthBetween`)
   - Enum constraints (`stringvalidator.OneOf`)
   - Regex patterns for slugs (`stringvalidator.RegexMatches`)
   - Set size limits (`setvalidator.SizeAtMost`)
   - UTF-8 validation for descriptions

4. **Error Handling:**
   - 404 on Read/Delete → `resp.State.RemoveResource(ctx)` (mark as removed, not error)
   - 409 Conflict → clear `diag` with actionable message
   - 429 Rate Limit → retry with `Retry-After` header
   - Network timeout → retry with exponential backoff (3 attempts)

5. **State Migration:**
   ```go
   func (r *ProjectResource) UpgradeState(ctx context.Context) map[int64]resource.StateUpgrader {
       return map[int64]resource.StateUpgrader{
           0: { // v0 → v1 migration
               StateUpgrader: func(ctx context.Context, req resource.UpgradeStateRequest, resp *resource.UpgradeStateResponse) {
                   // migration logic
               },
           },
       }
   }
   ```

6. **Acceptance Tests:**
   - `httptest.NewServer` mocking the FeatureSignals REST API
   - Test: CRUD lifecycle for every resource
   - Test: Import state for every resource
   - Test: Validation failures (empty strings, wrong enums, missing required)
   - Test: Edge cases (concurrent creates, deleted resources, conflict handling)

7. **Documentation:**
   - `tfplugindocs` for Terraform Registry formatting
   - Working examples in `examples/` per resource
   - GoDoc on all exported symbols

#### 7.1.4 Provider Registration

**File:** `terraform-fs/internal/provider/provider.go`

```go
func (p *FeaturesignalsProvider) Resources(_ context.Context) []func() resource.Resource {
    return []func() resource.Resource{
        NewFlagResource,
        NewProjectResource,
        NewEnvironmentResource,
        NewSegmentResource,
        NewWebhookResource,
        NewAPIKeyResource,
        NewTeamMemberResource,
    }
}

func (p *FeaturesignalsProvider) DataSources(_ context.Context) []func() datasource.DataSource {
    return []func() datasource.DataSource{
        NewFlagsDataSource,
        NewFlagDataSource,
        NewProjectsDataSource,
        NewEnvironmentsDataSource,
        NewSegmentsDataSource,
    }
}
```

#### 7.1.5 Publishing Preparation

1. **GitHub Actions Release Workflow:** `.github/workflows/release-terraform.yml`
   - Build for: `linux_amd64`, `linux_arm64`, `darwin_amd64`, `darwin_arm64`, `windows_amd64`
   - GPG sign binaries
   - Create GitHub release with changelog
   - Validate against Terraform Registry publishing rules

2. **Terraform Registry Requirements:**
   - Repository name: `terraform-provider-featuresignals`
   - GPG key registered with registry
   - Documentation in registry format

3. **Makefile additions:**
   ```makefile
   build:     # Build for current platform
   test:      # Run unit tests
   vet:       # Run go vet
   testacc:   # Run acceptance tests (TF_ACC=1)
   lint:      # Run golangci-lint
   docs:      # Generate Terraform registry docs via tfplugindocs
   install:   # Build and install to ~/.terraform.d/plugins
   release:   # Cross-compile and sign for all target platforms
   verify:    # Verify terraform provider schema is valid
   ```

---

### 7.2 Pulumi Provider

**Problem:** Many teams use Pulumi instead of Terraform for infrastructure management, especially those who want to use general-purpose programming languages (TypeScript, Go, Python, C#, Java) instead of HCL.

#### 7.2.1 Architecture

Two implementation options (choose based on maintenance capacity):

**Option A: Pulumi Native Provider (Preferred)**
- Written in Go using Pulumi's provider SDK
- Registered in Pulumi Registry
- Supports all Pulumi languages (TS, Go, Python, .NET, Java, YAML)
- Full IDE support, type safety, documentation generation
- Follows Pulumi's resource naming conventions

**Option B: Config Generation Library**
- A Go library that generates Pulumi TypeScript code from the `ResourceModel`
- Simpler to maintain, no provider SDK complexity
- Generated code can be committed and customized
- Good for teams that prefer code generation over native providers

**Implementation (Option A):**

**Path:** `pulumi-fs/provider/` (new directory at project root)

```go
package provider

// PulumiProvider implements the Pulumi resource provider interface.
//
// Provider schema:
//   name: "featuresignals"
//   version: "0.1.0"
//
// Resources:
//   featuresignals:index:Project
//   featuresignals:index:Environment
//   featuresignals:index:Flag
//   featuresignals:index:Segment
//   featuresignals:index:Webhook
//   featuresignals:index:ApiKey
//
// Provider config:
//   apiKey (string, secret): FeatureSignals API key
//   host (string, optional): API host URL (default: https://api.featuresignals.com)
```

**Usage:**
```typescript
import * as fs from "@featuresignals/pulumi";

const project = new fs.Project("my-app", {
    name: "My App",
    slug: "my-app",
});

const production = new fs.Environment("production", {
    projectSlug: project.slug,
    name: "Production",
    color: "#ef4444",
});

const darkMode = new fs.Flag("dark-mode", {
    projectSlug: project.slug,
    key: "dark-mode",
    name: "Dark Mode",
    flagType: "boolean",
    defaultValue: "false",
    environments: [
        { key: "production", enabled: false },
    ],
});
```

#### 7.2.2 Required Components

| Component | File | Description |
|---|---|---|
| Provider schema | `provider/provider.go` | Provider metadata, config schema |
| Project resource | `provider/project.go` | CRUD for projects |
| Environment resource | `provider/environment.go` | CRUD for environments |
| Flag resource | `provider/flag.go` | CRUD for flags with env states |
| Segment resource | `provider/segment.go` | CRUD for segments with rules |
| Webhook resource | `provider/webhook.go` | CRUD for webhooks |
| API Key resource | `provider/apikey.go` | CRUD for API keys |
| Client | `provider/client.go` | Shared HTTP client wrapper |

#### 7.2.3 Testing

- Acceptance tests using Pulumi's test framework (`pulumi.NewProviderServer`)
- Mock HTTP server for FeatureSignals API
- Tests for each resource: create, read, update, delete, import
- Cross-language validation (test that TS/Python/Go SDKs all work)

#### 7.2.4 Publishing

- Published to Pulumi Registry
- GitHub Actions: build, lint, test, publish workflow
- Pulumi Package Generator for SDK generation
- Documentation generated via `pulumi package gen-sdk`

---

### 7.3 Ansible Collection

**Problem:** Platform engineering and SRE teams manage infrastructure via Ansible playbooks and roles. Feature flag configuration should be part of their existing automation workflows.

#### 7.3.1 Architecture

Ansible Collection with modules for each resource type. Fits into existing `ansible-playbook` workflows alongside other infrastructure tasks.

**Path:** `ansible-fs/` (new directory at project root)

```
ansible-fs/
├── galaxy.yml                 # Collection metadata
├── README.md
├── plugins/
│   └── modules/
│       ├── fs_project.py      # Manage projects
│       ├── fs_environment.py  # Manage environments
│       ├── fs_flag.py         # Manage feature flags
│       ├── fs_segment.py      # Manage segments
│       ├── fs_webhook.py      # Manage webhooks
│       └── fs_api_key.py      # Manage API keys
├── roles/
│   ├── feature-flag-setup/    # Complete flag setup role
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   └── defaults/
│   │       └── main.yml
│   └── migration/             # Migration automation role
│       ├── tasks/
│       │   └── main.yml
│       └── defaults/
│           └── main.yml
├── tests/
│   ├── integration/
│   └── unit/
└── meta/
    └── runtime.yml
```

#### 7.3.2 Module Interface

All modules follow Ansible's standard module conventions: `name`, `state` (present/absent), check mode support, diff mode support, idempotency.

**Example module (`fs_flag.py`):**
```python
#!/usr/bin/python
# -*- coding: utf-8 -*-

DOCUMENTATION = r'''
---
module: fs_flag
short_description: Manage FeatureSignals feature flags
description:
    - Create, update, or delete feature flags in FeatureSignals.
    - Supports boolean and multivariate flag types.
    - Configures per-environment targeting rules and rollouts.
options:
    state:
        description: Desired state of the flag
        type: str
        required: false
        default: present
        choices: [ present, absent ]
    api_key:
        description: FeatureSignals API key
        type: str
        required: true
        no_log: true
    host:
        description: FeatureSignals API host
        type: str
        required: false
        default: https://api.featuresignals.com
    project_slug:
        description: Project slug
        type: str
        required: true
    key:
        description: Unique flag key
        type: str
        required: true
    name:
        description: Human-readable flag name
        type: str
        required: true
    flag_type:
        description: Flag value type
        type: str
        required: false
        default: boolean
        choices: [ boolean, string, number, json ]
    default_value:
        description: Default value as JSON string
        type: str
        required: true
    environments:
        description: Per-environment configuration
        type: list
        elements: dict
        required: false
        suboptions:
            key:
                type: str
                required: true
            enabled:
                type: bool
                required: true
            rules:
                type: str
                required: false
    tags:
        description: Flag tags
        type: list
        elements: str
        required: false
'''

EXAMPLES = r'''
- name: Create a feature flag
  fs_flag:
    state: present
    api_key: "{{ fs_api_key }}"
    project_slug: "my-app"
    key: "dark-mode"
    name: "Dark Mode"
    flag_type: "boolean"
    default_value: "false"
    environments:
      - key: "production"
        enabled: false
      - key: "staging"
        enabled: true
    tags:
      - "team:frontend"
'''
```

**All modules share:**
- Common `ModuleDocFragment` for API key and host parameters
- Consistent return values (`changed`, `flag`, `diff`)
- Check mode support (`--check` flag shows what would change)
- Diff mode support (`--diff` shows before/after)
- Idempotent operations (no changes if desired state already matches)
- Error handling with `module.fail_json` for API errors
- Logging to Ansible's `module.warn()` and `module.debug()`

#### 7.3.3 Required Modules

| Module | File | Description |
|---|---|---|
| `fs_project` | `plugins/modules/fs_project.py` | Manage projects |
| `fs_environment` | `plugins/modules/fs_environment.py` | Manage environments |
| `fs_flag` | `plugins/modules/fs_flag.py` | Manage feature flags |
| `fs_segment` | `plugins/modules/fs_segment.py` | Manage segments with rules |
| `fs_webhook` | `plugins/modules/fs_webhook.py` | Manage webhooks |
| `fs_api_key` | `plugins/modules/fs_api_key.py` | Manage API keys |
| `fs_org_info` | `plugins/modules/fs_org_info.py` | Info module: list flags, projects |

#### 7.3.4 Roles

**`feature-flag-setup` role:** Complete feature flag lifecycle management in a single role:
```yaml
- hosts: localhost
  roles:
    - role: feature-flag-setup
      vars:
        fs_project:
          name: "My App"
          slug: "my-app"
        fs_environments:
          - name: "Production"
            slug: "production"
          - name: "Staging"
            slug: "staging"
        fs_flags:
          - key: "dark-mode"
            name: "Dark Mode"
            defaults:
              production: false
              staging: true
```

**`migration` role:** Automates migration from LaunchDarkly/Unleash/Flagsmith:
```yaml
- hosts: localhost
  roles:
    - role: migration
      vars:
        fs_source: launchdarkly
        fs_source_api_key: "{{ ld_api_key }}"
        fs_export_format: terraform  # or pulumi, ansible
```

#### 7.3.5 Testing

- `ansible-test units` for Python unit tests
- `ansible-test integration` for integration tests against mock API
- `molecule` scenarios for end-to-end testing
- Test matrix: Python 3.10–3.13, Ansible 8+

#### 7.3.6 Publishing

- Published to Ansible Galaxy (`featuresignals.feature_flags`)
- GitHub Actions: `ansible-galaxy collection build && publish`
- Versioning follows Semantic Versioning for collections

---

### 7.4 Crossplane Provider

**Problem:** Cloud-native teams manage infrastructure through Crossplane (Kubernetes-native control plane). Feature flags should be manageable as Kubernetes custom resources alongside databases, caches, and cloud services.

#### 7.4.1 Architecture

A Crossplane provider that exposes FeatureSignals resources as Kubernetes Custom Resource Definitions (CRDs). Managed resources reconcile to the FeatureSignals API via a Crossplane controller.

**Path:** `crossplane-fs/` (new directory at project root)

```
crossplane-fs/
├── apis/
│   ├── v1alpha1/
│   │   ├── types_project.go
│   │   ├── types_environment.go
│   │   ├── types_flag.go
│   │   ├── types_segment.go
│   │   ├── types_webhook.go
│   │   ├── types_apikey.go
│   │   └── register.go
│   └── v1alpha1/zz_generated.deepcopy.go
├── internal/
│   ├── clients/
│   │   └── featuresignals.go  # API client
│   └── controller/
│       ├── project.go
│       ├── environment.go
│       ├── flag.go
│       ├── segment.go
│       ├── webhook.go
│       └── apikey.go
├── package/
│   ├── crossplane.yaml        # Provider metadata
│   └── helm/
├── cmd/
│   └── provider/
│       └── main.go
├── Makefile
├── Dockerfile
├── go.mod
└── README.md
```

#### 7.4.2 Custom Resources

**Each resource follows the Crossplane managed resource pattern:**

```yaml
apiVersion: featuresignals.crossplane.io/v1alpha1
kind: Flag
metadata:
  name: dark-mode-flag
spec:
  forProvider:
    projectSlug: "my-app"
    key: "dark-mode"
    name: "Dark Mode"
    flagType: "boolean"
    defaultValue: "false"
    environments:
      - key: "production"
        enabled: false
      - key: "staging"
        enabled: true
  providerConfigRef:
    name: featuresignals-provider
```

**ProviderConfig (authentication):**

```yaml
apiVersion: featuresignals.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: featuresignals-provider
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: fs-secret
      key: api_key
  host: https://api.featuresignals.com
```

#### 7.4.3 Required CRDs

| CRD | API Version | File |
|---|---|---|
| `Project` | `v1alpha1` | `apis/v1alpha1/types_project.go` |
| `Environment` | `v1alpha1` | `apis/v1alpha1/types_environment.go` |
| `Flag` | `v1alpha1` | `apis/v1alpha1/types_flag.go` |
| `Segment` | `v1alpha1` | `apis/v1alpha1/types_segment.go` |
| `Webhook` | `v1alpha1` | `apis/v1alpha1/types_webhook.go` |
| `ApiKey` | `v1alpha1` | `apis/v1alpha1/types_apikey.go` |
| `ProviderConfig` | `v1alpha1` | `apis/v1alpha1/types_provider_config.go` |

#### 7.4.4 Controller Logic

Each controller follows the Crossplane managed resource reconciler pattern:

```go
package controller

type FlagReconciler struct {
    client crossplane.ResourceClient
    featuresignals *clients.FeatureSignalsClient
}

func (r *FlagReconciler) Reconcile(ctx context.Context, req reconcile.Request) (reconcile.Result, error) {
    // 1. Observe: Fetch the Flag CR and current state from FeatureSignals API
    // 2. Diff: Compare desired vs actual state
    // 3. Create/Update/Delete: Reconcile differences via FeatureSignals API
    // 4. Update status: Set ready condition, synced status, resource ref
    // 5. Return result with requeue interval (default: 60s)
}
```

**Key behaviors:**
- **Observe-only resources:** Use `Observation` to check external state without modifying
- **Late initialization:** Populate default values in CR status
- **External name annotation:** Store FeatureSignals resource ID in `crossplane.io/external-name`
- **Connection details:** Expose API key references in `status.connectionDetails`
- **Dependency ordering:** Wait for Project to be ready before creating Environments and Flags
- **Garbage collection:** Delete external resources when CR is deleted
- **Conflict resolution:** Handle concurrent modifications with `updated_at` checks

#### 7.4.5 Testing

- `envtest` for controller integration tests with real CRD validation
- Unit tests with mocked FeatureSignals API client
- End-to-end tests with Kind cluster + Crossplane installation
- Manifest generation tests (`make generate`)

#### 7.4.6 Publishing

- Crossplane Registry (`registry.xpkg.upbound.io/featuresignals/provider`)
- Docker image for the provider controller
- Helm chart for installation
- `upbound` CLI for package management

---

### 7.5 AWS CDK / CDKTF Construct Library

**Problem:** Teams using AWS Cloud Development Kit (CDK) manage infrastructure through constructs. CDK for Terraform (CDKTF) bridges CDK and Terraform providers. We need both a native CDK construct library and CDKTF bindings.

#### 7.5.1 CDKTF Construct Library

**Path:** `cdktf-fs/` (new directory at project root)

Since CDKTF wraps Terraform providers, this is generated from the Terraform provider schema. Combine with handcrafted higher-level constructs.

```
cdktf-fs/
├── src/
│   ├── index.ts
│   ├── project.ts
│   ├── environment.ts
│   ├── flag.ts
│   ├── segment.ts
│   ├── webhook.ts
│   └── feature-flag-app.ts  # high-level construct
├── package.json
├── tsconfig.json
├── jest.config.ts
└── README.md
```

**High-level constructs for common patterns:**

```typescript
import { FeatureFlagApp } from "@featuresignals/cdktf";

// Complete feature flag setup as a single construct
const app = new FeatureFlagApp(stack, "FlagApp", {
    project: { name: "My App", slug: "my-app" },
    environments: [
        { name: "Production", slug: "production", color: "#ef4444" },
        { name: "Staging", slug: "staging", color: "#f59e0b" },
    ],
    flags: [
        {
            key: "dark-mode",
            name: "Dark Mode",
            type: "boolean",
            defaultValue: "false",
            environments: {
                production: { enabled: false },
                staging: { enabled: true },
            },
        },
    ],
});

// CDKTF constructs compose with other infrastructure
new aws.ec2.Instance(stack, "Server", {
    // ... instance config
});
```

#### 7.5.2 Native CDK Construct Library (Optional Enhancement)

**Path:** `cdk-fs/` (new directory at project root)

For teams using AWS CDK directly (not CDKTF), provide a native construct library:

```
cdk-fs/
├── lib/
│   ├── index.ts
│   ├── project.ts
│   ├── environment.ts
│   ├── flag.ts
│   ├── segment.ts
│   ├── flag-app.ts     # high-level construct
│   └── custom-resource/ # Lambda-backed custom resources for API calls
├── lambda/             # Custom resource Lambda functions
│   ├── cr-project/
│   ├── cr-flag/
│   └── lib/
├── package.json
├── tsconfig.json
├── jest.config.ts
└── README.md
```

**Custom Resource Approach:**
```typescript
// Lambda-backed custom resource for CRUD operations
new CustomResource(this, "FlagResource", {
    serviceToken: flagProvider.functionArn,
    properties: {
        Action: "CREATE", // or UPDATE, DELETE
        ApiKey: apiKeySecret.secretValue.toString(),
        Host: "https://api.featuresignals.com",
        ProjectSlug: "my-app",
        Key: "dark-mode",
        Name: "Dark Mode",
        FlagType: "boolean",
        DefaultValue: "false",
    },
});
```

---

### 7.6 Migration — Multi-IaC Export Feature

**Problem:** The migration tool currently only mentions Terraform HCL export. It must support ALL IaC providers above, plus offer a unified config export format.

#### 7.6.1 Enhanced Importer Interface

**File:** `server/internal/integrations/iac/export.go` (new)

```go
package iac

// ExportConfig controls the migration export behavior.
type ExportConfig struct {
    Format     string   // "terraform", "pulumi", "ansible", "crossplane", "cdk", "all"
    OutputDir  string   // directory to write generated files
    Namespace  string   // namespace / module name for generated configs
    IncludeAPIKeys bool // whether to include API keys (sensitive)
}

// MultiExporter manages export to multiple IaC formats.
type MultiExporter struct {
    generators map[string]Generator
}

func NewMultiExporter() *MultiExporter {
    return &MultiExporter{
        generators: map[string]Generator{
            "terraform":  NewTerraformGenerator(),
            "pulumi":     NewPulumiGenerator(),
            "ansible":    NewAnsibleGenerator(),
            "crossplane": NewCrossplaneGenerator(),
            "cdk":        NewCDKGenerator(),
        },
    }
}

// Export generates IaC configs from the common resource model.
func (e *MultiExporter) Export(ctx context.Context, model ResourceModel, config ExportConfig) (map[string][]GeneratedFile, error) {
    results := make(map[string][]GeneratedFile)

    if config.Format == "all" {
        for name, gen := range e.generators {
            files, err := gen.Generate(ctx, model)
            if err != nil {
                return nil, fmt.Errorf("%s: %w", name, err)
            }
            results[name] = files
        }
        return results, nil
    }

    gen, ok := e.generators[config.Format]
    if !ok {
        return nil, fmt.Errorf("unsupported export format: %s", config.Format)
    }

    files, err := gen.Generate(ctx, model)
    if err != nil {
        return nil, err
    }
    results[config.Format] = files
    return results, nil
}
```

#### 7.6.2 Migration API Enhancement

**Extend the migration endpoints (from Workstream 2):**

```
POST /v1/migration/analyze    — body: { provider, api_key, project_id, export_format }
       → returns: { plan: {...}, iac_files: [...] }

POST /v1/migration/export     — body: { provider, api_key, project_id, format }
       → returns: { files: [{ path, content, comment }] }

POST /v1/migration/execute    — body: { provider, api_key, project_id, export_format }
       → returns: { migration_id, project_id, imported_flags, generated_files }
```

**Export format options:**
- `terraform` — HCL config files
- `pulumi` — TypeScript/Go/Python Pulumi code
- `ansible` — Ansible playbook YAML + role structure
- `crossplane` — Kubernetes CRD YAML manifests
- `cdk` — CDK/CDKTF TypeScript constructs
- `all` — All supported formats at once (ZIP download)

#### 7.6.3 Migration Dashboard UI

**File:** `dashboard/src/app/(app)/settings/integrations/migration/page.tsx`

Add a migration wizard with format selection:

1. **Source:** Select provider + enter API credentials
2. **Scope:** Choose what to migrate (flags, environments, segments, all)
3. **Target format:** Select one or more IaC formats
4. **Preview:** Show migration plan with diff
5. **Execute:** 
   - Option A: Import to FeatureSignals directly
   - Option B: Export as IaC config files (download ZIP)
   - Option C: Both import + export

**UI components:**
- Format selector cards with icons (Terraform, Pulumi, Ansible, Crossplane, CDK)
- File tree preview showing generated files
- Syntax-highlighted code preview panel
- Download all as ZIP button
- Copy-to-clipboard for individual files

---

### 7.7 Common Generator Implementations

**Each generator (TerraformGenerator, PulumiGenerator, etc.) follows the same contract:**

```go
// Each generator:
// 1. Takes the common ResourceModel
// 2. Maps each resource to the target format using Go templates
// 3. Returns a set of GeneratedFile objects

type TerraformGenerator struct {
    templates *template.Template
}

func NewTerraformGenerator() *TerraformGenerator {
    return &TerraformGenerator{
        templates: template.Must(template.New("tf").Funcs(template.FuncMap{
            "snakeCase":  toSnakeCase,
            "quote":      strconv.Quote,
            "jsonEncode": json.Marshal,
        }).ParseFS(templateFS, "templates/terraform/*.tmpl")),
    }
}

func (g *TerraformGenerator) Generate(ctx context.Context, model ResourceModel) ([]GeneratedFile, error) {
    var files []GeneratedFile

    // Generate provider file
    var providerBuf bytes.Buffer
    if err := g.templates.ExecuteTemplate(&providerBuf, "provider.tf.tmpl", model); err != nil {
        return nil, fmt.Errorf("provider template: %w", err)
    }
    files = append(files, GeneratedFile{
        Path:    "provider.tf",
        Content: providerBuf.Bytes(),
        Comment: "Terraform provider configuration",
    })

    // Generate resource files (one per resource type or all in main.tf)
    var mainBuf bytes.Buffer
    if err := g.templates.ExecuteTemplate(&mainBuf, "main.tf.tmpl", model); err != nil {
        return nil, fmt.Errorf("main template: %w", err)
    }
    files = append(files, GeneratedFile{
        Path:    "main.tf",
        Content: mainBuf.Bytes(),
        Comment: "FeatureSignals resource definitions",
    })

    return files, nil
}
```

**Template directory structure:**
```
internal/integrations/iac/templates/
├── terraform/
│   ├── provider.tf.tmpl
│   ├── main.tf.tmpl
│   └── variables.tf.tmpl
├── pulumi/
│   ├── index.ts.tmpl
│   └── config.ts.tmpl
├── ansible/
│   ├── playbook.yml.tmpl
│   ├── roles/feature-flag-setup/tasks/main.yml.tmpl
│   └── group_vars/all.yml.tmpl
├── crossplane/
│   ├── provider-config.yaml.tmpl
│   └── resources.yaml.tmpl
└── cdk/
    ├── app.ts.tmpl
    └── stack.ts.tmpl
```

---

### 7.8 IaC Provider Expansion Strategy — "Major First, Then Long Tail"

**Design principle:** The registry pattern means any IaC provider can be added without touching existing code. Start with the most widely adopted tools, then expand to niche platforms. Community contributions follow the documented pattern.

**Tier 1 — Top 3 providers (build first, highest ROI):**

| Provider | Ecosystem | Best For | Effort | Priority |
|---|---|---|---|---|
| Terraform | HCL, Plugin Framework | Ops teams, IaC standard, multi-cloud | Large | P0 — Already started |
| Pulumi | TypeScript/Go/Python/Py | Developer-centric teams, programming languages | Large | P1 — Growing fast |
| Ansible | YAML, Python modules | SRE, platform engineering, config management | Medium | P1 — Widely deployed |

**Tier 2 — Strong second wave (build next):**

| Provider | Notes | Complexity | Target Audience |
|---|---|---|---|
| Crossplane | Kubernetes-native, GitOps, CNCF project | High | Cloud-native teams, platform engineers |
| CDKTF | AWS CDK for Terraform, TypeScript | Medium | AWS-native teams using CDK |
| OpenTofu | Terraform fork, OSS, Linux Foundation | Low | Teams that migrated from Terraform |
| Helm/Kustomize | Kubernetes package manager, Kubernetes-native config | Medium | K8s-only teams, GitOps workflows |

**Tier 3 — Long tail (community-contributed, orchestration/niche):**

| Provider | Notes |
|---|---|
| AWS CDK (Native) | Native CDK (not CDKTF), Lambda custom resources |
| Pulumi ESC | Pulumi Environments, Secrets, and Config |
| Kubernetes Operators | Custom K8s operators for FeatureSignals |
| Serverless Framework | Serverless application deployments |
| CloudFormation | AWS native, legacy enterprise |
| Azure Resource Manager | Azure native, enterprise ARM templates |
| Google Deployment Manager | GCP native, less common |
| SaltStack | Config management, enterprise |
| Chef | Legacy config management |
| Puppet | Legacy config management |
| Nix/NixOS | Declarative, reproducible builds |
| CDK8s | Kubernetes CDK, open-source |
| Jsonnet | Data templating language, used by Grafana |
| Dhall | Configuration language, programmable |
| CUE | Configuration unified, used by Dagger/Tekton |

**Provider lifecycle management:**
```go
// IaCProviderStatus tracks provider maturity and support level.
type IaCProviderStatus struct {
    Name            string  `json:"name"`
    SupportLevel    string  `json:"support_level"` // "core", "extended", "community", "deprecated"
    MarketShare     float64 `json:"market_share,omitempty"`
    PrimaryContact  string  `json:"primary_contact,omitempty"` // team or maintainer
    DocsURL         string  `json:"docs_url,omitempty"`
    AddedInVersion  string  `json:"added_in_version"`
    DeprecatedIn    string  `json:"deprecated_in,omitempty"`
    RemovalDate     string  `json:"removal_date,omitempty"`
}

// Support matrix:
//   core:      First-party, full test coverage, documented, published to registry
//   extended:  First-party, core features, published, fewer tests
//   community: Community-maintained, PR-reviewed by core team
//   deprecated: No longer recommended, removal scheduled
```

**Dashboard UI for IaC provider management:**
- IaC provider catalog page showing supported formats
- Per-provider: status, version, docs link, examples
- Usage statistics (how many users exported to each format)
- Feedback mechanism for requesting new providers

---

### 7.9 Main.go Registration — All Three Registries

**File:** `server/cmd/server/main.go`

All three provider systems (migration importers, Git providers, IaC generators) register at application startup through the same pattern:

```go
package main

import (
    "github.com/featuresignals/server/internal/integrations"
    "github.com/featuresignals/server/internal/integrations/flagsmith"
    "github.com/featuresignals/server/internal/integrations/launchdarkly"
    "github.com/featuresignals/server/internal/integrations/unleash"
    "github.com/featuresignals/server/internal/janitor"
    "github.com/featuresignals/server/internal/integrations/iac"
)

func initProviders() {
    // ─── 1. Migration Importers (feature flag providers) ──────────────────
    integrations.Register("launchdarkly", launchdarkly.NewImporter)
    integrations.Register("unleash", unleash.NewImporter)
    integrations.Register("flagsmith", flagsmith.NewImporter)

    // Tier 2 — coming soon:
    // integrations.Register("splitio", splitio.NewImporter)
    // integrations.Register("configcat", configcat.NewImporter)
    // integrations.Register("harness", harness.NewImporter)
    // integrations.Register("devcycle", devcycle.NewImporter)
    // integrations.Register("growthbook", growthbook.NewImporter)

    // ─── 2. Git Providers (AI Janitor PR generation) ─────────────────────
    janitor.RegisterGitProvider("github", janitor.NewGitHubProvider)
    janitor.RegisterGitProvider("gitlab", janitor.NewGitLabProvider)
    janitor.RegisterGitProvider("bitbucket", janitor.NewBitbucketProvider)
    janitor.RegisterGitProvider("azure-devops", janitor.NewAzureDevOpsProvider)

    // Tier 2 — coming soon:
    // janitor.RegisterGitProvider("gitea", janitor.NewGiteaProvider)
    // janitor.RegisterGitProvider("aws-codecommit", janitor.NewCodeCommitProvider)
    // janitor.RegisterGitProvider("gerrit", janitor.NewGerritProvider)

    // ─── 3. IaC Generators (config export to any format) ────────────────
    iac.RegisterGenerator("terraform", iac.NewTerraformGenerator)
    iac.RegisterGenerator("pulumi", iac.NewPulumiGenerator)
    iac.RegisterGenerator("ansible", iac.NewAnsibleGenerator)

    // Tier 2 — coming soon:
    // iac.RegisterGenerator("crossplane", iac.NewCrossplaneGenerator)
    // iac.RegisterGenerator("cdktf", iac.NewCDKTFGenerator)
    // iac.RegisterGenerator("opentofu", iac.NewOpenTofuGenerator)
}
```

**Key rules for registration:**
1. All registrations happen in a single `initProviders()` call in `main()`
2. No `init()` functions with side effects — explicit registration only
3. Tier 1 providers are registered by default
4. Tier 2+ providers are commented out until built, with clear tracking
5. Adding a new provider = write implementation + uncomment registration line
6. No factory switch statements anywhere in the codebase

---

### 7.10 Execution Order

1. **Terraform** — Complete existing work (expand resources, production hardening) — P0
2. **Pulumi** — Next most popular IaC tool, growing fast — P1
3. **Ansible** — Critical for SRE/ops teams, widest deployment — P1
4. **Crossplane** — Cloud-native / GitOps teams — P2
5. **CDKTF / OpenTofu** — AWS ecosystem + Terraform fork — P2
6. All others — Community contributions + long tail prioritization
   - Add migration example showing Terraform export
   - Add upgrade guide for provider versions


### 7.11 End-to-End Coverage — Multi-IaC Providers

#### 7.11.1 Backend API

**File:** `server/internal/api/handler/iac.go` (new)

```
POST /v1/iac/generate     — Generate IaC configs from current FeatureSignals resources
                          — body: { format: "terraform"|"pulumi"|"ansible"|... }
                          — returns: { files: [{ path, content, comment }] }

GET  /v1/iac/providers    — List all registered IaC providers with their capabilities
                          — returns: { providers: [{ name, display_name, file_extension, status }] }

POST /v1/iac/preview      — Preview what the generated configs would look like
                          — returns: { file_tree: [{ path, size, lines }] }
```

All endpoints follow CLAUDE.md handler patterns: narrowest interface, structured logging, domain error wrapping.

#### 7.11.2 Dashboard UI — IaC Provider Management

**File:** `dashboard/src/app/(app)/settings/integrations/iac/page.tsx` (new)

A management page with three sections:

1. **Provider Catalog:**
   - Grid of all registered IaC providers with name, icon, status (active/in development/coming soon)
   - Provider cards show: version, file extension, documentation link
   - Filter/search by provider name or type

2. **Config Export:**
   - Select resources to export (projects, environments, flags, segments, webhooks, API keys)
   - Select target format from available providers
   - Click "Generate" to produce config files
   - File tree preview with syntax-highlighted code panel
   - Download individual files or all as ZIP

3. **Editor Integration:**
   - "Copy to clipboard" button per file
   - "View diff" mode showing what changed since last export
   - Integration with migration export (section 7.6.3)

**States:** Loading (skeleton provider cards), Error (generation failures, API errors), Empty (no providers registered), Edge cases (large exports, unsupported resource types).

#### 7.11.3 Documentation

**Docs pages to create/update in `docs/docs/`:**

| Page | Path | Content |
|---|---|---|
| IaC Overview | `docs/docs/iac/overview.md` | Supported IaC formats, use cases, getting started |
| Terraform Provider | `docs/docs/iac/terraform.md` | Provider config, resources, data sources, examples, import |
| Pulumi Provider | `docs/docs/iac/pulumi.md` | Provider setup, resources, cross-language examples |
| Ansible Collection | `docs/docs/iac/ansible.md` | Collection setup, modules, playbook examples, roles |
| Crossplane Provider | `docs/docs/iac/crossplane.md` | CRDs, ProviderConfig, controller setup, composition |
| CDK / CDKTF | `docs/docs/iac/cdk.md` | Construct library, CDKTF bindings, high-level constructs |
| Migration Export | `docs/docs/iac/migration-export.md` | Exporting during migration, format comparison |
| Provider Development | `docs/docs/iac/developing-providers.md` | How to add a new IaC provider, registry pattern, templates |

**Dashboard docs links:**
```typescript
// Add to dashboard/src/components/docs-link.tsx
DOCS_LINKS.iac = `${DOCS_BASE}/iac/overview`
DOCS_LINKS.iacTerraform = `${DOCS_BASE}/iac/terraform`
DOCS_LINKS.iacPulumi = `${DOCS_BASE}/iac/pulumi`
DOCS_LINKS.iacAnsible = `${DOCS_BASE}/iac/ansible`
DOCS_LINKS.iacExport = `${DOCS_BASE}/iac/migration-export`
```

#### 7.11.4 Website

- `/features/integrations` page should list all supported IaC providers with icons
- Each IaC provider on the website must link to its docs page
- Pricing page should mention IaC support under "Infrastructure as Code" feature
- Footer "Terraform Registry" link should resolve to the actual registry URL
- No broken links between website and docs for IaC content

#### 7.11.5 Tests

| Layer | Test Type | Coverage |
|---|---|---|
| Backend | Unit | Every generator: terraform, pulumi, ansible, crossplane, cdk |
| Backend | Integration | Full generation flow: ResourceModel → Generate → validate output format |
| Backend | Integration | Registry operations: register, list, lookup, duplicate detection |
| Dashboard | Component | IaC provider catalog, config export UI, file preview |
| Dashboard | E2E | Export flow: select format → generate → preview → download |
| IaC | Acceptance | Terraform provider plan/apply against mock API |
| IaC | Acceptance | Pulumi provider preview/up against mock API |
| Docs | Link check | All IaC docs links resolve to valid pages |

---

## 8. Execution Order & Dependencies


| Order | Workstream | Depends On | Effort Estimate |
|---|---|---|---|
| 1 | Workstream 1 — UI Colors | None | Large (many files) |
| 2 | Workstream 4 — Icons | Workstream 1 (for color consistency) | Medium |
| 3 | Workstream 2 — Backend Migration + Dashboard UI + Docs | None | Large (backends + wizard + docs pages) |
| 4 | Workstream 7 — Multi-IaC Providers + Dashboard + Docs | Workstream 2 (for migration export) | Large (5+ providers + dashboard + docs) |
| 5 | Workstream 6 — Broken Links | Understanding page structure | Large (17+ new website pages + docs pages) |
| 6 | Workstream 3 — Slide-Over Panels | Workstream 1 (colors), Workstream 4 (icons) | Large (new component + 5 entity implementations) |
| 7 | Workstream 5 — AI Janitor (full stack) | Workstream 2 (may need integration hooks) | Large (API + dashboard + docs + website) |

**End-to-end rule:** Each group's workstreams must be complete across ALL five layers (backend, dashboard, website, docs, IaC) before being marked done. No partial deliveries.

**Parallel execution groups:**
- Group A (fully parallel): Workstream 1, Workstream 2, Workstream 6
- Group B (parallel): Workstream 4 (depends on 1), Workstream 7 (depends on 2)
- Group C (serial): Workstream 3 (depends on 1 + 4), Workstream 5 (depends on 2)

## 9. Quality Checklist

Every change **must** pass this checklist before merging:

### End-to-End Coverage (Five-Layer Mandatory)
- [ ] Backend API: endpoints exist, tested, documented, OpenAPI annotated
- [ ] Dashboard UI: pages exist (list, create, edit, delete, details) with all states (loading, empty, error, success, edge cases)
- [ ] Dashboard UI: API integration via `lib/api.ts` with typed interfaces
- [ ] Website: public page references the feature; no broken links
- [ ] Documentation: dedicated docs page(s) created; `DOCS_LINKS` entries added and verified
- [ ] IaC: Terraform/Pulumi/Ansible provider support added where applicable
- [ ] Tests: unit, integration, acceptance tests for ALL layers (not just backend)
- [ ] Observability: logging, metrics, error tracking added for the new feature

### Correctness
- [ ] Code compiles with zero warnings (`go vet`, `tsc --noEmit`)
- [ ] All new code has tests; existing tests still pass
- [ ] Error paths are handled — not just happy path
- [ ] Domain errors map to correct HTTP status codes (Go)
- [ ] Race condition safety verified (`go test -race`)
- [ ] No TypeScript `any` added; replace existing `any` where encountered

### Architecture (Go)
- [ ] Dependencies flow inward (handlers → domain ← store)
- [ ] New interfaces are as narrow as possible (ISP)
- [ ] No concrete implementation imports across package boundaries
- [ ] New behavior extends via composition, not modification (OCP)
- [ ] External service calls use timeouts, retries, and circuit breakers

### Architecture (Dashboard/Website)
- [ ] Server components by default; `"use client"` only when necessary
- [ ] No direct `fetch` calls in components — use `app/api` gateway
- [ ] Zustand for client state only — no new state libraries
- [ ] Radix UI for accessible interactive elements
- [ ] Tailwind CSS 4 only — no CSS modules, styled-components, or inline styles
- [ ] `cn()` utility for conditional class merging

### Data
- [ ] New queries have appropriate indexes; `EXPLAIN ANALYZE` verified
- [ ] Migration files come in pairs and are reversible
- [ ] No N+1 queries; batch where possible
- [ ] Transactions are short; no external I/O inside transactions

### Observability
- [ ] Structured logging with `org_id`, `request_id`, entity IDs
- [ ] Error logs include enough context to debug without reproducing
- [ ] New metrics points for significant operations

### Security
- [ ] No secrets, hardcoded URLs, or magic numbers
- [ ] Input validated at handler level before store calls
- [ ] Tenant isolation maintained (org-scoped queries)
- [ ] Rate limiting on new public endpoints
- [ ] API keys marked `sensitive` in Terraform schema

### UI/UX
- [ ] All components handle loading, error, empty, and success states
- [ ] Color scheme is consistent (accent/stone, no indigo/slate)
- [ ] All icons use lucide-react (no emoji, no hardcoded SVGs)
- [ ] Transitions and animations consistent with globals.css
- [ ] All links work — no 404s, no broken anchors
- [ ] Keyboard navigation works; ARIA labels present
- [ ] Responsive design: mobile-first, tested at common breakpoints

### Tests
- [ ] Unit tests for all new handlers, services, components
- [ ] Integration tests for all new store/repository methods
- [ ] Acceptance tests for all new Terraform resources
- [ ] Table-driven tests are the default pattern
- [ ] Test naming: `TestTypeName_Method_Scenario`

### Go Specific
- [ ] No `panic()` in production code
- [ ] No `init()` with side effects
- [ ] No global mutable state
- [ ] Context propagated as first parameter
- [ ] Errors wrapped with context (`fmt.Errorf("noun action: %w", err)`)
- [ ] Sentinel errors from `domain/errors.go`
- [ ] `slog` exclusively — no `fmt.Println` or `log.Printf`

### TypeScript/Dashboard Specific
- [ ] Strict mode — no `any`, no `@ts-ignore`, no `!` without guard
- [ ] Discriminated unions for async state
- [ ] No `console.log` in committed code
- [ ] All API responses have typed interfaces
- [ ] No bypassing `api.ts` client

---

## Appendix A: File Reference Map

```
featuresignals/
├── dashboard/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/
│   │   │   │   ├── analytics/
│   │   │   │   ├── approvals/
│   │   │   │   ├── audit/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── env-comparison/
│   │   │   │   ├── environments/
│   │   │   │   ├── flags/
│   │   │   │   ├── health/
│   │   │   │   ├── janitor/
│   │   │   │   ├── metrics/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── segments/
│   │   │   │   ├── settings/
│   │   │   │   │   ├── api-keys/
│   │   │   │   │   ├── billing/
│   │   │   │   │   ├── general/
│   │   │   │   │   ├── integrations/
│   │   │   │   │   ├── notifications/
│   │   │   │   │   ├── sso/
│   │   │   │   │   ├── team/
│   │   │   │   │   └── webhooks/
│   │   │   │   ├── target-comparison/
│   │   │   │   ├── target-inspector/
│   │   │   │   └── usage-insights/
│   │   │   ├── globals.css
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── empty-state.tsx
│   │   │   │   ├── error-display.tsx
│   │   │   │   ├── form-field.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── inline-create-form.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── loading-spinner.tsx
│   │   │   │   ├── page-header.tsx
│   │   │   │   ├── password-strength.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── stat-card.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   └── textarea.tsx
│   │   │   ├── flag-slide-over.tsx
│   │   │   ├── entity-dialog.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── docs-link.tsx
│   │   │   ├── context-bar.tsx
│   │   │   ├── command-palette.tsx
│   │   │   └── ... (other components)
│   │   ├── hooks/
│   │   └── lib/
│   │       ├── api.ts
│   │       ├── external-urls.ts
│   │       └── constants.ts
│   └── ...
├── website-new/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── header.tsx
│   │   │   └── footer.tsx
│   │   └── data/
│   │       └── nav-links.ts
│   └── ...
├── server/
│   ├── internal/
│   │   ├── integrations/
│   │   │   ├── launchdarkly/importer.go
│   │   │   ├── unleash/          ← NEW
│   │   │   ├── flagsmith/        ← NEW
│   │   │   └── migrator.go       ← NEW
│   │   ├── janitor/
│   │   │   ├── analyzer.go
│   │   │   └── analyzer_test.go
│   │   ├── api/handler/
│   │   │   ├── migration.go      ← NEW
│   │   │   └── janitor.go        ← NEW
│   │   └── ...
│   └── ...
├── terraform-fs/
│   ├── internal/
│   │   └── provider/
│   │       ├── provider.go
│   │       ├── client.go
│   │       ├── resource_flag.go
│   │       ├── resource_project.go       ← NEW
│   │       ├── resource_environment.go   ← NEW
│   │       ├── resource_segment.go       ← NEW
│   │       ├── resource_webhook.go       ← NEW
│   │       ├── resource_api_key.go       ← NEW
│   │       ├── resource_team_member.go   ← NEW
│   │       ├── data_source_flags.go
│   │       ├── data_source_flag.go       ← NEW
│   │       ├── data_source_projects.go   ← NEW
│   │       ├── data_source_environments.go ← NEW
│   │       ├── data_source_segments.go   ← NEW
│   │       └── *_test.go                  (for each)
│   ├── examples/                          ← POPULATE
│   └── README.md
└── docs/
    └── docs/
        ├── core-concepts/                  (verify pages exist)
        ├── api-reference/                  (verify pages exist)
        ├── advanced/                       (verify pages exist)
        ├── sdks/                           (verify pages exist)
        ├── getting-started/                (verify pages exist)
        ├── architecture/                   (verify pages exist)
        ├── deployment/                     (verify pages exist)
        └── ...                             (create missing pages)
```

---

## Appendix B: Design System Summary

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| accent | `#0d9488` | `accent`, `bg-accent`, `text-accent` | Primary actions, active states, badges |
| accent-dark | `#0f766e` | `accent-dark` | Hover states, pressed buttons |
| accent-light | `#4fd1c5` | `accent-light` | Subtle highlights, decorative elements |
| accent-subtle | `rgba(13,148,136,0.08)` | — | Subtle background, hover on cards |
| accent-glow | `rgba(13,148,136,0.25)` | — | Glow effects, focus rings |
| accent-glass | `rgba(13,148,136,0.06)` | — | Glassmorphism backgrounds |
| stone-50 | `#fafaf9` | `stone-50` | Page background |
| stone-100 | `#f5f5f4` | `stone-100` | Card background, hover states |
| stone-200 | `#e7e5e4` | `stone-200` | Borders, dividers |
| stone-300 | `#d6d3d1` | `stone-300` | Inactive borders |
| stone-400 | `#a8a29e` | `stone-400` | Muted text, icons |
| stone-500 | `#78716c` | `stone-500` | Secondary text |
| stone-600 | `#57534e` | `stone-600` | Body text |
| stone-700 | `#44403c` | `stone-700` | Strong text |
| stone-800 | `#292524` | `stone-800` | Headings |
| stone-900 | `#1c1917` | `stone-900` | Bold headings, dark backgrounds |

**Do NOT use:** `indigo-*`, `slate-*`, `violet-*`, `purple-*`, `fuchsia-*`, `pink-*` unless for specific semantic purposes (e.g., danger = red, success = emerald).

**Semantic color mapping:**
- Primary / Active / Brand → `accent`
- Success → `emerald`
- Warning → `amber`
- Danger / Destructive → `red` or `rose`
- Info → `blue` or `sky`
- Neutral → `stone`

---

*This document is a living prompt reference. Update as requirements evolve.*