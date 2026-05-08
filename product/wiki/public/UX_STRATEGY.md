---
title: UX Strategy — Don Norman-Inspired Product Design
tags: [ux, design, strategy, product]
domain: architecture
sources:
  - Don Norman, The Design of Everyday Things (1988, 2013)
  - Don Norman, Emotional Design (2004)
  - Don Norman, Living with Complexity (2010)
  - Nielsen Norman Group, 10 Usability Heuristics (1994, 2024)
  - ARCHITECTURE.md
  - COMPETITIVE.md
  - CUSTOMERS.md
  - ROADMAP.md
related:
  - [[ARCHITECTURE.md]]
  - [[DEVELOPMENT.md]]
  - [[ROADMAP.md]]
  - [[COMPETITIVE.md]]
last_updated: 2026-05-10
maintainer: llm
review_status: current
confidence: high
---

## Overview

This page documents FeatureSignals' UX strategy, grounded in Don Norman's design philosophy and the Nielsen Norman Group's usability heuristics. Every UX decision in the product should trace back to one of the principles documented here.

**Core Philosophy:** FeatureSignals is an engineering tool built for engineers. The UX must be honest, efficient, and transparent — never manipulative, never bloated, never confusing. We don't trick users into upgrading. We show them value and let them choose.

---

## Design Principles

### P1: Close the Gulfs

| Gulf | Definition | FeatureSignals Application |
|------|-----------|--------------------------|
| **Gulf of Execution** | The gap between user's goal and the means to achieve it | Can a user create a flag and see it work in <60 seconds? |
| **Gulf of Evaluation** | The gap between system state and user's understanding | Can a user see that their flag toggle actually changed evaluations? |

**Rule:** Every feature must provide immediate, visible feedback. No action should feel like it disappeared into a black box.

### P2: Prevent Errors, Don't Just Handle Them

Norman distinguishes *slips* (unconscious errors from inattention) from *mistakes* (conscious errors from wrong mental models).

| Error Type | Prevention Strategy |
|-----------|-------------------|
| Toggling production flag accidentally | Environment color coding + confirmation with hold-to-confirm |
| Deleting wrong flag | Soft delete + 30-day recovery + confirmation |
| Misconfiguring targeting rules | Live preview showing which users match |
| Wrong environment | Persistent environment indicator with color intensity |

**Rule:** Make it impossible to do the wrong thing. When that's not possible, make it hard.

### P3: Knowledge in the World, Not in the Head

Users should not need to memorize:

- Which environment they're in (show it persistently)
- Flag key naming conventions (suggest, autocomplete, validate)
- API key values (copy button, one-click reveal, masked by default)
- URL patterns (breadcrumbs, context hierarchy, command palette)

**Rule:** If information is needed to use the product, it should be visible or one click away.

### P4: Emotional Design — All Three Levels

| Level | Definition | FeatureSignals Application |
|-------|-----------|--------------------------|
| **Visceral** | Immediate aesthetic reaction | Clean, modern UI; fast page loads; satisfying animations |
| **Behavioral** | Pleasure of effective use | Fast flag toggle, clear feedback, efficient workflows |
| **Reflective** | Self-image and meaning | "I use a tool built by engineers who care about craft" |

**Rule:** The product should feel premium and trustworthy at every level.

### P5: Progressive Disclosure

Complexity is not the enemy — *unnecessary* complexity is. Reveal advanced features when users need them, not before.

| User Stage | What They See |
|-----------|--------------|
| First visit | Simple flag: name, type, on/off toggle |
| After creating 5 flags | Targeting rules, scheduling, prerequisites |
| Team admin | Approval workflows, webhooks, audit logs |
| Enterprise | SSO config, compliance reports, custom roles |

**Rule:** The first experience must be dead simple. Complexity unfolds as the user's needs grow.

---

## Heuristic Compliance Checklist

Every new feature must pass this checklist before merging:

- [ ] **Visibility of System Status** — Does the user know what happened after every action?
- [ ] **Match Between System and Real World** — Do we use engineering-friendly language, not marketing-speak?
- [ ] **User Control and Freedom** — Can the user undo? Is there a clear "emergency exit"?
- [ ] **Consistency and Standards** — Does this match the rest of the dashboard? Do we follow web conventions?
- [ ] **Error Prevention** — Are destructive actions guarded? Are defaults safe?
- [ ] **Recognition Rather Than Recall** — Is information visible, or must users remember it?
- [ ] **Flexibility and Efficiency of Use** — Can power users use keyboard shortcuts? Is there a command palette entry?
- [ ] **Aesthetic and Minimalist Design** — Is every element necessary? Does anything compete for attention?
- [ ] **Help Users Recognize, Diagnose, and Recover from Errors** — Are error messages clear, plain-language, and constructive?
- [ ] **Help and Documentation** — Is this feature self-explanatory? If not, is contextual help available?

---

## Implementation Roadmap

### Phase 1: First 60 Seconds (Onboarding)
- Instant Flag wizard — auto-create org/project/env during signup
- Demo flag with live evaluation preview
- Copy-paste-ready SDK snippet

### Phase 2: Close the Evaluation Gulf
- Live evaluation counter on flag detail
- "Evaluate Me" — enter user ID, see step-by-step evaluation
- Flag toggle confirmation pulse with first eval result

### Phase 3: Visual Rule Builder
- Block-based visual rule editor (Notion/Airtable filter style)
- Live preview showing matched users
- Drag-to-reorder rule priority
- Conflict detection between overlapping rules

### Phase 4: Flag Dashboard as Living Map
- Visual flag grid with status, type, activity sparklines
- Smart filtering by type, status, age, activity
- Flag dependency graph visualization
- "What's changed?" diff summary

### Phase 5: Environment-Aware Safety
- Persistent environment color indicator
- Production safety gates (hold-to-confirm)
- Visual promotion wizard with diff view
- Side-by-side environment comparison

### Phase 6: Proactive Error Communication
- Webhook failure alerts in dashboard
- SDK connectivity health indicators
- Flag conflict detection
- Visual flag timeline with diff capability

### Phase 7: Pricing & Trust
- Live pricing calculator comparing competitors
- Clear Community vs Pro feature boundaries
- No dark patterns, no fake urgency

### Phase 8: Progressive Disclosure & Polish
- Role-based views (developer vs admin)
- Simple/Advanced toggle on flag creation
- Embedded contextual help with tooltips
- Searchable command palette enhancements

---

## Cross-References

- [[ARCHITECTURE.md]] — system architecture that enables fast UX
- [[DEVELOPMENT.md]] — development standards for implementing UX
- [[ROADMAP.md]] — feature roadmap alignment
- [[COMPETITIVE.md]] — competitive UX differentiators
- [[PERFORMANCE.md]] — evaluation hot path performance (enables real-time UX)

## Sources

- Norman, D. (2013). *The Design of Everyday Things: Revised and Expanded Edition*. Basic Books.
- Norman, D. (2004). *Emotional Design: Why We Love (or Hate) Everyday Things*. Basic Books.
- Norman, D. (2010). *Living with Complexity*. MIT Press.
- Nielsen, J. (1994). *10 Usability Heuristics for User Interface Design*. Nielsen Norman Group.
- Nielsen Norman Group. (2024). *10 Usability Heuristics Applied to Complex Applications*.
