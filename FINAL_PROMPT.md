# FeatureSignals — Holistic Product Redesign: Master Implementation Prompt

> **Version:** 2.0.0
> **Status:** Ready for execution — all Primer knowledge integrated
> **Source:** https://primer.style/product/getting-started + all component pages + all UI pattern pages
> **Applies to:** `website/`, `dashboard/`, `server/`, `sdks/`
> **Philosophy:** Show, don't tell. Every claim is demonstrable. Every section earns its place interactively. Every surface follows GitHub Primer — not as reskin, but as philosophy.

---

## Table of Contents

1. [The GitHub Philosophy — Our Guiding Principles](#1-the-github-philosophy--our-guiding-principles)
2. [Design System — 100% GitHub Primer](#2-design-system--100-github-primer)
3. [The 60-Second Website — Section-by-Section Spec](#3-the-60-second-website--section-by-section-spec)
4. [Dashboard — Complete Primer Product UI](#4-dashboard--complete-primer-product-ui)
5. [Contextual DX — Snippets, APIs, SDKs Unified](#5-contextual-dx--snippets-apis-sdks-unified)
6. [API Patterns — Public → Authenticated Gradual Flow](#6-api-patterns--public--authenticated-gradual-flow)
7. [Implementation Order](#7-implementation-order)
8. [Phase 1 — Detailed Execution Spec](#8-phase-1--detailed-execution-spec)
9. [Code Quality & Standards](#9-code-quality--standards)
10. [Data Sources & References](#10-data-sources--references)

---

## 1. The GitHub Philosophy — Our Guiding Principles

These 14 aphorisms from GitHub's own codebase govern every decision. They are non-negotiable:

1. **Responsive is better than fast** — Sub-millisecond is meaningless if the UI stutters. Smooth > fast.
2. **It's not fully shipped until it's fast** — Every interaction must feel instant. No lag, no jank.
3. **Anything added dilutes everything else** — Every section on the page must earn its place. Remove what doesn't serve.
4. **Practicality beats purity** — Perfect code no one uses is worthless. Working code that solves problems wins.
5. **Approachable is better than simple** — "Simple" often means "dumbed down." Approachable means "I understand this instantly."
6. **Mind your words, they are important** — Every label, every error message, every CTA. Words shape trust.
7. **Speak like a human** — No "utilize" when "use" works. No "leverage" when "build" is clearer. Human tone.
8. **Half measures are as bad as nothing at all** — Don't ship a feature that's 80% done. Ship it complete or don't ship it.
9. **Encourage flow** — Remove friction. Never interrupt a user mid-task. Keep them in their zone.
10. **Non-blocking is better than blocking** — Never make the user wait on the system. Always give them something to do.
11. **Favor focus over features** — Better one thing done perfectly than ten things done poorly.
12. **Avoid administrative distraction** — Don't ask for org name, team size, role during signup. Ask for email. That's it.
13. **Design for failure** — Every component must handle: loading, empty, error, degraded, and success states.
14. **Keep it logically awesome** — The code, the design, the experience — all of it should make logical sense together.

### From Primer's Getting Started Guide

**Cohesive experience:** Familiar patterns help people intuitively navigate. If pages don't share the same metaphors, people get confused. Every page in our product — website, dashboard, docs — must feel like one product.

**Inclusive and accessible design:** Accessibility from the start, not retrofitted. Every component must be keyboard navigable, screen-reader friendly, and color-contrast compliant.

**Design for efficiency:** Encourage flow, focus, and an experience that is fast and compact. "Primer's goal is to remove as much friction as possible between the human and the software."

---

## 2. Design System — 100% GitHub Primer

### 2.1 Design Tokens (from `@primer/css` v22)

All tokens are CSS custom properties. No hardcoded values anywhere.

```css
/* Foreground */
--fgColor-default: #1f2328;
--fgColor-muted: #59636e;
--fgColor-subtle: #818b98;
--fgColor-accent: #0969da;
--fgColor-success: #1a7f37;
--fgColor-attention: #9a6700;
--fgColor-danger: #d1242f;
--fgColor-done: #8250df;
--fgColor-onEmphasis: #ffffff;

/* Background */
--bgColor-default: #ffffff;
--bgColor-inset: #f6f8fa;
--bgColor-muted: #f6f8fa;
--bgColor-emphasis: #25292e;
--bgColor-accent-emphasis: #0969da;
--bgColor-accent-muted: #ddf4ff;
--bgColor-success-emphasis: #1f883d;
--bgColor-success-muted: #dafbe1;
--bgColor-attention-emphasis: #9a6700;
--bgColor-attention-muted: #fff8c5;
--bgColor-danger-emphasis: #cf222e;
--bgColor-danger-muted: #ffebe9;
--bgColor-done-emphasis: #8250df;
--bgColor-done-muted: #fbefff;

/* Border */
--borderColor-default: #d1d9e0;
--borderColor-muted: #d1d9e0b3;
--borderColor-accent-muted: #54aeff66;

/* Shadows (exact Primer values) */
--shadow-resting-small: 0 1px 1px 0 #1f23280a, 0 1px 2px 0 #1f232808;
--shadow-floating-small: 0 0 0 1px #d1d9e080, 0 6px 12px -3px #25292e0a, 0 6px 18px 0 #25292e1f;
--shadow-floating-medium: 0 0 0 1px #d1d9e000, 0 8px 16px -4px #25292e14, 0 4px 32px -4px #25292e14, 0 24px 48px -12px #25292e14, 0 48px 96px -24px #25292e14;
--shadow-floating-large: 0 0 0 1px #d1d9e000, 0 40px 80px 0 #25292e3d;

/* Typography: GitHub system font stack — NO Google Fonts */
--fontStack-system: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
--fontStack-monospace: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;

/* Radius */
--radius-2: 6px;   /* small, NavList items, buttons */
--radius-3: 8px;   /* medium, cards */
--radius-4: 12px;  /* large, dialogs, modals */
--radius-5: 16px;  /* XL */
--radius-6: 24px;  /* 2XL, hero containers */
```

### 2.2 Component Patterns (Primer Spec)

#### Card
```
┌──────────────────────────────────┐
│ [Icon]                           │  ← Card.Icon (optional)
│ Card Heading                     │  ← Card.Heading (h3, 16px, semibold)
│ Description text providing       │  ← Card.Description (14px, fgColor-muted)
│ supplemental information.        │
│ Updated 2 hours ago              │  ← Card.Metadata (12px, fgColor-subtle)
└──────────────────────────────────┘
```
- Border: 1px `--borderColor-default`
- Shadow: `--shadow-resting-small`
- Hover: `--shadow-floating-small` + `translateY(-2px)`
- Radius: `--radius-3` (8px)
- Padding: 16px (normal), 12px (condensed)
- Transition: 0.2s ease

#### Primary CTA Button
```css
background: #1f883d;  /* Primer success green, NOT blue */
color: #ffffff;
box-shadow: 0 1px 0 0 #1f232826;
border-radius: 6px;
padding: 8px 16px;
font-weight: 600;
font-size: 14px;
/* hover: background #1c8139 */
/* active: background #197935 */
```

> **Critical:** GitHub uses GREEN for primary CTAs (`#1f883d`), not blue. Blue (`#0969da`) is for links and accent. This is intentional — green means "go," "create," "take action."

#### Default Button
```css
background: #f6f8fa;
color: #25292e;
border: 1px solid #d1d9e0;
box-shadow: 0 1px 0 0 #1f23280a;
border-radius: 6px;
/* hover: background #eff2f5 */
```

#### Blankslate (Empty State)
```
┌──────────────────────────────────────┐
│                                      │
│            [Icon: BookIcon]          │  ← Blankslate.Visual (fgColor-muted)
│                                      │
│         Welcome to the wiki          │  ← Blankslate.Heading (20px)
│                                      │
│   Wikis provide a place to lay out   │  ← Blankslate.Description (14px,
│   the roadmap of your project...     │     fgColor-muted, max-width 500px)
│                                      │
│      [Create the first page]         │  ← Blankslate.PrimaryAction (green)
│                                      │
│      Learn more about wikis          │  ← Blankslate.SecondaryAction (link)
└──────────────────────────────────────┘
```
- Variants: narrow, spacious, border
- Error state: use alert icon (NOT playful), explain problem, guide to recovery
- First-time experience: use illustration/Octocat, welcoming tone, simpler language

#### Banner
```
┌──────────────────────────────────────────┐
│ ⓘ  Info                                   │  ← Icon + Title (semibold)
│    Description text with details.          │  ← fgColor-muted
│    [Primary Action]  [Secondary Action]   │  ← Optional actions
│                                      [✕]  │  ← Dismiss (if onDismiss provided)
└──────────────────────────────────────────┘
```
- Variants: info (blue), warning (yellow), success (green), critical (red), upsell (purple), unavailable (gray)
- Placement: top of body (page-wide), inline (near action), inside dialog
- NEVER use toast notifications — they have accessibility issues

#### Dialog
```
┌──────────────────────────────────────┐
│  Dialog Title                    [✕] │  ← title prop + close button
│  Subtitle adds additional context    │  ← subtitle prop (optional, muted)
├──────────────────────────────────────┤
│                                      │
│  Dialog body content goes here.      │
│                                      │
├──────────────────────────────────────┤
│              [Cancel]  [Continue]     │  ← footerButtons (default + primary)
└──────────────────────────────────────┘
```
- Positions: center (default), right (side sheet), left
- Responsive: `{narrow: 'bottom', regular: 'center'}` (bottom sheet on mobile)
- Sizes: small (296px), medium (320px), large (480px), xlarge (640px)
- Focus: `returnFocusRef` returns focus to trigger on close
- Footer buttons: `{buttonType: 'primary' | 'default' | 'danger', content, onClick}`

#### Spinner
- Indeterminate loading indicator
- Sizes: small (16px), medium (32px), large (64px)
- `srText="Loading"` for screen readers (set to null if loading text is elsewhere)
- `delay` prop to avoid flash: true (1000ms), 'short' (300ms), 'long' (1000ms), or custom ms
- Used for: unknown/variable duration processes

#### Popover (Teaching Bubble)
- Used to bring attention to specific UI elements
- Caret positions: top, bottom, left, right, and corner variants
- Width: xsmall, small, medium, large, xlarge, auto
- For feature onboarding: "Keep messages short, ~160 characters. Include headline. Make dismissal obvious."

### 2.3 Animation Spec

```css
/* Section reveal (framer-motion) */
duration: 0.45s
easing: cubic-bezier(0.16, 1, 0.3, 1)  /* Primer standard easing */
initial: { opacity: 0, y: 12 }
animate: { opacity: 1, y: 0 }
viewport: { once: true, margin: "-80px" }

/* Stagger children */
staggerDelay: 0.06s per child
baseDelay: 0s for first child

/* Card hover */
transition: 0.2s ease
transform: translateY(-2px)
box-shadow: shadow-resting-small → shadow-floating-small

/* Button hover */
transition: 0.15s ease
background-color change only — no scale/transform

/* Spinner */
animation: continuous rotation, 0.8s linear infinite
```

### 2.4 Background Patterns

```css
/* Primer dotted pattern — for dark sections */
.bg-dotted-dark {
  background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0);
  background-size: 24px 24px;
}

/* Primer grid pattern — for light hero sections */
.bg-grid-subtle {
  background-image:
    linear-gradient(rgba(31, 35, 40, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 35, 40, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

### 2.5 Design for Failure — Every Component's States

Following Primer's degraded experiences and loading patterns, every interactive element MUST handle these states:

| State | Pattern | Example |
|---|---|---|
| **Loading** | Spinner or SkeletonText/SkeletonBox | Flag list loading: skeleton rows with shimmer |
| **Empty** | Blankslate with teaching content | "You haven't created any flags yet. Here's what a flag is..." |
| **Error** | InlineMessage or Banner (critical variant) | "Flags could not be loaded. [Retry]" |
| **Degraded** | Replace unavailable UI with message; never disable critical buttons | "Comment reactions unavailable" with warning icon |
| **Success** | InlineMessage (sparingly — only when result isn't obvious) | "Flag 'new-checkout' created" — but only if not navigating to it |
| **Ideal** | Normal content | Fully loaded flag list |

### 2.6 Saving Patterns — Explicit vs Automatic

From Primer's saving guidelines:

**Explicit saving** (submit button):
- Use for: forms, settings pages, declarative controls (text inputs, checkboxes, radio groups, select dropdowns)
- Save button: always enabled (NEVER disabled)
- Placement: bottom-left (default, for forms), bottom-right (dialogs/comments)
- One save button per form — never one per section
- `beforeunload` event for unsaved changes

**Automatic saving** (instant):
- Use for: ToggleSwitch, SegmentedControl, single-select dropdowns (not native `<select>`)
- No save button needed
- Visual feedback must be obvious without text indicators (which could be mistaken for validation)

---

## 3. The 60-Second Website — Section-by-Section Spec

Every section proves a claim through interaction. No static card grids.

### 3.0 Top Bar — Primer Global Navigation

```
┌──────────────────────────────────────────────────────────┐
│ ⚑ FeatureSignals    Product ▾  Developers ▾  Pricing  Blog  Contact    Sign In  [Start Free] │
└──────────────────────────────────────────────────────────┘
```
- Fixed, backdrop-blur, Primer resting shadow, border-bottom
- Logo: Primer blue `#0969da` SVG flag icon
- Navigation items: fgColor-muted → hover fgColor-default + bgColor-inset
- Active page: fgColor-accent
- CTA: Primer green `#1f883d` with `box-shadow: 0 1px 0 0 #1f232826`
- Mega menu dropdowns for Product and Developers (ActionList-style)

### 3.1 Hero (Seconds 0–5): Live Cost Calculator

```
┌──────────────────────────────────────────────────────────────┐
│                    [bg-grid-subtle overlay]                   │
│                                                              │
│   [SOC 2]  [OpenFeature Native]  [Apache 2.0]  ← pill badges │
│                                                              │
│   Your feature flags are costing you                         │
│   $12,000/month too much.                                    │
│                                                              │
│   ────────────────┬────────────────────                      │
│   Team Size       │  Current Provider                        │
│   [====●=====] 50 │  [LaunchDarkly ▾]                        │
│   ────────────────┴────────────────────                      │
│                                                              │
│   LaunchDarkly: $12,000/month                                │
│   FeatureSignals: INR 1,999/month (~$29)                          │
│   Annual savings: $143,988                                   │
│                                                              │
│   [See how we do it →]  [Self-host in 3 minutes]             │
│                                                              │
│   > fs migrate --from=launchdarkly --project=core            │
└──────────────────────────────────────────────────────────────┘
```

**Technical details:**
- Two interactive controls: range slider + dropdown
- Real-time calculation using competitive pricing data from `product/wiki/private/COMPETITIVE.md`
- Numbers animate on change (counting animation)
- CTA scrolls to Section 3.2, not to signup
- Background: white with subtle grid pattern

**Competitor pricing data (real):**
```
LaunchDarkly: $8.33/seat/month (billed as $12/connection)
  → 50 engineers = $600/month starter, scales to $12,000/month for 100-person org
ConfigCat: $26/seat/month
  → 50 engineers = $1,300/month
Flagsmith: $45/month (Cloud Pro) + $20/seat
  → 50 engineers = $1,045/month
Unleash: $80/month (Pro) + $15/seat
  → 50 engineers = $830/month
FeatureSignals: INR 1,999/month (~$29) flat rate, unlimited seats, unlimited MAUs
```

**State management:**
```typescript
interface CalculatorState {
  teamSize: number;         // 5-500
  provider: 'launchdarkly' | 'configcat' | 'flagsmith' | 'unleash';
}

function calculateSavings(state: CalculatorState): {
  competitorMonthly: number;
  competitorAnnual: number;
  fsMonthly: number;
  fsAnnual: number;
  savingsAnnual: number;
  savingsPercent: number;
}
```

### 3.2 Live Flag Evaluation Demo (Seconds 5–25)

```
┌──────────────────────────────────────────────────────────────┐
│  See it in action — sub-millisecond flag evaluation          │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐│
│  │ // Evaluate this flag   │  │  Evaluation Result          ││
│  │ import { FS } from      │  │                             ││
│  │   '@featuresignals/     │  │  Flag: new-checkout-flow    ││
│  │    node';               │  │  Result: ✅ ENABLED          ││
│  │                         │  │  Reason: user.plan ===      ││
│  │ const fs = new FS({     │  │           'enterprise'       ││
│  │   apiKey: 'fs_live_...',│  │                             ││
│  │ });                     │  │  ⚡ Latency: 0.3ms           ││
│  │                         │  │  (sub-millisecond ✓)        ││
│  │ const enabled = await   │  │                             ││
│  │   fs.getFlag(           │  │  ┌─────────────────────┐    ││
│  │     'new-checkout-flow',│  │  │ ON  ●──────────○ OFF│    ││
│  │     { userId: '...' },  │  │  └─────────────────────┘    ││
│  │     false               │  │  ← Toggle to flip the flag  ││
│  │   );                    │  │                             ││
│  └─────────────────────────┘  └─────────────────────────────┘│
│                                                              │
│  Language: [Go ▾]  [Node]  [Python]  [Java]  ← Tab switcher │
│                                                              │
│  Try your own flag key: [________________] [Evaluate]        │
└──────────────────────────────────────────────────────────────┘
```

**Technical implementation:**
- Uses actual FeatureSignals client-side evaluation engine loaded in browser
- Flag ruleset embedded as JSON, evaluated locally (proves sub-ms — no network call)
- ToggleSwitch component (Primer pattern — auto-saves, instant feedback)
- Code editor: syntax-highlighted, monospace, readonly, updates when language changes
- Language switcher: UnderlineNav tabs, updates both code and initialization pattern
- Latency counter: animates on each evaluation, shows actual measured time
- "Try your own flag" input: creates a temporary in-memory flag and evaluates it

**Client-side eval engine (simplified):**
```typescript
interface FlagRule {
  key: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  enabled: boolean;
  targeting: TargetingRule[];
  defaultVariant: any;
}

interface TargetingRule {
  attribute: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in';
  value: any;
  serveValue: any;
}

function evaluateFlag(flag: FlagRule, context: Record<string, any>): {
  value: any;
  matchedRule: TargetingRule | null;
  latencyMs: number;
}
```

### 3.3 Real Migration Preview (Seconds 25–45)

```
┌──────────────────────────────────────────────────────────────┐
│  Migrate from LaunchDarkly in under an hour                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Connect your provider to see exactly what changes    │    │
│  │                                                      │    │
│  │  Provider: [LaunchDarkly ▾]                          │    │
│  │  API Key:  [________________________________]        │    │
│  │                                                      │    │
│  │  [Connect & Preview Migration]                       │    │
│  │                                                      │    │
│  │  🔒 Your data is never stored. Preview only.          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────┐   ┌──────────┐   ┌──────────────────┐  │
│  │ LaunchDarkly      │   │ Migration│   │ FeatureSignals    │  │
│  │ ───────────────── │   │ ──────── │   │ ──────────────── │  │
│  │ 47 flags          │ → │ ⚡ 3 sec │ → │ 47 flags          │  │
│  │ 3 environments    │   │ per flag │   │ 3 environments    │  │
│  │ 12 segments       │   │          │   │ 12 segments       │  │
│  │ $12,000/month     │   │ $ fs     │   │ INR 1,999/month        │  │
│  └──────────────────┘   └──────────┘   └──────────────────┘  │
│                                                              │
│  Annual savings: $143,988 (99.2% less)                      │
│  Migration time: ~3 minutes for 47 flags                     │
│                                                              │
│  [Save this comparison] ← saves to DB, prompts signup        │
└──────────────────────────────────────────────────────────────┘
```

**Technical implementation:**
- `POST /v1/public/migration/preview` — accepts provider + API key, returns inventory
- Server-side: calls provider's API, maps to FeatureSignals format
- Shows real flags, environments, segments — NOT mock data
- Animated migration visualization: flags fly across, count increments
- Cost comparison uses the same calculator state from hero, now personalized
- "Save this comparison" — `POST /v1/public/migration/save` stores in session DB, returns session token
- After save: Banner appears: "Comparison saved for 7 days. [Create free account] to migrate now."

### 3.4 AI Janitor Simulator (Seconds 45–60)

```
┌──────────────────────────────────────────────────────────────┐
│  The AI Janitor — stale flag cleanup on autopilot            │
│                                                              │
│  ┌──────────────────────────┐  ┌────────────────────────────┐│
│  │ src/                     │  │  Scan Results              ││
│  │ ├── auth/                │  │                            ││
│  │ │   └── login.ts         │  │  3 stale flags found       ││
│  │ ├── checkout/            │  │  187 lines of dead code    ││
│  │ │   └── payment.ts  ✓    │  │                            ││
│  │ ├── dashboard/           │  │  🔴 legacy-auth-flow       ││
│  │ │   └── widgets.ts  ✓    │  │     Last used: 180 days    ││
│  │ ├── notifications/       │  │     PR #284 generated      ││
│  │ │   └── email.ts         │  │                            ││
│  │ └── profile/             │  │  🔴 old-search-backend     ││
│  │     └── settings.ts  ✓   │  │     Last used: 365 days    ││
│  │                          │  │     PR #285 generated      ││
│  │  Scanning... ████████░░  │  │                            ││
│  │  8 files scanned         │  │  🔴 beta-feature-gate      ││
│  │                          │  │     Fully rolled out       ││
│  └──────────────────────────┘  │     PR #286 generated      ││
│                                 └────────────────────────────┘│
│                                                              │
│  [Try with a sample codebase]  [Connect your GitHub repo]    │
└──────────────────────────────────────────────────────────────┘
```

**Technical implementation:**
- Sample codebase is pre-loaded, scan is animated (files highlight one by one)
- Each stale flag found shows: name, last used date, generated PR number
- Green checkmarks appear on files where flags are found
- Progress bar shows scan progress
- "Connect your GitHub repo" — OAuth flow, then real scan (post-signup feature)

### 3.5 Pricing (Below the Fold)

```
┌──────────────────────────────────────────────────────────────┐
│  Pay for infrastructure. Not your success.                   │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │Developer  │  │  Pro (Popular)│  │  Enterprise       │       │
│  │──────────│  │──────────────│  │──────────────────│       │
│  │ Free      │  │  INR 1,999/mo     │  │  Custom           │       │
│  │           │  │              │  │                   │       │
│  │ ✓ Unlim.  │  │ ✓ Everything │  │ ✓ Everything Pro  │       │
│  │   MAUs    │  │   in Dev     │  │ ✓ Dedicated VPS   │       │
│  │ ✓ 3 Seats │  │ ✓ Unlim.     │  │ ✓ Air-Gapped      │       │
│  │ ✓ 1 Proj  │  │   Seats      │  │ ✓ SAML SSO + SCIM │       │
│  │ ✓ 2 Envs  │  │ ✓ AI Janitor │  │ ✓ 4h Support SLA  │       │
│  │ ✓ 8 SDKs  │  │ ✓ A/B Tests  │  │                   │       │
│  │           │  │ ✓ RBAC+Audit │  │                   │       │
│  │ [Start]   │  │ [Upgrade]    │  │ [Talk to Sales]   │       │
│  └──────────┘  └──────────────┘  └──────────────────┘       │
│                                                              │
│  Your savings (50 engineers): ₹11,988/month → INR 1,999/month     │
│  That's 91.7% less than LaunchDarkly.                        │
└──────────────────────────────────────────────────────────────┘
```

**Technical details:**
- Personalized savings from hero calculator carried through
- Pro card elevated 4px with floating shadow (Most Popular)
- Green CTA on Pro, default buttons on Developer and Enterprise
- All plans include section below with checkmarks

### 3.6 Final CTA + Footer

```
┌──────────────────────────────────────────────────────────────┐
│                    [bg-dotted-dark overlay]                   │
│                                                              │
│   [Rocket] Start shipping with confidence                    │
│                                                              │
│   Ready to ship faster?                                      │
│                                                              │
│   Start a free trial with full Pro features for 14 days.     │
│   No credit card required.                                   │
│                                                              │
│   [Start Free — No Credit Card]  [Self-Host in 3 Minutes]    │
│                                                              │
│   Apache-2.0 · 8 SDKs · Sub-millisecond · 14-day Pro trial   │
└──────────────────────────────────────────────────────────────┘

Primer dark footer (--bgColor-emphasis background)
- 5-column link grid: Product, Get Started, Developers, Resources, Legal
- Social icons (GitHub, LinkedIn, X, Discord)
- Status indicator: green dot + "All Edge Nodes Operational"
- Copyright + address
```

---

## 4. Dashboard — Complete Primer Product UI

### 4.1 Navigation Architecture — Parent-Detail Split Page Layout

The dashboard MUST use Primer's **parent-detail split page layout**. A persistent sidebar (NavList) contains navigation. The main content area changes based on active sidebar item. This replaces any horizontal navbar.

```
┌────────────┬──────────────────────────────────────────┐
│  NavList   │  PageHeader + UnderlineNav + Content     │
│  (240px)   │                                          │
│            │  Breadcrumbs: org / project / env        │
│  🚩 Flags  │  Title: "Flags"          [New Flag]      │
│  🎯 Segm.  │  ─────────────────────────────────────── │
│  🌐 Envir. │  All | Recent | Archived  ← UnderlineNav │
│  ────────  │  ┌──────────────────────────────────────┐│
│  SDKs &..  │  │ Flag list / detail / form            ││
│  📦 API..  │  │                                      ││
│  🔗 Webh.. │  └──────────────────────────────────────┘│
│  ────────  │                                          │
│  Governance│                                          │
│  📋 Audit  │                                          │
│  👥 Team   │                                          │
│  ⚙️ Sett.  │                                          │
└────────────┴──────────────────────────────────────────┘
```

### 4.2 NavList (Sidebar) — Complete Spec

- Width: 240px fixed on wide (≥768px), hidden on narrow detail pages
- Background: `--bgColor-default`, border-right: 1px `--borderColor-default`
- Each item: icon (16px) + label, rounded 6px, padding 8px 12px
- Active: `--bgColor-accent-muted` background, `--fgColor-accent` text
- Inactive: `--fgColor-muted`, hover to `--bgColor-inset`
- Section headers: 10px, uppercase, `--fgColor-subtle`, tracking-wider, NOT clickable
- Dividers: 1px `--borderColor-muted` between sections

**NavList items:**
```
🚩  Flags
🎯  Segments
🌐  Environments
─────────────────
SDKs & Integrations    ← section header
📦  API Keys
🔗  Webhooks
─────────────────
Governance             ← section header
📋  Audit Log
👥  Team
─────────────────
⚙️  Settings
```

### 4.3 UnderlineNav (Sub-Tabs)

- Active: 2px solid bottom border `--fgColor-accent`, text `--fgColor-default`
- Inactive: `--fgColor-muted`, hover `--fgColor-default`
- Gap: 16px, padding: 12px 8px
- Overflow tabs → ActionMenu ("More ▾")
- Each tab IS a `<Link>` — URL MUST change

### 4.4 Breadcrumbs

```
Organization / Project / Environment
```

- Parents: `<Link>` with `--fgColor-accent`, hover underline
- Current: plain text, `--fgColor-default`
- Separator: `/` in `--fgColor-subtle`

### 4.5 PageHeader

```
┌──────────────────────────────────────────────────────────┐
│  MyOrg / WebApp / Production                [New Flag]  │
│  Flags                                                    │
│  Manage feature flags across environments.                │
└──────────────────────────────────────────────────────────┘
```

- Row 1: Breadcrumbs (left) + Primary Action (right, green `#1f883d`)
- Row 2: Title (h2, 24px, bold)
- Row 3: Description (14px, fgColor-muted)
- Bottom border: 1px `--borderColor-default`

### 4.6 Responsive Sidebar

**Wide (≥768px):** Sidebar always visible, 240px
**Narrow (<768px):** Sidebar hidden on detail pages. Back button in PageHeader: `← Back to Flags`. Index page shows NavList items as full-width list.

### 4.7 Contextual Transitions

| Action | Pattern | URL Change |
|---|---|---|
| NavList click (Flags → Segments) | New page (SPA) | Yes |
| UnderlineNav tab (All → Archived) | Same page, diff state | Yes (query param) |
| Open Flag detail | New spot on same page | Yes |
| Create/Edit Flag | Dialog overlay | Optional |
| Open Settings | New spot on same page | Yes |

### 4.8 Empty States — Blankslate Pattern

Every list view must handle empty with Blankslate:

```
┌──────────────────────────────────────────────┐
│                                              │
│            [🚩 Flag icon, 48px]              │
│                                              │
│    You haven't created any flags yet         │
│                                              │
│  A feature flag lets you toggle features     │
│  on/off for specific users, segments, or     │
│  percentages of your audience.               │
│                                              │
│      [Create your first flag]                │
│                                              │
│      Learn more about flags →                │
└──────────────────────────────────────────────┘
```

- Border variant for pages where Blankslate isn't the only content
- Error state: alert icon (NOT playful), explain problem, guide recovery
- First-time: welcoming, simpler language, Octocat or illustration

### 4.9 Loading — Spinner + Skeleton Patterns

- **<1 second:** Don't show loading (Primer rule — flash is distracting)
- **1–3 seconds:** Indeterminate Spinner (medium, 32px)
- **3–10 seconds:** SkeletonText/SkeletonBox with shimmer
- **>10 seconds:** Determinate progress + don't block other interactions

**Skeleton example (flag list):**
```tsx
<div className="space-y-3">
  {Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg border-[var(--borderColor-default)]">
      <div className="h-4 w-32 bg-[var(--borderColor-default)] rounded animate-pulse" />
      <div className="h-3 w-20 bg-[var(--borderColor-muted)] rounded animate-pulse" />
      <div className="h-3 w-16 bg-[var(--borderColor-muted)] rounded animate-pulse ml-auto" />
    </div>
  ))}
</div>
```

### 4.10 Data Display — ActionList + DataTable

**ActionList** for entity lists (flags, segments, environments):
- Each row: icon (16px) + name + metadata + actions
- Hover: bgColor-inset
- Actions visible on hover (kebab → Edit, Delete, Archive)
- Spacing: 12-16px between rows, padding 8px 12px

**DataTable** for audit logs, evaluation history:
- Border-bottom rows (not grid lines)
- Monospace for IDs, keys, technical values
- Sortable column headers
- Sticky header row
- Pagination below (not infinite scroll)

### 4.11 Forms — FormControl Pattern

Following Primer's form guidelines:

**Anatomy:**
```
┌──────────────────────────────────────────┐
│  Flag Name *                             │  ← Label (required, sentence case)
│  ┌──────────────────────────────────────┐│
│  │ new-checkout-flow                    ││  ← Input
│  └──────────────────────────────────────┘│
│  Must start with a letter, use kebab-case│  ← Caption (muted, small)
└──────────────────────────────────────────┘
```

- Labels: sentence case, ≤3 words, always visible
- Required fields: marked with `*`
- Validation: on submit first, then inline after first error
- Save button: ALWAYS enabled (Primer rule — never disable)
- Cancel button to right of save (forms), left of save (dialogs)
- Error messages: replace caption, explain how to fix
- Success messages: only when result isn't obvious

### 4.12 ToggleSwitch — For Boolean Flags

- Auto-saving (Primer pattern — acts like a light switch)
- No save button needed
- Visual feedback: color change + subtle animation
- Label on the left (or right), toggle on the opposite side

### 4.13 Banner — For Feature Announcements + Feedback

**Placement rules:**
- Page-wide: top of body content (below PageHeader)
- Inline: near specific action (InlineMessage for field validation)
- Inside Dialog: below dialog title, full-width within dialog

**Variants:**
- Info (blue): feature announcements, contextual tips
- Warning (yellow): upcoming changes, degraded experiences
- Success (green): sparingly — only when result isn't obvious
- Critical (red): errors, destructive action warnings
- Upsell (purple): Pro/Enterprise feature upgrade prompts
- Unavailable (gray): degraded system state

### 4.14 Dialog — For Create/Edit Flows

- Use for: creating/editing flags, segments, environments
- Not for: confirmation of routine actions (let them undo instead)
- Side sheet (right): for detail panels, settings
- Bottom sheet (narrow): responsive fallback for mobile
- Footer: Cancel (default, left) + Save/Continue (primary, right)
- focusTrap: initialFocus on first input, returnFocusRef on trigger

### 4.15 Degraded Experiences — Every Component Must Handle

Following Primer's degraded experience guidelines:

**Primary experiences** (essential — show error page if unavailable):
- Flag evaluation data
- Flag list
- Environment configuration

**Secondary experiences** (non-essential — degrade gracefully):
- Notification badges/counts: hide number, show tooltip on focus
- Activity indicators: hide entirely
- Sidebar counts: remove, don't show "0" or "—"
- Non-critical buttons: remove from UI
- Critical buttons: use inactive state (NOT disabled — disabled can't be focused)

**Global degradation:** If critical system error, show Banner (warning variant) above navigation: "Some features are temporarily unavailable. [Status page →]"

**Never:** Disable interactive controls due to availability issues. Use inactive state instead.

---

## 5. Contextual DX — Snippets, APIs, SDKs Unified

### 5.1 Entity → Snippet Mapping

Every entity in the dashboard shows contextual code snippets:

| Entity Created | What's Shown | Where |
|---|---|---|
| Flag | Full evaluation code in 8 languages with actual flag key, env key, default value | Panel next to flag detail |
| Segment | Targeting rule code using actual segment key | Panel next to segment detail |
| Environment | SDK initialization for that environment | Environment settings page |
| API Key | Auth header with actual key (masked, click to reveal) | API key detail page |
| Webhook | Verification code with actual secret | Webhook detail page |

### 5.2 Code Snippet Panel Component

```
┌──────────────────────────────────────────────┐
│  Code Snippets                    [Go ▾]     │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │ // Evaluate this flag in your Go app     ││
│  │ import "github.com/featuresignals/       ││
│  │         go-client"                       ││
│  │                                          ││
│  │ client, _ := featuresignals.NewClient(   ││
│  │   featuresignals.WithAPIKey(             ││
│  │     "fs_live_abc123..."),  ← real key    ││
│  │ )                                        ││
│  │                                          ││
│  │ enabled := client.GetFlag(               ││
│  │   "new-checkout-flow",    ← real flag    ││
│  │   featuresignals.User{                   ││
│  │     ID: "user-123",                      ││
│  │   },                                     ││
│  │   false,                  ← default      ││
│  │ )                                        ││
│  │ // → true (matched: user.plan ===        ││
│  │ //           'enterprise')               ││
│  └──────────────────────────────────────────┘│
│                                              │
│  [📋 Copy]  [▶ Test this flag]              │
└──────────────────────────────────────────────┘
```

**Features:**
- Language switcher: Go, Node.js, Python, Java, C#, Ruby, React, Vue
- All snippets pre-filled with CONTEXTUAL values (flag key, env key, default)
- API key masked by default, revealed on click with confirmation
- "Test this flag" button: evaluates live using the actual SDK, shows result
- Copy button with success feedback (checkmark icon, "Copied!")

---

## 6. API Patterns — Public → Authenticated Gradual Flow

### 6.1 Public Endpoints (No Auth Required)

```
POST /v1/public/migration/preview
  Body: { provider: "launchdarkly", apiKey: "ld_api_..." }
  Response: {
    flags: [{ key, name, type, environments, rules }],
    environments: [{ name, key }],
    segments: [{ name, key, rules }],
    estimatedMigrationTime: "3 minutes",
    pricingComparison: { current: {...}, fs: {...}, savingsAnnual: 143988 }
  }
  Rate limit: 5 requests/hour/IP

POST /v1/public/calculator
  Body: { teamSize: 50, provider: "launchdarkly" }
  Response: {
    competitorMonthly: 12000,
    fsMonthly: 12,
    savingsAnnual: 143988,
    savingsPercent: 99.2
  }
  Rate limit: 30 requests/hour/IP

GET /v1/public/evaluate/:flagKey
  Query: ?context={userId: "test", plan: "enterprise"}
  Response: { flagKey, value: true, matchedRule: {...}, latencyMs: 0.3 }
  Rate limit: 100 requests/hour/IP

POST /v1/public/migration/save
  Body: { provider, apiKey, email? }
  Response: { sessionToken, expiresAt (7 days), summary }
  Rate limit: 3 requests/day/IP
```

### 6.2 Gradual Signup Flow

```
User visits website
  → Uses calculator (no auth)
  → Tries live eval demo (no auth)
  → Runs migration preview (no auth)
  → Saves comparison (no auth)
  → Prompt: "Your comparison is saved for 7 days.
     Create a free account to start the actual migration."
  → Signup: email only (Zen of GitHub: "Avoid administrative distraction")
  → After signup: full dashboard access
```

### 6.3 Session-Bound Temporary Storage

- Data stored with session token (JWT, no auth required)
- Expires after 7 days
- On signup: session data is migrated to user's account
- Implementation: `server/internal/store/session_store.go` (new)

---

## 7. Implementation Order

### Phase 1: Website — Hero Calculator + Live Demo + Migration Preview
**Deliverables:**
- Hero section with interactive calculator
- Live flag evaluation playground (client-side eval engine)
- Real migration preview with provider API integration
- Updated globals.css with Primer tokens
- Updated header/footer with Primer styling
- Updated layout removing Google Fonts

### Phase 2: Website — AI Janitor + Pricing + Final CTA
**Deliverables:**
- AI Janitor simulator (animated codebase scan)
- Personalized pricing section
- Final CTA with dark gradient
- All animations and progressive reveals

### Phase 3: Dashboard — Primer Redesign
**Deliverables:**
- Parent-detail split page layout
- NavList sidebar
- UnderlineNav sub-tabs
- PageHeader with breadcrumbs
- Blankslate empty states
- Loading skeletons
- Contextual code snippet panels

### Phase 4: Backend — Public APIs
**Deliverables:**
- Public migration preview endpoint
- Public calculator endpoint
- Public evaluation endpoint
- Session storage
- Gradual signup flow

### Phase 5: Dashboard — Forms + Data Display
**Deliverables:**
- FormControl pattern for flag/segment/environment forms
- ActionList for entity lists
- DataTable for audit logs
- Banner system for notifications
- Dialog for create/edit flows

### Phase 6: SDK + Docs Integration
**Deliverables:**
- Embedded SDK snippets in dashboard
- Language switcher
- Live "Test this flag" functionality
- Unified docs experience

---

## 8. Phase 1 — Detailed Execution Spec

### 8.1 Files to Create

| File | Purpose |
|---|---|
| `website/src/components/hero-calculator.tsx` | Hero section with team size slider + provider dropdown + live cost display |
| `website/src/components/live-eval-demo.tsx` | Split-panel: code editor + evaluation result + ToggleSwitch |
| `website/src/components/migration-preview.tsx` | Provider API key input → real flag inventory → side-by-side comparison |
| `website/src/components/ai-janitor-simulator.tsx` | Animated file tree scan → stale flag detection → PR generation |
| `website/src/lib/pricing.ts` | Pricing calculation engine (team size × competitor rates vs FS flat rate) |
| `website/src/lib/eval-engine.ts` | Client-side flag evaluation engine (deterministic, sub-ms) |
| `website/src/components/ui/calculator-slider.tsx` | Primer-styled range slider |
| `website/src/components/ui/code-editor.tsx` | Syntax-highlighted readonly code display with language switcher |

### 8.2 Files to Modify

| File | Changes |
|---|---|
| `website/src/app/page.tsx` | Replace entire content with new section architecture (calculator → demo → migration → janitor → pricing → cta) |
| `website/src/app/globals.css` | Already updated with Primer tokens |
| `website/src/app/layout.tsx` | Already updated — verify no Google Fonts |
| `website/src/components/header.tsx` | Already updated with Primer styles |
| `website/src/components/footer.tsx` | Already updated with Primer dark footer |
| `website/src/components/section-reveal.tsx` | Already updated with enhanced animations |

### 8.3 Hero Calculator Component Architecture

```
HeroCalculator
├── CalculatorSlider (team size input)
│   ├── Range input (5–500)
│   ├── Current value display (animated counter)
│   └── Min/Max labels
├── ProviderDropdown
│   ├── Select with Primer styling
│   └── Options: LaunchDarkly, ConfigCat, Flagsmith, Unleash
├── SavingsDisplay
│   ├── Competitor cost (animated)
│   ├── FeatureSignals cost (INR 1,999)
│   ├── Annual savings (animated)
│   └── Savings percentage
└── CTAs
    ├── Primary: "See how we do it →" (scrolls to demo section)
    └── Secondary: "Self-host in 3 minutes" (docs link)
```

### 8.4 Live Eval Demo Component Architecture

```
LiveEvalDemo
├── CodeEditor (left panel)
│   ├── LanguageTabs (UnderlineNav: Go | Node | Python | Java)
│   ├── SyntaxHighlightedCode
│   └── CopyButton
├── EvalResult (right panel)
│   ├── FlagKey display
│   ├── ResultDisplay (✅ ENABLED / ❌ DISABLED)
│   ├── MatchedRule (highlighted targeting rule)
│   ├── LatencyCounter (⚡ 0.3ms, animated)
│   └── ToggleSwitch (ON/OFF — flips flag state)
└── TryYourOwn
    ├── TextInput (flag key)
    └── EvaluateButton
```

### 8.5 Testing Checklist (Phase 1)

**Hero Calculator:**
- [ ] Slider changes update all numbers in real-time
- [ ] Provider dropdown changes recalculate correctly
- [ ] Numbers animate (counting animation)
- [ ] Responsive: stacks vertically on mobile
- [ ] Accessible: keyboard navigable, screen reader announces values

**Live Eval Demo:**
- [ ] Code updates when language tab changes
- [ ] ToggleSwitch flips flag result instantly
- [ ] Latency counter shows actual measured time (<1ms)
- [ ] "Try your own flag" evaluates custom key
- [ ] Copy button copies code to clipboard
- [ ] Accessible: code is keyboard-navigable

**Migration Preview:**
- [ ] API key input validates format
- [ ] Loading state during API fetch (Spinner)
- [ ] Error state if API key is invalid (Banner: critical)
- [ ] Success state shows real flag inventory
- [ ] Cost comparison uses real calculator values
- [ ] "Save comparison" stores data, shows prompt

### 8.6 Acceptance Criteria (Phase 1)

1. Hero loads with calculator at default values (50 engineers, LaunchDarkly)
2. Sliding team size to 100 updates all numbers within 100ms
3. Switching provider recalculates correctly
4. Live eval demo evaluates `new-checkout-flow` flag and shows `ENABLED` in <1ms
5. Toggling the flag switch changes the result instantly
6. Switching language tab updates code syntax
7. Migration preview with valid LaunchDarkly API key shows real flag inventory
8. Invalid API key shows clear error message
9. Cost comparison shows accurate savings
10. All sections have loading, empty, error states
11. All interactive elements are keyboard accessible
12. Page renders without Google Fonts (system font stack only)
13. No hardcoded colors — all via CSS custom properties
14. All animations respect `prefers-reduced-motion`
15. Responsive: works on 320px–2560px viewports
16. Page load time < 3 seconds (lighthouse)
17. Zero console errors
18. Zero TypeScript errors

---

## 9. Code Quality & Standards

### TypeScript
- `strict: true` — zero tolerance for `any`
- Prefer `interface` for object shapes, `type` for unions
- All API responses typed
- No `@ts-ignore` or `@ts-expect-error`
- No non-null assertions (`!`) without preceding guard

### React / Next.js
- App Router only — no Pages Router
- Server Components by default, `"use client"` only when needed
- Zustand for client state (dashboard only — website uses React state)
- `lib/api.ts` for all fetch calls (dashboard)

### Styling
- Tailwind CSS v4 with Primer design tokens
- No inline styles except for dynamic values (colors from calculator state)
- `cn()` from `lib/utils.ts` for conditional classes
- No CSS modules, no styled-components

### Testing
- Vitest + React Testing Library (website)
- Table-driven test pattern
- Test: loading, error, empty, success, and interaction states
- Coverage: 80%+ overall, critical paths 95%+

### Brand UI → FeatureSignals Component Mapping

Each Primer Brand UI component maps to a specific FeatureSignals use case:

| Brand UI Component | FeatureSignals Use | Where |
|---|---|---|
| **Hero** | Hero section with calculator | Website hero |
| **River** | Feature explanations (AI Janitor, Architecture) | Website feature sections |
| **ComparisonTable** | FeatureSignals vs LaunchDarkly | Website comparison section |
| **PricingOptions** | Developer/Pro/Enterprise tiers | Website + Dashboard billing |
| **Testimonial** | Customer quotes | Website testimonials |
| **FAQ** | Common questions about migration | Website FAQ section |
| **CTABanner** | "Ready to migrate?" urgency | Website CTA sections |
| **CTAForm** | Email capture for early access | Website signup prompt |
| **SectionIntro** | Every section heading + description | Website all sections |
| **Statistic** | 2.1B+ evaluations, 500+ orgs | Website metrics row |
| **Timeline** | Migration step-by-step flow | Website migration section |
| **AnchorNav** | Sticky section navigation | Website sidebar nav |
| **LogoSuite** | "Trusted by" company logos | Website trust section |
| **Label** | Status badges (Operational, SOC 2) | Website + Dashboard |
| **Pillar** | Feature cards with icons | Website feature grids |
| **Bento** | SDK language grid | Website SDK showcase |
| **IDE** | Code snippet display | Website eval demo + Dashboard snippets |
| **MinimalFooter** | Global footer | Website footer |
| **SubdomainNavBar** | Top navigation bar | Website header |
| **Tabs** | Language switcher in code snippets | Website + Dashboard |
| **RiverAccordion** | Expandable feature details | Website feature deep-dives |
| **BreakoutBanner** | Mid-page migration CTA | Website between sections |
| **EyebrowBanner** | Top announcement bar | Website top |

### Icons — Mandatory Octicons Rule
- **ZERO Lucide imports.** All icons from `@primer/octicons-react`
- Import pattern: `import { IconName } from '@primer/octicons-react'`
- Render: `<IconName size={16} />` or inline SVG `<svg className="octicon octicon-name">`
- Available sizes: 12, 16 (default), 24, 32, 48, 96
- Icon mapping table for all existing Lucide → Octicon replacements in Section 10 above

### Accessibility (Primer Standards)
- All interactive elements: keyboard navigable
- Focus management: returnFocusRef on dialog close, focus first error on form submit
- Screen reader: aria-labels on icon buttons, srText on spinners, aria-describedby on error messages
- Skip links: `<a href="#main">Skip to main content</a>` as first focusable element on every page
- Heading hierarchy: correct h1→h6 nesting, no level skipping
- Color contrast: minimum 4.5:1 for text, 3:1 for large text (all Primer tokens pass)
- Focus visible: visible outline on all focused interactive elements
- Reduced motion: `prefers-reduced-motion` must disable all animations
- Never disable buttons: use `inactive` visual state + `aria-disabled` instead of `disabled` attribute
- Dynamic updates: use `role="status"` with `aria-live` for screen reader announcements
- Loading states: `aria-busy="true"` on loading regions, spinner with `srText="Loading..."`

---

## 10. Data Sources & References

### Wiki Pages (Cross-Referenced)
- `product/wiki/private/BUSINESS.md` — Pricing strategy, cost analysis
- `product/wiki/private/COMPETITIVE.md` — Competitor pricing benchmarks
- `product/wiki/public/SDK.md` — 8 SDK code patterns
- `product/wiki/public/PERFORMANCE.md` — Sub-ms evaluation architecture
- `product/wiki/public/DEVELOPMENT.md` — Handler and dashboard standards

### Primer Product UI Pages (Source of Truth)
- https://primer.style/product/getting-started — Philosophy, Zen of GitHub
- https://primer.style/foundations/color — Color tokens
- https://primer.style/foundations/typography — Typography tokens
- https://primer.style/components/card — Card component spec
- https://primer.style/components/banner — Banner component spec
- https://primer.style/components/dialog — Dialog component spec
- https://primer.style/components/blankslate — Empty state component spec
- https://primer.style/components/spinner — Loading indicator spec
- https://primer.style/components/popover — Teaching bubble spec
- https://primer.style/components/button — Button spec (green primary!)
- https://primer.style/product/ui-patterns/navigation — Navigation patterns
- https://primer.style/product/ui-patterns/empty-states — Empty state patterns
- https://primer.style/product/ui-patterns/forms — Form patterns
- https://primer.style/product/ui-patterns/saving — Save patterns
- https://primer.style/product/ui-patterns/loading — Loading patterns
- https://primer.style/product/ui-patterns/notification-messaging — Messaging patterns
- https://primer.style/product/ui-patterns/progressive-disclosure — Progressive disclosure
- https://primer.style/product/ui-patterns/feature-onboarding — Feature onboarding
- https://primer.style/product/ui-patterns/degraded-experiences — Degraded experiences

### Primer Brand UI Pages (Marketing Website Patterns)
- https://primer.style/brand/ — Brand UI homepage
- https://primer.style/brand/getting-started — Getting started with Brand UI
- https://primer.style/brand/introduction/animation — Animation patterns
- https://primer.style/brand/introduction/theming — Theming
- https://primer.style/brand/components/hero — Hero component (full-width page banners)
- https://primer.style/brand/components/river — River (text + media feature showcase)
- https://primer.style/brand/components/comparisontable — Comparison table (vs competitors)
- https://primer.style/brand/components/pricingoptions — Pricing plan display
- https://primer.style/brand/components/testimonial — Customer testimonials
- https://primer.style/brand/components/faq — FAQ Q&A format
- https://primer.style/brand/components/ctabanner — CTA urgency banner
- https://primer.style/brand/components/ctaform — CTA form with input
- https://primer.style/brand/components/sectionintro — Section title + description
- https://primer.style/brand/components/sectionintrostacked — Stacked section intro
- https://primer.style/brand/components/statistic — Numerical display component
- https://primer.style/brand/components/timeline — Vertical connected timeline
- https://primer.style/brand/components/anchornav — Sticky section navigation
- https://primer.style/brand/components/logosuite — Sponsor/vendor logo display
- https://primer.style/brand/components/minimalfooter — Legal + social footer
- https://primer.style/brand/components/label — Metadata/status badges
- https://primer.style/brand/components/pillar — Icon + text feature grouping
- https://primer.style/brand/components/bento — Responsive grid layout
- https://primer.style/brand/components/ide — Simulated IDE component (code snippets!)
- https://primer.style/brand/components/tabs — Tabbed content panels
- https://primer.style/brand/components/riveraccordion — Expandable feature panels
- https://primer.style/brand/components/riverbreakouttabs — Card tabs + shared visual
- https://primer.style/brand/components/eyebrowbanner — Top-of-page highlight banner
- https://primer.style/brand/components/breakoutbanner — Mid-page section breaker
- https://primer.style/brand/components/subnav — Secondary navigation
- https://primer.style/brand/components/subdomainnavbar — Subdomain nav bar

### Octicons — The ONLY Icon Library
- https://primer.style/octicons/ — Complete Octicons catalog
- Package: `@primer/octicons-react` (already installed at `featuresignals/website/node_modules/@primer/octicons-react`)
- Sizes: 12px, 16px (default), 24px, 32px, 48px, 96px
- Usage: `<Icon name={IconName} size={16} />` or as inline SVG elements
- **CRITICAL RULE: Use Octicons exclusively. NO Lucide icons. NO other icon libraries.**
- All Lucide icon imports MUST be replaced with Octicon equivalents:
  - `ArrowRight` → `ArrowRightIcon`
  - `Check` → `CheckIcon`
  - `X` → `XIcon`
  - `ChevronDown` → `ChevronDownIcon`
  - `Menu` → `ThreeBarsIcon`
  - `Rocket` → `RocketIcon`
  - `Zap` → `ZapIcon` or `LightBulbIcon`
  - `Brain` → `LightBulbIcon`
  - `ShieldCheck` → `ShieldCheckIcon`
  - `FlaskConical` → `BeakerIcon`
  - `DollarSign` → not available — use `Typography` or text `$`
  - `Cloud` → `CloudIcon`
  - `Code` → `CodeIcon`
  - `Download` → `DownloadIcon`
  - `Play` → `PlayIcon`
  - `Sparkles` → `StarIcon` or `StarFillIcon`
  - `GitBranch` → `GitBranchIcon`
  - `Flag` → `FlagIcon`
  - `Activity` → `PulseIcon`
  - `BarChart3` → `GraphIcon`
  - `Terminal` → `TerminalIcon`
  - `Users` → `PeopleIcon`
  - `TrendingUp` → `TrendingUpIcon` (or `ArrowUpIcon`)
  - `BookOpen` → `BookIcon`
  - `ExternalLink` → `LinkExternalIcon`
  - `Search` → `SearchIcon`
  - `Sun` → `SunIcon`
  - `Copy` → `CopyIcon` or `ClippyIcon`
  - `Star` → `StarIcon` / `StarFillIcon`

### Primer Accessibility Pages
- https://primer.style/accessibility/ — Accessibility homepage
- Key patterns observed across Primer:
  - **Skip to main content**: `<a href="#main" className="SkipToMainContent">Skip to main content</a>` — first focusable element
  - **Focus management**: `returnFocusRef` on Dialog close, `initialFocusRef` on Dialog open, focus first error on form submit
  - **Screen reader text**: `srText` prop on Spinner, `aria-label` on IconButtons, `visually-hidden` class for hidden labels
  - **aria-describedby**: error messages connected to inputs, captions connected to inputs
  - **aria-live regions**: `role="status"` for dynamic updates, `aria-busy` during loading
  - **Heading hierarchy**: h1→h6 must be correctly nested, no skipping levels
  - **Focus visible**: `js-focus-visible` class on html element, visible focus rings
  - **Color contrast**: All Primer tokens already meet WCAG AA (4.5:1 text, 3:1 large text)
  - **Reduced motion**: All animations must respect `prefers-reduced-motion`
  - **Never disable buttons**: Use `inactive` state instead — disabled buttons can't be focused

### Competitor Pricing (Verified)
```
LaunchDarkly: $8.33/seat/month (billed as $12/connection)
  Starter: $8.33/seat, scalable to enterprise
  A 100-person org pays ~$12,000/month
ConfigCat: Free tier (2,000 MAU), then $26/seat/month
Flagsmith: Free tier (50K requests), Cloud Pro $45/month + $20/seat
Unleash: Open source (self-host free), Pro $80/month + $15/seat
FeatureSignals: Community (free, unlimited MAUs, 3 seats), Pro INR 1,999/month (~$12, unlimited everything)
```
