---
title: Unified Overhaul Plan — Docs Migration, FlagEngine Rebrand & Dashboard-Docs Integration
tags: [strategy, planning, docs, dashboard, migration, architecture]
domain: architecture
sources:
  - MASTER_PLAN.md (Norman principles, NNGroup heuristics, Signal UI)
  - ARCHITECTURE.md (hexagonal architecture, multi-tenancy)
  - UX_STRATEGY.md (5 principles, heuristic checklist, 8-phase roadmap)
  - SIGNAL_UI.md (design tokens, component spec, interaction patterns)
related:
  - [[MASTER_PLAN.md]]
  - [[ARCHITECTURE.md]]
  - [[UX_STRATEGY.md]]
  - [[DEVELOPMENT.md]]
last_updated: 2026-05-16
maintainer: llm
review_status: current
confidence: high
---

## Overview

This plan covers three interconnected transformations grounded in Don Norman's design philosophy:

1. **Docs Migration**: Consolidate `docs.featuresignals.com` (Docusaurus, 99 pages) into `featuresignals.com/docs` (Next.js MDX). One surface, one design language.
2. **Dashboard Rebrand → FlagEngine**: Move from `app.featuresignals.com` to `featuresignals.com/flagengine`. The name "FlagEngine" reflects what the product IS — an engine that evaluates flags — rather than what it LOOKS like (a dashboard). Per Norman's Emotional Design: the reflective level ("I use a tool called FlagEngine") carries more weight than "I use a dashboard."
3. **FlagEngine-Docs Integration**: Contextual documentation panels that open inside FlagEngine without navigation loss. Users click `?` on any field and get the relevant docs, right there. This bridges the Gulf of Execution ("How do I configure this?") without leaving the task context.

---

## Part 0: Foundational Norman Principles for This Plan

### P0.1: One Surface, One Mental Model
> "Complexity is a fact of life; complication is a choice." — Living with Complexity, p. 4

Currently, users navigate three disconnected surfaces: `featuresignals.com` (website), `docs.featuresignals.com` (docs), `app.featuresignals.com` (dashboard). Each has different navigation, different visual language, different URL patterns. This is **complication we chose**. The fix: everything lives at `featuresignals.com/*`, sharing the same Signal UI design tokens, same navigation patterns, same content voice.

### P0.2: Bridge the Two Gulfs Without Leaving Context
> DOET, pp. 38-40

When a user encounters an unfamiliar field in FlagEngine, two gulfs open:
- **Gulf of Execution**: "How do I configure this targeting rule?"
- **Gulf of Evaluation**: "Did my configuration work?"

Currently, bridging these requires leaving FlagEngine → opening docs → searching → finding answer → returning. This is a 5-step context switch. The fix: contextual docs panel that opens inline. One click. Zero context loss.

### P0.3: Knowledge in the World, Not in the Head
> DOET, pp. 74-122

Every FlagEngine field should have accessible help (`?` icon) that reveals documentation without requiring the user to know the docs URL, remember a search term, or leave their workflow. The documentation is embedded in the world of the tool.

### P0.9: Three Levels of Emotional Design

| Level | Application to FlagEngine |
|-------|--------------------------|
| **Visceral** | Same premium Signal UI as the website. Dark sidebar, clean workspace. |
| **Behavioral** | Contextual docs panels. Keyboard shortcuts. Fast flag toggle. |
| **Reflective** | "I use FlagEngine" — the name itself signals technical craft. |

---

## Part 1: Docs Migration — Docusaurus → Next.js MDX

### 1.1 Current State

| Aspect | Docusaurus (`docs.featuresignals.com`) | Website (`featuresignals.com/docs`) |
|--------|--------------------------------------|-------------------------------------|
| Pages | 99 markdown files (97 `.md` + 2 `.mdx`) | ~45 React `.tsx` stubs (thin) |
| Sidebar | 3-tier progressive (Concepts/Guides/Reference) | 9-section flat sidebar |
| Interactive | 3 custom components (RolloutSimulator, TargetingRuleDemo, TryItSnippet) | None |
| API Playground | `@scalar/docusaurus` plugin | `@scalar/api-reference` standalone (working, needs spec file) |
| CSS | Docusaurus Infima + custom CSS (1,775 lines) | Signal UI design tokens |
| URL Pattern | `docs.featuresignals.com/getting-started/quickstart` | `featuresignals.com/docs/getting-started/quickstart` |

