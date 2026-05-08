# Usability Testing Plan — FeatureSignals Dashboard

> **Status:** Ready to execute
> **Method:** Moderated remote usability testing with think-aloud protocol
> **Participants:** 5 users
> **Duration:** 45–60 minutes per session

---

## 1. Goal

Identify friction points, confusion sources, and task-completion barriers in
the three most critical dashboard workflows. The findings will directly
inform design improvements before the Phase F polish pass.

### Research Questions

1. Can users create and launch a feature flag without external help?
2. Can users set up a new project with environments confidently?
3. Can users diagnose why a flag is not evaluating as expected?
4. Where do users pause, hesitate, or make errors?
5. What mental model do users form of FeatureSignals' concepts?

---

## 2. Participants

We recruit **5 participants** per NNGroup's recommendation — this catches
approximately 85% of usability issues in a given interface.

### Recruitment Criteria

| Criterion | Requirement |
|---|---|
| **Role** | Software engineer, engineering manager, or DevOps practitioner |
| **Experience** | Has used feature flag tools before OR is evaluating one for the first time |
| **Technical comfort** | Comfortable writing code, using APIs, and navigating developer tools |
| **Screening** | No prior exposure to FeatureSignals (new users) |

### Participant Roster Template

| ID | Role | Years Exp | Flag Tool Experience | Session Date | Completed |
|---|---|---|---|---|---|
| P1 | Senior Engineer | 6 | LaunchDarkly | — | ☐ |
| P2 | Engineering Manager | 9 | None | — | ☐ |
| P3 | Full-Stack Developer | 3 | Flagsmith | — | ☐ |
| P4 | DevOps Engineer | 5 | Split.io | — | ☐ |
| P5 | Staff Engineer | 10 | Homegrown | — | ☐ |

---

## 3. Method

### 3.1 Format

- **Moderated remote testing** via Zoom/Google Meet.
- **Think-aloud protocol** — participants verbalize their thoughts, intentions,
  expectations, and reactions continuously while interacting with the product.
- Moderator observes silently, takes notes, and prompts only when the participant
  goes silent for more than 10 seconds.

### 3.2 Session Structure (45–60 min)

| Phase | Duration | Activity |
|---|---|---|
| Introduction | 5 min | Welcome, consent form, explain think-aloud |
| Pre-test questionnaire | 5 min | Background, experience, expectations |
| Scenario 1 | 8–12 min | "Create and launch a feature flag" |
| Post-task rating | 2 min | Single Ease Question (SEQ) |
| Scenario 2 | 8–12 min | "Set up a new project with environments" |
| Post-task rating | 2 min | SEQ |
| Scenario 3 | 8–12 min | "Investigate a flag that's not evaluating correctly" |
| Post-task rating | 2 min | SEQ |
| System Usability Scale (SUS) | 3 min | 10-item SUS questionnaire |
| Post-test interview | 5–10 min | Open-ended questions |
| **Total** | **45–60 min** | |

### 3.3 Tools

- **Screen recording:** Zoom cloud recording (or equivalent) — captures screen,
  audio, and facial expressions.
- **Session notes:** Moderator uses the note template (`note-template.md`) during
  each session.
- **Remote observation:** Stakeholders can join silently with cameras off.
- **Post-session:** Upload recordings to the shared research drive within 24 hours.

---

## 4. Metrics Collected

| Metric | How Measured | Target |
|---|---|---|
| **Task completion rate** | Binary: completed / partial / failed | > 80% completed |
| **Time on task** | Stopwatch per scenario | See scenario criteria |
| **Errors per task** | Count of wrong clicks, navigation errors, form validation errors | < 2 per task |
| **Single Ease Question (SEQ)** | 7-point Likert: "Overall, how easy or difficult was this task?" | Mean > 5.5 |
| **System Usability Scale (SUS)** | 10-item standardized questionnaire (0–100 scale) | Score > 68 (above average) |
| **Think-aloud insights** | Qualitative: quotes, pain points, mental model errors | — |

---

## 5. Success Criteria

- **≥ 80%** of participants complete Scenario 1 (create flag) within 3 minutes
- **≥ 80%** of participants complete Scenario 2 (project setup) within 5 minutes
- **≥ 80%** of participants successfully diagnose the issue in Scenario 3
- **Mean SUS score ≥ 68** (above industry average)
- **Zero critical (severity 4) issues** — issues that completely block task completion

---

## 6. Analysis & Reporting

After all 5 sessions:

1. **Compile session notes** into a master findings spreadsheet.
2. **Severity-rubric each issue** (see note template for severity scale).
3. **Calculate quantitative metrics** (completion rate, time, SEQ, SUS).
4. **Identify top 5 issues** by severity × frequency.
5. **Write final report** using `report-template.md`.
6. **Present findings** to the engineering and design team within 1 week.

---

## 7. Schedule

| Milestone | Target Date |
|---|---|
| Recruit 5 participants | Week 1 |
| Pilot session (practice run) | Week 1 |
| Conduct 5 sessions | Week 1–2 |
| Analyze results | Week 2 |
| Deliver final report | Week 2 |

---

## References

- Nielsen, J. (2000). *Why You Only Need to Test with 5 Users*. NNGroup.
- Nielsen, J. (2012). *Thinking Aloud: The #1 Usability Tool*. NNGroup.
- Sauro, J. & Lewis, J.R. (2016). *Quantifying the User Experience*.
- Brooke, J. (1996). *SUS: A quick and dirty usability scale*.
