# WCAG 2.1 AA Compliance Checklist — FeatureSignals Dashboard

> **Last Updated:** 2026-05-14  
> **Assessment:** Automated + Manual  
> **Status Key:** ✅ PASS | ❌ FAIL | ⬜ UNTESTED | ⚠️ PARTIAL

---

## Principle 1: Perceivable

### 1.1 Text Alternatives

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 1.1.1 | Non-text Content — All images, icons, and non-text elements have text alternatives | A | ⬜ | Audit in progress | High |

### 1.2 Time-based Media

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | ✅ | No audio/video content in dashboard | N/A |
| 1.2.2 | Captions (Prerecorded) | A | ✅ | No video content | N/A |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | ✅ | No video content | N/A |
| 1.2.4 | Captions (Live) | AA | ✅ | No live video | N/A |
| 1.2.5 | Audio Description (Prerecorded) | AA | ✅ | No video content | N/A |

### 1.3 Adaptable

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 1.3.1 | Info and Relationships — Semantic structure conveys relationships (headings, lists, tables, labels) | A | ⚠️ | Audit in progress; some form inputs need explicit label associations | High |
| 1.3.2 | Meaningful Sequence — Content order preserves meaning | A | ✅ | DOM order matches visual order | N/A |
| 1.3.3 | Sensory Characteristics — Instructions don't rely solely on sensory characteristics (shape, color, location) | A | ⚠️ | Some error states use color-only indicators | Medium |
| 1.3.4 | Orientation — Content not restricted to single orientation | AA | ✅ | Dashboard works in portrait and landscape | N/A |
| 1.3.5 | Identify Input Purpose — Input purpose can be programmatically determined | AA | ✅ | Form inputs use proper `type` and `autocomplete` attributes | N/A |

### 1.4 Distinguishable

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 1.4.1 | Use of Color — Color is not the only means of conveying information | A | ⚠️ | Status badges use color + text; some interactive states need non-color indicators | Medium |
| 1.4.2 | Audio Control — No auto-playing audio | A | ✅ | No audio in dashboard | N/A |
| 1.4.3 | Contrast (Minimum) — Text has 4.5:1 contrast ratio (3:1 for large text) | AA | ⚠️ | Signal UI tokens checked; some tertiary text may be borderline | High |
| 1.4.4 | Resize Text — Text can be resized to 200% without loss of content | AA | ⚠️ | Tailwind responsive classes used; needs verification at 200% zoom | Medium |
| 1.4.5 | Images of Text — No images of text used | AA | ✅ | All text is real text | N/A |
| 1.4.10 | Reflow — Content reflows without horizontal scrolling at 320px width | AA | ⚠️ | Mobile responsive; some table views need testing | Medium |
| 1.4.11 | Non-text Contrast — UI components and graphics have 3:1 contrast | AA | ⚠️ | Border colors use Signal UI tokens; needs verification | Medium |
| 1.4.12 | Text Spacing — Content adapts to user text spacing settings | AA | ✅ | Relative units used; no fixed heights on text containers | N/A |
| 1.4.13 | Content on Hover or Focus — Hover/focus content is dismissible, hoverable, persistent | AA | ⚠️ | Tooltips and dropdowns need dismiss-on-escape verification | Medium |

---

## Principle 2: Operable

### 2.1 Keyboard Accessible

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 2.1.1 | Keyboard — All functionality available via keyboard | A | ⚠️ | Audit in progress; drag-and-drop may need keyboard alternative | High |
| 2.1.2 | No Keyboard Trap — Focus can be moved away from any component using keyboard | A | ⚠️ | Modals and dialogs need escape-to-close verification | High |
| 2.1.4 | Character Key Shortcuts — No single-character shortcuts that interfere | A | ✅ | Keyboard shortcuts use modifier keys (Cmd/Ctrl) | N/A |

### 2.2 Enough Time

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 2.2.1 | Timing Adjustable — Users can extend or disable time limits | A | ✅ | No time-limited interactions outside auth token expiry (standard) | N/A |
| 2.2.2 | Pause, Stop, Hide — Auto-updating content can be paused | A | ✅ | No auto-updating content (carousels, etc.) | N/A |

### 2.3 Seizures and Physical Reactions

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 2.3.1 | Three Flashes or Below Threshold — No content flashes more than 3 times/second | A | ✅ | Animations use smooth transitions; no flashing content | N/A |