### 1.2 Target Architecture

```
featuresignals.com/docs/
├── layout.tsx                        ← DocsLayout (sidebar + content grid)
├── page.tsx                          ← Docs home / intro
├── api/
│   └── content/[slug]/
│       └── route.ts                  ← Docs Content API (returns rendered MDX)
├── getting-started/
│   ├── quickstart/page.mdx
│   ├── installation/page.mdx
│   ├── create-your-first-flag/page.mdx
│   └── migration/
│       ├── overview/page.mdx
│       ├── from-launchdarkly/page.mdx
│       ├── from-flagsmith/page.mdx
│       ├── from-unleash/page.mdx
│       ├── iac-export/page.mdx
│       └── troubleshooting/page.mdx
├── core-concepts/
│   ├── feature-flags/page.mdx
│   ├── toggle-categories/page.mdx
│   ├── projects-and-environments/page.mdx
│   ├── targeting-and-segments/page.mdx
│   ├── implementation-patterns/page.mdx
│   ├── percentage-rollouts/page.mdx
│   ├── ab-experimentation/page.mdx
│   ├── mutual-exclusion/page.mdx
│   ├── prerequisites/page.mdx
│   └── flag-lifecycle/page.mdx
├── architecture/
│   ├── overview/page.mdx
│   ├── evaluation-engine/page.mdx
│   └── real-time-updates/page.mdx
├── sdks/
│   ├── overview/page.mdx
│   ├── go/page.mdx → nodejs/ python/ java/ dotnet/ ruby/ react/ vue/
│   └── openfeature/page.mdx
├── api-reference/
│   ├── overview/page.mdx
│   ├── [category]/page.tsx          ← Dynamic from api-endpoints.ts
│   ├── playground/page.tsx          ← Scalar API Reference (already exists)
│   └── activity-guides/
│       ├── evaluating-flags/page.mdx
│       ├── managing-environments/page.mdx
│       └── managing-flags/page.mdx
├── advanced/
│   ├── ai-janitor/page.mdx
│   ├── ai-janitor-quickstart/page.mdx
│   ├── ai-janitor-git-providers/page.mdx
│   ├── ai-janitor-configuration/page.mdx
│   ├── ai-janitor-pr-workflow/page.mdx
│   ├── ai-janitor-llm-integration/page.mdx
│   ├── ai-janitor-troubleshooting/page.mdx
│   ├── approval-workflows/page.mdx
│   ├── audit-logging/page.mdx
│   ├── kill-switch/page.mdx
│   ├── rbac/page.mdx
│   ├── relay-proxy/page.mdx
│   ├── scheduling/page.mdx
│   └── webhooks/page.mdx
├── dashboard/                        ← FlagEngine user guides
│   ├── overview/page.mdx
│   ├── managing-flags/page.mdx
│   ├── env-comparison/page.mdx
│   ├── target-inspector/page.mdx
│   ├── target-comparison/page.mdx
│   ├── evaluation-metrics/page.mdx
│   ├── flag-health/page.mdx
│   └── usage-insights/page.mdx
├── deployment/
│   ├── docker-compose/page.mdx
│   ├── self-hosting/page.mdx
│   ├── on-premises/page.mdx
│   └── configuration/page.mdx
├── compliance/
│   ├── security-overview/page.mdx
│   ├── gdpr/ (privacy-policy, data-retention, dpa-template, subprocessors, gdpr-rights)
│   ├── soc2/ (controls-matrix, evidence-collection, incident-response)
│   ├── ccpa-cpra/page.mdx
│   ├── hipaa/page.mdx
│   ├── dora/page.mdx
│   ├── csa-star/page.mdx
│   ├── data-privacy-framework/page.mdx
│   ├── iso27001/isms-overview/page.mdx
│   └── iso27701/pims-overview/page.mdx
├── tutorials/
│   ├── feature-flag-checkout/page.mdx
│   ├── ab-testing-react/page.mdx
│   ├── progressive-rollout/page.mdx
│   └── kill-switch/page.mdx
├── iac/
│   ├── overview/page.mdx
│   ├── terraform/page.mdx
│   ├── pulumi/page.mdx
│   └── ansible/page.mdx
├── enterprise/
│   ├── overview/page.mdx
│   └── onboarding/page.mdx
├── self-hosting/
│   └── onboarding-guide/page.mdx
├── operations/
│   ├── incident-runbook/page.mdx
│   └── disaster-recovery/page.mdx
├── intro/page.mdx                     ← "What is FeatureSignals?"
└── GLOSSARY/page.mdx
```

