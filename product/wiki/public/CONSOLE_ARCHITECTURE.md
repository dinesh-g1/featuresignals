# Console Shell Architecture — FeatureSignals Dashboard

> **Version:** 1.0.0
> **Status:** Current (supersedes sidebar-based layout in UI_UX_SPECIFICATION.md §2.2)
> **Applies To:** All dashboard code under `dashboard/src/app/(app)/`
> **Last Updated:** 2026-05-28
> **Replaces:** Old sidebar layout (NavList, ContextBar, EnvColorBar, Breadcrumb, DashboardFooter, IconRail, FloatingPanel)

---

## 1. Overview

The FeatureSignals dashboard uses a **single unified console shell** as the default layout for all authenticated routes. The old sidebar-based navigation has been completely removed. The console provides three primary interaction zones, a top bar for navigation and context switching, a context panel for detail views, and a bottom status bar.

---

## 2. Console Shell Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TopBar (48px)                                                           │
│ [FS] [Maturity] │ [Org] [Project▼] [Env▼] │ [Search ⌘K] [⚙️] [?] [👤] │
├────────┬───────────────────────────────────────────────────┬─────────────┤
│CONNECT │              LifecycleZone (center)                │    LEARN    │
│(left,  │                                                   │   (right,   │
│collaps-│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │collapsible)│
│ible)   │   │Code2Flag│ →  │Preflight│ →  │IncidentF│ →  │ Impact  │     │
│        │   │   4     │    │   3     │    │  lag 2  │    │Analyzer2│     │
│        │   └─────────┘    └─────────┘    └─────────┘    └─────────┘     │
│        │   [expanded product cards show internal stages]                 │
├────────┴───────────────────────────────────────────────────┴─────────────┤
│ BottomBar (32px): Status • Connection • Feature Count                    │
└──────────────────────────────────────────────────────────────────────────┘
                        │
              ContextPanel (380px overlay, right)
              [flag-detail|ship-wizard|incident|preflight|janitor|approval]
```

### 2.1 TopBar (48px)

Fixed top bar present on all console pages.

| Position | Element | Purpose |
|----------|---------|---------|
| Left | FS Logo | Navigate to `/console` |
| Left | Maturity Badge | Agent maturity level indicator |
| Center-Left | Org Selector | Current organization |
| Center-Left | Project Dropdown | Project selector with create/edit/delete, "View all projects" link |
| Center-Left | Environment Dropdown | Environment selector (development, staging, production) |
| Center-Right | Search (⌘K) | Command palette / global search |
| Right | Settings Gear (⚙️) | Settings dropdown (see §4 Settings Hierarchy) |
| Right | Help (?) | Documentation, support, keyboard shortcuts |
| Right | User Menu (👤) | Profile, logout, theme toggle |

### 2.2 Main Area — Three Zones

The main area is divided into three horizontal zones. CONNECT and LEARN are collapsible, giving LifecycleZone maximum space when needed.

| Zone | Position | Width | Content |
|------|----------|-------|---------|
| **CONNECT** | Left | ~280px, collapsible | SDK installation, API keys, integrations, connection status |
| **LifecycleZone** | Center | Flexible (fills remaining) | 4 product cards in flow (see §3) |
| **LEARN** | Right | ~320px, collapsible | Insights, compliance, impact reports, audit preview |

### 2.3 ContextPanel (380px Overlay)

A right-side overlay panel that slides in when a feature, incident, or action needs detail view. Does not push main content — overlays on top.

| Panel Type | Trigger | Content |
|------------|---------|---------|
| `flag-detail` | Click feature in LifecycleZone | Flag details, targeting, history, hold-to-confirm actions |
| `ship-wizard` | Ship/rollout action | Rollout stepper, guard metrics, approval status |
| `incident` | Incident alert | Incident timeline, correlation, remediation options |
| `preflight` | Preflight check | Impact analysis, compliance check, approval chain |
| `janitor` | Cleanup action | Stale flag details, cleanup PR preview |
| `approval` | Pending approval | Approval/rejection with reason, audit trail |

### 2.4 BottomBar (32px)

Fixed bottom bar with:

- **Status indicator:** Green/yellow/red dot with system status text
- **Connection status:** WebSocket connection state
- **Feature count:** Total features across selected project/environment

---

## 3. Resource Hierarchy in UI

The console reflects the FeatureSignals data model hierarchy:

```
Organization
  └── Project (selectable via TopBar dropdown)
       └── Environment (selectable via TopBar dropdown)
            └── Features (displayed in LifecycleZone)