### 2.4 Navigable

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 2.4.1 | Bypass Blocks — Skip-to-content link available | A | ❌ | No skip-to-content link implemented | **Critical** |
| 2.4.2 | Page Titled — Pages have descriptive titles | A | ✅ | Next.js metadata provides per-page titles | N/A |
| 2.4.3 | Focus Order — Focus order preserves meaning and operability | A | ⚠️ | Audit in progress; modal focus trapping needs verification | Medium |
| 2.4.4 | Link Purpose (In Context) — Link purpose is clear from text or context | A | ⚠️ | Some icon-only buttons lack accessible names | High |
| 2.4.5 | Multiple Ways — Multiple ways to locate pages | AA | ✅ | Navigation sidebar + command palette + breadcrumbs | N/A |
| 2.4.6 | Headings and Labels — Headings and labels describe topic or purpose | AA | ✅ | Pages use proper heading hierarchy | N/A |
| 2.4.7 | Focus Visible — Keyboard focus indicator is visible on all interactive elements | AA | ⚠️ | Focus-visible rings configured; needs verification on all components | High |

### 2.5 Input Modalities

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 2.5.1 | Pointer Gestures — Multi-point gestures have single-pointer alternatives | A | ✅ | No multi-point gesture requirements | N/A |
| 2.5.2 | Pointer Cancellation — Down-event is not used to execute actions | A | ✅ | Actions trigger on click (up-event), not mousedown | N/A |
| 2.5.3 | Label in Name — Visible label text matches or is included in accessible name | A | ⚠️ | Form inputs need verification that aria-label matches visible label | Medium |
| 2.5.4 | Motion Actuation — Functionality not solely dependent on device motion | A | ✅ | No motion-dependent functionality | N/A |

---

## Principle 3: Understandable

### 3.1 Readable

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 3.1.1 | Language of Page — Page language is programmatically determined | A | ✅ | `<html lang="en">` set in root layout | N/A |
| 3.1.2 | Language of Parts — Language changes within content are marked | AA | ✅ | No multilingual content blocks | N/A |

### 3.2 Predictable

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 3.2.1 | On Focus — No unexpected context change on focus | A | ✅ | Focus does not trigger navigation or form submission | N/A |
| 3.2.2 | On Input — Changing input doesn't auto-submit without warning | A | ✅ | Forms require explicit submission | N/A |
| 3.2.3 | Consistent Navigation — Navigation order is consistent across pages | AA | ✅ | Sidebar structure is persistent | N/A |
| 3.2.4 | Consistent Identification — Components with same function are identified consistently | AA | ✅ | Signal UI design system ensures consistency | N/A |

### 3.3 Input Assistance

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 3.3.1 | Error Identification — Errors are described in text | A | ⚠️ | Inline errors exist; need to verify all error states include text descriptions | Medium |
| 3.3.2 | Labels or Instructions — Labels and instructions are provided | A | ⚠️ | Most forms have labels; some complex inputs (rule builder) need instructions | Medium |
| 3.3.3 | Error Suggestion — Suggestions are provided for errors when known | AA | ⚠️ | Some error messages could be more actionable (see Content Voice standards) | Medium |
| 3.3.4 | Error Prevention (Legal, Financial, Data) — Reversible, checked, confirmed | AA | ⚠️ | Delete operations have confirmation; toggle in production has safety gate | Medium |

---

## Principle 4: Robust

### 4.1 Compatible

| ID | Criterion | Level | Status | Notes | Fix Priority |
|----|-----------|-------|--------|-------|-------------|
| 4.1.1 | Parsing — No duplicate attributes; elements properly nested | A | ✅ | React/JSX enforces well-formed markup | N/A |
| 4.1.2 | Name, Role, Value — All UI components expose name, role, and value to assistive technology | A | ⚠️ | Radix UI provides good ARIA defaults; custom components need verification | High |
| 4.1.3 | Status Messages — Status messages can be presented without focus change | AA | ⚠️ | Toast notifications use `aria-live`; needs verification on all status messages | Medium |

---

## Summary

| Principle | Total Criteria | PASS | FAIL | PARTIAL | UNTESTED |
|-----------|---------------|------|------|---------|----------|
| 1. Perceivable | 17 | 8 | 0 | 6 | 3 |
| 2. Operable | 14 | 7 | 1 | 5 | 1 |
| 3. Understandable | 10 | 6 | 0 | 4 | 0 |
| 4. Robust | 3 | 1 | 0 | 2 | 0 |
| **Total** | **44** | **22** | **1** | **17** | **4** |

### Immediate Actions

1. ❌ **[CRITICAL]** 2.4.1 — Add skip-to-content link
2. ⚠️ **[HIGH]** 1.1.1 — Add alt text to all images and aria-labels to icon-only buttons
3. ⚠️ **[HIGH]** 1.3.1 — Ensure all form inputs have explicit label associations
4. ⚠️ **[HIGH]** 1.4.3 — Verify color contrast ratios on all text
5. ⚠️ **[HIGH]** 2.4.4 — Ensure all links and buttons have accessible names
6. ⚠️ **[HIGH]** 2.4.7 — Ensure focus indicators are visible on all interactive elements
7. ⚠️ **[HIGH]** 4.1.2 — Add role attributes where needed on custom components
