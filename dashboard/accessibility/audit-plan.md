# FeatureSignals Dashboard — Accessibility Audit Plan

> **Target:** WCAG 2.1 Level AA  
> **Status:** In Progress  
> **Last Updated:** 2026-05-14  
> **Owner:** Engineering

---

## 1. Audit Methodology

The audit combines automated tooling with manual verification to catch the full spectrum of accessibility issues. Automated tools catch ~30-40% of WCAG violations; manual testing is essential for the remaining 60-70%.

### 1.1 Automated Tools

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **axe-core** (via `@axe-core/react`) | In-browser violation detection during development | Impact: critical, serious. Run on every route. |
| **Lighthouse** (DevTools + CI) | Page-level audit including accessibility score | Run on critical pages: login, flags list, flag detail, settings |
| **Vitest + jest-dom** | Unit/component test assertions (`toHaveAccessibleName`, `toHaveFocus`, etc.) | Integrated into existing test suite |

### 1.2 Manual Checks

| Category | Method | Tools |
|----------|--------|-------|
| **Keyboard navigation** | Tab through every interactive element; verify focus order, focus visibility, no keyboard traps | Manual tab-through on every route |
| **Screen reader** | Test with VoiceOver (macOS) on critical flows | VoiceOver + Safari |
| **Color contrast** | Verify all text meets 4.5:1 (normal) / 3:1 (large) contrast ratios | axe-core + manual spot-checks with Contrast app |
| **Focus management** | Verify focus moves to new content after navigation, modal open, dialog open | Manual |
| **Text resize** | Zoom to 200% — verify content doesn't overflow or truncate | Browser zoom |
| **Reduced motion** | Verify `prefers-reduced-motion` is respected | System settings toggle |

### 1.3 Audit Cadence

| Event | Action |
|-------|--------|
| **Every PR** | axe-core runs automatically during development; reviewer checks focus + labels |
| **Weekly** | Lighthouse audit on top 5 pages |
| **Monthly** | Full manual keyboard + screen reader pass |
| **Per release** | Complete WCAG 2.1 AA checklist review |

---

## 2. Audit Scope

### 2.1 Critical User Flows (Must Pass)

1. **Login → Dashboard** — Login form, navigation, project selection
2. **Flag Management** — List flags, create flag, toggle flag, edit targeting
3. **Settings** — General settings, team management, API keys
4. **Error States** — Global error page, 404 page, inline errors

### 2.2 All Pages & Components

- All pages under `/src/app/(app)/`
- All shared components in `/src/components/`
- All UI primitives in `/src/components/ui/`
- Auth pages: login, register, forgot-password, reset-password, magic-link, SSO

---

## 3. WCAG 2.1 AA Principles

### Principle 1: Perceivable
Information and user interface components must be presentable to users in ways they can perceive.

### Principle 2: Operable
User interface components and navigation must be operable.

### Principle 3: Understandable
Information and the operation of the user interface must be understandable.

### Principle 4: Robust
Content must be robust enough that it can be interpreted by a wide variety of user agents, including assistive technologies.

---

## 4. Severity Classification

| Level | Description | Fix SLA |
|-------|-------------|---------|
| **Critical** | Blocks users from completing core tasks; screen reader cannot understand content | 24 hours |
| **Serious** | Significantly degrades experience for users with disabilities | 1 week |
| **Moderate** | Inconvenient but workable; alternative paths exist | 2 weeks |
| **Minor** | Cosmetic; best practice recommendations | Backlog |

---

## 5. Reporting

### 5.1 Findings Format

Each finding includes:
- **ID:** Unique identifier (e.g., A11Y-001)
- **WCAG Criterion:** Specific SC reference (e.g., 1.1.1 Non-text Content)
- **Location:** File path + line number
- **Description:** What the issue is
- **Impact:** Who is affected and how
- **Fix:** Concrete remediation steps
- **Status:** Open / In Progress / Fixed / Verified

### 5.2 Issue Tracking

- Filed as GitHub issues with `accessibility` label
- Linked to WCAG checklist items
- Tracked in `accessibility/findings.md`
