---
title: Master Product Overhaul Plan — Norman-Inspired Unified Design & Independent Design System
tags: [ux, design, strategy, product, planning, design-system]
domain: architecture
sources:
  - Don Norman, The Design of Everyday Things (2013) — 369 pages
  - Don Norman, Living with Complexity (2010) — 309 pages
  - Don Norman, The Design of Future Things (2007) — 241 pages
  - Don Norman, Design for a Better World (2023) — humanity-centered design
  - Nielsen & Pernice, Eyetracking Web Usability (2010) — 457 pages
  - Nielsen, 10 Usability Heuristics (1994/2024)
  - Norman, Emotional Design (2004)
  - Laubheimer, Data Tables: Four Universal User Tasks (NNGroup, 2022)
  - Neusesser & Sunwall, Error Message Guidelines (NNGroup, 2023)
  - Kaplan, Complex Application Design: A 5-Layer Framework (NNGroup)
  - NNGroup, 8 Design Guidelines for Complex Applications
  - Moran, The 4 Factors of UX Maturity (NNGroup, 2024)
  - NNGroup Reports Catalog: Application Design, Navigation, IA, Interaction Design, Search, Design Process
related:
  - [[UX_STRATEGY.md]]
  - [[ARCHITECTURE.md]]
  - [[DEVELOPMENT.md]]
  - [[COMPETITIVE.md]]
  - [[ROADMAP.md]]
last_updated: 2026-05-14
maintainer: llm
review_status: current
confidence: high
---

## Overview

This document is the **master plan** for making FeatureSignals a world-class, unified product experience and establishing **Signal UI** — an independent, Norman-grounded design system that replaces our current dependency on GitHub Primer's design language. It is grounded in ~1,400 pages of Don Norman's design philosophy and the Nielsen Norman Group's empirical eyetracking research.

**Core thesis:** FeatureSignals must feel like **one organism** — not a website + docs + dashboard + API bolted together. Every surface must share the same conceptual model, the same visual language, the same interaction patterns, and the same philosophy.

---

## Part 0: Foundational Principles (From All Four Books)

### P0.1: The Distinction That Changes Everything
> **"Complexity is a fact of life; complication is a choice."** — Living with Complexity, p. 4

Feature flag systems are inherently complex (targeting rules, segments, environments, rollouts, scheduling, dependencies). Our job is not to hide that complexity but to make it **intelligible** through good conceptual models, clear signifiers, and proper organization.

### P0.2: The Two Gulfs (DOET, pp. 38-40)
Every interaction must bridge two gulfs:
- **Gulf of Execution**: "How do I do this?" → bridged by signifiers, constraints, mappings, conceptual model
- **Gulf of Evaluation**: "What just happened?" → bridged by feedback, conceptual model

### P0.3: Knowledge in the World (DOET, pp. 74-122)
People function by combining external knowledge (signifiers, labels, spatial organization) with internal knowledge (memory). Design should put knowledge in the world wherever possible.

### P0.4: Augmentation, Not Automation (Design of Future Things, p. 34)
We help developers make better decisions; we don't make decisions for them. The system suggests, the human decides.

### P0.5: The Playbook Principle (Design of Future Things, pp. 73-74)
The system must always display which "play" it's following. Users must understand what the system is doing and why. This applies to flag evaluation, automated rollouts, AI janitor, and every "smart" feature.

### P0.6: Calm Technology (Design of Future Things, pp. 148-149)
Information should live in the periphery of attention, moving to the center only when needed. Alerts should be for actionable issues only.

### P0.7: The Scanning Reality (Eyetracking Web Usability)
Users don't read — they scan. They make sub-second decisions about whether to engage. Design must accommodate F-pattern, layer-cake, and spotted scanning patterns. Place critical information in priority spots. Use clear headings. Keep it sparse.

### P0.8: Error is Design Failure (DOET, pp. 162-216)
Most "human error" is actually design error. Slips (execution failures) and mistakes (planning failures) have different causes and need different preventions. The best error message is no error message — prevent the error from being possible.

### P0.9: Three Levels of Emotional Design
- **Visceral**: Immediate aesthetic reaction — clean, fast, beautiful
- **Behavioral**: Pleasure of effective use — efficient workflows, satisfying interactions
- **Reflective**: Self-image and meaning — "I use a tool built by engineers who care"

### P0.10: Humanity-Centered Design (Design for a Better World)
Design must serve all of humanity, not just users. For FeatureSignals this means:
- Honest, transparent pricing (no dark patterns)
- Accessible design (keyboard, screen reader, color contrast)
- Open source core (Apache 2.0)
- No vendor lock-in (OpenFeature native)
- Data sovereignty and privacy by default

### P0.11: The NNGroup Empirical Foundation — 2,397 Guidelines, 30 Years of Data
> **"When a design is based on empirical evidence about human behavior, it works. When it's based on opinion, it's a gamble."**

NNGroup's research is not opinion — it's derived from decades of controlled usability testing, eyetracking studies with 300+ participants, and factor analysis of thousands of usability problems. The following synthesis integrates their most relevant findings for a SaaS developer tool dashboard. The complete body of work encompasses **2,397 UX design guidelines** across 12 report volumes.

**The 10 Usability Heuristics (Nielsen, 1994; validated through 2024) —** These are the empirical bedrock, derived from factor analysis of 249 usability problems. Unlike Norman's higher-level design philosophy, the heuristics are a practical evaluation checklist:

| # | Heuristic | Dashboard Application |
|---|-----------|----------------------|
| 1 | **Visibility of System Status** | Show evaluation state, sync status, deployment progress with live indicators |
| 2 | **Match Between System and Real World** | Use developer-domain terminology (flags, toggles, segments), not internal jargon |
| 3 | **User Control and Freedom** | Undo flag changes, cancel operations, escape filters with one click |
| 4 | **Consistency and Standards (Jakob's Law)** | Follow dashboard conventions established by GitHub, Vercel, Datadog, Stripe — users spend most time on *other* sites |
| 5 | **Error Prevention** | Validate flag rules before deployment; guard against conflicting targeting rules; don't let users create un-deployable configurations |
| 6 | **Recognition Rather Than Recall** | Show flag status, targeting rules, history without navigation; never force users to memorize state |
| 7 | **Flexibility and Efficiency of Use** | Keyboard shortcuts, bulk operations, saved filters, command palette for power users |
| 8 | **Aesthetic and Minimalist Design** | Don't clutter dashboards with rarely-needed metrics; prioritize essential data; every element must earn its place |
| 9 | **Help Users Recognize, Diagnose, and Recover from Errors** | Explain *why* a flag didn't evaluate as expected; suggest corrective action; preserve all user input |
| 10 | **Help and Documentation** | Inline documentation for flag configuration; searchable help that's context-sensitive; `?` icon on every field |

**Key Data Point:** Heuristic #4 (Jakob's Law) is particularly critical for developer tools — developers spend their days in GitHub, Vercel, Stripe, and Datadog. Matching their expectations is not "copying" — it's respecting the user's existing mental models.

**Testing Efficiency:** NNGroup's foundational research (Nielsen, 2000) established that testing with **5 users per iteration** catches ~85% of usability problems. Additional users yield diminishing returns. This is the most cost-effective UX investment possible — one round per sprint.

---

## Part 1: The Unified Conceptual Model

### The One Model That Powers Everything

Every surface of FeatureSignals must share the same fundamental mental model:

```
Organization
  └── Project (what you're building)
       └── Environment (dev, staging, production)
            └── Flag (a decision point)
                 ├── Flag State (enabled/disabled per environment)
                 ├── Targeting Rules (who sees what)
                 ├── Segments (reusable user groups)
                 └── Evaluation (what happens when code checks the flag)
```

This hierarchy must be:
1. **Visible** — always know where you are in the tree
2. **Navigable** — one click to move between levels
3. **Consistent** — same representation on website, docs, dashboard, and API responses

### The Mapping: Every Surface, Same Model

| Surface | How It Shows the Model |
|---------|----------------------|
| **Website** | Hero section: "Feature flags that don't cost a fortune" → How it works diagram → Pricing by plan |
| **Docs** | Left sidebar: Getting Started → Core Concepts (the model) → SDK Guides → API Reference |
| **Dashboard** | Left sidebar: org → project selector → env selector → flags/segments/settings |
| **API** | RESTful paths mirror the model: `/v1/projects/{id}/flags/{key}/environments/{envId}` |

---

## Part 2: Surface-by-Surface Plan

### 2.1 Website (`featuresignals/website/`)

**Current State Assessment:** Recently redesigned (May 2026) with Tailscale/Sanity-inspired design, 14 routes, Material illustrations.

**Norman Principles Applied:**
- **Visceral**: First impression must convey trust, capability, and craft. Not "cheap LaunchDarkly alternative" but "the thoughtful engineer's choice."
- **Scanning (Eyetracking)**: Hero must pass the "3-second test" — value prop understood in one fixation.
- **Knowledge in the World**: Pricing must be radically transparent. No "Contact Sales" obfuscation.

**Specific Improvements:**

#### A. Hero Section Redesign
```
BEFORE: "Feature Flags for Modern Teams" (generic)
AFTER:  "Ship faster. Break nothing. Pay less than lunch."
        Sub: "Feature flags that evaluate in <1ms. Unlimited seats. INR 1,999/month."
        + Live evaluation demo (type a flag key, see result in real-time)
        + "Start free — no credit card" CTA
```

**Why (Eyetracking, pp. 50-64):** Users spend 3-5 seconds deciding whether to engage. The hero must communicate value in one fixation. Numbers ("<1ms", "INR 1,999", "unlimited") draw the eye. The live demo is a signifier that demonstrates capability without reading.

#### B. Pricing Page Honesty
```
Current: Already transparent (INR 1,999/month)
Improve:
  - Remove ANY "popular" badges or fake urgency
  - Show total cost calculator: "50 engineers = INR 1,999/month. LaunchDarkly = $416.50/month."
  - "Enterprise: Starting at ~$150/month. We tell you the price upfront."
  - Trust signals prominently: "No dark patterns. Open source core. No vendor lock-in."
```

**Why (Living with Complexity, pp. 164-168):** The Washington Mutual Bank succeeded by removing barriers. Sociable design. Honest pricing is sociable — it says "we respect you."

#### C. "How It Works" Visual Narrative
```
A 4-step visual story (not a feature list):
  1. Create a flag (screenshot) → "One click. Or use our API."
  2. Add targeting (screenshot) → "Roll out to beta users, then 10%, then everyone."
  3. Ship your code (code snippet) → "Deploy once. Toggle forever."
  4. Watch it work (dashboard screenshot) → "See evaluations in real-time. <1ms latency."
```

**Why (DOET, pp. 25-32):** People learn through stories and conceptual models, not feature lists. The 4-step narrative builds the user's mental model before they even sign up.

#### D. Trust Footer
```
Every page footer:
  "FeatureSignals is Apache 2.0 licensed. No vendor lock-in. OpenFeature native.
   Your data stays in your region. We never sell your data.
   Built by engineers, for engineers."
  + System status indicator (green dot)
  + "6,234,891 evaluations served today" (live counter)
```

**Why (Design for a Better World):** Transparency and trust are not marketing tactics — they are ethical commitments made visible.

---

### 2.2 Documentation (`featuresignals/docs/`)

**Current State:** 35+ page Docusaurus site, OpenAPI specs, migration guides.

**Norman Principles Applied:**
- **Conceptual Models**: Docs must build the user's mental model from first principles.
- **Just-in-time learning (Living with Complexity, pp. 243-245):** Documentation should appear when needed, not front-loaded.
- **Scanning (Eyetracking, pp. 69, 345):** Layer-cake pattern — clear headings, short paragraphs, bulleted lists.

**Specific Improvements:**

#### A. Progressive Documentation Architecture
```
Level 1: "I want to understand" → Core Concepts (the model)
  - What is a feature flag?
  - The Evaluation Pipeline (visual diagram)
  - Targeting Rules Explained (with interactive examples)
  - Environments & Promotion

Level 2: "I want to do something" → Guides
  - Quick Start (5 minutes to first flag)
  - Migrate from LaunchDarkly / Flagsmith / Unleash
  - Best Practices (naming conventions, flag lifecycle)

Level 3: "I want the details" → Reference
  - API Reference (OpenAPI)
  - SDK Reference (8 languages)
  - Configuration Reference
```

**Why (DOET, pp. 231-234):** Activity-centered design. Organize documentation around what users want to accomplish, not around the product's internal structure.

#### B. Interactive Examples
Every conceptual page should have embedded, runnable examples:
- Targeting rule builder that shows evaluation results
- "Try it" code snippets that use a public sandbox API key
- Percentage rollout simulator

**Why (DOET, pp. 227-228):** Prototyping and testing accelerate learning. Interactive examples are prototypes for the mind.

#### C. In-Dashboard Help Integration
Documentation content should be accessible from within the dashboard:
- Every field has a `?` icon linking to the relevant docs section
- DocsPanel (already built) slides out with contextual documentation
- `Cmd+K` searches both dashboard actions AND documentation

---

### 2.3 Dashboard (`featuresignals/dashboard/`)

**Current State:** Next.js 16, React 19, extensive component library. Phases 1-8 UX overhaul just completed.

**Norman Principles Applied:**
- **All 10 heuristics**
- **The Seven Stages of Action (DOET, pp. 41, 71)**
- **Three Knowledge States (Living with Complexity, pp. 225-226):** Past (how did I get here?), Present (what's happening now?), Future (what will happen next?)

**Specific Improvements:**

#### A. The "Three Questions" Every Page Must Answer
Every page/screen in the dashboard must instantly answer:
1. **Where am I?** — Breadcrumb + context bar + environment color
2. **What can I do here?** — Clear primary action + visible secondary actions
3. **What happened?** — Feedback on last action + system status

#### B. The Evaluation Transparency Principle
> **"The system must always display which 'play' it is following."** — Design of Future Things, pp. 73-74

For every flag evaluation, the dashboard must show:
- Which rule matched (or "default value")
- Why other rules didn't match
- The evaluation latency
- A visual trace of the decision tree

This is partially implemented in the Target Inspector. It must become the **default view** for all flag details.

#### C. The Augmentation Principle in AI Features
> **"Augmentation, not automation."** — Design of Future Things, p. 34

The AI Janitor must:
- **Suggest** stale flags for cleanup (not auto-delete)
- **Show its reasoning**: "This flag has served 100% TRUE for 45 days"
- **Allow override**: "Dismiss" / "Keep this flag"
- **Provide a grace period**: "Will be flagged for cleanup in 7 days"

#### D. Form Design Overhaul
Based on Eyetracking findings (pp. 176-193):
- **ALL forms must use single-column, left-aligned, stacked-label layout.**
- No multi-column forms anywhere.
- No placeholder text in fields (use labels above).
- Progressive disclosure for advanced fields.
- Phone/date fields: single input with format hint, not split fields.

#### E. Navigation Consistency
- Sidebar must never change its structure unexpectedly (Eyetracking, pp. 116-118)
- Active state must be clearly visible
- Breadcrumbs on every page (31% look rate — Eyetracking, p. 156)
- Back button must always work as expected

#### F. Dashboard Home — The "Peripheral Awareness" View
The project dashboard should function as calm technology:
- **Center**: What needs attention now (flags with pending approvals, stale flags, webhook failures)
- **Periphery**: Evaluation volume sparklines, SDK health dots, recent activity
- **Alert only when actionable**: No "everything is fine" notifications

#### G. Error States — The "No Error Messages" Principle
> **"Good design means never having to say 'that was wrong.'"** — Living with Complexity, pp. 226-227

- Instead of "Error: Flag key already exists," say "dark-mode is already taken. How about dark-mode-v2 or theme-dark?"
- Instead of "Invalid targeting rule," highlight the specific condition that's problematic and explain why
- Instead of "401 Unauthorized," say "Your session has expired. Log in again?" with a single click

#### H. Data Table Design — The Four Core User Tasks (NNGroup)
> **Source:** Laubheimer, *Data Tables: Four Universal User Tasks* (NNGroup, 2022)

Data tables are the primary UI pattern for a SaaS developer dashboard. Every table in FeatureSignals must support these four universal tasks:

##### H.1 Find Record(s) That Fit Specific Criteria
- **First column must be a human-readable record identifier** — never a "mystery meat" auto-generated ID. Example: flag `key` (user-created, meaningful), not UUID.
- **Default column order should reflect importance** to users, with related columns adjacent.
- **Filters must be discoverable, fast, and transparent** — the current filter syntax must be visible, and active filters must have clear indicators so users know they're viewing filtered data.
- Eyetracking shows users engage in **hierarchical scanning patterns** — fixating between filters and data, moving column by column. Design filter UI to support this scanning rhythm.

##### H.2 Compare Data
- **Freeze header rows and header columns** — non-negotiable for any table exceeding the viewport.
- Use **zebra striping and hover-triggered row highlighting** to help users maintain visual place during horizontal scanning.
- **Column hiding/reordering must be discoverable** — provide both drag-and-drop (power user accelerator) and menu-based options (accessible). Show clear indicator when columns are hidden (e.g., "3 columns hidden").
- A subtle **drop-shadow on frozen columns** helps spatial orientation — suggests they float "above" scrollable data.
- Support **sorting by any variable** and manual row reordering where applicable.

##### H.3 View, Edit, or Add a Single Row
NNGroup identifies five patterns with tradeoffs:

| Pattern | When to Use | When to Avoid |
|---------|-------------|---------------|
| **Edit in place** | Narrow tables, single-field edits | Wide tables, multi-field edits |
| **Modal popup** | Simple forms, no cross-reference needed | When users need to reference other rows |
| **Nonmodal side panel** | Editing that requires referencing table data | Extremely narrow viewports |
| **Separate window** | Deep multi-step workflows | Simple single-field changes |
| **Accordion row** | Quick inline expansion | Users won't close accordions; leads to cluttered display |

> **Critical NNGroup finding:** "We routinely observe in testing that users refer to existing data in other records while they edit a record." Therefore, **nonmodal side panels are the default choice** for FeatureSignals — they let users reference table data while editing. Use modals only for focused, self-contained actions (create, confirm delete).

##### H.4 Taking Action on Records
- **Single-record actions:** Inline actions work for 1-2 items. More than that leads to crowding (unlabeled icons) or hidden menus (discoverability issues).
- **Batch actions:** Checkbox selection + action buttons above/below the table. Include **Select All** as a shortcut. Batch actions are critical for developer workflows (bulk flag enable/disable, bulk archive, bulk tag).

**Table vs. Cards Decision Rule:**

| Tables Win For | Cards Win For |
|--------------|--------------|
| Scalability (adding rows/columns) | Visual browsing / discovery |
| Comparison tasks (adjacent data) | Mobile-first experiences |
| Dense data scanning | Image-heavy content |
| Developer/administrator workflows | Consumer/exploratory browsing |

FeatureSignals is a developer tool. **Default to tables. Use cards sparingly for overview/dashboard tiles only.**

#### I. Error Message Design — The Complete NNGroup Framework
> **Source:** Neusesser & Sunwall, *Error Message Guidelines* (NNGroup, 2023)

Error messages are not an afterthought — they are a core part of the product experience. NNGroup's research provides a three-dimensional framework:

##### I.1 Visibility Guidelines
| Rule | FeatureSignals Implementation |
|------|-------------------------------|
| Display errors **close to the error's source** | Inline validation next to the field, not top-of-page banners. The `InlineError` component already does this. |
| Use **noticeable, redundant, accessible indicators** | Bold + high-contrast + red + icons + borders. Never color alone — 350M people have color-vision deficiency. |
| **Design errors based on impact** | Warnings (toasts/banners) vs. blocking errors (modals). Differentiate severity visually — not all problems are equal. |
| **Avoid premature error display** | Don't show errors on field blur for exploratory interactions. NNGroup: "Presenting errors too early is a hostile pattern. It's like grading a test before the student has had a chance to answer." Validate on submit or after meaningful input completion. |

##### I.2 Communication Guidelines
- **Use human-readable language** — no error codes exposed to users. The 404 page is the web's most common violation of this rule.
- **Concisely and precisely describe the issue** — never `An error occurred`. State what failed and why.
- **Offer constructive advice** — state the problem AND a potential remedy. Examples:
  - Bad: `Invalid flag key`
  - Good: `Flag keys can only contain lowercase letters, numbers, and hyphens. Example: "dark-mode"`
- **Take a positive tone; don't blame the user** — avoid `invalid`, `illegal`, `incorrect`. The system must gracefully adapt to imperfect input.
- **Avoid humor** — it becomes stale on repeated encounters and can feel mocking during frustrating moments.

##### I.3 Efficiency Guidelines
- **Preserve the user's input at all costs** — let users edit their original input, never force starting over.
- **Reduce error-correction effort** — if possible, guess the correct action and let users pick from a small list of fixes (e.g., "Did you mean `dark-mode`?" with one-click correction).
- **Educate concisely on how the system works** — use hypertext links to supplementary documentation. The `docs_url` field in API error responses enables this.

##### I.4 Mitigating Total Failure (The "Fail Whale" Effect)
> "Mitigate total failure with novelty." For catastrophic errors (server overload, total outage), blend apology with something surprising or novel. This leverages the **peak-end rule** and **negativity bias** to salvage the user relationship.

**FeatureSignals Application:** A custom illustration + honest status message for 500-level errors: "Something broke on our end. We've been alerted and are fixing it. Check status.featuresignals.com for updates."

#### J. Complex Application Design — The 5-Layer Framework (NNGroup)
> **Source:** Kaplan, *Complex Application Design: A 5-Layer Framework* (NNGroup)

FeatureSignals is a complex application (developer tool with deep workflows). NNGroup's framework organizes design thinking into five layers:

| Layer | Definition | FeatureSignals Application |
|-------|-----------|--------------------------|
| **1. Conceptual Model** | Users' mental model of how the system works | The flag hierarchy: Org > Project > Environment > Flag > Targeting > Evaluation |
| **2. Navigation** | How users move through the application | Persistent sidebar + breadcrumbs + command palette + environment switcher |
| **3. Page/Layout** | Information architecture within each view | Consistent page structure: context bar > primary action > data > detail panel |
| **4. Component** | Individual UI elements and behaviors | Every component follows Norman + NNGroup principles (documented in Part 3) |
| **5. Visual Design** | Aesthetic presentation and clarity | Single design system (Signal UI), consistent tokens, calibrated whitespace |

**Eight Design Guidelines for Complex Applications:**

1. **Support learning by doing** — progressive disclosure, not upfront tutorials. Users learn by creating flags, not by reading about them.
2. **Provide flexible navigation paths** — power users and novices need different routes. Command palette for experts, guided flows for newcomers.
3. **Help users track their work** — activity logs, flag change history, undo. The user should never wonder "what did I just change?"
4. **Design for interruption** — save draft state, enable resumption. Developers get interrupted constantly.
5. **Offer gentle guidance** — contextual help, not intrusive onboarding. The `HelpTooltip` component + `?` icons serve this need.
6. **Show system status clearly** — what's happening now (live evaluations), what just happened (recent changes), what will happen (scheduled rollouts).
7. **Prevent errors proactively** — constraints, smart defaults, confirmation for destructive actions. Production environment = hold-to-confirm.
8. **Support comparison and analysis** — side-by-side environment views, flag diff, saved filter views. Developers need to compare, not just view.

---

### 2.4 API (`featuresignals/server/`)

**Current State:** RESTful API, chi router, ~100 endpoints, OpenAPI spec, SDKs in 8 languages.

**Norman Principles Applied:**
- **Conceptual Models**: API paths should mirror the mental model.
- **Feedback**: Every mutation returns the created/updated entity.
- **Consistency**: Same patterns everywhere.
- **Error as communication**: Error messages should be educational, diagnostic, and constructive.

**Specific Improvements:**

#### A. API as a First-Class Product Surface
The API is not "backend plumbing." It is the primary interface for the majority of FeatureSignals users (developers integrating SDKs). It must be designed with the same care as the dashboard.

#### B. Response Design Principles
Every API response must:
1. **Include the entity**: Created/updated resource returned in full (already done ✅)
2. **Include context**: `request_id` for traceability (already done ✅)
3. **Include what's next**: HATEOAS links or `related` field suggesting next actions
4. **Include timing**: `evaluation_time_ms` on evaluation endpoints

#### C. Error Response Design
```
CURRENT:
{ "error": "validation failed", "request_id": "abc123" }

FUTURE:
{
  "error": {
    "code": "validation_failed",
    "message": "Flag key 'dark mode' contains spaces. Use lowercase, hyphenated keys like 'dark-mode'.",
    "field": "key",
    "suggestion": "dark-mode",
    "docs_url": "https://featuresignals.com/docs/core-concepts/flags#naming"
  },
  "request_id": "abc123"
}
```

**Why (DOET, pp. 203-205):** Error messages should make the problem understandable and suggest a solution. The Apple Newton failed because errors were unintelligible ("Egg freckles?"). The Palm succeeded because errors were understandable.

#### D. SDK as Augmented Intelligence
> **"It is the combination of the two, the person plus the artifact, that is smart."** — DOET, p. 112

SDKs should:
- Provide intelligent defaults (cache TTLs, retry logic, timeouts)
- Report evaluation reasons, not just values
- Warn on suspicious patterns (same flag evaluated 10,000 times/second)
- Fail gracefully (serve default values when the server is unreachable)

#### E. API Documentation as Learning Tool
- Organize by activity, not by endpoint (activity-centered design)
- Provide copy-paste-ready curl examples
- Show request → response pairs for every endpoint
- Include a "Try It" console on the docs site

---

## Part 3: Signal UI — The Independent Design System

> **Strategic Decision (May 2026):** FeatureSignals will build and maintain its own design system — **Signal UI** — independent of GitHub Primer. This eliminates the existential risk of depending on a third-party design system that could change, deprecate, or close-source components at any time. The design system is grounded in Don Norman's principles and NNGroup's empirical research, not in mimicking another company's style.

### 3.0 Why Independence Matters

**Current State (May 2026):** The dashboard uses `@primer/octicons-react` for icons, and the CSS variable naming convention (`--fgColor-*`, `--bgColor-*`, `--borderColor-*`, `--shadow-resting-*`) is copied directly from GitHub Primer v22. While the actual React components are custom-built on Radix primitives (not Primer React), the design *language* is Primer's.

**The Risk:**
1. GitHub could change Primer's licensing, availability, or direction unpredictably
2. GitHub could deprecate `@primer/octicons-react` in favor of a new icon system
3. Our product's visual identity would be derivative of GitHub's — not our own
4. Recruiting designers who know "our system" rather than "Primer" becomes harder
5. If Primer makes a breaking change, our entire CSS variable architecture breaks

**The Solution:** Create **Signal UI** — a world-class design system owned by FeatureSignals, grounded in Norman + NNGroup principles, with zero dependency on GitHub Primer. We already have `lucide-react` installed as our icon library (alongside Primer Octicons). The migration path is clear and achievable.

### 3.1 Design Token Architecture

Signal UI tokens are named semantically (what they *mean*) rather than chromatically (what they *are*). This is the most important distinction from Primer — our tokens describe purpose, not color value.

#### 3.1.1 Color Tokens

```
Primer Convention (REMOVE):           Signal UI Convention (ADOPT):
--fgColor-default                     --signal-fg-primary
--fgColor-muted                       --signal-fg-secondary
--fgColor-subtle                      --signal-fg-tertiary
--fgColor-accent                      --signal-fg-accent
--fgColor-success                     --signal-fg-success
--fgColor-danger                      --signal-fg-danger
--fgColor-attention                   --signal-fg-warning
--bgColor-default                     --signal-bg-primary
--bgColor-muted                       --signal-bg-secondary
--bgColor-inset                       --signal-bg-tertiary
--borderColor-default                 --signal-border-default
--borderColor-muted                   --signal-border-subtle
--shadow-resting-xsmall               --signal-shadow-xs
--shadow-resting-small                --signal-shadow-sm
--shadow-floating-small               --signal-shadow-md
--shadow-floating-medium              --signal-shadow-lg
```

**Why semantic naming (Norman, DOET pp. 74-122):** "Knowledge in the world." A designer or developer reading `--signal-fg-danger` immediately knows its purpose. Reading `--fgColor-default` requires knowing the Primer system. Semantic names make correct usage easy and incorrect usage hard.

#### 3.1.2 Typography Scale

| Token | Size / Line Height | Usage |
|-------|-------------------|-------|
| `--signal-text-xs` | 12px / 16px | Legal footnotes, fine print |
| `--signal-text-sm` | 14px / 20px | Secondary text, table cells, metadata |
| `--signal-text-base` | 16px / 24px | Body text, form labels, descriptions |
| `--signal-text-lg` | 18px / 28px | Section headings, card titles |
| `--signal-text-xl` | 24px / 32px | Page titles |
| `--signal-text-2xl` | 30px / 40px | Hero headings |
| `--signal-text-mono` | 14px / 20px | Code, flag keys, API values (JetBrains Mono) |

#### 3.1.3 Spacing Scale (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-space-1` | 4px | Icon-label gap, tight inline spacing |
| `--signal-space-2` | 8px | Element internal padding |
| `--signal-space-3` | 12px | Card padding, form group spacing |
| `--signal-space-4` | 16px | Section padding, container padding |
| `--signal-space-5` | 24px | Major section separation |
| `--signal-space-6` | 32px | Page-level spacing |
| `--signal-space-8` | 48px | Layout-level separation |
| `--signal-space-12` | 64px | Hero/landing vertical rhythm |

#### 3.1.4 Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-duration-instant` | 100ms | Toggle, checkbox, micro-interactions |
| `--signal-duration-fast` | 150ms | Button hover, focus transitions |
| `--signal-duration-normal` | 250ms | Modal open/close, panel slide |
| `--signal-duration-slow` | 400ms | Page transitions, progressive disclosure |
| `--signal-easing-default` | `cubic-bezier(0.16, 1, 0.3, 1)` | Standard interactions (ease-out) |
| `--signal-easing-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Celebratory moments only |

#### 3.1.5 Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-shadow-none` | `none` | Flat surfaces |
| `--signal-shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | Cards at rest, subtle elevation |
| `--signal-shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Elevated cards, sticky headers |
| `--signal-shadow-md` | `0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)` | Dropdowns, tooltips, popovers |
| `--signal-shadow-lg` | `0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)` | Modals, dialogs |
| `--signal-shadow-xl` | `0 20px 40px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04)` | Full-screen overlays |

**Why (DOET pp. 82-83):** Shadows are signifiers of affordance. A card with `shadow-xs` signals "I'm at rest, on the surface." A modal with `shadow-lg` signals "I'm above everything else, attend to me." Consistent shadow language makes the spatial model visible.

#### 3.1.6 Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-radius-none` | 0 | Tables, code blocks, data displays |
| `--signal-radius-sm` | 4px | Inputs, badges, tags |
| `--signal-radius-md` | 8px | Buttons, cards, dropdowns |
| `--signal-radius-lg` | 12px | Modals, large cards |
| `--signal-radius-xl` | 16px | Hero cards, feature panels |
| `--signal-radius-full` | 9999px | Pills, avatars, status dots |

### 3.2 Component Specification — Every Component, Grounded in Principle

Each component in Signal UI must:
1. **State its purpose** — What user need does it fulfill? (Norman: Activity-Centered Design)
2. **Document its affordances** — How does it visually signal what it does? (Norman: Signifiers)
3. **Define its feedback** — What happens when the user interacts? (NNGroup Heuristic #1: Visibility of System Status)
4. **Declare its constraints** — What can't the user do with it? (Norman: Error Prevention)
5. **Specify its states** — Default, hover, active, focus, disabled, loading, error

#### 3.2.1 Core Components Inventory

| Component | Purpose | Norman Principle | NNGroup Heuristic |
|-----------|---------|-----------------|-------------------|
| **Button** | Initiate an action | Signifiers + Feedback | #1 Visibility, #3 Control |
| **Input** | Accept user data | Constraints + Affordances | #5 Error Prevention |
| **Select/Dropdown** | Choose from options | Recognition over Recall | #6 Recognition |
| **Switch/Toggle** | Binary state change | Immediate Feedback | #1 Visibility |
| **Table** | Display and compare data | Knowledge in the World | #4 Consistency, #8 Minimalism |
| **Modal** | Focused task without navigation loss | Gulf of Execution | #3 Control & Freedom |
| **Side Panel** | Edit while referencing context | Knowledge in the World | #6 Recognition |
| **Toast** | Transient feedback | Calm Technology (Periphery) | #1 Visibility |
| **Tooltip** | Just-in-time information | Progressive Disclosure | #10 Help & Documentation |
| **Skeleton** | Loading state that feels fast | Visceral Design | #1 Visibility |
| **Empty State** | Guide first action | Conceptual Model building | #10 Help |
| **Error Display** | Explain what happened and how to fix it | No Error Messages principle | #9 Error Recovery |
| **Breadcrumb** | Spatial orientation | Knowledge in the World | #4 Consistency |
| **Command Palette** | Power user accelerator | Flexibility & Efficiency | #7 Efficiency |

#### 3.2.2 Button — Full Specification Example

**Purpose:** Initiate an action with a single click or keypress.
**Affordances:** Visual weight (primary > secondary > ghost), hover lift (`translateY(-1px)`), active press (`scale(0.97)`), focus ring.
**Feedback:** 
- Hover: `--signal-duration-fast` transition, slight lift, color shift
- Press: `--signal-duration-instant` scale down (haptic metaphor)
- Loading: Spinner replaces content, button stays same width (no layout shift)
- Success: Brief success icon + color pulse, then reverts (for save buttons)
**Constraints:**
- Never disabled (use `aria-disabled` + visual state — prevents focus trap for keyboard users)
- Loading state prevents double-submit
- Destructive actions use danger variant + confirmation
**States:**
| State | Visual | When |
|-------|--------|------|
| Default | Resting color, no elevation | Idle |
| Hover | Slightly lighter/darker, translateY(-1px) | Mouse over |
| Focus | 2px accent ring, offset 2px | Keyboard focus |
| Active | scale(0.97), no translateY | Mouse down / key held |
| Loading | Spinner, same width, `aria-disabled` | Async operation in progress |
| Disabled | 50% opacity, `pointer-events-none`, `aria-disabled` | Action unavailable |

#### 3.2.3 Table — Full Specification

**Purpose:** Display structured data for scanning, comparison, and action.
**Four Tasks Supported** (per NNGroup H.1-H.4 above):
1. Find records matching criteria (filterable columns, visible filter state)
2. Compare data across rows (frozen headers, zebra striping, hover highlight)
3. View/Edit single records (nonmodal side panel by default)
4. Take action on records (inline actions for 1-2 items, batch actions via checkbox)

**Affordances:**
- Sortable column headers have sort direction indicator + hover cursor change
- Filterable columns have filter icon, filled when active
- Selectable rows show checkbox on hover
- Resizable columns have drag handle on right edge

**Feedback:**
- Row hover highlights the entire row (maintains visual place during scanning)
- Sort action triggers immediate reorder + brief header highlight
- Batch selection shows count: "3 selected"

**States:**
| State | Visual | When |
|-------|--------|------|
| Loading | Skeleton rows matching column count | Initial data fetch |
| Empty | Illustration + "No flags yet. Create your first flag." + CTA button | Zero records |
| Filtered Empty | "No flags match your filters. Clear filters?" + clear button | Zero results from active filter |
| Error | Retry button + friendly message + error reference | API failure |
| Data | Standard table rendering | Normal operation |

### 3.3 Interaction Patterns — The Universal Rules

| Pattern | Rule | Applies To | Norman/NNGroup Source |
|---------|------|-----------|----------------------|
| **Immediate Feedback** | Every action produces visible change within 100ms | All interactive elements | Heuristic #1 |
| **Undo** | Destructive actions offer 5-second undo toast | Delete, archive, status change | Heuristic #3, DOET pp. 202-205 |
| **Auto-save** | Changes save automatically with "Saved" indicator | Settings, targeting rules, forms | Heuristic #5 (prevent data loss) |
| **Debounced Search** | 300ms debounce, searches all visible fields | Global search, flag search, filter inputs | Heuristic #7 (efficiency) |
| **Persistent Navigation** | Sidebar structure never changes unexpectedly | Main navigation | Eyetracking pp. 116-118 |
| **Breadcrumbs** | Every page below top level has breadcrumbs | All pages except dashboard home | Eyetracking p. 156 (31% look rate) |
| **Hold to Confirm** | Production environment destructive actions require 3s hold | Production flag toggle, production rule delete | Heuristic #5 (error prevention) |
| **Progressive Disclosure** | Advanced options hidden behind "Show advanced" toggle | Flag creation, targeting rules, settings | Norman: Living with Complexity pp. 243-245 |
| **Skeleton Screens** | Content shell with shimmer animation, not spinners | All async content loading | Heuristic #1 (visibility) |
| **Empty State** | Illustration + description + CTA | All empty lists, new accounts | Heuristic #10 (help) |

### 3.4 Content Voice — Consistent Across All Surfaces

One voice speaks from website, docs, dashboard, API responses, and error messages:

| Attribute | Rule | Example |
|-----------|------|---------|
| **Tone** | Confident, helpful, never condescending | "Here's what happened" not "Oops!" |
| **Jargon** | Use engineering terms correctly; explain when introducing | "Targeting rule" is fine. "T-Distribution" needs a tooltip. |
| **Error Messages** | "X didn't work because Y. Try Z." | Not "Invalid input" but "Flag key 'dark mode' contains spaces. Try 'dark-mode'." |
| **Success Messages** | Brief confirmation of what happened | "Flag 'dark-mode' created in Production." |
| **Empty States** | "No [thing] yet. [Action] to get started." | "No flags yet. Create your first flag." |
| **Pricing** | Exact numbers, no asterisks, no "starting at" unless true | "$23/month" not "Starting at $19.99*" |
| **Competitors** | Never disparage. "We're different" not "They're bad." | "Unlike tools that charge per seat, FeatureSignals is flat-rate." |
| **Humans First** | "You" and "your team" not "users" and "accounts" | "Your flags" not "User flag inventory" |

### 3.5 Migration Plan: Primer → Signal UI

**Phase 0: Token Migration (Week 1)**
1. Create new `globals.signal.css` with Signal UI tokens alongside existing `globals.css` (Primer)
2. Map all Primer tokens to Signal UI equivalents as CSS variable aliases
3. Deploy both systems running in parallel — zero visual change for users

**Phase 1: Component Migration (Weeks 2-3)**
1. Replace `@primer/octicons-react` imports with `lucide-react` equivalents (already installed)
2. Update component CSS to use Signal UI token names (mechanical find-and-replace with verification)
3. Remove Primer token fallbacks one component at a time

**Phase 2: Visual Refresh (Weeks 3-4)**
1. Apply Signal UI's own visual identity — this is the moment the product looks like *us*, not GitHub
2. Adjust color palette, typography, spacing to Signal UI spec
3. Visual regression testing on all pages

**Phase 3: Complete Independence (Week 4)**
1. Remove `@primer/octicons-react` from `package.json`
2. Remove Primer CSS variables from `globals.css`
3. Archive old token mapping
4. Celebrate independence 🎉

### 3.6 Design System Governance

- **Owner:** Engineering + Design (shared responsibility)
- **Documentation:** Signal UI components documented in Storybook (or equivalent), linked from DEVELOPMENT.md
- **Versioning:** Semantic versioning. Breaking visual changes = major version bump.
- **Contribution:** New components must pass the 5-point checklist (purpose, affordances, feedback, constraints, states) before merge
- **Review:** Every component PR includes a screenshot + interaction recording
- **Testing:** Visual regression tests for all components. Accessibility audit (axe-core) on every component.
- **Deprecation:** Components deprecated with a migration path, removed after 2 major versions

---

## Part 4: Implementation Phases

### Phase 0: Design System Independence — Signal UI (Week 1-2)
**Goal:** Establish an independent design system owned by FeatureSignals, zero dependency on GitHub Primer.

1. Create `globals.signal.css` with Signal UI design tokens (semantic naming)
2. Map existing Primer tokens to Signal UI equivalents as aliases (parallel deployment)
3. Replace all `@primer/octicons-react` imports with `lucide-react` equivalents
4. Update `package.json` to remove `@primer/octicons-react`
5. Migrate all components to Signal UI CSS variable names
6. Visual regression testing on every page
7. Remove Primer tokens from `globals.css`
8. Document Signal UI in DEVELOPMENT.md

### Phase A: Design System Unification (Week 2-3)
**Goal:** One visual language across all surfaces (website, docs, dashboard).

1. Extract CSS variable tokens to a shared package (`@featuresignals/design-tokens`)
2. Apply shared tokens to website and docs
3. Unify typography, spacing, colors, radius, shadows across all surfaces
4. Create a shared component library for website + docs
5. Audit and fix all visual inconsistencies

### Phase B: Website Transformation (Week 3-4)
1. Hero section redesign with live evaluation demo
2. "How It Works" visual narrative (4 steps)
3. Pricing page radical honesty improvements
4. Trust footer with live system status
5. Navigation consistency with dashboard

### Phase C: Documentation Restructuring (Week 4-5)
1. Reorganize into 3-tier architecture (Concepts → Guides → Reference)
2. Add interactive examples to key pages
3. Integrate in-dashboard help (contextual links from every field)
4. Add "Try It" API console
5. Unify visual design with website and dashboard

### Phase D: Dashboard Deepening (Week 5-7)
1. **Evaluation transparency:** Visual decision tree on all flag details (Section 2.3B)
2. **AI Janitor augmentation mode:** Suggest, don't auto-delete (Section 2.3C)
3. **Form design overhaul:** Single-column, stacked labels everywhere (Section 2.3D)
4. **Dashboard home as calm technology:** Center/periphery model (Section 2.3F)
5. **"Three Questions" audit:** Every page answers: Where am I? What can I do? What happened? (Section 2.3A)
6. **Data table upgrade:** Frozen headers, zebra striping, nonmodal side panel editing, batch actions, visible filter state (Section 2.3H)
7. **Error message redesign:** Full NNGroup framework — visible, communicative, efficient (Section 2.3I)

### Phase E: API Excellence (Week 7-8)
1. Enhanced error responses: `code` + `message` + `suggestion` + `docs_url` (Section 2.4C)
2. SDK intelligence improvements: evaluation reasons, anomaly warnings, graceful degradation
3. HATEOAS links on collection responses
4. API documentation reorganized by activity, not endpoint (Section 2.4E)
5. "Try It" console on docs site

### Phase F: Integration, Polish & Accessibility (Week 8-9)
1. End-to-end user journey testing (signup → first flag → first evaluation)
2. Visual regression testing across all surfaces
3. Accessibility audit: WCAG 2.1 AA compliance (automated + manual)
4. 5-user usability testing on 3 critical flows (per NNGroup: catches ~85% of issues)
5. Content voice consistency pass across all surfaces
6. Performance optimization: Lighthouse 95+ on all pages
7. Final visual polish

---

## Part 5: Success Metrics

| Metric | Current | Target | How Measured |
|--------|---------|--------|-------------|
| **Signup → First Flag** | ~5 minutes | <60 seconds | Onboarding funnel analytics |
| **Dashboard page load** | — | <1.5s FCP | Lighthouse |
| **Flag toggle latency** | <1ms p99 | <1ms p99 | Server metrics |
| **Error rate (dashboard)** | — | <0.1% | Console error tracking |
| **Docs search success** | — | >90% find answer | Docs analytics |
| **Pricing page conversion** | — | Baseline + track | Analytics |
| **Accessibility score** | — | WCAG 2.1 AA | Automated + manual audit |
| **NPS (when available)** | — | >50 | In-app survey |
| **Design system independence** | 0% | 100% Signal UI, 0% Primer | Code audit |
| **Usability test score** | — | >85% task completion | 5-user test per sprint |
| **Error recovery rate** | — | >90% of errors include suggestion | Error monitoring |
| **Table task support** | 2/4 tasks | 4/4 NNGroup tasks supported | Design audit |
| **Accessibility score** | — | WCAG 2.1 AA | axe-core + manual audit |

---

## Cross-References

- [[UX_STRATEGY.md]] — original UX strategy (now superseded by this master plan)
- [[ARCHITECTURE.md]] — system architecture
- [[DEVELOPMENT.md]] — development standards
- [[PERFORMANCE.md]] — performance targets
- [[COMPLIANCE.md]] — compliance posture
- [[ROADMAP.md]] — feature roadmap

## Sources

1. Norman, D. (2013). *The Design of Everyday Things: Revised and Expanded Edition*. Basic Books.
2. Norman, D. (2010). *Living with Complexity*. MIT Press.
3. Norman, D. (2007). *The Design of Future Things*. Basic Books.
4. Norman, D. (2023). *Design for a Better World: Meaningful, Sustainable, Humanity Centered*. MIT Press.
5. Nielsen, J. & Pernice, K. (2010). *Eyetracking Web Usability*. New Riders.
6. Nielsen, J. (1994). *10 Usability Heuristics for User Interface Design*. NNGroup.
7. Norman, D. (2004). *Emotional Design: Why We Love (or Hate) Everyday Things*. Basic Books.
