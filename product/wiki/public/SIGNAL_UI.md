---
title: Signal UI Design System
tags: [design, ux, core]
domain: design
sources:
  - MASTER_PLAN.md (Sections 3.0-3.6)
  - dashboard/src/app/signal.css
related:
  - [[MASTER_PLAN]]
  - [[DEVELOPMENT]]
  - [[UX_STRATEGY]]
last_updated: 2026-05-14
maintainer: engineering
review_status: current
confidence: high
---

## Overview

Signal UI is FeatureSignals' independent design system — zero dependency on GitHub Primer. Every design token uses semantic naming (what it *means*) rather than chromatic naming (what it *is*). This makes correct usage easy and incorrect usage hard ("Knowledge in the world" — Norman, DOET pp. 74-122).

## Design Token Architecture

### Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-fg-primary` | `#1f2328` | Primary text, headings, body copy |
| `--signal-fg-secondary` | `#59636e` | Secondary text, descriptions |
| `--signal-fg-tertiary` | `#818b98` | Placeholder text, disabled labels |
| `--signal-fg-accent` | `#0969da` | Links, active states, primary actions |
| `--signal-fg-success` | `#1a7f37` | Success messages, enabled states |
| `--signal-fg-warning` | `#9a6700` | Warning messages, attention indicators |
| `--signal-fg-danger` | `#d1242f` | Error text, destructive actions |
| `--signal-fg-info` | `#8250df` | Informational highlights, done states |
| `--signal-fg-on-emphasis` | `#ffffff` | Text on dark backgrounds |

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-bg-primary` | `#ffffff` | Page backgrounds, cards |
| `--signal-bg-secondary` | `#f6f8fa` | Inset backgrounds, muted sections |
| `--signal-bg-tertiary` | `#f6f8fa` | Nested sections (currently aliased to secondary) |
| `--signal-bg-inverse` | `#25292e` | Dark backgrounds, code blocks |
| `--signal-bg-accent-emphasis` | `#0969da` | Accent backgrounds (primary buttons) |
| `--signal-bg-accent-muted` | `#ddf4ff` | Subtle accent backgrounds |
| `--signal-bg-success-emphasis` | `#1f883d` | Success backgrounds |
| `--signal-bg-success-muted` | `#dafbe1` | Subtle success backgrounds |
| `--signal-bg-warning-emphasis` | `#9a6700` | Warning backgrounds |
| `--signal-bg-warning-muted` | `#fff8c5` | Subtle warning backgrounds |
| `--signal-bg-danger-emphasis` | `#cf222e` | Error backgrounds |
| `--signal-bg-danger-muted` | `#ffebe9` | Subtle error backgrounds |
| `--signal-bg-info-emphasis` | `#8250df` | Information backgrounds |
| `--signal-bg-info-muted` | `#fbefff` | Subtle information backgrounds |

### Border Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-border-default` | `#d1d9e0` | Default borders |
| `--signal-border-subtle` | `#d1d9e0b3` | Subtle borders |
| `--signal-border-emphasis` | `#818b98` | Emphasized borders |
| `--signal-border-accent-emphasis` | `#0969da` | Accent borders (focus rings) |
| `--signal-border-accent-muted` | `#54aeff66` | Subtle accent borders |
| `--signal-border-success-emphasis` | `#1a7f37` | Success borders |
| `--signal-border-success-muted` | `#4ac26b66` | Subtle success borders |
| `--signal-border-warning-emphasis` | `#9a6700` | Warning borders |
| `--signal-border-warning-muted` | `#d4a72c66` | Subtle warning borders |
| `--signal-border-danger-emphasis` | `#cf222e` | Error borders |

### Typography Scale

| Token | Size / Line Height | Usage |
|-------|-------------------|-------|
| `--signal-text-xs` | 12px / 16px | Legal footnotes, fine print |
| `--signal-text-sm` | 14px / 20px | Secondary text, table cells, metadata |
| `--signal-text-base` | 16px / 24px | Body text, form labels, descriptions |
| `--signal-text-lg` | 18px / 28px | Section headings, card titles |
| `--signal-text-xl` | 24px / 32px | Page titles |
| `--signal-text-2xl` | 30px / 40px | Hero headings |
| `--signal-text-mono` | 14px / 20px | Code, flag keys, API values (JetBrains Mono) |

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-font-sans` | System font stack | All UI text |
| `--signal-font-mono` | Monospace font stack | Code, keys, values |

### Spacing Scale (4px base)

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

### Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-duration-instant` | 100ms | Toggle, checkbox, micro-interactions |
| `--signal-duration-fast` | 150ms | Button hover, focus transitions |
| `--signal-duration-normal` | 250ms | Modal open/close, panel slide |
| `--signal-duration-slow` | 400ms | Page transitions, progressive disclosure |
| `--signal-easing-default` | `cubic-bezier(0.16, 1, 0.3, 1)` | Standard interactions (ease-out) |
| `--signal-easing-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Celebratory moments only |

### Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-shadow-none` | `none` | Flat surfaces |
| `--signal-shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | Cards at rest, subtle elevation |
| `--signal-shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Elevated cards, sticky headers |
| `--signal-shadow-md` | `0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)` | Dropdowns, tooltips, popovers |
| `--signal-shadow-lg` | `0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)` | Modals, dialogs |
| `--signal-shadow-xl` | `0 20px 40px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04)` | Full-screen overlays |

### Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--signal-radius-none` | 0 | Tables, code blocks, data displays |
| `--signal-radius-sm` | 4px | Inputs, badges, tags |
| `--signal-radius-md` | 8px | Buttons, cards, dropdowns |
| `--signal-radius-lg` | 12px | Modals, large cards |
| `--signal-radius-xl` | 16px | Hero cards, feature panels |
| `--signal-radius-full` | 9999px | Pills, avatars, status dots |

## Component Specification

Each component in Signal UI must:
1. **State its purpose** — What user need does it fulfill?
2. **Document its affordances** — How does it visually signal what it does?
3. **Define its feedback** — What happens when the user interacts?
4. **Declare its constraints** — What can't the user do with it?
5. **Specify its states** — Default, hover, active, focus, disabled, loading, error

### Button Specification

| State | Visual | When |
|-------|--------|------|
| Default | Resting color, no elevation | Idle |
| Hover | Slightly lighter/darker, translateY(-1px) | Mouse over |
| Focus | 2px accent ring, offset 2px | Keyboard focus |
| Active | scale(0.97), no translateY | Mouse down / key held |
| Loading | Spinner, same width, `aria-disabled` | Async operation in progress |
| Disabled | 50% opacity, `pointer-events-none`, `aria-disabled` | Action unavailable |

### Table Specification

| State | Visual | When |
|-------|--------|------|
| Loading | Skeleton rows matching column count | Initial data fetch |
| Empty | Illustration + "No flags yet. Create your first flag." + CTA | Zero records |
| Filtered Empty | "No flags match your filters. Clear filters?" | Zero results from active filter |
| Error | Retry button + friendly message + error reference | API failure |
| Data | Standard table rendering | Normal operation |

## Interaction Patterns

| Pattern | Rule | Applies To |
|---------|------|-----------|
| Immediate Feedback | Every action produces visible change within 100ms | All interactive elements |
| Undo | Destructive actions offer 5-second undo toast | Delete, archive, status change |
| Auto-save | Changes save automatically with "Saved" indicator | Settings, targeting rules, forms |
| Debounced Search | 300ms debounce, searches all visible fields | Global search, flag search |
| Persistent Navigation | Sidebar structure never changes unexpectedly | Main navigation |
| Breadcrumbs | Every page below top level has breadcrumbs | All pages except dashboard home |
| Hold to Confirm | Production destructive actions require 3s hold | Production flag toggle, rule delete |
| Progressive Disclosure | Advanced options behind "Show advanced" | Flag creation, targeting rules |
| Skeleton Screens | Content shell with shimmer animation | All async content loading |
| Empty State | Illustration + description + CTA | All empty lists, new accounts |

## Content Voice

| Attribute | Rule | Example |
|-----------|------|---------|
| Tone | Confident, helpful, never condescending | "Here's what happened" not "Oops!" |
| Jargon | Use engineering terms correctly; explain when introducing | "Targeting rule" is fine. "T-Distribution" needs a tooltip |
| Error Messages | "X didn't work because Y. Try Z." | Not "Invalid input" but "Flag key 'dark mode' contains spaces. Try 'dark-mode'." |
| Success Messages | Brief confirmation of what happened | "Flag 'dark-mode' created in Production." |
| Empty States | "No [thing] yet. [Action] to get started." | "No flags yet. Create your first flag." |
| Pricing | Exact numbers, no asterisks | "INR 1,999/month" not "Starting at INR 1,999*" |
| Humans First | "You" and "your team" not "users" and "accounts" | "Your flags" not "User flag inventory" |

## Icons

Signal UI uses **lucide-react** for all icons. The icon barrel file is at `dashboard/src/components/icons/nav-icons.tsx`.

### Primer → Lucide Migration Map

| Primer Octicon | lucide-react | Notes |
|---|---|---|
| `AlertFillIcon` | `AlertTriangle` | No fill variant in lucide |
| `AlertIcon` | `AlertTriangle` | |
| `BeakerIcon` | `FlaskConical` | Closest semantic match |
| `CheckCircleFillIcon` | `CheckCircle` | No fill variant |
| `HeartFillIcon` | `Heart` | |
| `IterationsIcon` | `Flag` | Feature flag metaphor |
| `PulseIcon` | `Activity` | Pulse not in lucide; Activity closest |
| `QuestionIcon` | `HelpCircle` | |
| `RepoIcon` | `FolderGit2` | Git repository metaphor |
| `RepoForkedIcon` | `GitFork` | |
| `SparkleFillIcon` | `Sparkles` | |
| `XCircleFillIcon` | `XCircle` | |
| All others | Direct lucide equivalent | 1:1 semantic match |

## Governance

- **Owner:** Engineering + Design (shared responsibility)
- **Versioning:** Semantic versioning. Breaking visual changes = major version bump.
- **Contribution:** New components must pass the 5-point checklist (purpose, affordances, feedback, constraints, states) before merge.
- **Review:** Every component PR includes a screenshot + interaction recording.
- **Testing:** Visual regression tests for all components. Accessibility audit (axe-core) on every component.
- **Deprecation:** Components deprecated with a migration path, removed after 2 major versions.

## File Location

The Signal UI design tokens live in `dashboard/src/app/signal.css`, imported by `globals.css`.