### 1.3 Migration Strategy

**Phase 1A: Foundation (parallel)**
1. Copy `docs/static/openapi/featuresignals.json` → `website/public/openapi/featuresignals.json`
2. Create `website/src/lib/docs.ts` — shared utilities: MDX component registry, frontmatter parser, table of contents generator
3. Create `website/src/components/docs/` — shared MDX components: `Callout`, `CodeBlock`, `Steps`, `ApiEndpoint`, `TryIt`
4. Enhance `DocsSidebar` with 3-tier progressive disclosure (Concept → Guide → Reference sections with proper collapse defaults)

**Phase 1B: Content Migration — Tier 1: Concepts (8 parallel agents)**
- Agent 1: Core Concepts (10 pages: feature-flags through flag-lifecycle)
- Agent 2: Architecture (3 pages)
- Agent 3: Intro + Glossary (2 pages)
- All agents convert Docusaurus MDX → Next.js MDX, replacing Infima components with Signal UI equivalents

**Phase 1C: Content Migration — Tier 2: Guides (8 parallel agents)**
- Agent 1: Getting Started + Quick Start (3 pages)
- Agent 2: Migration guides (6 pages)
- Agent 3: Tutorials (4 pages)
- Agent 4: AI Janitor (7 pages)
- Agent 5: Platform + Advanced (8 pages: relay-proxy through webhooks)
- Agent 6: Dashboard/FlagEngine guides (8 pages)
- Agent 7: IaC (4 pages)
- Agent 8: Deployment (4 pages)

**Phase 1D: Content Migration — Tier 3: Reference (6 parallel agents)**
- Agent 1: API Reference overview + authentication
- Agent 2-3: API Reference categories (split 11 + 12)
- Agent 4: SDKs (10 pages)
- Agent 5: Security & Compliance (15 pages across GDPR/SOC2/CCPA/HIPAA/DORA/CSA/ISO)
- Agent 6: Enterprise + Operations (4 pages)

**Phase 1E: Interactive Components Port**
- Port `RolloutSimulator.tsx` from Docusaurus → Next.js component
- Port `TargetingRuleDemo.tsx` from Docusaurus → Next.js component
- Port `TryItSnippet.tsx` from Docusaurus → Next.js component
- Port custom CSS (~1,000 lines) to Tailwind + Signal UI tokens
- Register all 3 components in the MDX component registry

**Phase 1F: Redirects & Cleanup**
- Create 301 redirect map: old Docusaurus URLs → new `/docs/*` URLs
- Add to `next.config.ts` redirects array
- Update header/footer "Docs" links to point to `/docs`
- Remove 301 redirect from `/docs/page.tsx`
- Rebuild and verify all routes

### 1.4 Docs Content API (for FlagEngine Integration)

Create `website/src/app/docs/api/content/[slug]/route.ts`:

```typescript
// GET /docs/api/content/advanced/targeting
// Returns: { title, content (rendered MDX HTML), frontmatter, toc }
//
// Used by FlagEngine's contextual docs panel.
// Cached at CDN level (public content, no auth needed).
// Returns 304 Not Modified based on content hash.
```