```

- **Org** is set at login and persisted in AppStore
- **Project** and **Environment** are selectable dropdowns in the TopBar
- All data in LifecycleZone, CONNECT, and LEARN zones is scoped to the selected project + environment
- URL sync: `/console?project=X&env=Y&stage=Z&feature=F`

---

## 4. Product Card Flow in LifecycleZone

The LifecycleZone displays 4 product cards in a left-to-right flow with SVG arrow connectors:

```
Code2Flag  →  Preflight  →  IncidentFlag  →  Impact Analyzer
   (4 stages)   (3 stages)     (2 stages)       (2 stages)
```

### 4.1 Product Cards

Each card shows:
- Product icon (lucide-react)
- Product name
- Phase indicator (PLAN, BUILD, OPERATE, LEARN)
- Feature count badge
- Click to expand → reveals internal stages as mini-kanban columns

### 4.2 Product Definitions

| Product | Icon | Phase | Internal Stages |
|---------|------|-------|-----------------|
| **Code2Flag** | `Code2` | PLAN | CONCEIVE, SPECIFY, DESIGN, FLAGIFY |
| **Preflight** | `Rocket` | BUILD | CONFIGURE, APPROVE, EXECUTE |
| **IncidentFlag** | `AlertTriangle` | OPERATE | OBSERVE, DECIDE |
| **Impact Analyzer** | `BarChart3` | LEARN | ANALYZE, LEARN |

### 4.3 Expanded View

Clicking a product card expands it downward to reveal internal stages as mini-kanban columns. Each column shows:
- Stage name
- Feature count for that stage
- Clickable features that open the ContextPanel

### 4.4 Stage Zoom

URL parameter `?stage=FLAGIFY` auto-expands the parent product (Code2Flag) and highlights the specific stage column.

### 4.5 Animations

- framer-motion `spring` transitions for expand/collapse
- Respects `prefers-reduced-motion` — no animation when set
- SVG arrow connectors between product cards

---

## 5. Settings Hierarchy

Settings are accessed via the gear icon (⚙️) in the TopBar. The dropdown organizes settings by resource scope:

```
Settings
├── Organization
│   ├── General
│   ├── Billing
│   ├── Team
│   ├── SSO
│   └── Notifications
├── Project
│   └── Integrations
└── Environment
    ├── API Keys
    └── Webhooks
