# Usability Test Report — FeatureSignals Dashboard

> **Report Date:** YYYY-MM-DD
> **Author:** [Name]
> **Study Period:** YYYY-MM-DD to YYYY-MM-DD
> **Version:** 1.0

---

## Executive Summary

*One paragraph summarizing the study, key findings, and primary recommendation.
Write this last — after the findings section is complete.*

**Overall Verdict:** [Pass / Pass with Issues / Fail]

**Key Numbers:**

| Metric | Result | Target | Status |
|---|---|---|---|
| Mean task completion rate | __% | > 80% | ✅ / ❌ |
| Mean SEQ score | __ / 7 | > 5.5 | ✅ / ❌ |
| Mean SUS score | __ / 100 | > 68 | ✅ / ❌ |
| Critical issues found (severity 4) | __ | 0 | ✅ / ❌ |

---

## Methodology

### Study Design

- **Type:** Moderated remote usability test
- **Protocol:** Think-aloud
- **Participants:** 5
- **Scenarios:** 3 critical workflows
- **Duration:** 45–60 minutes per session
- **Dates:** YYYY-MM-DD to YYYY-MM-DD

### Participant Demographics

| ID | Role | Years Exp | Flag Tool Experience |
|---|---|---|---|
| P1 | | | |
| P2 | | | |
| P3 | | | |
| P4 | | | |
| P5 | | | |

---

## Findings by Severity

### Critical (Severity 4) — Prevents Task Completion

| # | Issue | Scenarios Affected | Participants Affected | Recommendation |
|---|---|---|---|---|
| 1 | | | | |

*If none:* ✅ No critical issues were observed.

### Serious (Severity 3) — Causes Significant Delay or Errors

| # | Issue | Scenarios Affected | Participants Affected | Recommendation |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

### Moderate (Severity 2) — Causes Hesitation or Extra Steps

| # | Issue | Scenarios Affected | Participants Affected | Recommendation |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

### Cosmetic (Severity 1) — Minor Annoyance

| # | Issue | Scenarios Affected | Participants Affected | Recommendation |
|---|---|---|---|---|
| 1 | | | | |

---

## Scenario-by-Scenario Analysis

### Scenario 1: "Create and Launch a Feature Flag"

| Metric | P1 | P2 | P3 | P4 | P5 | Mean |
|---|---|---|---|---|---|---|
| Completion (✓) | | | | | | __% |
| Time (mm:ss) | | | | | | __:__ |
| Errors | | | | | | __ |
| SEQ (1–7) | | | | | | __ |

**Key observations:**
- *[What worked well]*
- *[What caused problems]*
- *[Quotes]*

**Recommended changes:**
1.
2.

### Scenario 2: "Set Up a New Project with Environments"

| Metric | P1 | P2 | P3 | P4 | P5 | Mean |
|---|---|---|---|---|---|---|
| Completion (✓) | | | | | | __% |
| Time (mm:ss) | | | | | | __:__ |
| Errors | | | | | | __ |
| SEQ (1–7) | | | | | | __ |

**Key observations:**

**Recommended changes:**
1.
2.

### Scenario 3: "Investigate a Flag That's Not Evaluating Correctly"

| Metric | P1 | P2 | P3 | P4 | P5 | Mean |
|---|---|---|---|---|---|---|
| Completion (✓) | | | | | | __% |
| Time to diagnose (mm:ss) | | | | | | __:__ |
| Errors | | | | | | __ |
| SEQ (1–7) | | | | | | __ |
| Correct diagnosis | | | | | | __% |

**Key observations:**

**Recommended changes:**
1.
2.

---

## SUS Results

| Participant | Odd Sum (items 1,3,5,7,9) | Even Sum (items 2,4,6,8,10) | SUS Score |
|---|---|---|---|
| P1 | | | |
| P2 | | | |
| P3 | | | |
| P4 | | | |
| P5 | | | |
| **Mean** | | | __ |

**Interpretation:**
- > 80.3: Excellent (Grade A)
- 68–80.3: Good (Grade B)
- 68: Average (Grade C)
- 51–68: Poor (Grade D)
- < 51: Unacceptable (Grade F)

---

## Post-Test Interview Themes

### What frustrated users most
- *[Theme 1]*
- *[Theme 2]*

### What users found intuitive
- *[Theme 1]*
- *[Theme 2]*

### Top feature requests
- *[Request 1]*
- *[Request 2]*

### Representative Quotes

> "..." — P_

> "..." — P_

> "..." — P_

---

## Recommendations

### Immediate (Before Release)

| # | Action | Severity | Effort | Owner |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

### Short-term (Next Sprint)

| # | Action | Severity | Effort | Owner |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

### Long-term (Future Consideration)

| # | Action | Rationale |
|---|---|---|
| 1 | | |
| 2 | | |

---

## Before/After Comparison

> *Complete this section after fixes are implemented and re-tested.*

| Metric | Before | After | Change |
|---|---|---|---|
| Task completion rate | __% | __% | |
| Mean SEQ | __ | __ | |
| Mean SUS | __ | __ | |
| Critical issues | __ | __ | |
| Mean time (Scenario 1) | __:__ | __:__ | |

---

## Appendix

### A. SUS Score Calculation

```
SUS = ((OddSum - 5) + (25 - EvenSum)) × 2.5
```

Where:
- OddSum = sum of ratings for items 1, 3, 5, 7, 9
- EvenSum = sum of ratings for items 2, 4, 6, 8, 10

### B. SEQ Scale

| Rating | Label |
|---|---|
| 1 | Very Difficult |
| 2 | Difficult |
| 3 | Somewhat Difficult |
| 4 | Neutral |
| 5 | Somewhat Easy |
| 6 | Easy |
| 7 | Very Easy |

### C. Glossary

- **SEQ:** Single Ease Question — a 7-point post-task difficulty rating.
- **SUS:** System Usability Scale — a 10-item standardized usability
  questionnaire yielding a 0–100 score.
- **Think-aloud protocol:** A usability testing method where participants
  verbalize their thoughts while using the product.
- **Severity:** The impact of a usability issue on task completion:
  1 (cosmetic) through 4 (critical).