This API is critical for Phase 2 (FlagEngine-docs integration). It must:
- Accept a doc slug (e.g., `core-concepts/targeting-and-segments`)
- Return rendered MDX content as HTML
- Include frontmatter (title, description, section)
- Include table of contents (for the side panel's mini-nav)
- Be cacheable (public, immutable content)
- Support `?section=heading-id` to scroll to specific heading

---

## Part 2: FlagEngine Rebrand — `app.featuresignals.com` → `featuresignals.com/flagengine`

### 2.1 Why "FlagEngine"

| Candidate | Norman Analysis |
|-----------|----------------|
| **FlagEngine** | Distinctive, technical, precise. Communicates what the product DOES (evaluates flags). Reflective level: "I use FlagEngine" — engineering pride. |
| Dashboard | Generic. Every SaaS has a dashboard. No reflective value. |
| ControlPlane | Enterprise jargon. Good but overloaded in infra space. |
| Workspace | Too generic. Not distinctive. |
| Flagship | Clever wordplay on "flagship" + "flags" but confusing (is it a ship? a product line?) |

**Decision: FlagEngine.**

### 2.2 Architecture: Proxy, Don't Merge

FlagEngine stays a **separate Next.js application** at `dashboard/`. Merging it into the website codebase would create a monolith that's hard to maintain, test, and deploy independently.

Instead, use a **reverse proxy** at the infrastructure level:

```
featuresignals.com
├── /*               → Website (Next.js, port 3000)
├── /docs/*          → Website (Next.js, port 3000) — same app
├── /flagengine/*    → FlagEngine (Next.js, port 3001) — proxied
└── /v1/*            → API Server (Go, port 8080) — proxied
```

**Implementation in `server/cmd/global-router/main.go`:**

```go
// Route /flagengine/* to the FlagEngine app
router.Handle("/flagengine/*", httputil.ReverseProxy("http://localhost:3001"))
```

**Implementation in `dashboard/next.config.ts`:**

```typescript
const nextConfig = {
  basePath: '/flagengine',
  assetPrefix: '/flagengine',
  // All routes, assets, and API calls are scoped under /flagengine
};
```

**Implementation in `dashboard/.env`:**

```bash
NEXT_PUBLIC_BASE_PATH=/flagengine
NEXT_PUBLIC_API_URL=https://featuresignals.com/v1
NEXT_PUBLIC_DOCS_API_URL=https://featuresignals.com/docs/api/content
```

### 2.3 URL Changes

| Before | After |
|--------|-------|
| `app.featuresignals.com/login` | `featuresignals.com/flagengine/login` |
| `app.featuresignals.com/projects` | `featuresignals.com/flagengine/projects` |
| `app.featuresignals.com/flags/my-flag` | `featuresignals.com/flagengine/flags/my-flag` |
| `app.featuresignals.com/settings` | `featuresignals.com/flagengine/settings` |

### 2.4 Migration Steps

**Phase 2A: FlagEngine Code Changes**
1. Update `dashboard/next.config.ts` — add `basePath: '/flagengine'`
2. Update all internal links to use `process.env.NEXT_PUBLIC_BASE_PATH`
3. Update API client (`dashboard/src/lib/api.ts`) — point to `featuresignals.com/v1`
4. Update all hardcoded URLs in components
5. Rebuild and test locally: `npx next build && npx next start --port 3001`

**Phase 2B: Global Router Config**
1. Add `/flagengine/*` → `localhost:3001` proxy rule
2. Add CORS headers if needed
3. Test end-to-end: register → login → create flag → evaluate

**Phase 2C: DNS & Deploy**
1. Deploy updated global router
2. Verify `featuresignals.com/flagengine` resolves correctly
3. Add 301 redirect from `app.featuresignals.com/*` → `featuresignals.com/flagengine/*`
4. Monitor for 48 hours
5. Retire `app.featuresignals.com` DNS record

---

## Part 3: FlagEngine-Docs Integration — Contextual Help Without Leaving

### 3.1 The Vision

A user is configuring a targeting rule in FlagEngine. They see a `?` icon next to "Match Type." They click it. A non-modal side panel slides out from the right, showing the relevant docs section — scrolled to the exact heading about match types. They read, understand, close the panel, and continue configuring. They never left FlagEngine. They never opened a new tab. The Gulf of Execution was bridged in one click.

### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────┐
│ FlagEngine (/flagengine/flags/my-flag/targeting)        │
│                                                         │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │
│  │                         │  │ DocsPanel             │ │
│  │  Targeting Rule Form    │  │                       │ │
│  │                         │  │  # Targeting Rules    │ │
│  │  Match Type: [dropdown]?│  │                       │ │
│  │  Attribute:  [input]    │  │  Match types          │ │
│  │  Operator:   [dropdown] │  │  determine how...     │ │
│  │  Value:      [input]    │  │                       │ │
│  │                         │  │  - ALL: Every rule...  │ │
│  │  [Add Condition]        │  │  - ANY: At least one..│ │
│  │                         │  │                       │ │
│  │                         │  │  [Open full docs →]   │ │
│  └─────────────────────────┘  └──────────────────────┘ │
│                                                         │
│  ? icon clicked → DocsPanel opens with content from     │
│  /docs/api/content/core-concepts/targeting-and-segments │
│  ?section=match-types                                   │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Components

**`FlagEnginePanel` (new) — `dashboard/src/components/docs-panel.tsx`:**

```typescript
// Props:
//   docSlug: string           — e.g., "core-concepts/targeting-and-segments"
//   section?: string          — e.g., "match-types" (heading ID to scroll to)
//   open: boolean
//   onClose: () => void

// Behavior:
//   1. Fetches rendered MDX from /docs/api/content/{docSlug}?section={section}
//   2. Renders in a non-modal side panel (right side, 480px wide)
//   3. Includes a mini table of contents for the doc
//   4. "Open in docs" link at bottom → opens /docs/{docSlug} in new tab
//   5. Smooth slide-in/out animation (250ms, Signal UI easing)
//   6. Close on Escape, click-outside, or X button
//   7. Responsive: full-screen drawer on mobile
```

**`FieldHelp` (existing, needs enhancement) — `dashboard/src/components/field-help.tsx`:**

```typescript
// Current: CSS-only tooltip with brief text
// Enhanced:
//   - If `docSlug` prop is provided, clicking opens DocsPanel instead of tooltip
//   - If no docSlug, falls back to existing tooltip behavior
//   - Visual distinction: ? with circle border becomes ? with book icon when docs available
```

**`DocsContent` (new, in website) — `website/src/components/docs/docs-content.tsx`:**

```typescript
// Renders MDX content from a given slug.
// Used by both /docs/* pages AND the Docs Content API.
// Accepts: slug, section (optional)
// Returns: rendered MDX with Signal UI styling
```

### 3.4 Integration Points (Where FieldHelp + DocsPanel Are Wired)

Every form field that has corresponding documentation gets a `?` icon:

| FlagEngine Page | Field | Doc Slug | Section |
|-----------------|-------|----------|---------|
| Flag Create | Flag Type | `core-concepts/toggle-categories` | `flag-types` |
| Flag Create | Key | `core-concepts/feature-flags` | `flag-keys` |
| Targeting Rules | Match Type | `core-concepts/targeting-and-segments` | `match-types` |
| Targeting Rules | Operator | `core-concepts/targeting-and-segments` | `operators` |
| Targeting Rules | Attribute | `core-concepts/targeting-and-segments` | `custom-attributes` |
| Segments | Segment Rules | `core-concepts/targeting-and-segments` | `segments` |
| Rollout | Percentage | `core-concepts/percentage-rollouts` | `progressive-rollout` |
| Experiments | Variants | `core-concepts/ab-experimentation` | `creating-experiments` |
| API Keys | Key Type | `api-reference/api-keys` | `key-types` |
| Webhooks | Event Types | `api-reference/webhooks` | `event-types` |
| AI Janitor | Scan Config | `advanced/ai-janitor-configuration` | `scan-configuration` |
| Environments | Environment Type | `core-concepts/projects-and-environments` | `environment-types` |
| RBAC | Role Assignment | `advanced/rbac` | `built-in-roles` |

### 3.5 Implementation Steps

**Phase 3A: Docs Content API**
1. Create `website/src/app/docs/api/content/[slug]/route.ts`
2. Implement MDX content fetching and rendering
3. Implement section-based content extraction (`?section=heading-id`)
4. Add caching headers (ETag, Cache-Control)
5. Test: `curl http://localhost:3000/docs/api/content/core-concepts/targeting-and-segments?section=match-types`

**Phase 3B: DocsPanel Component**
1. Create `dashboard/src/components/docs-panel.tsx`
2. Implement fetch, render, close behaviors
3. Style with Signal UI tokens matching the website
4. Add keyboard accessibility (Escape to close, focus trap)
5. Add responsive behavior (full-screen on mobile)

**Phase 3C: FieldHelp Enhancement**
1. Update `FieldHelp` to accept optional `docSlug` and `docSection` props
2. When `docSlug` present: show book icon, open DocsPanel on click
3. When no `docSlug`: existing tooltip behavior
4. Add to field-help.tsx: optional `onOpenDocs` callback

**Phase 3D: Wiring**
1. Wire FieldHelp to all 13 integration points listed above
2. Add a global `DocsPanel` provider at FlagEngine layout level
3. Pass `openDocSlug` state through React Context so any component can trigger docs

---

## Part 4: Content Voice — Consistent Across All Three Surfaces

One voice speaks from website, docs, and FlagEngine:

| Attribute | Website | Docs | FlagEngine |
|-----------|---------|------|------------|
| **Headings** | Bold, benefit-oriented | Clear, descriptive | Action-oriented |
| **Body** | Confident, helpful | Educational, thorough | Concise, instructive |
| **CTAs** | "Start free" | "Read next: →" | "Save and continue" |
| **Errors** | Never shown (redirected) | "X didn't work because Y. Try Z." | Inline validation + DocsPanel |
| **Success** | Brief confirmation | "You've completed X. Next: Y" | Auto-dismissing toast |

Signal UI content voice rules from SIGNAL_UI.md §3.4 apply everywhere:
- Confident, helpful, never condescending
- Use engineering terms correctly; explain when introducing
- "You" and "your team" not "users" and "accounts"
- Never disparage competitors

---

## Part 5: Implementation Phases (In Order)

### Phase 1: Docs Migration (Days 1-3)

**Phase 1A: Foundation (Day 1 morning)**
- [ ] Copy OpenAPI spec to `website/public/openapi/featuresignals.json`
- [ ] Create `website/src/lib/docs.ts` (MDX registry, frontmatter parser, TOC generator)
- [ ] Create `website/src/components/docs/` (Callout, CodeBlock, Steps, ApiEndpoint, TryIt)
- [ ] Enhance `DocsSidebar` with 3-tier progressive disclosure
- [ ] Verify API playground works at `/docs/api-reference/playground`
- [ ] Verify existing `/docs` pages still work

**Phase 1B: Tier 1 — Concepts (Day 1 afternoon, 3 parallel agents)**
- Agent 1: Core Concepts (10 pages)
- Agent 2: Architecture (3 pages)
- Agent 3: Intro + Glossary (2 pages)
- [ ] All 15 pages as Next.js MDX with Signal UI styling

**Phase 1C: Tier 2 — Guides (Day 2, 8 parallel agents)**
- Agent 1: Getting Started + Quick Start (3 pages)
- Agent 2: Migration guides (6 pages)
- Agent 3: Tutorials (4 pages)
- Agent 4: AI Janitor (7 pages)
- Agent 5: Platform + Advanced (8 pages)
- Agent 6: FlagEngine guides (8 pages)
- Agent 7: IaC (4 pages)
- Agent 8: Deployment (4 pages)
- [ ] All 44 pages as Next.js MDX

**Phase 1D: Tier 3 — Reference (Day 3 morning, 6 parallel agents)**
- Agent 1: API Reference overview + auth
- Agent 2-3: API Reference categories
- Agent 4: SDKs (10 pages)
- Agent 5: Security & Compliance (15 pages)
- Agent 6: Enterprise + Operations (4 pages)
- [ ] All remaining pages as Next.js MDX

**Phase 1E: Interactive Components (Day 3 afternoon)**
- [ ] Port RolloutSimulator → `website/src/components/docs/rollout-simulator.tsx`
- [ ] Port TargetingRuleDemo → `website/src/components/docs/targeting-rule-demo.tsx`
- [ ] Port TryItSnippet → `website/src/components/docs/try-it-snippet.tsx`
- [ ] Port custom CSS → Tailwind + Signal UI tokens
- [ ] Register all 3 in MDX component registry
- [ ] Embed in relevant `.mdx` pages (targeting, rollout, quickstart)

**Phase 1F: Redirects & Cleanup (Day 3 evening)**
- [ ] Create 301 redirect map for ALL old Docusaurus URLs → new `/docs/*` URLs
- [ ] Add to `next.config.ts`
- [ ] Update header "Docs" → `/docs` (internal link)
- [ ] Update footer "Docs" links → `/docs/*`
- [ ] Remove 301 redirect from `/docs/page.tsx` (replace with actual docs home)
- [ ] `npx next build` — verify all routes
- [ ] `npx serve out` — manual QA on 5 random pages

### Phase 2: Docs Content API (Day 4 morning)

- [ ] Create `website/src/app/docs/api/content/[slug]/route.ts`
- [ ] Implement MDX rendering endpoint
- [ ] Implement `?section=` parameter
- [ ] Add caching headers
- [ ] Test with curl

### Phase 3: FlagEngine Rebrand (Day 4 afternoon)

- [ ] Update `dashboard/next.config.ts` — `basePath: '/flagengine'`
- [ ] Update `dashboard/.env` — `NEXT_PUBLIC_BASE_PATH`, API URLs
- [ ] Update all internal links (use `basePath` prefix)
- [ ] Update `dashboard/src/lib/api.ts` — point to `featuresignals.com/v1`
- [ ] Rebuild FlagEngine: `npx next build`
- [ ] Test locally: `npx next start --port 3001`
- [ ] Add proxy rule in global router: `/flagengine/*` → `localhost:3001`
- [ ] Test end-to-end: register → login → create flag → evaluate

### Phase 4: FlagEngine-Docs Integration (Day 5)

- [ ] Create `dashboard/src/components/docs-panel.tsx`
- [ ] Create `dashboard/src/contexts/docs-context.tsx` (DocsProvider)
- [ ] Enhance `FieldHelp` with `docSlug` + `docSection` props
- [ ] Wire DocsProvider into FlagEngine layout
- [ ] Wire FieldHelp to all 13 integration points
- [ ] Test: click `?` → panel opens → content loads → close → continue

### Phase 5: Verification & Polish (Day 6)

- [ ] Full build: website + FlagEngine + server
- [ ] E2E smoke test: homepage → docs → sign up → flagEngine → create flag → click `?` → read docs → close panel → continue
- [ ] Lighthouse audit: website 95+, docs 90+, FlagEngine 90+
- [ ] Accessibility audit (axe-core) on all 3 surfaces
- [ ] Visual regression: before/after screenshots
- [ ] 301 redirects: verify old Docusaurus URLs → new `/docs/*` URLs
- [ ] 301 redirect: `app.featuresignals.com/*` → `featuresignals.com/flagengine/*`

### Phase 6: Deploy & Sunset (Day 7)

- [ ] Deploy website (with docs) to production
- [ ] Deploy FlagEngine with new basePath
- [ ] Deploy global router with new proxy rules
- [ ] Deploy DNS changes (app.featuresignals.com → featuresignals.com/flagengine)
- [ ] Monitor for 48 hours (error rates, 404s, redirect chains)
- [ ] Sunset `docs.featuresignals.com` DNS record
- [ ] Archive Docusaurus codebase at `docs/`

---

## Part 6: Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Docs pages migrated | 99/99 | Build output: `find website/src/app/docs -name 'page.mdx' \| wc -l` |
| Old URL redirects | 100% coverage | `curl -I` on old Docusaurus URLs → 301 to new URLs |
| FlagEngine base path | Zero broken links | E2E click-through: login → create flag → evaluate |
| Contextual docs panel | <500ms load time | `performance.now()` from click to content rendered |
| Console errors | 0 across all surfaces | Browser console on homepage, /docs, /flagengine |
| Lighthouse | 95+ website, 90+ docs, 90+ flagengine | Chrome DevTools Lighthouse |
| Accessibility | WCAG 2.1 AA (0 critical violations) | axe-core automated audit |

---

## Part 7: Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| MDX rendering differs between Docusaurus and Next.js | Medium | Shared component registry; visual diff on every page |
| `basePath` breaks FlagEngine auth redirects | Medium | Test auth flow end-to-end before deploy |
| Docs Content API overloads website | Low | CDN cache (public, immutable content); rate limit |
| Old Docusaurus URLs not all redirected | Low | Script to diff Docusaurus routes vs Next.js routes |
| SEO rankings drop during migration | Low | 301 redirects preserve link equity; submit new sitemap |

---

## Cross-References

- [[MASTER_PLAN.md]] — Norman principles, NNGroup heuristics, Signal UI specification
- [[ARCHITECTURE.md]] — Hexagonal architecture, global router, deployment topology
- [[UX_STRATEGY.md]] — 5 design principles, heuristic checklist
- [[SIGNAL_UI.md]] — Design tokens, component spec, interaction patterns
- [[DEVELOPMENT.md]] — Go server standards, handler pattern, dashboard standards