```

Settings pages render at `/console/settings/*` using the same console shell layout.

---

## 6. Navigation Scheme

| Route | Layout | Content |
|-------|--------|---------|
| `/console` | Console Shell (default) | LifecycleZone with 4 product cards |
| `/console/settings/*` | Console Shell | Settings pages |
| `/projects` | Console Shell | Project management (grid of project cards) |
| `/activity` | Center Zone | Activity feed |
| `/usage` | Center Zone | Usage metrics |
| `/limits` | Center Zone | Rate limits and quotas |
| `/onboarding` | Minimal (no shell) | New user onboarding flow |
| `/pricing` | Minimal (no shell) | Pricing page |
| `/support` | Minimal (no shell) | Support page |

**Route behavior:**
- All `/console/*` routes render LifecycleZone in the center
- Non-console routes (`/projects`, `/activity`, `/usage`, `/limits`) render their page content in the center zone
- Minimal-layout routes (`/onboarding`, `/pricing`, `/support`) bypass the console shell entirely

---

## 7. State Management

### 7.1 ConsoleStore (Zustand vanilla)

Non-persisted, in-memory store for console UI state:

| State | Type | Purpose |
|-------|------|---------|
| `features` | `Feature[]` | Features for current project/env |
| `integrations` | `Integration[]` | API keys, SDK installs |
| `insights` | `InsightReport[]` | Impact reports, compliance |
| `selectedFeatureId` | `string \| null` | Currently selected feature (opens ContextPanel) |
| `expandedProductId` | `ProductId \| null` | Currently expanded product card |
| `panelType` | `PanelType \| null` | Active ContextPanel type |
| `isConnectOpen` | `boolean` | CONNECT zone collapsed state |
| `isLearnOpen` | `boolean` | LEARN zone collapsed state |
| `retryTrigger` | `number` | Increment to trigger zone data refetch |

### 7.2 AppStore (Zustand + persist)

Persisted store for authentication and context:

| State | Type | Purpose |
|-------|------|---------|
| `user` | `User \| null` | Authenticated user |
| `org` | `Org \| null` | Current organization |
| `selectedProjectId` | `string \| null` | Selected project |
| `selectedEnvId` | `string \| null` | Selected environment |
| `token` | `string \| null` | JWT access token |
| `refreshToken` | `string \| null` | JWT refresh token |

### 7.3 URL Sync

Bidirectional URL synchronization via `use-console-url-sync.ts`:

- **Read:** On mount, reads `?stage=`, `?env=`, `?search=`, `?feature=` from URL
- **Write:** On state change, updates URL query params without full page reload
- **Deep-linkable:** Any console state can be shared via URL

---

## 8. Data Flow

```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│  API     │ ←→  │ ConsoleStore │ ←→  │   UI     │
│ Client   │     │ (Zustand)    │     │ Components│
└──────────┘     └─────────────┘     └──────────┘
      │                                    │
      │ requestWithRetry()                 │ URL sync
      │ (token refresh, no transformKeys)   │ bidirectional
      ▼                                    ▼
┌──────────┐                        ┌──────────────┐
│ Go Server│                        │ URL params   │
│ /v1/*    │                        │ stage, env,   │
└──────────┘                        │ search, feature│
                                    └──────────────┘
```

### 8.1 API Client

- All API calls go through `dashboard/src/lib/api.ts`
- `requestWithRetry()` handles token refresh, retry with backoff
- **No `transformKeys`** — wire format (snake_case) matches TypeScript types exactly
- All types defined in `dashboard/src/lib/console-types.ts`

### 8.2 WebSocket

- Auto-reconnecting WebSocket with JWT refresh
- Used for real-time updates (feature state changes, incident alerts)
- Connection status displayed in BottomBar

---

## 9. Design Tokens

All styling uses **Signal UI** design tokens exclusively. Zero hardcoded hex colors anywhere.

### 9.1 Token Categories

| Category | Examples |
|----------|----------|
| **Color** | `--signal-bg-surface`, `--signal-text-primary`, `--signal-accent`, `--signal-danger`, `--signal-warning`, `--signal-success` |
| **Spacing** | `--signal-space-1` (4px) through `--signal-space-12` (48px) |
| **Typography** | `--signal-font-sans`, `--signal-text-xs` through `--signal-text-3xl` |
| **Radius** | `--signal-radius-sm`, `--signal-radius-md`, `--signal-radius-lg` |
| **Shadow** | `--signal-shadow-sm`, `--signal-shadow-md`, `--signal-shadow-lg` |
| **Animation** | `--signal-transition-fast` (150ms), `--signal-transition-normal` (250ms), `--signal-transition-slow` (350ms) |

### 9.2 Dark Mode

All Signal UI tokens have dark mode variants. The token system handles theme switching automatically. Components use the same token names in both modes.

---

## 10. State Handling Patterns

Every page and component must handle all states:

| State | Pattern |
|-------|---------|
| **Loading** | Skeleton/spinner matching content shape; visible within 200ms |
| **Empty (no data)** | Contextual illustration + message + CTA button |
| **Empty (filtered)** | "No results match your filters" + suggestion + clear filters |
| **Error** | Human-readable error + error code + retry button + support link |
| **Success** | Data displayed with clear hierarchy |
| **Not Found** | Clear 404 with navigation suggestions |
| **Unauthorized** | Redirect or permission request UI |
| **Rate Limited** | Wait time + suggestion |

### 10.1 Console-Specific States

| Zone | Loading | Empty | Error |
|------|---------|-------|-------|
| **LifecycleZone** | 4 product card skeletons | Welcome CTA with "Create your first feature" | Error card with retry |
| **CONNECT** | 2 skeleton rows | "Connect your first integration" CTA | Error with retry |
| **LEARN** | 2 skeleton cards | "Insights will appear here" message | Error with retry |
| **ContextPanel** | Panel skeleton with shimmer | N/A (only opens with data) | Error message inside panel |
| **BottomBar** | Pulsing status dot | Default (shows counts as zero) | Red status indicator |

---

## 11. Accessibility

- **Keyboard navigation:** All interactive elements are focusable and operable via keyboard
- **Focus management:** Focus is trapped in dialogs and the ContextPanel
- **Skip to main content:** WCAG 2.1 AA compliant skip link
- **Screen reader:** ARIA labels on all interactive elements; live regions for status updates
- **Reduced motion:** `prefers-reduced-motion` respected throughout — animations disabled when set
- **Color contrast:** All Signal UI tokens meet WCAG AA contrast ratios in both light and dark modes

---

## 12. Cross-References

- [[SIGNAL_UI.md]] — Complete design token architecture
- [[UX_STRATEGY.md]] — Don Norman-inspired design principles
- [[../private/UI_UX_SPECIFICATION.md]] — Original UI/UX spec (sidebar sections superseded)
- [[TERMINOLOGY.md]] — Approved vocabulary for all UI labels
- [[DEFINITION_OF_DONE.md]] — 7-layer completion standard

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-28 | Console Overhaul | Initial console architecture reference. Documents unified shell layout (TopBar, 3 zones, ContextPanel, BottomBar), resource hierarchy, product card flow, settings hierarchy, navigation scheme, state management, data flow, design tokens, state handling patterns, and accessibility. Supersedes sidebar-based navigation in UI_UX_SPECIFICATION.md §2.2. |
